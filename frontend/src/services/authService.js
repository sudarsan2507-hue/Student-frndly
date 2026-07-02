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

    async googleLogin(credential, accountType = 'individual') {
        const response = await api.post('/auth/google', { credential, accountType });

        if (response.data.success) {
            const { token, user } = response.data.data;
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));
            return { token, user };
        }

        throw new Error(response.data.message || 'Google login failed');
    },

    async logout() {
        try {
            const token = this.getToken();
            if (token) await api.post('/auth/logout');
        } catch { /* best-effort server revocation */ }
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

    /** Read role from the JWT payload — cannot be tampered without the server secret */
    getTokenRole() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role || null;
        } catch {
            return null;
        }
    },

    isAuthenticated() {
        return !!this.getToken();
    }
};

export default authService;
