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
    async getKnowledgeOverview() {
        const response = await api.get('/knowledge/overview');
        return response.data;
    }
};

export default knowledgeService;
