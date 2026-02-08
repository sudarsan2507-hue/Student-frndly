import api from './api';

/**
 * Frontend skill service
 * Handles API calls for skill management
 */
const skillService = {
    /**
     * Create a new skill
     * @param {Object} skillData - {name, category, initialProficiency}
     * @returns {Promise<Object>}
     */
    async createSkill(skillData) {
        const response = await api.post('/skills', skillData);
        return response.data;
    },

    /**
     * Get all user skills
     * @returns {Promise<Array>}
     */
    async getUserSkills() {
        const response = await api.get('/skills');
        return response.data;
    },

    /**
     * Get a single skill
     * @param {string} skillId
     * @returns {Promise<Object>}
     */
    async getSkillById(skillId) {
        const response = await api.get(`/skills/${skillId}`);
        return response.data;
    },

    /**
     * Mark skill as practiced
     * @param {string} skillId
     * @returns {Promise<Object>}
     */
    async markAsPracticed(skillId) {
        const response = await api.patch(`/skills/${skillId}/practice`);
        return response.data;
    },

    /**
     * Delete a skill
     * @param {string} skillId
     * @returns {Promise<Object>}
     */
    async deleteSkill(skillId) {
        const response = await api.delete(`/skills/${skillId}`);
        return response.data;
    }
};

export default skillService;
