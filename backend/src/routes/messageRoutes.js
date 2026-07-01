import express from 'express';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const createMessageRoutes = (storage, authMiddleware) => {
    const router = express.Router();
    router.use(authMiddleware.authenticateToken);

    // GET /api/messages — student sees their own messages
    router.get('/', asyncHandler(async (req, res) => {
        const msgs = storage.findMessagesForUser(req.user.id);
        res.json({ success: true, data: msgs });
    }));

    // GET /api/messages/unread-count — must come before /:id/read to avoid routing conflict
    router.get('/unread-count', asyncHandler(async (req, res) => {
        const count = storage.getUnreadCount(req.user.id);
        res.json({ success: true, data: { count } });
    }));

    // POST /api/messages/:id/read — mark a message as read (only if it belongs to this user)
    router.post('/:id/read', asyncHandler(async (req, res) => {
        const msgs = storage.findMessagesForUser(req.user.id);
        const owns = msgs.some(m => m.id === req.params.id);
        if (!owns) {
            return res.status(403).json({ success: false, message: 'Message not found or access denied' });
        }
        storage.markMessageRead(req.params.id);
        res.json({ success: true });
    }));

    return router;
};

export default createMessageRoutes;
