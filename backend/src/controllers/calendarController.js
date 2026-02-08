class CalendarController {
    constructor(calendarService) {
        this.calendarService = calendarService;
    }

    /**
     * Get all calendar events
     * GET /api/calendar
     */
    getEvents = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const events = await this.calendarService.getAggregatedEvents(userId);
            res.json({ success: true, data: events });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Schedule a session
     * POST /api/calendar/schedule
     */
    scheduleSession = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { skillId, date } = req.body;

            if (!skillId || !date) {
                return res.status(400).json({
                    success: false,
                    message: 'Skill ID and date are required'
                });
            }

            const event = await this.calendarService.scheduleSession(userId, skillId, date);
            res.status(201).json({ success: true, data: event });
        } catch (error) {
            if (error.message === 'Skill not found') return res.status(404).json({ success: false, message: error.message });
            if (error.message === 'Unauthorized') return res.status(403).json({ success: false, message: error.message });
            next(error);
        }
    };

    /**
     * Delete an event
     * DELETE /api/calendar/:id
     */
    deleteEvent = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            await this.calendarService.deleteEvent(id, userId);
            res.json({ success: true, message: 'Event deleted' });
        } catch (error) {
            if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
            next(error);
        }
    };
}

export default CalendarController;
