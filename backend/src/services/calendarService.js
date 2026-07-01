class CalendarService {
    constructor(storage) {
        this.storage = storage;
    }

    async getAggregatedEvents(userId) {
        const calendarEvents = await this.storage.findCalendarEventsByUserId(userId);
        const tests = await this.storage.findQuickTestsByUserId(userId);
        const skills = await this.storage.findSkillsByUserId(userId);
        const skillMap = new Map(skills.map(s => [s.id, s]));

        const normalizedEvents = calendarEvents.map(event => {
            const skill = skillMap.get(event.skillId);
            return {
                id: event.id,
                title: skill ? skill.name : 'Unknown Skill',
                date: event.date,
                type: event.type,
                skillId: event.skillId,
                status: event.status,
                color: event.type === 'scheduled' ? '#60a5fa' : '#34d399'
            };
        });

        const normalizedTests = tests.map(test => {
            const skill = skillMap.get(test.skillId);
            return {
                id: test.id,
                title: `${skill ? skill.name : 'Unknown'} Test`,
                date: test.completedAt || test.createdAt,
                type: 'test',
                skillId: test.skillId,
                score: test.score,
                color: '#a78bfa'
            };
        });

        return [...normalizedEvents, ...normalizedTests].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );
    }

    async scheduleSession(userId, skillId, date) {
        const skills = await this.storage.findSkillsByUserId(userId);
        const skill = skills.find(s => s.id === skillId);
        if (!skill) throw new Error('Skill not found');

        return this.storage.createCalendarEvent({
            userId,
            skillId,
            date,
            type: 'scheduled',
            status: 'pending'
        });
    }

    async logPracticeSession(userId, skillId) {
        return this.storage.createCalendarEvent({
            userId,
            skillId,
            date: new Date().toISOString(),
            type: 'practice',
            status: 'completed'
        });
    }

    async deleteEvent(eventId, userId) {
        const events = await this.storage.findCalendarEventsByUserId(userId);
        const event = events.find(e => e.id === eventId);
        if (!event) throw new Error('Event not found or unauthorized');
        return this.storage.deleteCalendarEvent(eventId);
    }
}

export default CalendarService;
