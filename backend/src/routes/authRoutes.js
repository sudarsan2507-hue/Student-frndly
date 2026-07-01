import express from 'express';

const createAuthRateLimiter = () => {
    const hits = new Map();
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    const MAX_REQUESTS = 20;

    // Prune expired entries every 10 minutes to prevent memory leak
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (now > entry.resetAt) hits.delete(key);
        }
    }, 10 * 60 * 1000).unref();

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const entry = hits.get(key);

        if (!entry || now > entry.resetAt) {
            hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
            return next();
        }

        if (entry.count >= MAX_REQUESTS) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
        }

        entry.count += 1;
        hits.set(key, entry);
        return next();
    };
};

const createAuthRoutes = (authController) => {
    const router = express.Router();
    const rateLimiter = createAuthRateLimiter();

    router.post('/login', rateLimiter, authController.login);
    router.post('/register', rateLimiter, authController.register);

    return router;
};

export default createAuthRoutes;
