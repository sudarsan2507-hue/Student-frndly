import express from 'express';

/**
 * Skill routes
 * All routes require authentication
 */
const createSkillRoutes = (skillController, authMiddleware) => {
    const router = express.Router();

    // All skill routes require authentication
    router.use(authMiddleware.authenticateToken);

    // POST /api/skills - Create a new skill
    router.post('/', skillController.createSkill);

    // GET /api/skills - Get all user skills
    router.get('/', skillController.getUserSkills);

    // GET /api/skills/:id - Get a specific skill
    router.get('/:id', skillController.getSkillById);

    // PATCH /api/skills/:id/practice - Mark skill as practiced
    router.patch('/:id/practice', skillController.markAsPracticed);

    // DELETE /api/skills/:id - Delete a skill
    router.delete('/:id', skillController.deleteSkill);

    return router;
};

export default createSkillRoutes;

