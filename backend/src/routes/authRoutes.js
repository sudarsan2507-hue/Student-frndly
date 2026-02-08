import express from 'express';

/**
 * Authentication routes
 * Defines all authentication-related endpoints
 */
const createAuthRoutes = (authController) => {
    const router = express.Router();

    // POST /api/auth/login
    router.post('/login', authController.login);

    return router;
};

export default createAuthRoutes;
