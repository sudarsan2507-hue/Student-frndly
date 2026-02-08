import api from './api';

/**
 * Frontend calendar service
 */
const calendarService = {
    /**
     * Get all calendar events
     * @returns {Promise<Array>}
     */
    async getEvents() {
        const response = await api.get('/calendar');
        return response.data;
    },

    /**
     * Schedule a session
     * @param {Object} data - { skillId, date }
     * @returns {Promise<Object>}
     */
    async scheduleSession(skillId, date) {
        const response = await api.post('/calendar/schedule', { skillId, date });
        return response.data;
    },

    /**
     * Delete an event
     * @param {string} id
     * @returns {Promise<Object>}
     */
    async deleteEvent(id) {
        const response = await api.delete(`/calendar/${id}`);
        return response.data;
    }
};

export default calendarService;
