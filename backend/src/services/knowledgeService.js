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
     * Get knowledge overview for a user.
     * Always returns a valid structured object even with no data.
     * @param {string} userId - User ID
     * @returns {Promise<Object>} { skills, stats, recentActivity }
     */
    async getKnowledgeOverview(userId) {
        // Get all user skills with calculated strength
        const skills = await this.skillService.getUserSkills(userId) || [];

        // Get all user test history
        const allTests = await this.storage.findQuickTestsByUserId(userId) || [];
        const completedTests = allTests
            .filter(t => t && t.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        // Organize tests by skill (keep last 5 per skill)
        const testsBySkill = {};
        completedTests.forEach(test => {
            if (!test || !test.skillId) return;
            if (!testsBySkill[test.skillId]) testsBySkill[test.skillId] = [];
            if (testsBySkill[test.skillId].length < 5) {
                testsBySkill[test.skillId].push(test);
            }
        });

        const enrichedSkills = skills.map(skill => {
            if (!skill) return null;

            const tests = testsBySkill[skill.id] || [];

            // FIX: use test.accuracy (0-100 percentage), NOT test.score (raw correct count e.g. 3)
            const avgAccuracy = tests.length > 0
                ? tests.reduce((sum, t) => sum + (Number(t.accuracy) || 0), 0) / tests.length
                : 0;

            let retentionStatus = 'Stable';
            let decayExplanation = 'Regular practice is maintaining this skill.';
            let statusColor = '#10b981'; // Green

            const decayMultiplier = Number(skill.adaptiveDecayMultiplier) || 1.0;
            const halfLife = Number(skill.halfLife) || 7;
            const daysSince = Number(skill.daysSinceLastPractice) || 0;

            // 1. Performance factor
            if (decayMultiplier < 0.8) {
                decayExplanation = 'Broad retention. Decay slowed by excellent test performance.';
                retentionStatus = 'Strong';
                statusColor = '#10b981';
            } else if (decayMultiplier > 1.2) {
                decayExplanation = 'Retention struggling. Decay accelerated by recent low scores.';
                retentionStatus = 'Critical';
                statusColor = '#ef4444';
            }

            // 2. Inactivity factor
            if (daysSince > halfLife * 2) {
                retentionStatus = 'Fading';
                decayExplanation = 'Fading due to inactivity. Has not been practiced recently.';
                statusColor = '#f59e0b';
            } else if (daysSince > halfLife && retentionStatus === 'Strong') {
                retentionStatus = 'Stable';
                decayExplanation = 'Good retention, but starting to fade due to recent inactivity.';
                statusColor = '#10b981';
            }

            return {
                ...skill,
                recentTests: tests,
                avgTestAccuracy: Math.round(avgAccuracy),
                retentionStatus,
                decayExplanation,
                statusColor,
                totalTests: tests.length
            };
        }).filter(Boolean);

        // Safe aggregate stats
        const stats = {
            totalSkills: enrichedSkills.length,
            totalTests: completedTests.length,
            averageStrength: enrichedSkills.length > 0
                ? Math.round(
                    enrichedSkills.reduce((sum, s) => sum + (Number(s.currentStrength) || 0), 0)
                    / enrichedSkills.length
                )
                : 0,
            skillsNeedingAttention: enrichedSkills.filter(s => (Number(s.currentStrength) || 0) < 60).length,
            skillsStrong: enrichedSkills.filter(s => (Number(s.currentStrength) || 0) >= 70).length
        };

        return {
            skills: enrichedSkills,
            stats,
            recentActivity: completedTests.slice(0, 10)
        };
    }
}

export default KnowledgeService;
