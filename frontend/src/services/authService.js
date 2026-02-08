import api from './api';

/**
 * Frontend authentication service
 * Handles login, logout, and token management
 */
const authService = {
    /**
     * Login user with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} User data and token
     */
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });

        if (response.data.success) {
            const { token, user } = response.data.data;

            // Store token and user data in localStorage
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));

            return { token, user };
        }

        throw new Error(response.data.message || 'Login failed');
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    /**
     * Get stored token
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('authToken');
    },

    /**
     * Get stored user data
     * @returns {Object|null}
     */
    getUser() {
        const userJson = localStorage.getItem('user');
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getToken();
    }
};

export default authService;
