/**
 * Retention Routes
 * Endpoints for predicting skill retention.
 */

import express from 'express';
import RetentionService from '../services/retentionService.js';
import authMiddleware from '../middleware/authMiddleware.js';

export function createRetentionRoutes(dataAccess) {
    const router = express.Router();
    const retentionService = new RetentionService(dataAccess);

    /**
     * POST /api/retention/predict
     * Predict retention for a single skill.
     * Body: { skillId }
     */
    router.post('/predict', authMiddleware, async (req, res) => {
        try {
            const { skillId } = req.body;
            if (!skillId) {
                return res.status(400).json({ error: 'skillId is required' });
            }

            const prediction = await retentionService.getRetentionForSkill(skillId);
            res.json(prediction);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/retention/user/:userId
     * Get retention predictions for all skills of a user.
     */
    router.get('/user/:userId', authMiddleware, async (req, res) => {
        try {
            const { userId } = req.params;
            const prediction = await retentionService.getUserRetention(userId);
            res.json(prediction);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/retention/threshold
     * Estimate when a skill will fall below a retention threshold.
     * Body: { skillId, threshold }
     */
    router.post('/threshold', authMiddleware, async (req, res) => {
        try {
            const { skillId, threshold = 50 } = req.body;
            if (!skillId) {
                return res.status(400).json({ error: 'skillId is required' });
            }

            const skill = await dataAccess.findSkillById(skillId);
            if (!skill) {
                return res.status(404).json({ error: 'Skill not found' });
            }

            const estimate = retentionService.estimateThresholdDate(skill, threshold);
            res.json(estimate);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/retention/health
     * Health check for retention service.
     */
    router.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'retention', timestamp: new Date().toISOString() });
    });

    return router;
}
