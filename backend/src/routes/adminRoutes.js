import express from 'express';

const createAdminRoutes = (adminController, authMiddleware) => {
    const router = express.Router();

    router.use(authMiddleware.authenticateToken);

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
    router.get('/student/:studentId', adminController.getStudentDetail);
    router.post('/message/:studentId', adminController.sendMessage);
    router.get('/messages/:studentId', adminController.getStudentMessages);

    return router;
};

export default createAdminRoutes;
