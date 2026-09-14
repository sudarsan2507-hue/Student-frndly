import axios from 'axios';

// Local dev: relative '/api', proxied to localhost:3000 by Vite (see
// vite.config.js) — no env var needed. Production (Vercel): the static
// frontend has no backend of its own, so VITE_API_URL must point at the
// deployed backend's origin (e.g. https://student-frndly-backend.onrender.com).
// Falls back to '/api' if unset, which is only correct when a backend is
// actually reachable at that same origin.
const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
    : '/api';

/**
 * Axios instance with authentication interceptors
 */
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Request interceptor - Attach JWT token to all requests
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response interceptor - Handle 401 errors
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, clear auth data
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');

            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
