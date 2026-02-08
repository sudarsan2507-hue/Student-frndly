/**
 * Knowledge service
 * Business logic for knowledge tracking and decay analysis
 */
class KnowledgeService {
    constructor(storage, skillService, quickTestService) {
        this.storage = storage;
        this.skillService = skillService;
        this.quickTestService = quickTestService;
    }

    /**
     * Get knowledge overview for a user
     * Combines skills with their recent test history and decay trends
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Knowledge overview with skills and tests
     */
    async getKnowledgeOverview(userId) {
        // Get all user skills with calculated strength
        const skills = await this.skillService.getUserSkills(userId);

        // Get all user test history
        const allTests = await this.storage.findQuickTestsByUserId(userId);
        const completedTests = allTests
            .filter(t => t.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        // Organize tests by skill
        const testsBySkill = {};
        completedTests.forEach(test => {
            if (!testsBySkill[test.skillId]) {
                testsBySkill[test.skillId] = [];
            }
            // Only keep last 5 tests per skill
            if (testsBySkill[test.skillId].length < 5) {
                testsBySkill[test.skillId].push(test);
            }
        });

        const enrichedSkills = skills.map(skill => {
            const tests = testsBySkill[skill.id] || [];
            const avgAccuracy = tests.length > 0
                ? tests.reduce((sum, t) => sum + t.score, 0) / tests.length
                : 0;

            // Insight Logic
            let retentionStatus = 'Stable'; // Strong, Stable, Fading, Critical
            let decayExplanation = 'Regular practice is maintaining this skill.';
            let statusColor = '#10b981'; // Green

            // 1. Analyze Decay Multiplier (Performance Factor)
            if (skill.adaptiveDecayMultiplier < 0.8) {
                decayExplanation = 'Broad retention. Decay slowed by excellent test performance.';
                retentionStatus = 'Strong';
                statusColor = '#10b981';
            } else if (skill.adaptiveDecayMultiplier > 1.2) {
                decayExplanation = 'Retention struggling. Decay accelerated by recent low scores.';
                retentionStatus = 'Critical';
                statusColor = '#ef4444';
            }

            // 2. Analyze Inactivity (Time Factor)
            const halfLife = skill.halfLife || 7;
            const daysSince = skill.daysSinceLastPractice;

            if (daysSince > halfLife * 2) {
                retentionStatus = 'Fading';
                decayExplanation = 'Fading due to inactivity. Has not been practiced recently.';
                statusColor = '#f59e0b'; // Yellow
            } else if (daysSince > halfLife) {
                if (retentionStatus === 'Strong') {
                    retentionStatus = 'Stable'; // Downgrade slightly
                    decayExplanation = 'Good retention, but starting to fade due to recent inactivity.';
                    statusColor = '#10b981';
                }
            }

            return {
                ...skill,
                recentTests: tests,
                avgTestAccuracy: avgAccuracy,
                retentionStatus,
                decayExplanation,
                statusColor,
                totalTests: tests.length
            };
        });

        // Calculate overall statistics
        const stats = {
            totalSkills: skills.length,
            totalTests: completedTests.length,
            averageStrength: skills.length > 0
                ? Math.round(skills.reduce((sum, s) => sum + s.currentStrength, 0) / skills.length)
                : 0,
            skillsNeedingAttention: skills.filter(s => s.currentStrength < 60).length,
            skillsStrong: skills.filter(s => s.currentStrength >= 70).length
        };

        return {
            skills: enrichedSkills,
            stats,
            recentActivity: completedTests.slice(0, 10) // Last 10 tests across all skills
        };
    }
}

export default KnowledgeService;
