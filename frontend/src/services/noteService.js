import api from './api';

/**
 * Personal Notes Service
 * Handles API calls for personal note management
 */

const noteService = {
    /**
     * Get notes for a specific date
     * @param {string} date - Date in YYYY-MM-DD format (optional)
     * @returns {Promise} Response with notes array
     */
    getNotes: async (date = null) => {
        try {
            const params = date ? { date } : {};
            console.log('Fetching notes for date:', date || 'all');

            const response = await api.get('/notes', { params });
            console.log('Loaded notes:', response.data.data);

            return response.data;
        } catch (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
    },

    /**
     * Create a new note
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} content - Note content
     * @returns {Promise} Response with created note
     */
    createNote: async (date, content) => {
        try {
            console.log('Creating note:', { date, content });

            const response = await api.post('/notes', {
                date,
                content
            });

            console.log('Created note:', response.data.data);
            return response.data;
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    /**
     * Update an existing note
     * @param {string} id - Note ID
     * @param {object} updates - Object with content and/or date
     * @returns {Promise} Response with updated note
     */
    updateNote: async (id, updates) => {
        try {
            console.log('Updating note:', id, updates);

            const response = await api.put(`/notes/${id}`, updates);

            console.log('Updated note:', response.data.data);
            return response.data;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    },

    /**
     * Delete a note
     * @param {string} id - Note ID
     * @returns {Promise} Response confirming deletion
     */
    deleteNote: async (id) => {
        try {
            console.log('Deleting note:', id);

            const response = await api.delete(`/notes/${id}`);

            console.log('Deleted note:', id);
            return response.data;
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }
};

export default noteService;
