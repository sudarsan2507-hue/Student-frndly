import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import DataAccess from './dataAccess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/app.db');
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * SQLite storage implementation using better-sqlite3.
 * Implements the full DataAccess interface.
 * Automatically migrates existing JSON data on first run.
 */
class SQLiteStorage extends DataAccess {
    constructor() {
        super();
        this.db = null;
        this.initialized = false;
    }

    // ─────────────────────────────────────────────────────────
    //  INITIALIZATION
    // ─────────────────────────────────────────────────────────

    async initialize() {
        if (this.initialized) return;

        // Open (or create) the database file
        this.db = new Database(DB_PATH);

        // Enable WAL mode for better concurrency and performance
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

        // Create all tables
        this._createTables();

        // Migrate existing JSON data if tables are empty
        await this._migrateJsonData();

        // Ensure status column exists for older DBs (idempotent migration)
        try {
            this.db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'approved'`);
            this.db.exec(`UPDATE users SET status = 'approved' WHERE status IS NULL`);
        } catch (e) { /* Column already exists — safe to ignore */ }

        this.initialized = true;
        console.log(`✓ SQLite database initialized at ${DB_PATH}`);
    }

    _createTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id        TEXT PRIMARY KEY,
                email     TEXT UNIQUE NOT NULL,
                password  TEXT NOT NULL,
                name      TEXT,
                role      TEXT DEFAULT 'student',
                status    TEXT DEFAULT 'approved',
                createdAt TEXT,
                updatedAt TEXT
            );

            CREATE TABLE IF NOT EXISTS skills (
                id                      TEXT PRIMARY KEY,
                userId                  TEXT NOT NULL,
                name                    TEXT NOT NULL,
                category                TEXT DEFAULT 'General',
                initialProficiency      REAL DEFAULT 50,
                lastPracticedAt         TEXT,
                halfLife                REAL DEFAULT 7,
                baseDecayRate           REAL DEFAULT 0.1,
                adaptiveDecayMultiplier REAL DEFAULT 1.0,
                createdAt               TEXT,
                updatedAt               TEXT,
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS quick_tests (
                id                    TEXT PRIMARY KEY,
                skillId               TEXT NOT NULL,
                userId                TEXT NOT NULL,
                skillName             TEXT,
                questions             TEXT,
                answers               TEXT,
                score                 REAL,
                accuracy              REAL,
                totalTime             REAL,
                averageTimePerQuestion REAL,
                responseTime          REAL,
                confidence            TEXT,
                completedAt           TEXT,
                createdAt             TEXT,
                FOREIGN KEY (skillId) REFERENCES skills(id),
                FOREIGN KEY (userId)  REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS calendar_events (
                id        TEXT PRIMARY KEY,
                userId    TEXT NOT NULL,
                skillId   TEXT,
                date      TEXT NOT NULL,
                type      TEXT NOT NULL,
                status    TEXT,
                createdAt TEXT,
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS personal_notes (
                id        TEXT PRIMARY KEY,
                userId    TEXT NOT NULL,
                date      TEXT NOT NULL,
                content   TEXT NOT NULL,
                createdAt TEXT,
                updatedAt TEXT,
                FOREIGN KEY (userId) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id          TEXT PRIMARY KEY,
                fromUserId  TEXT NOT NULL,
                toUserId    TEXT NOT NULL,
                type        TEXT DEFAULT 'tip',
                subject     TEXT,
                content     TEXT NOT NULL,
                meetingDate TEXT,
                isRead      INTEGER DEFAULT 0,
                createdAt   TEXT,
                FOREIGN KEY (fromUserId) REFERENCES users(id),
                FOREIGN KEY (toUserId)   REFERENCES users(id)
            );
        `);
    }

    async _migrateJsonData() {
        // Migrate Users
        const userCount = this.db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        if (userCount === 0) {
            try {
                const usersPath = path.join(DATA_DIR, 'users.json');
                const usersRaw = await fs.readFile(usersPath, 'utf-8');
                const users = JSON.parse(usersRaw);
                const insertUser = this.db.prepare(`
                    INSERT OR IGNORE INTO users (id, email, password, name, role, createdAt, updatedAt)
                    VALUES (@id, @email, @password, @name, @role, @createdAt, @updatedAt)
                `);
                const insertMany = this.db.transaction((rows) => {
                    for (const u of rows) insertUser.run({
                        id: u.id || crypto.randomUUID(),
                        email: u.email,
                        password: u.password,
                        name: u.name || null,
                        role: u.role || 'student',
                        createdAt: u.createdAt || new Date().toISOString(),
                        updatedAt: u.updatedAt || new Date().toISOString()
                    });
                });
                insertMany(users);
                console.log(`✓ Migrated ${users.length} users from users.json`);
            } catch (e) {
                console.log('No users.json found to migrate, starting fresh.');
            }
        }

        // Migrate Skills
        const skillCount = this.db.prepare('SELECT COUNT(*) as c FROM skills').get().c;
        if (skillCount === 0) {
            try {
                const skillsRaw = await fs.readFile(path.join(DATA_DIR, 'skills.json'), 'utf-8');
                const skills = JSON.parse(skillsRaw);
                const ins = this.db.prepare(`
                    INSERT OR IGNORE INTO skills
                    (id, userId, name, category, initialProficiency, lastPracticedAt,
                     halfLife, baseDecayRate, adaptiveDecayMultiplier, createdAt, updatedAt)
                    VALUES (@id, @userId, @name, @category, @initialProficiency, @lastPracticedAt,
                            @halfLife, @baseDecayRate, @adaptiveDecayMultiplier, @createdAt, @updatedAt)
                `);
                const tx = this.db.transaction((rows) => { for (const s of rows) ins.run(s); });
                tx(skills);
                console.log(`✓ Migrated ${skills.length} skills from skills.json`);
            } catch (e) { /* No file — OK */ }
        }

        // Migrate Quick Tests
        const testCount = this.db.prepare('SELECT COUNT(*) as c FROM quick_tests').get().c;
        if (testCount === 0) {
            try {
                const testsRaw = await fs.readFile(path.join(DATA_DIR, 'quickTests.json'), 'utf-8');
                const tests = JSON.parse(testsRaw);
                const ins = this.db.prepare(`
                    INSERT OR IGNORE INTO quick_tests
                    (id, skillId, userId, skillName, questions, answers, score, accuracy,
                     totalTime, averageTimePerQuestion, responseTime, confidence, completedAt, createdAt)
                    VALUES (@id, @skillId, @userId, @skillName, @questions, @answers, @score, @accuracy,
                            @totalTime, @averageTimePerQuestion, @responseTime, @confidence, @completedAt, @createdAt)
                `);
                const tx = this.db.transaction((rows) => {
                    for (const t of rows) ins.run({
                        ...t,
                        questions: JSON.stringify(t.questions || []),
                        answers: JSON.stringify(t.answers || {})
                    });
                });
                tx(tests);
                console.log(`✓ Migrated ${tests.length} quick tests from quickTests.json`);
            } catch (e) { /* No file — OK */ }
        }

        // Migrate Calendar Events
        const evtCount = this.db.prepare('SELECT COUNT(*) as c FROM calendar_events').get().c;
        if (evtCount === 0) {
            try {
                const evtRaw = await fs.readFile(path.join(DATA_DIR, 'calendarEvents.json'), 'utf-8');
                const events = JSON.parse(evtRaw);
                const ins = this.db.prepare(`
                    INSERT OR IGNORE INTO calendar_events (id, userId, skillId, date, type, status, createdAt)
                    VALUES (@id, @userId, @skillId, @date, @type, @status, @createdAt)
                `);
                const tx = this.db.transaction((rows) => { for (const e of rows) ins.run(e); });
                tx(events);
                console.log(`✓ Migrated ${events.length} calendar events from calendarEvents.json`);
            } catch (e) { /* No file — OK */ }
        }

        // Migrate Personal Notes
        const noteCount = this.db.prepare('SELECT COUNT(*) as c FROM personal_notes').get().c;
        if (noteCount === 0) {
            try {
                const notesRaw = await fs.readFile(path.join(DATA_DIR, 'notes.json'), 'utf-8');
                const notes = JSON.parse(notesRaw);
                const ins = this.db.prepare(`
                    INSERT OR IGNORE INTO personal_notes (id, userId, date, content, createdAt, updatedAt)
                    VALUES (@id, @userId, @date, @content, @createdAt, @updatedAt)
                `);
                const tx = this.db.transaction((rows) => { for (const n of rows) ins.run(n); });
                tx(notes);
                console.log(`✓ Migrated ${notes.length} notes from notes.json`);
            } catch (e) { /* No file — OK */ }
        }
    }

    // ─────────────────────────────────────────────────────────
    //  USER OPERATIONS
    // ─────────────────────────────────────────────────────────

    async findUserByEmail(email) {
        return this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) || null;
    }

    async findUserById(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
    }

    async getAllUsers() {
        return this.db.prepare('SELECT * FROM users').all();
    }

    async createUser(userData) {
        const id = userData.id || crypto.randomUUID();
        const now = new Date().toISOString();
        const user = {
            id,
            email: userData.email,
            password: userData.password,
            name: userData.name || null,
            role: userData.role || 'student',
            status: userData.status || (userData.role === 'admin' ? 'approved' : 'pending'),
            createdAt: userData.createdAt || now,
            updatedAt: now
        };
        this.db.prepare(`
            INSERT INTO users (id, email, password, name, role, status, createdAt, updatedAt)
            VALUES (@id, @email, @password, @name, @role, @status, @createdAt, @updatedAt)
        `).run(user);
        return user;
    }

    async updateUser(id, userData) {
        const existing = await this.findUserById(id);
        if (!existing) return null;
        const updated = { ...existing, ...userData, id, updatedAt: new Date().toISOString() };
        this.db.prepare(`
            UPDATE users SET email=@email, password=@password, name=@name,
            role=@role, status=@status, updatedAt=@updatedAt WHERE id=@id
        `).run(updated);
        return updated;
    }

    // ─── ADMIN OPERATIONS ──────────────────────────────────────

    async getPendingUsers() {
        return this.db.prepare(`SELECT id, email, name, role, status, createdAt FROM users WHERE status = 'pending'`).all();
    }

    async approveUser(id) {
        this.db.prepare(`UPDATE users SET status = 'approved', updatedAt = ? WHERE id = ?`).run(new Date().toISOString(), id);
        return this.findUserById(id);
    }

    async rejectUser(id) {
        this.db.prepare(`UPDATE users SET status = 'rejected', updatedAt = ? WHERE id = ?`).run(new Date().toISOString(), id);
        return this.findUserById(id);
    }

    async getAllStudentsWithStats() {
        const students = this.db.prepare(`SELECT id, email, name, role, status, createdAt FROM users WHERE role = 'student'`).all();
        return students.map(student => {
            const skills = this.db.prepare(`SELECT * FROM skills WHERE userId = ?`).all(student.id);
            const tests = this.db.prepare(`SELECT * FROM quick_tests WHERE userId = ? AND completedAt IS NOT NULL`).all(student.id);
            const avgStrength = skills.length > 0
                ? Math.round(skills.reduce((s, sk) => s + (sk.initialProficiency || 50), 0) / skills.length)
                : 0;
            const avgAccuracy = tests.length > 0
                ? Math.round(tests.reduce((s, t) => s + (Number(t.accuracy) || 0), 0) / tests.length)
                : 0;
            return {
                ...student,
                totalSkills: skills.length,
                totalTests: tests.length,
                avgStrength,
                avgAccuracy,
                skills
            };
        });
    }

    async deleteUser(id) {
        const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ─────────────────────────────────────────────────────────
    //  SKILL OPERATIONS
    // ─────────────────────────────────────────────────────────

    async createSkill(skillData) {
        const now = new Date().toISOString();
        const skill = {
            id: skillData.id || String(Date.now()),
            userId: skillData.userId,
            name: skillData.name,
            category: skillData.category || 'General',
            initialProficiency: skillData.initialProficiency ?? 50,
            lastPracticedAt: skillData.lastPracticedAt || now,
            halfLife: skillData.halfLife ?? 7,
            baseDecayRate: skillData.baseDecayRate ?? 0.1,
            adaptiveDecayMultiplier: skillData.adaptiveDecayMultiplier ?? 1.0,
            createdAt: skillData.createdAt || now,
            updatedAt: skillData.updatedAt || now
        };
        this.db.prepare(`
            INSERT INTO skills (id, userId, name, category, initialProficiency, lastPracticedAt,
                                halfLife, baseDecayRate, adaptiveDecayMultiplier, createdAt, updatedAt)
            VALUES (@id, @userId, @name, @category, @initialProficiency, @lastPracticedAt,
                    @halfLife, @baseDecayRate, @adaptiveDecayMultiplier, @createdAt, @updatedAt)
        `).run(skill);
        return skill;
    }

    async findSkillById(id) {
        return this.db.prepare('SELECT * FROM skills WHERE id = ?').get(id) || null;
    }

    async findSkillsByUserId(userId) {
        return this.db.prepare('SELECT * FROM skills WHERE userId = ?').all(userId);
    }

    async updateSkill(id, skillData) {
        const existing = await this.findSkillById(id);
        if (!existing) return null;
        const updated = { ...existing, ...skillData, id, updatedAt: new Date().toISOString() };
        this.db.prepare(`
            UPDATE skills SET userId=@userId, name=@name, category=@category,
                initialProficiency=@initialProficiency, lastPracticedAt=@lastPracticedAt,
                halfLife=@halfLife, baseDecayRate=@baseDecayRate,
                adaptiveDecayMultiplier=@adaptiveDecayMultiplier, updatedAt=@updatedAt
            WHERE id=@id
        `).run(updated);
        return updated;
    }

    async deleteSkill(id) {
        const result = this.db.prepare('DELETE FROM skills WHERE id = ?').run(id);
        return result.changes > 0;
    }

    async markSkillAsPracticed(id) {
        return this.updateSkill(id, { lastPracticedAt: new Date().toISOString() });
    }

    // ─────────────────────────────────────────────────────────
    //  QUICK TEST OPERATIONS
    // ─────────────────────────────────────────────────────────

    _serializeTest(testData) {
        return {
            ...testData,
            questions: typeof testData.questions === 'string'
                ? testData.questions
                : JSON.stringify(testData.questions || []),
            answers: typeof testData.answers === 'string'
                ? testData.answers
                : JSON.stringify(testData.answers || {})
        };
    }

    _deserializeTest(row) {
        if (!row) return null;
        return {
            ...row,
            questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
            answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers
        };
    }

    async createQuickTest(testData) {
        const now = new Date().toISOString();
        const test = {
            id: testData.id || crypto.randomUUID(),
            skillId: testData.skillId,
            userId: testData.userId,
            skillName: testData.skillName || null,
            questions: typeof testData.questions === 'string'
                ? testData.questions
                : JSON.stringify(testData.questions || []),
            answers: typeof testData.answers === 'string'
                ? testData.answers
                : JSON.stringify(testData.answers || {}),
            score: testData.score ?? null,
            accuracy: testData.accuracy ?? null,
            totalTime: testData.totalTime ?? null,
            averageTimePerQuestion: testData.averageTimePerQuestion ?? null,
            responseTime: testData.responseTime ?? null,
            confidence: testData.confidence || null,
            completedAt: testData.completedAt || null,
            createdAt: testData.createdAt || now
        };
        this.db.prepare(`
            INSERT INTO quick_tests (id, skillId, userId, skillName, questions, answers,
                score, accuracy, totalTime, averageTimePerQuestion, responseTime,
                confidence, completedAt, createdAt)
            VALUES (@id, @skillId, @userId, @skillName, @questions, @answers,
                    @score, @accuracy, @totalTime, @averageTimePerQuestion, @responseTime,
                    @confidence, @completedAt, @createdAt)
        `).run(test);
        return this._deserializeTest(test);
    }

    async findQuickTestById(id) {
        const row = this.db.prepare('SELECT * FROM quick_tests WHERE id = ?').get(id);
        return this._deserializeTest(row);
    }

    async findQuickTestsBySkillId(skillId) {
        const rows = this.db.prepare('SELECT * FROM quick_tests WHERE skillId = ?').all(skillId);
        return rows.map(r => this._deserializeTest(r));
    }

    async findQuickTestsByUserId(userId) {
        const rows = this.db.prepare('SELECT * FROM quick_tests WHERE userId = ?').all(userId);
        return rows.map(r => this._deserializeTest(r));
    }

    async updateQuickTest(id, testData) {
        const existing = await this.findQuickTestById(id);
        if (!existing) return null;
        const merged = {
            ...existing,
            ...testData,
            id,
            questions: typeof testData.questions !== 'undefined'
                ? (typeof testData.questions === 'string' ? testData.questions : JSON.stringify(testData.questions))
                : (typeof existing.questions === 'string' ? existing.questions : JSON.stringify(existing.questions)),
            answers: typeof testData.answers !== 'undefined'
                ? (typeof testData.answers === 'string' ? testData.answers : JSON.stringify(testData.answers))
                : (typeof existing.answers === 'string' ? existing.answers : JSON.stringify(existing.answers))
        };
        this.db.prepare(`
            UPDATE quick_tests SET skillId=@skillId, userId=@userId, skillName=@skillName,
                questions=@questions, answers=@answers, score=@score, accuracy=@accuracy,
                totalTime=@totalTime, averageTimePerQuestion=@averageTimePerQuestion,
                responseTime=@responseTime, confidence=@confidence, completedAt=@completedAt
            WHERE id=@id
        `).run(merged);
        return this._deserializeTest(merged);
    }

    async deleteQuickTest(id) {
        const result = this.db.prepare('DELETE FROM quick_tests WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ─────────────────────────────────────────────────────────
    //  CALENDAR EVENT OPERATIONS
    // ─────────────────────────────────────────────────────────

    async createCalendarEvent(eventData) {
        const event = {
            id: eventData.id || crypto.randomUUID(),
            userId: eventData.userId,
            skillId: eventData.skillId || null,
            date: eventData.date,
            type: eventData.type,
            status: eventData.status || null,
            createdAt: eventData.createdAt || new Date().toISOString()
        };
        this.db.prepare(`
            INSERT INTO calendar_events (id, userId, skillId, date, type, status, createdAt)
            VALUES (@id, @userId, @skillId, @date, @type, @status, @createdAt)
        `).run(event);
        return event;
    }

    async findCalendarEventsByUserId(userId) {
        return this.db.prepare('SELECT * FROM calendar_events WHERE userId = ?').all(userId);
    }

    async deleteCalendarEvent(id) {
        const result = this.db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ─────────────────────────────────────────────────────────
    //  PERSONAL NOTE OPERATIONS
    // ─────────────────────────────────────────────────────────

    async createNote(noteData) {
        const now = new Date().toISOString();
        const note = {
            id: noteData.id || crypto.randomUUID(),
            userId: noteData.userId,
            date: noteData.date,
            content: noteData.content.trim(),
            createdAt: noteData.createdAt || now,
            updatedAt: noteData.updatedAt || now
        };
        this.db.prepare(`
            INSERT INTO personal_notes (id, userId, date, content, createdAt, updatedAt)
            VALUES (@id, @userId, @date, @content, @createdAt, @updatedAt)
        `).run(note);
        return note;
    }

    async findNotesByUserId(userId, dateFilter = null) {
        if (dateFilter) {
            return this.db
                .prepare('SELECT * FROM personal_notes WHERE userId = ? AND date = ? ORDER BY updatedAt DESC')
                .all(userId, dateFilter);
        }
        return this.db
            .prepare('SELECT * FROM personal_notes WHERE userId = ? ORDER BY updatedAt DESC')
            .all(userId);
    }

    async findNoteById(id) {
        return this.db.prepare('SELECT * FROM personal_notes WHERE id = ?').get(id) || null;
    }

    async updateNote(id, updates) {
        const existing = await this.findNoteById(id);
        if (!existing) throw new Error('Note not found');
        const updated = {
            ...existing,
            ...(updates.content !== undefined ? { content: updates.content.trim() } : {}),
            ...(updates.date !== undefined ? { date: updates.date } : {}),
            updatedAt: new Date().toISOString()
        };
        this.db.prepare(`
            UPDATE personal_notes SET content=@content, date=@date, updatedAt=@updatedAt
            WHERE id=@id
        `).run(updated);
        return updated;
    }

    async deleteNote(id) {
        const existing = await this.findNoteById(id);
        if (!existing) throw new Error('Note not found');
        this.db.prepare('DELETE FROM personal_notes WHERE id = ?').run(id);
        return existing;
    }

    // ─── MESSAGE OPERATIONS ────────────────────────────────

    async createMessage({ fromUserId, toUserId, type, subject, content, meetingDate }) {
        const msg = {
            id: crypto.randomUUID(),
            fromUserId,
            toUserId,
            type: type || 'tip',
            subject: subject || null,
            content,
            meetingDate: meetingDate || null,
            isRead: 0,
            createdAt: new Date().toISOString()
        };
        this.db.prepare(`
            INSERT INTO messages (id, fromUserId, toUserId, type, subject, content, meetingDate, isRead, createdAt)
            VALUES (@id, @fromUserId, @toUserId, @type, @subject, @content, @meetingDate, @isRead, @createdAt)
        `).run(msg);
        return msg;
    }

    findMessagesForUser(userId) {
        return this.db.prepare(`
            SELECT m.*, u.name as fromName, u.email as fromEmail
            FROM messages m JOIN users u ON m.fromUserId = u.id
            WHERE m.toUserId = ? ORDER BY m.createdAt DESC
        `).all(userId);
    }

    findMessagesSentByAdmin(adminId, studentId = null) {
        if (studentId) {
            return this.db.prepare(`
                SELECT m.*, u.name as toName, u.email as toEmail
                FROM messages m JOIN users u ON m.toUserId = u.id
                WHERE m.fromUserId = ? AND m.toUserId = ? ORDER BY m.createdAt DESC
            `).all(adminId, studentId);
        }
        return this.db.prepare(`
            SELECT m.*, u.name as toName, u.email as toEmail
            FROM messages m JOIN users u ON m.toUserId = u.id
            WHERE m.fromUserId = ? ORDER BY m.createdAt DESC
        `).all(adminId);
    }

    markMessageRead(id) {
        this.db.prepare(`UPDATE messages SET isRead = 1 WHERE id = ?`).run(id);
    }

    getUnreadCount(userId) {
        return this.db.prepare(`SELECT COUNT(*) as c FROM messages WHERE toUserId = ? AND isRead = 0`).get(userId)?.c || 0;
    }
}

export default SQLiteStorage;
