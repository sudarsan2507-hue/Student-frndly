class CalendarService {
    constructor(storage) {
        this.storage = storage;
    }

    /**
     * Get all events (tests, practice, scheduled) for a user
     */
    async getAggregatedEvents(userId) {
        // 1. Get Scheduled & Practice Events
        const calendarEvents = await this.storage.findCalendarEventsByUserId(userId);

        // 2. Get Test History
        const tests = await this.storage.findQuickTestsByUserId(userId);

        // 3. Get Skills (for names)
        const skills = await this.storage.findSkillsByUserId(userId);
        const skillMap = new Map(skills.map(s => [s.id, s]));

        // Normalize Calendar Events
        const normalizedEvents = calendarEvents.map(event => {
            const skill = skillMap.get(event.skillId);
            return {
                id: event.id,
                title: skill ? skill.name : 'Unknown Skill',
                date: event.date,
                type: event.type, // 'practice' or 'scheduled'
                skillId: event.skillId,
                status: event.status,
                color: event.type === 'scheduled' ? '#60a5fa' : '#34d399' // Blue or Green
            };
        });

        // Normalize Test Events
        const normalizedTests = tests.map(test => {
            const skill = skillMap.get(test.skillId);
            return {
                id: test.id,
                title: `${skill ? skill.name : 'Unknown'} Test`,
                date: test.completedAt || test.createdAt,
                type: 'test',
                skillId: test.skillId,
                score: test.score,
                color: '#a78bfa' // Purple
            };
        });

        // Combine and Sort
        return [...normalizedEvents, ...normalizedTests].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );
    }

    /**
     * Schedule a future practice session
     */
    async scheduleSession(userId, skillId, date) {
        const skill = await this.storage.findSkillById(skillId);
        if (!skill) throw new Error('Skill not found');
        if (skill.userId !== userId) throw new Error('Unauthorized');

        return this.storage.createCalendarEvent({
            userId,
            skillId,
            date,
            type: 'scheduled',
            status: 'pending'
        });
    }

    /**
     * Log a completed practice session
     */
    async logPracticeSession(userId, skillId) {
        return this.storage.createCalendarEvent({
            userId,
            skillId,
            date: new Date().toISOString(),
            type: 'practice',
            status: 'completed'
        });
    }

    /**
     * Delete a scheduled event
     */
    async deleteEvent(eventId, userId) {
        // First find the event to verify ownership
        // Note: storage.findCalendarEventsByUserId returns all, so we filter
        const events = await this.storage.findCalendarEventsByUserId(userId);
        const event = events.find(e => e.id === eventId);

        if (!event) throw new Error('Event not found or unauthorized');

        return this.storage.deleteCalendarEvent(eventId);
    }
}

export default CalendarService;
