import { ADMIN_EMAIL, STUDENT_EMAIL, DEMO_EMAILS, DEMO_PASSWORD, buildStudentDataset, buildMessages } from '../demoData.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

/**
 * Wipes and re-applies one demo account's data back to the canonical
 * dataset. Called on logout for either of the two public demo accounts
 * (see authController#logout) so every visitor who logs in afterwards
 * finds the same fresh, fully-populated demo state — nothing the previous
 * visitor did to it persists.
 */
export async function resetDemoAccountIfNeeded(storage, email) {
    if (!DEMO_EMAILS.includes(email)) return;

    const user = await storage.findUserByEmail(email);
    if (!user) return;

    const clearUserData = (userId) => {
        const skillIds = storage.db.prepare('SELECT id FROM skills WHERE userId = ?').all(userId).map((r) => r.id);
        for (const skillId of skillIds) {
            storage.db.prepare('DELETE FROM quick_tests WHERE skillId = ?').run(skillId);
        }
        storage.db.prepare('DELETE FROM quick_tests WHERE userId = ?').run(userId); // any orphaned-by-skill rows too
        storage.db.prepare('DELETE FROM skills WHERE userId = ?').run(userId);
        storage.db.prepare('DELETE FROM calendar_events WHERE userId = ?').run(userId);
        storage.db.prepare('DELETE FROM personal_notes WHERE userId = ?').run(userId);
        storage.db.prepare('DELETE FROM messages WHERE fromUserId = ? OR toUserId = ?').run(userId, userId);
    };

    if (email === ADMIN_EMAIL) {
        // Admin has no personal skill/test data — just make sure the password
        // hasn't drifted from the known demo credential.
        const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
        await storage.updateUser(user.id, { password: hash });
        logger.info('Demo account reset (admin)', { email });
        return;
    }

    if (email === STUDENT_EMAIL) {
        clearUserData(user.id);

        const { skills, quickTests, calendarEvents, notes } = buildStudentDataset(user.id);
        for (const s of skills) await storage.createSkill(s);
        for (const t of quickTests) await storage.createQuickTest(t);
        for (const e of calendarEvents) await storage.createCalendarEvent(e);
        for (const n of notes) await storage.createNote(n);

        const admin = await storage.findUserByEmail(ADMIN_EMAIL);
        if (admin) {
            for (const m of buildMessages(admin.id, user.id)) await storage.createMessage(m);
        }

        const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
        await storage.updateUser(user.id, { password: hash });
        logger.info('Demo account reset (student)', { email, skills: skills.length, tests: quickTests.length });
    }
}
