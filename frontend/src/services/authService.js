import api from './api';

const authService = {
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });

        if (response.data.success) {
            const { token, user } = response.data.data;
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));
            return { token, user };
        }

        throw new Error(response.data.message || 'Login failed');
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    getToken() {
        return localStorage.getItem('authToken');
    },

    getUser() {
        try {
            const userJson = localStorage.getItem('user');
            return userJson ? JSON.parse(userJson) : null;
        } catch {
            localStorage.removeItem('user');
            return null;
        }
    },

    isAuthenticated() {
        return !!this.getToken();
    }
};

export default authService;
