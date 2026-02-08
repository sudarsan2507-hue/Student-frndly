import QuickTest from '../models/QuickTest.js';

/**
 * QuickTest service
 * Handles quick test generation, evaluation, and adaptive decay adjustment
 */
class QuickTestService {
    constructor(storage, skillService) {
        this.storage = storage;
        this.skillService = skillService;
    }

    /**
     * Generate a quick test for a skill
     * Simple multiple-choice questions about the skill
     * @param {string} skillId - Skill ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Test with questions
     */
    async generateTest(skillId, userId) {
        const skill = await this.storage.findSkillById(skillId);

        if (!skill) {
            throw new Error('Skill not found');
        }

        if (skill.userId !== userId) {
            throw new Error('Unauthorized: You can only test your own skills');
        }

        // Generate skill-specific questions
        const questions = this.generateQuestions(skill);

        const test = new QuickTest({
            skillId,
            userId,
            skillName: skill.name,
            questions
        });

        const savedTest = await this.storage.createQuickTest(test.toJSON());

        // Return test without correct answers
        return {
            ...savedTest,
            questions: savedTest.questions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options
            }))
        };
    }

    /**
     * Generate questions based on skill
     * Creates 5 contextual recall questions
     * @param {Object} skill - Skill object
     * @returns {Array} Array of question objects
     */
    generateQuestions(skill) {
        const skillName = skill.name;

        // 5 recall-focused questions
        const templates = [
            {
                question: `How would you describe your current proficiency in ${skillName}?`,
                options: ['Expert', 'Intermediate', 'Beginner', 'Just learning'],
                correctIndex: 1 // Intermediate is most common
            },
            {
                question: `When did you last practice ${skillName}?`,
                options: ['Today', 'This week', 'This month', 'Longer ago'],
                correctIndex: 0
            },
            {
                question: `Can you recall a key concept from ${skillName}?`,
                options: ['Yes, multiple concepts', 'Yes, one concept', 'Maybe with hints', 'Not really'],
                correctIndex: 0
            },
            {
                question: `How confident are you in applying ${skillName}?`,
                options: ['Very confident', 'Somewhat confident', 'Not very confident', 'Not confident'],
                correctIndex: 0
            },
            {
                question: `What is the best way to maintain your skills in ${skillName}?`,
                options: ['Regular practice and testing', 'Occasional review', 'Hope for the best', 'Never practice'],
                correctIndex: 0
            }
        ];

        return templates.map((template, index) => ({
            id: `q${Date.now()}_${index}`,
            question: template.question,
            options: template.options,
            correctIndex: template.correctIndex
        }));
    }

    /**
     * Submit test answers and calculate results
     * @param {string} testId - Test ID
     * @param {string} userId - User ID
     * @param {Object} answers - User's answers {questionId: answerIndex}
     * @param {number} totalTime - Total time taken in seconds
     * @returns {Promise<Object>} Results with updated skill
     */
    async submitTest(testId, userId, answers, totalTime) {
        const test = await this.storage.findQuickTestById(testId);

        if (!test) {
            throw new Error('Test not found');
        }

        if (test.userId !== userId) {
            throw new Error('Unauthorized: You can only submit your own tests');
        }

        if (test.completedAt) {
            throw new Error('Test already completed');
        }

        // Calculate score and accuracy
        const { accuracy, correctCount, totalQuestions } = this.calculateAccuracy(test.questions, answers);

        // Calculate response time metrics
        const averageTimePerQuestion = totalTime / totalQuestions;

        // Determine confidence based on response time
        let confidence = 'medium';
        if (averageTimePerQuestion < 10) {
            confidence = 'high';
        } else if (averageTimePerQuestion > 20) {
            confidence = 'low';
        }

        // Update test with results
        const updatedTest = await this.storage.updateQuickTest(testId, {
            answers,
            score: correctCount,
            accuracy,
            totalTime,
            averageTimePerQuestion,
            responseTime: averageTimePerQuestion, // Backwards compatibility
            confidence,
            completedAt: new Date().toISOString()
        });

        // Adjust skill decay based on performance
        const updatedSkill = await this.adjustSkillDecay(test.skillId, accuracy, averageTimePerQuestion, confidence);

        // Mark skill as practiced
        await this.storage.markSkillAsPracticed(test.skillId);

        return {
            test: updatedTest,
            skill: updatedSkill,
            results: {
                score: correctCount,
                totalQuestions,
                accuracy,
                confidence,
                totalTime,
                averageTimePerQuestion,
                performance: this.getPerformanceLabel(accuracy, averageTimePerQuestion)
            }
        };
    }

    /**
     * Calculate test accuracy
     * @param {Array} questions - Questions with correct answers
     * @param {Object} userAnswers - User's answers
     * @returns {Object} Accuracy percentage and counts
     */
    calculateAccuracy(questions, userAnswers) {
        let correctCount = 0;
        const totalQuestions = questions.length;

        questions.forEach(q => {
            const userAnswer = userAnswers[q.id];
            // Support both correctAnswer and correctIndex field names
            const correctAnswer = q.correctIndex !== undefined ? q.correctIndex : q.correctAnswer;
            if (userAnswer !== undefined && userAnswer === correctAnswer) {
                correctCount++;
            }
        });

        const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        return {
            accuracy: Math.round(accuracy),
            correctCount,
            totalQuestions
        };
    }

    /**
     * Adjust skill decay parameters based on test performance
     * Uses half-life adjustments + adaptive multiplier
     * Better performance = slower decay (higher half-life, lower multiplier)
     * Worse performance = faster decay (lower half-life, higher multiplier)
     * @param {string} skillId - Skill ID
     * @param {number} accuracy - Test accuracy (0-100)
     * @param {number} responseTime - Average response time in seconds
     * @param {string} confidence - 'low', 'medium', 'high'
     * @returns {Promise<Object>} Updated skill
     */
    async adjustSkillDecay(skillId, accuracy, responseTime, confidence) {
        const skill = await this.storage.findSkillById(skillId);

        if (!skill) {
            throw new Error('Skill not found');
        }

        let halfLife = skill.halfLife || 7;
        let newMultiplier = skill.adaptiveDecayMultiplier || 1.0;

        // Adjust based on accuracy and confidence
        if (accuracy >= 80 && confidence === 'high') {
            // Excellent performance - slower decay
            halfLife = Math.min(halfLife * 1.3, 30); // Cap at 30 days
            newMultiplier *= 0.8;
        } else if (accuracy >= 60 && confidence !== 'low') {
            // Good performance - slightly slower decay
            halfLife = Math.min(halfLife * 1.1, 30);
            newMultiplier *= 0.9;
        } else if (accuracy < 50 || confidence === 'low') {
            // Poor performance - faster decay
            halfLife = Math.max(halfLife * 0.8, 3); // Minimum 3 days
            newMultiplier *= 1.2;
        }

        // Fine-tune based on response time
        if (responseTime < 8) {
            // Quick response: additional improvement
            newMultiplier *= 0.95;
        } else if (responseTime > 18) {
            // Slow response: additional decay
            newMultiplier *= 1.1;
        }

        // Keep multiplier between 0.5 and 2.0
        newMultiplier = Math.max(0.5, Math.min(2.0, newMultiplier));

        // Update skill with new decay parameters
        const updatedSkill = await this.storage.updateSkill(skillId, {
            halfLife,
            adaptiveDecayMultiplier: newMultiplier
        });

        return {
            ...updatedSkill,
            currentStrength: this.skillService.calculateCurrentStrength(updatedSkill),
            daysSinceLastPractice: this.skillService.getDaysSinceLastPractice(updatedSkill.lastPracticedAt)
        };
    }

    /**
     * Get performance label based on accuracy and response time
     */
    getPerformanceLabel(accuracy, responseTime) {
        if (accuracy >= 80 && responseTime < 10) return 'Excellent';
        if (accuracy >= 60 && responseTime < 15) return 'Good';
        if (accuracy >= 40) return 'Fair';
        return 'Needs Practice';
    }

    /**
     * Get test history for a skill
     * @param {string} skillId - Skill ID
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Test history
     */
    async getTestHistory(skillId, userId) {
        const skill = await this.storage.findSkillById(skillId);

        if (!skill) {
            throw new Error('Skill not found');
        }

        if (skill.userId !== userId) {
            throw new Error('Unauthorized');
        }

        const tests = await this.storage.findQuickTestsBySkillId(skillId);

        return tests
            .filter(t => t.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    }
}

export default QuickTestService;
