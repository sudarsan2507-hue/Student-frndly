import express from 'express';

/**
 * QuickTest routes
 * All routes require authentication
 */
const createQuickTestRoutes = (quickTestController, authMiddleware) => {
    const router = express.Router();

    // All test routes require authentication
    router.use(authMiddleware.authenticateToken);

    // POST /api/quick-test/:skillId/generate - Generate a quick test
    router.post('/:skillId/generate', quickTestController.generateTest);

    // POST /api/quick-test/submit - Submit test answers
    router.post('/submit', quickTestController.submitTest);

    // GET /api/quick-test/:skillId/history - Get test history for a skill
    router.get('/:skillId/history', quickTestController.getTestHistory);

    return router;
};

export default createQuickTestRoutes;
