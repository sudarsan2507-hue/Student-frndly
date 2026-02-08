/**
 * Knowledge controller
 * Handles HTTP requests for knowledge tracking and analysis
 */
class KnowledgeController {
    constructor(knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    /**
     * Get knowledge overview for authenticated user
     * GET /api/knowledge/overview
     */
    getOverview = async (req, res, next) => {
        try {
            const userId = req.user.id; // From auth middleware

            const overview = await this.knowledgeService.getKnowledgeOverview(userId);

            res.json({
                success: true,
                data: overview
            });
        } catch (error) {
            next(error);
        }
    };
}

export default KnowledgeController;
