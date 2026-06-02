import api from './api';

/**
 * Frontend knowledge service
 * Handles API calls for knowledge tracking
 */
const knowledgeService = {
    /**
     * Get knowledge overview (skills + test history + stats)
     * @returns {Promise<Object>}
     */
    async getOverview(options = {}) {
        const timeoutMs = Number(options.timeoutMs) || 12000;
        const response = await api.get('/knowledge/overview', {
            timeout: timeoutMs
        });
        return response.data;
    },

    // Alias for backwards compatibility
    async getKnowledgeOverview() {
        return this.getOverview();
    }
};

export default knowledgeService;

