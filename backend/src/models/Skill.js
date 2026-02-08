/**
 * Skill model
 * Represents a skill that a user is tracking
 */
class Skill {
    constructor(data) {
        this.id = data.id || null;
        this.userId = data.userId; // Owner of this skill
        this.name = data.name;
        this.category = data.category || 'General';
        this.initialProficiency = data.initialProficiency || 50; // 0-100
        this.lastPracticedAt = data.lastPracticedAt || new Date().toISOString();

        // Decay model parameters
        this.halfLife = data.halfLife || 7; // Days until strength drops to 50%
        this.baseDecayRate = data.baseDecayRate || 0.1; // Base decay constant
        this.adaptiveDecayMultiplier = data.adaptiveDecayMultiplier || 1.0; // Adjusted by test performance

        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Validate skill data
     */
    static validate(data) {
        const errors = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push('Skill name is required');
        }

        if (!data.userId) {
            errors.push('User ID is required');
        }

        if (data.initialProficiency !== undefined) {
            const proficiency = Number(data.initialProficiency);
            if (isNaN(proficiency) || proficiency < 0 || proficiency > 100) {
                errors.push('Initial proficiency must be between 0 and 100');
            }
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
            userId: this.userId,
            name: this.name,
            category: this.category,
            initialProficiency: this.initialProficiency,
            lastPracticedAt: this.lastPracticedAt,
            halfLife: this.halfLife,
            baseDecayRate: this.baseDecayRate,
            adaptiveDecayMultiplier: this.adaptiveDecayMultiplier,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

export default Skill;
