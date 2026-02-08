import api from './api';

/**
 * Frontend quick test service
 * Handles API calls for quick tests
 */
const quickTestService = {
    /**
     * Generate a quick test for a skill
     * @param {string} skillId
     * @returns {Promise<Object>}
     */
    async generateTest(skillId) {
        const response = await api.post(`/quick-test/${skillId}/generate`);
        return response.data;
    },

    /**
     * Submit test answers
     * @param {string} testId
     * @param {Object} answers - {questionId: answerIndex}
     * @param {number} totalTime - Total time in seconds
     * @returns {Promise<Object>}
     */
    async submitTest(testId, answers, totalTime) {
        const response = await api.post('/quick-test/submit', {
            testId,
            answers,
            totalTime
        });
        return response.data;
    },

    /**
     * Get test history for a skill
     * @param {string} skillId
     * @returns {Promise<Array>}
     */
    async getTestHistory(skillId) {
        const response = await api.get(`/quick-test/${skillId}/history`);
        return response.data;
    }
};

export default quickTestService;
