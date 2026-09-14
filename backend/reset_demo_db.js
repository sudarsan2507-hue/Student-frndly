/**
 * One-time cleanup: wipes every account except the two public demo
 * accounts (admin@test.com / gugugaga@test.com, both password "password"),
 * and seeds the student account with a full demo dataset. Ongoing reset
 * (after that point) happens automatically on logout — see
 * src/services/demoResetService.js — this script is just for getting an
 * existing/dev database into that starting state.
 *
 * Run: node reset_demo_db.js
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ADMIN_EMAIL, STUDENT_EMAIL, DEMO_PASSWORD, buildStudentDataset, buildMessages } from './src/demoData.js';

const db = new Database('./data/app.db');
const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

console.log('Wiping all accounts except the two demo accounts...');

const keepEmails = [ADMIN_EMAIL, STUDENT_EMAIL];
const otherUserIds = db.prepare(
    `SELECT id FROM users WHERE email NOT IN (${keepEmails.map(() => '?').join(',')})`
).all(...keepEmails).map((r) => r.id);

const del = db.transaction((ids) => {
    for (const id of ids) {
        db.prepare(`DELETE FROM quick_tests WHERE userId = ? OR skillId IN (SELECT id FROM skills WHERE userId = ?)`).run(id, id);
        db.prepare(`DELETE FROM skills WHERE userId = ?`).run(id);
        db.prepare(`DELETE FROM calendar_events WHERE userId = ?`).run(id);
        db.prepare(`DELETE FROM personal_notes WHERE userId = ?`).run(id);
        db.prepare(`DELETE FROM messages WHERE fromUserId = ? OR toUserId = ?`).run(id, id);
        db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    }
    db.prepare(`DELETE FROM admin_audit_log`).run(); // referenced admins no longer exist except the kept one
});
del(otherUserIds);
console.log(`Deleted ${otherUserIds.length} other account(s) and their data.`);

// Ensure the two demo accounts exist with the right role/password
const upsertUser = (email, role, name) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        db.prepare('UPDATE users SET password = ?, role = ?, status = ?, name = ?, updatedAt = ? WHERE id = ?')
            .run(hash, role, 'approved', name, new Date().toISOString(), existing.id);
        return existing.id;
    }
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO users (id, email, password, name, role, status, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)`)
        .run(id, email, hash, name, role, new Date().toISOString(), new Date().toISOString());
    return id;
};

const adminId = upsertUser(ADMIN_EMAIL, 'admin', 'Admin');
const studentId = upsertUser(STUDENT_EMAIL, 'student', 'Demo Student');
console.log('Demo accounts ready:', { adminId, studentId });

// Wipe and re-seed the student's demo data
db.prepare(`DELETE FROM quick_tests WHERE userId = ? OR skillId IN (SELECT id FROM skills WHERE userId = ?)`).run(studentId, studentId);
db.prepare(`DELETE FROM skills WHERE userId = ?`).run(studentId);
db.prepare(`DELETE FROM calendar_events WHERE userId = ?`).run(studentId);
db.prepare(`DELETE FROM personal_notes WHERE userId = ?`).run(studentId);
db.prepare(`DELETE FROM messages WHERE fromUserId = ? OR toUserId = ?`).run(studentId, studentId);

const { skills, quickTests, calendarEvents, notes } = buildStudentDataset(studentId);

const insertSkill = db.prepare(`INSERT INTO skills (id, userId, name, category, initialProficiency, lastPracticedAt, halfLife, baseDecayRate, adaptiveDecayMultiplier, createdAt, updatedAt)
    VALUES (@id, @userId, @name, @category, @initialProficiency, @lastPracticedAt, @halfLife, @baseDecayRate, @adaptiveDecayMultiplier, @createdAt, @updatedAt)`);
for (const s of skills) insertSkill.run(s);

const insertTest = db.prepare(`INSERT INTO quick_tests (id, skillId, userId, skillName, questions, answers, score, accuracy, totalTime, averageTimePerQuestion, responseTime, confidence, completedAt, createdAt)
    VALUES (@id, @skillId, @userId, @skillName, @questions, @answers, @score, @accuracy, @totalTime, @averageTimePerQuestion, @responseTime, @confidence, @completedAt, @createdAt)`);
for (const t of quickTests) {
    insertTest.run({
        id: crypto.randomUUID(), ...t,
        questions: JSON.stringify(t.questions), answers: JSON.stringify(t.answers),
    });
}

const insertEvent = db.prepare(`INSERT INTO calendar_events (id, userId, skillId, date, type, status, createdAt)
    VALUES (@id, @userId, @skillId, @date, @type, @status, @createdAt)`);
for (const e of calendarEvents) insertEvent.run({ ...e, createdAt: new Date().toISOString() });

const insertNote = db.prepare(`INSERT INTO personal_notes (id, userId, date, content, createdAt, updatedAt)
    VALUES (@id, @userId, @date, @content, @createdAt, @updatedAt)`);
for (const n of notes) insertNote.run({ ...n, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

const insertMsg = db.prepare(`INSERT INTO messages (id, fromUserId, toUserId, type, subject, content, meetingDate, isRead, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)`);
for (const m of buildMessages(adminId, studentId)) {
    insertMsg.run(crypto.randomUUID(), m.fromUserId, m.toUserId, m.type, m.subject, m.content, new Date().toISOString());
}

console.log(`Seeded student demo data: ${skills.length} skills, ${quickTests.length} tests, ${calendarEvents.length} calendar events, ${notes.length} notes.`);
console.log('Done. Login with admin@test.com / password or gugugaga@test.com / password.');
