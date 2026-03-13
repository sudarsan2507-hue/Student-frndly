import express from 'express';

const createMessageRoutes = (storage, authMiddleware) => {
    const router = express.Router();
    router.use(authMiddleware.authenticateToken);

    // GET /api/messages — student sees their own messages
    router.get('/', (req, res) => {
        const msgs = storage.findMessagesForUser(req.user.id);
        res.json({ success: true, data: msgs });
    });

    // POST /api/messages/:id/read — mark a message as read
    router.post('/:id/read', (req, res) => {
        storage.markMessageRead(req.params.id);
        res.json({ success: true });
    });

    // GET /api/messages/unread-count
    router.get('/unread-count', (req, res) => {
        const count = storage.getUnreadCount(req.user.id);
        res.json({ success: true, data: { count } });
    });

    return router;
};

export default createMessageRoutes;
