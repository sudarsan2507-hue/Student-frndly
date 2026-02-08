import express from 'express';

/**
 * Knowledge routes
 * All routes require authentication
 */
const createKnowledgeRoutes = (knowledgeController, authMiddleware) => {
    const router = express.Router();

    // All knowledge routes require authentication
    router.use(authMiddleware.authenticateToken);

    // GET /api/knowledge/overview - Get knowledge overview
    router.get('/overview', knowledgeController.getOverview);

    return router;
};

export default createKnowledgeRoutes;
