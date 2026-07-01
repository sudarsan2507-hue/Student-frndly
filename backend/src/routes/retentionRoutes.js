import express from 'express';
import RetentionService from '../services/retentionService.js';
import logger from '../utils/logger.js';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;

const createSimpleRateLimiter = ({ windowMs = RATE_WINDOW_MS, maxRequests = RATE_MAX_REQUESTS } = {}) => {
    const hits = new Map();

    // Prune expired entries periodically to prevent unbounded growth
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (now > entry.resetAt) hits.delete(key);
        }
    }, windowMs).unref();

    return (req, res, next) => {
        const key = `${req.user?.id || req.ip}:${req.path}`;
        const now = Date.now();

        const entry = hits.get(key);
        if (!entry || now > entry.resetAt) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (entry.count >= maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({ error: 'Too many retention requests. Please retry shortly.' });
        }

        entry.count += 1;
        hits.set(key, entry);
        return next();
    };
};

const createRetentionAuditLogger = () => (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info('Retention request', {
            method: req.method,
            url: req.originalUrl,
            userId: req.user?.id || 'anonymous',
            status: res.statusCode,
            durationMs: Date.now() - start
        });
    });
    next();
};

export function createRetentionRoutes(dataAccess, authMiddleware) {
    const router = express.Router();
    const retentionService = new RetentionService(dataAccess);
    const rateLimiter = createSimpleRateLimiter();

    router.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'retention', timestamp: new Date().toISOString() });
    });

    router.use(authMiddleware.authenticateToken);
    router.use(createRetentionAuditLogger());

    router.post('/predict', rateLimiter, async (req, res) => {
        try {
            const { skillId } = req.body;
            if (!skillId) return res.status(400).json({ error: 'skillId is required' });

            const skill = await dataAccess.findSkillById(skillId);
            if (!skill) return res.status(404).json({ error: 'Skill not found' });

            if (req.user.role !== 'admin' && skill.userId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized access to this skill' });
            }

            const prediction = await retentionService.getRetentionForSkill(skillId);
            res.json(prediction);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/user/:userId', rateLimiter, async (req, res) => {
        try {
            const { userId } = req.params;

            if (req.user.role !== 'admin' && userId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized access to this user data' });
            }

            const prediction = await retentionService.getUserRetention(userId);
            res.json(prediction);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/threshold', rateLimiter, async (req, res) => {
        try {
            const { skillId, threshold = 50 } = req.body;
            if (!skillId) return res.status(400).json({ error: 'skillId is required' });

            const thresholdValue = Number(threshold);
            if (Number.isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 100) {
                return res.status(400).json({ error: 'threshold must be a number between 0 and 100' });
            }

            const skill = await dataAccess.findSkillById(skillId);
            if (!skill) return res.status(404).json({ error: 'Skill not found' });

            if (req.user.role !== 'admin' && skill.userId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized access to this skill' });
            }

            const estimate = retentionService.estimateThresholdDate(skill, thresholdValue);
            res.json(estimate);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
