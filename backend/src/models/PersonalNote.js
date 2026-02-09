/**
 * PersonalNote Model
 * Represents a date-specific personal note created by a user
 */

import crypto from 'crypto';

class PersonalNote {
    constructor({ id, userId, date, content, createdAt, updatedAt }) {
        this.id = id;
        this.userId = userId;
        this.date = date; // Format: YYYY-MM-DD
        this.content = content;
        this.createdAt = createdAt || new Date().toISOString();
        this.updatedAt = updatedAt || new Date().toISOString();
    }

    /**
     * Validate note data
     */
    static validate(data) {
        const errors = [];

        if (!data.userId) {
            errors.push('userId is required');
        }

        if (!data.date) {
            errors.push('date is required');
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
            errors.push('date must be in YYYY-MM-DD format');
        }

        if (!data.content || data.content.trim() === '') {
            errors.push('content is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a new PersonalNote instance from data
     */
    static create(data) {
        const validation = PersonalNote.validate(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        return new PersonalNote({
            id: data.id || crypto.randomUUID(),
            userId: data.userId,
            date: data.date,
            content: data.content.trim(),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }

    /**
     * Update note with new data
     */
    update(updates) {
        if (updates.content !== undefined) {
            this.content = updates.content.trim();
        }
        if (updates.date !== undefined) {
            this.date = updates.date;
        }
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Convert to plain object for JSON serialization
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            date: this.date,
            content: this.content,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

export default PersonalNote;
