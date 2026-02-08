/**
 * QuickTest controller
 * Handles HTTP requests for quick test generation and evaluation
 */
class QuickTestController {
    constructor(quickTestService) {
        this.quickTestService = quickTestService;
    }

    /**
     * Generate a quick test for a skill
     * POST /api/quick-test/:skillId/generate
     */
    generateTest = async (req, res, next) => {
        try {
            const { skillId } = req.params;
            const userId = req.user.id; // From auth middleware

            const test = await this.quickTestService.generateTest(skillId, userId);

            res.status(201).json({
                success: true,
                message: 'Test generated successfully',
                data: test
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };

    /**
     * Submit test answers and get results
     * POST /api/quick-test/submit
     */
    submitTest = async (req, res, next) => {
        try {
            const { testId, answers, totalTime } = req.body;
            const userId = req.user.id;

            if (!testId) {
                return res.status(400).json({
                    success: false,
                    message: 'Test ID is required'
                });
            }

            if (!answers || typeof answers !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Answers are required'
                });
            }

            if (totalTime === undefined || totalTime < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid total time is required'
                });
            }

            const result = await this.quickTestService.submitTest(testId, userId, answers, totalTime);

            res.json({
                success: true,
                message: 'Test submitted successfully',
                data: result
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('already completed')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };

    /**
     * Get test history for a skill
     * GET /api/quick-test/:skillId/history
     */
    getTestHistory = async (req, res, next) => {
        try {
            const { skillId } = req.params;
            const userId = req.user.id;

            const tests = await this.quickTestService.getTestHistory(skillId, userId);

            res.json({
                success: true,
                data: tests
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    };
}

export default QuickTestController;
