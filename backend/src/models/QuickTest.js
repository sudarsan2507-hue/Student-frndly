/**
 * QuickTest model
 * Represents a quick recall test for a skill
 */
class QuickTest {
    constructor(data) {
        this.id = data.id || null;
        this.skillId = data.skillId;
        this.userId = data.userId;
        this.skillName = data.skillName || ''; // Store skill name for history display

        // Test questions and answers
        this.questions = data.questions || []; // Array of {id, question, options, correctIndex}
        this.answers = data.answers || {}; // {questionId: answerIndex}

        // Results
        this.score = data.score || 0; // Number of correct answers
        this.accuracy = data.accuracy || 0; // Percentage correct (0-100)
        this.totalTime = data.totalTime || 0; // Total time in seconds
        this.averageTimePerQuestion = data.averageTimePerQuestion || 0;
        this.responseTime = data.responseTime || null; // Kept for backwards compatibility

        // Confidence indicator (based on response time and accuracy)
        this.confidence = data.confidence || 'medium'; // 'low', 'medium', 'high'

        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.completedAt = data.completedAt || null;
    }

    /**
     * Validate quick test data
     */
    static validate(data) {
        const errors = [];

        if (!data.skillId) {
            errors.push('Skill ID is required');
        }

        if (!data.userId) {
            errors.push('User ID is required');
        }

        if (data.questions && !Array.isArray(data.questions)) {
            errors.push('Questions must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to plain object for storage
     */
    toJSON() {
        return {
            id: this.id,
            skillId: this.skillId,
            userId: this.userId,
            skillName: this.skillName,
            questions: this.questions,
            answers: this.answers,
            score: this.score,
            accuracy: this.accuracy,
            totalTime: this.totalTime,
            averageTimePerQuestion: this.averageTimePerQuestion,
            responseTime: this.responseTime,
            confidence: this.confidence,
            completedAt: this.completedAt,
            createdAt: this.createdAt
        };
    }
}

export default QuickTest;
