/**
 * DB-agnostic data access layer interface
 * All storage implementations (in-memory, JSON, MySQL) must implement these methods
 */

class DataAccess {
    // User operations
    async findUserByEmail(email) {
        throw new Error('Method not implemented');
    }

    async findUserById(id) {
        throw new Error('Method not implemented');
    }

    async getAllUsers() {
        throw new Error('Method not implemented');
    }

    async createUser(userData) {
        throw new Error('Method not implemented');
    }

    async updateUser(id, userData) {
        throw new Error('Method not implemented');
    }

    async deleteUser(id) {
        throw new Error('Method not implemented');
    }

    // Initialize storage (load data, connect to DB, etc.)
    async initialize() {
        throw new Error('Method not implemented');
    }

    // Skill operations
    async createSkill(skillData) {
        throw new Error('Method not implemented');
    }

    async findSkillById(id) {
        throw new Error('Method not implemented');
    }

    async findSkillsByUserId(userId) {
        throw new Error('Method not implemented');
    }

    async updateSkill(id, skillData) {
        throw new Error('Method not implemented');
    }

    async deleteSkill(id) {
        throw new Error('Method not implemented');
    }

    async markSkillAsPracticed(id) {
        throw new Error('Method not implemented');
    }

    // Quick Test operations
    async createQuickTest(testData) {
        throw new Error('Method not implemented');
    }

    async findQuickTestById(id) {
        throw new Error('Method not implemented');
    }

    async findQuickTestsBySkillId(skillId) {
        throw new Error('Method not implemented');
    }

    async findQuickTestsByUserId(userId) {
        throw new Error('Method not implemented');
    }

    async updateQuickTest(id, testData) {
        throw new Error('Method not implemented');
    }

    async deleteQuickTest(id) {
        throw new Error('Method not implemented');
    }
}

export default DataAccess;
