import express from 'express';

/**
 * Authentication routes
 */
const createAuthRoutes = (authController) => {
    const router = express.Router();

    // POST /api/auth/login
    router.post('/login', authController.login);

    // POST /api/auth/register
    router.post('/register', authController.register);

    return router;
};

export default createAuthRoutes;
