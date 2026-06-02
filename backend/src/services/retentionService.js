/**
 * Retention Service
 * Predicts skill retention/strength using exponential decay model.
 *
 * Formula: retention = initialProficiency * 0.5^(daysSincePractice / halfLife) * adaptiveMultiplier
 * This is based on the Ebbinghaus forgetting curve.
 */

export default class RetentionService {
    constructor(dataAccess) {
        this.dataAccess = dataAccess;
    }

    /**
     * Predict retention strength for a skill.
     *
     * @param {Object} skill - Skill object with:
     *   - initialProficiency (0-100)
     *   - lastPracticedAt (ISO date string)
     *   - halfLife (days, default 7)
     *   - baseDecayRate (0-1, unused in deterministic, for future use)
     *   - adaptiveDecayMultiplier (factor to adjust decay, default 1.0)
     * @returns {Object} { retention: 0-100, daysUnpracticed: number, explanation: string }
     */
    predictRetention(skill) {
        if (!skill) {
            return {
                retention: 0,
                daysUnpracticed: null,
                explanation: 'Skill not found.',
                error: true
            };
        }

        const {
            initialProficiency = 50,
            lastPracticedAt,
            halfLife = 7,
            adaptiveDecayMultiplier = 1.0
        } = skill;

        // Calculate days since last practiced
        const lastPracticeDate = new Date(lastPracticedAt);
        const now = new Date();
        const daysUnpracticed = Math.max(0, (now - lastPracticeDate) / (1000 * 60 * 60 * 24));

        // Exponential decay: retention = initial * 0.5^(days / halfLife) * adaptiveMultiplier
        const decayFactor = Math.pow(0.5, daysUnpracticed / halfLife);
        let retention = initialProficiency * decayFactor * adaptiveDecayMultiplier;

        // Clamp to 0-100 range
        retention = Math.max(0, Math.min(100, retention));

        return {
            retention: Math.round(retention * 10) / 10, // Round to 1 decimal place
            daysUnpracticed: Math.round(daysUnpracticed * 10) / 10,
            halfLife,
            adaptiveMultiplier: adaptiveDecayMultiplier,
            decayFactor: Math.round(decayFactor * 1000) / 1000,
            explanation: `Retention = ${Math.round(initialProficiency)} * 0.5^(${Math.round(daysUnpracticed * 10) / 10} / ${halfLife}) * ${adaptiveDecayMultiplier} = ${Math.round(retention)}`
        };
    }

    /**
     * Predict retention for multiple skills.
     *
     * @param {Array} skills - Array of skill objects
     * @returns {Array} Array of retention predictions
     */
    predictRetentionBatch(skills) {
        if (!Array.isArray(skills)) return [];
        return skills.map(skill => ({
            skillId: skill.id,
            skillName: skill.name,
            ...this.predictRetention(skill)
        }));
    }

    /**
     * Get retention prediction for a skill by ID.
     *
     * @param {string} skillId - Skill ID
     * @returns {Promise<Object>} Retention prediction
     */
    async getRetentionForSkill(skillId) {
        const skill = await this.dataAccess.findSkillById(skillId);
        if (!skill) {
            return { error: 'Skill not found', skillId };
        }
        return this.predictRetention(skill);
    }

    /**
     * Get retention predictions for all skills of a user.
     *
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User retention summary
     */
    async getUserRetention(userId) {
        const skills = await this.dataAccess.findSkillsByUserId(userId);
        if (!skills || skills.length === 0) {
            return {
                userId,
                totalSkills: 0,
                skills: [],
                averageRetention: 0,
                summary: 'No skills found for this user.'
            };
        }

        const predictions = this.predictRetentionBatch(skills);
        const avgRetention = predictions.length > 0
            ? Math.round(predictions.reduce((sum, p) => sum + (p.retention || 0), 0) / predictions.length * 10) / 10
            : 0;

        return {
            userId,
            totalSkills: predictions.length,
            skills: predictions,
            averageRetention: avgRetention,
            summary: `Average retention across ${predictions.length} skill(s): ${avgRetention}%`
        };
    }

    /**
     * Estimate when a skill will fall below a retention threshold.
     *
     * @param {Object} skill - Skill object
     * @param {number} threshold - Retention threshold (0-100, default 50)
     * @returns {Object} { daysUntilThreshold, estimatedDate, willReachThreshold }
     */
    estimateThresholdDate(skill, threshold = 50) {
        if (!skill || threshold < 0 || threshold > 100) {
            return { error: 'Invalid input' };
        }

        const { initialProficiency = 50, halfLife = 7, adaptiveDecayMultiplier = 1.0 } = skill;
        const adjusted = initialProficiency * adaptiveDecayMultiplier;

        // Solve: threshold = adjusted * 0.5^(days / halfLife)
        // => 0.5^(days / halfLife) = threshold / adjusted
        // => days / halfLife = log2(adjusted / threshold)
        // => days = halfLife * log2(adjusted / threshold)

        if (adjusted <= threshold) {
            return {
                daysUntilThreshold: 0,
                estimatedDate: new Date().toISOString(),
                willReachThreshold: true,
                message: 'Skill is already at or below threshold.'
            };
        }

        const daysUntilThreshold = halfLife * Math.log2(adjusted / threshold);
        const estimatedDate = new Date(Date.now() + daysUntilThreshold * 24 * 60 * 60 * 1000);

        return {
            daysUntilThreshold: Math.round(daysUntilThreshold * 10) / 10,
            estimatedDate: estimatedDate.toISOString(),
            willReachThreshold: true
        };
    }
}
