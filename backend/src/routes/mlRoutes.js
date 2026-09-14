import express from 'express';

/**
 * ML routes — all seven models from mlService, mounted at /api/ml.
 * Every route requires auth; ownership checks mirror the pattern used in
 * retentionRoutes.js (a student can only query their own skills/schedule,
 * admin-only for cross-student endpoints).
 */
export default function createMLRoutes(mlService, storage, authMiddleware) {
    const router = express.Router();
    router.use(authMiddleware.authenticateToken);

    const ownsSkillOrAdmin = async (req, res, skillId) => {
        const skill = await storage.findSkillById(skillId);
        if (!skill) { res.status(404).json({ success: false, message: 'Skill not found' }); return null; }
        if (req.user.role !== 'admin' && skill.userId !== req.user.id) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
            return null;
        }
        return skill;
    };

    // 1. Personalized decay-rate curve fit
    router.get('/decay-rate/:skillId', async (req, res, next) => {
        try {
            const skill = await ownsSkillOrAdmin(req, res, req.params.skillId);
            if (!skill) return;
            res.json({ success: true, data: await mlService.fitPersonalDecayRate(req.params.skillId) });
        } catch (err) { next(err); }
    });

    // 2. Spaced-repetition (SM-2) schedule
    router.get('/schedule/:skillId', async (req, res, next) => {
        try {
            const skill = await ownsSkillOrAdmin(req, res, req.params.skillId);
            if (!skill) return;
            res.json({ success: true, data: await mlService.getSpacedRepetitionSchedule(req.params.skillId) });
        } catch (err) { next(err); }
    });

    // 3. Adaptive difficulty (IRT / Rasch) for the current user
    router.get('/adaptive-difficulty', async (req, res, next) => {
        try {
            res.json({ success: true, data: await mlService.getAdaptiveDifficulty(req.user.id) });
        } catch (err) { next(err); }
    });

    // 4. At-risk scorecard — admin only, all students
    router.get('/at-risk', async (req, res, next) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
            res.json({ success: true, data: await mlService.getAtRiskScores() });
        } catch (err) { next(err); }
    });

    // 5. Related skills via clustering
    router.get('/related-skills/:skillId', async (req, res, next) => {
        try {
            const skill = await ownsSkillOrAdmin(req, res, req.params.skillId);
            if (!skill) return;
            res.json({ success: true, data: await mlService.getRelatedSkills(req.params.skillId) });
        } catch (err) { next(err); }
    });

    // 6. Anomaly detection on a skill's test history
    router.get('/anomalies/:skillId', async (req, res, next) => {
        try {
            const skill = await ownsSkillOrAdmin(req, res, req.params.skillId);
            if (!skill) return;
            res.json({ success: true, data: await mlService.detectAnomalies(req.params.skillId) });
        } catch (err) { next(err); }
    });

    // 7. Optimal daily study-time allocation (0/1 knapsack) for the current user
    router.post('/allocate', async (req, res, next) => {
        try {
            const minutes = Number(req.body?.minutesAvailable) || 20;
            res.json({ success: true, data: await mlService.allocateStudyTime(req.user.id, minutes) });
        } catch (err) { next(err); }
    });

    return router;
}
