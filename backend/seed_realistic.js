import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DB_PATH = './data/app.db';
const db = new Database(DB_PATH);

console.log('Generating realistic simulation data...');

const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync('password123', salt);

// Create 6 super active users for realistic long-term data
const activeStudents = [
    { id: crypto.randomUUID(), name: 'David Chen', email: 'david@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Sarah Miller', email: 'sarah@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'James Wilson', email: 'james@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Emily Clark', email: 'emily@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Michael Lee', email: 'michael@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Jessica Taylor', email: 'jessica@test.com', status: 'approved' }
];

const skillLibrary = [
    { name: 'JavaScript Basics', category: 'Programming' },
    { name: 'React Context API', category: 'Programming' },
    { name: 'SQL Joins', category: 'Database' },
    { name: 'Algebra II', category: 'Mathematics' },
    { name: 'Cellular Biology', category: 'Science' },
    { name: 'Spanish Conjugation', category: 'Language' },
    { name: 'World War 1', category: 'History' },
    { name: 'Physics Mechanics', category: 'Science' }
];

const insertData = db.transaction(() => {
    const userStmt = db.prepare(`INSERT INTO users (id, email, password, name, role, status, createdAt) VALUES (?, ?, ?, ?, 'student', ?, datetime('now', '-30 days'))`);

    // We insert the skill FIRST, but use 'UPDATE' later for its final state
    const skillStmt = db.prepare(`
        INSERT INTO skills (id, userId, name, category, initialProficiency, halfLife, createdAt, lastPracticedAt) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), datetime('now', '-' || ? || ' days'))
    `);

    const updateSkillStmt = db.prepare(`
        UPDATE skills SET initialProficiency = ?, lastPracticedAt = datetime('now', '-' || ? || ' days') WHERE id = ?
    `);

    const testStmt = db.prepare(`
        INSERT INTO quick_tests (id, skillId, userId, skillName, accuracy, score, totalTime, completedAt, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), datetime('now', '-' || ? || ' days'))
    `);

    activeStudents.forEach((student) => {
        userStmt.run(student.id, student.email, hashedPassword, student.name, student.status);
        console.log(`Simulating 30 days of data for: ${student.name}`);

        const numSkills = Math.floor(Math.random() * 3) + 4;
        const shuffledSkills = [...skillLibrary].sort(() => 0.5 - Math.random());
        const mySkills = shuffledSkills.slice(0, numSkills);

        mySkills.forEach(spec => {
            const skillId = crypto.randomUUID();
            const ageDays = Math.floor(Math.random() * 10) + 20; // 20-30 days ago

            let currentProficiency = Math.floor(Math.random() * 30) + 20; // Starts around 20-50%
            let lastPracticed = ageDays;

            // MUST insert skill first to satisfy foreign key for tests
            skillStmt.run(skillId, student.id, spec.name, spec.category, currentProficiency, 7.0, ageDays, ageDays);

            const numTests = Math.floor(Math.random() * 10) + 5; // 5 to 14 tests over the month
            let daysAgo = ageDays;

            for (let i = 0; i < numTests; i++) {
                // Move forward in time (closer to today)
                daysAgo = daysAgo - (Math.floor(Math.random() * 4) + 1);
                if (daysAgo < 0) daysAgo = 0;

                const testId = crypto.randomUUID();

                // Simulating learning curve
                let accuracy = Math.floor(currentProficiency + (Math.random() * 15) - Math.random() * 5);
                if (accuracy < 0) accuracy = 0;
                if (accuracy > 100) accuracy = 100;

                const timeTaken = Math.max(30, 160 - (i * 12) - (Math.random() * 20));

                testStmt.run(testId, skillId, student.id, spec.name, accuracy, accuracy, timeTaken.toString(), daysAgo, daysAgo);

                // Testing helps them learn:
                currentProficiency += Math.floor(Math.random() * 12) + 3;
                if (currentProficiency > 100) currentProficiency = 100;

                lastPracticed = daysAgo;

                if (daysAgo === 0) break;
            }

            // Update the skill with final simulated proficiency and practice date
            updateSkillStmt.run(currentProficiency, lastPracticed, skillId);
        });
    });
});

try {
    insertData();
    console.log('\n✅ Successfully simulated realistic learning curves for 6 new highly-active students!');
    console.log(' - These students took 5 to 14 tests per skill over a 30-day simulated timeline.');
    console.log(' - Their answers start inaccurate, and realistically climb closer to 100% over the month.');
} catch (e) {
    console.error('Failed to insert simulation data:', e.message);
}

db.close();
