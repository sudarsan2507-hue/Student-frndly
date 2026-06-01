import Database from 'better-sqlite3';
import crypto from 'crypto';

const DB_PATH = './data/app.db';
const db = new Database(DB_PATH);

const OLIVIA_EMAIL = 'olivia@test.com';
const now = new Date();
const nowSql = now.toISOString().slice(0, 19).replace('T', ' ');

const user = db.prepare('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)').get(OLIVIA_EMAIL);

if (!user) {
    console.error(`User not found: ${OLIVIA_EMAIL}`);
    process.exit(1);
}

const skills = db.prepare('SELECT * FROM skills WHERE userId = ? ORDER BY createdAt ASC').all(user.id);

if (!skills.length) {
    console.error(`No skills found for ${user.email}`);
    process.exit(1);
}

const latestTestBySkill = db.prepare(`
    SELECT completedAt
    FROM quick_tests
    WHERE skillId = ? AND userId = ? AND completedAt IS NOT NULL
    ORDER BY datetime(completedAt) DESC
    LIMIT 1
`);

const updateSkillStmt = db.prepare(`
    UPDATE skills
    SET lastPracticedAt = ?, updatedAt = ?
    WHERE id = ?
`);

const insertTestStmt = db.prepare(`
    INSERT INTO quick_tests (
        id, skillId, userId, skillName,
        questions, answers, score, accuracy,
        totalTime, averageTimePerQuestion, responseTime,
        confidence, completedAt, createdAt
    ) VALUES (
        @id, @skillId, @userId, @skillName,
        @questions, @answers, @score, @accuracy,
        @totalTime, @averageTimePerQuestion, @responseTime,
        @confidence, @completedAt, @createdAt
    )
`);

const tx = db.transaction(() => {
    const updates = [];

    for (const skill of skills) {
        const latestTest = latestTestBySkill.get(skill.id, user.id);
        const latestDate = latestTest?.completedAt || skill.createdAt || nowSql;
        updateSkillStmt.run(latestDate, nowSql, skill.id);
        updates.push({ skillId: skill.id, latestDate });
    }

    const targetSkills = skills.slice(0, Math.min(3, skills.length));
    const newTests = [
        {
            skill: targetSkills[0],
            accuracy: 92,
            totalTime: 78,
            completedAt: nowSql
        },
        {
            skill: targetSkills[1] || targetSkills[0],
            accuracy: 84,
            totalTime: 95,
            completedAt: nowSql
        }
    ];

    for (const test of newTests) {
        if (!test.skill) continue;
        insertTestStmt.run({
            id: crypto.randomUUID(),
            skillId: test.skill.id,
            userId: user.id,
            skillName: test.skill.name,
            questions: null,
            answers: null,
            score: null,
            accuracy: test.accuracy,
            totalTime: test.totalTime,
            averageTimePerQuestion: null,
            responseTime: null,
            confidence: null,
            completedAt: test.completedAt,
            createdAt: nowSql
        });
    }

    return updates;
});

const updates = tx();
console.log(`Updated ${updates.length} skill timestamps for ${user.email}`);
console.log('Added 2 fresh quick tests for Olivia.');
console.log('Updated skills:');
for (const row of updates) {
    console.log(`- ${row.skillId} @ ${row.latestDate}`);
}

db.close();
