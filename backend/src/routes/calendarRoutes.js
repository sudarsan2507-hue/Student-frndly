import express from 'express';

const createCalendarRouter = (calendarController, authMiddleware) => {
    const router = express.Router();

    // All routes required authentication
    router.use(authMiddleware.authenticateToken);

    router.get('/', calendarController.getEvents);
    router.post('/schedule', calendarController.scheduleSession);
    router.delete('/:id', calendarController.deleteEvent);

    return router;
};

export default createCalendarRouter;
