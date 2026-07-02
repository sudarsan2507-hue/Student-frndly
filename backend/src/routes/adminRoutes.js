import express from 'express';

const createAdminRateLimiter = () => {
    const hits = new Map();
    const WINDOW_MS = 15 * 60 * 1000;
    const MAX_REQUESTS = 60;

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

const createAdminRoutes = (adminController, authMiddleware) => {
    const router = express.Router();
    const rateLimiter = createAdminRateLimiter();

    router.use(authMiddleware.authenticateToken);
    router.use(rateLimiter);

    // Admin-only guard
    router.use((req, res, next) => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    });

    router.get('/pending', adminController.getPendingStudents);
    router.post('/approve/:userId', adminController.approveStudent);
    router.post('/reject/:userId', adminController.rejectStudent);
    router.get('/analytics', adminController.getAnalytics);
    router.get('/audit-log', adminController.getAuditLog);
    router.get('/student/:studentId', adminController.getStudentDetail);
    router.post('/message/:studentId', adminController.sendMessage);
    router.get('/messages/:studentId', adminController.getStudentMessages);

    return router;
};

export default createAdminRoutes;
