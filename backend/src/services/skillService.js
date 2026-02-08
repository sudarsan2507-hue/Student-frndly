import Skill from '../models/Skill.js';

/**
 * Skill service
 * Business logic for skill management and decay calculations
 */
class SkillService {
    constructor(storage) {
        this.storage = storage;
    }

    /**
   * Calculate current skill strength based on exponential decay (half-life model)
   * Formula: strength = initialProficiency × (0.5)^((days / halfLife) × adaptiveMultiplier)
   * 
   * @param {Object} skill - Skill object with decay parameters
   * @returns {number} Current strength (0-100)
   */
    calculateCurrentStrength(skill) {
        const daysSinceLastPractice = this.getDaysSinceLastPractice(skill.lastPracticedAt);

        // Exponential decay using half-life model
        // strength = initial × (1/2)^(time/halfLife × adaptive)
        const halfLife = skill.halfLife || 7; // Default 7 days
        const adaptiveMultiplier = skill.adaptiveDecayMultiplier || 1.0;

        // Calculate decay exponent
        const exponent = (daysSinceLastPractice / halfLife) * adaptiveMultiplier;

        // Apply exponential decay
        const decayFactor = Math.pow(0.5, exponent);
        const currentStrength = skill.initialProficiency * decayFactor;

        // Ensure minimum of 10%
        return Math.max(10, Math.round(currentStrength));
    }

    /**
     * Calculate days since last practice
     * @param {string} lastPracticedAt - ISO date string
     * @returns {number} Days elapsed
     */
    getDaysSinceLastPractice(lastPracticedAt) {
        const now = new Date();
        const lastPracticed = new Date(lastPracticedAt);
        const diffMs = now - lastPracticed;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return Math.max(0, diffDays);
    }

    /**
     * Create a new skill for a user
     * @param {string} userId - User ID
     * @param {Object} skillData - Skill data
     * @returns {Promise<Object>} Created skill with current strength
     */
    async createSkill(userId, skillData) {
        const validation = Skill.validate({ ...skillData, userId });

        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const skill = new Skill({
            ...skillData,
            userId,
            lastPracticedAt: new Date().toISOString() // Set to now when created
        });

        const savedSkill = await this.storage.createSkill(skill.toJSON());

        return {
            ...savedSkill,
            currentStrength: this.calculateCurrentStrength(savedSkill),
            daysSinceLastPractice: this.getDaysSinceLastPractice(savedSkill.lastPracticedAt)
        };
    }

    /**
     * Get all skills for a user with calculated current strength
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of skills with current strength
     */
    async getUserSkills(userId) {
        const skills = await this.storage.findSkillsByUserId(userId);

        return skills.map(skill => ({
            ...skill,
            currentStrength: this.calculateCurrentStrength(skill),
            daysSinceLastPractice: this.getDaysSinceLastPractice(skill.lastPracticedAt)
        }));
    }

    /**
     * Get a single skill by ID
     * @param {string} skillId - Skill ID
     * @returns {Promise<Object|null>} Skill with current strength
     */
    async getSkillById(skillId) {
        const skill = await this.storage.findSkillById(skillId);

        if (!skill) {
            return null;
        }

        return {
            ...skill,
            currentStrength: this.calculateCurrentStrength(skill),
            daysSinceLastPractice: this.getDaysSinceLastPractice(skill.lastPracticedAt)
        };
    }

    /**
     * Mark skill as practiced (updates lastPracticedAt to now)
     * @param {string} skillId - Skill ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Promise<Object>} Updated skill
     */
    async markAsPracticed(skillId, userId) {
        const skill = await this.storage.findSkillById(skillId);

        if (!skill) {
            throw new Error('Skill not found');
        }

        if (skill.userId !== userId) {
            throw new Error('Unauthorized: You can only update your own skills');
        }

        const updatedSkill = await this.storage.markSkillAsPracticed(skillId);

        // Log practice to calendar
        await this.storage.createCalendarEvent({
            userId,
            skillId,
            date: new Date().toISOString(),
            type: 'practice',
            status: 'completed'
        });

        return {
            ...updatedSkill,
            currentStrength: this.calculateCurrentStrength(updatedSkill),
            daysSinceLastPractice: this.getDaysSinceLastPractice(updatedSkill.lastPracticedAt)
        };
    }

    /**
     * Delete a skill
     * @param {string} skillId - Skill ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Promise<boolean>} Success status
     */
    async deleteSkill(skillId, userId) {
        const skill = await this.storage.findSkillById(skillId);

        if (!skill) {
            throw new Error('Skill not found');
        }

        if (skill.userId !== userId) {
            throw new Error('Unauthorized: You can only delete your own skills');
        }

        return await this.storage.deleteSkill(skillId);
    }
}

export default SkillService;

