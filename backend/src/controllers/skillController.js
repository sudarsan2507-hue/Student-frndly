/**
 * Skill controller
 * Handles HTTP requests for skill management
 */
class SkillController {
    constructor(skillService) {
        this.skillService = skillService;
    }

    /**
     * Create a new skill
     * POST /api/skills
     */
    createSkill = async (req, res, next) => {
        try {
            const userId = req.user.id; // From auth middleware
            const { name, category, initialProficiency } = req.body;

            const skill = await this.skillService.createSkill(userId, {
                name,
                category,
                initialProficiency
            });

            res.status(201).json({
                success: true,
                message: 'Skill created successfully',
                data: skill
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get all skills for the authenticated user
     * GET /api/skills
     */
    getUserSkills = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const skills = await this.skillService.getUserSkills(userId);

            res.json({
                success: true,
                data: skills
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get a single skill by ID
     * GET /api/skills/:id
     */
    getSkillById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const skill = await this.skillService.getSkillById(id);

            if (!skill) {
                return res.status(404).json({
                    success: false,
                    message: 'Skill not found'
                });
            }

            // Check if user owns this skill
            if (skill.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to view this skill'
                });
            }

            res.json({
                success: true,
                data: skill
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mark skill as practiced
     * PATCH /api/skills/:id/practice
     */
    markAsPracticed = async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const skill = await this.skillService.markAsPracticed(id, userId);

            res.json({
                success: true,
                message: 'Skill marked as practiced',
                data: skill
            });
        } catch (error) {
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };

    /**
     * Delete a skill
     * DELETE /api/skills/:id
     */
    deleteSkill = async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            await this.skillService.deleteSkill(id, userId);

            res.json({
                success: true,
                message: 'Skill deleted successfully'
            });
        } catch (error) {
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };
}

export default SkillController;

