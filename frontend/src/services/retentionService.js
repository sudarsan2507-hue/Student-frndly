import api from './api';

const retentionService = {
    /**
     * Predict retention for a single skill
     * @param {string} skillId
     */
    async predictRetention(skillId) {
        const response = await api.post('/retention/predict', { skillId });
        return response.data;
    },

    /**
     * Get retention predictions for a user
     * @param {string} userId
     */
    async getUserRetention(userId) {
        const response = await api.get(`/retention/user/${userId}`);
        return response.data;
    },

    /**
     * Estimate when a skill falls below a threshold
     * @param {string} skillId
     * @param {number} threshold
     */
    async estimateThresholdDate(skillId, threshold = 50) {
        const response = await api.post('/retention/threshold', { skillId, threshold });
        return response.data;
    }
};

export default retentionService;
