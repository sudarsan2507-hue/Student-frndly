import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DB_PATH = './data/app.db';
const db = new Database(DB_PATH);

console.log('Inserting 10 more students into Student_frndly database...');

const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync('password123', salt);

const newStudents = [
    { id: crypto.randomUUID(), name: 'Olivia Rodrigo', email: 'olivia@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Cillian Murphy', email: 'cillian@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Timothee Chalamet', email: 'timothee@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Florence Pugh', email: 'florence@test.com', status: 'pending' },
    { id: crypto.randomUUID(), name: 'Pedro Pascal', email: 'pedro@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Bella Ramsey', email: 'bella@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Oscar Isaac', email: 'oscar@test.com', status: 'pending' },
    { id: crypto.randomUUID(), name: 'Margot Robbie', email: 'margot@test.com', status: 'approved' },
    { id: crypto.randomUUID(), name: 'Ryan Gosling', email: 'ryan@test.com', status: 'rejected' },
    { id: crypto.randomUUID(), name: 'Chris Evans', email: 'chris@test.com', status: 'approved' }
];

const categories = ['Programming', 'Mathematics', 'Language', 'Science', 'History', 'Art'];
const skillNames = ['Python Basics', 'Machine Learning', 'Linear Algebra', 'World War II', 'French', 'Color Theory', 'Data Structures', 'Git & GitHub'];

const insertData = db.transaction(() => {
    const userStmt = db.prepare(`INSERT INTO users (id, email, password, name, role, status, createdAt) VALUES (?, ?, ?, ?, 'student', ?, datetime('now'))`);
    const skillStmt = db.prepare(`INSERT INTO skills (id, userId, name, category, initialProficiency, halfLife, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))`);
    const testStmt = db.prepare(`INSERT INTO quick_tests (id, skillId, userId, skillName, accuracy, totalTime, completedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))`);

    newStudents.forEach((student) => {
        userStmt.run(student.id, student.email, hashedPassword, student.name, student.status);
        console.log(`Added student: ${student.name} (${student.status})`);

        if (student.status !== 'approved') return;

        const numSkills = Math.floor(Math.random() * 4) + 3; // 3 to 6 skills
        for (let i = 0; i < numSkills; i++) {
            const skillId = crypto.randomUUID();
            const skillName = skillNames[Math.floor(Math.random() * skillNames.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const proficiency = Math.floor(Math.random() * 60) + 40;
            const ageDays = Math.floor(Math.random() * 21); // up to 3 weeks old

            skillStmt.run(skillId, student.id, skillName, category, proficiency, 7.0, ageDays);

            const numTests = Math.floor(Math.random() * 4); // 0 to 3 tests
            for (let j = 0; j < numTests; j++) {
                const testId = crypto.randomUUID();
                // To simulate realistic data, sometimes tests are low, sometimes high
                const accuracy = Math.floor(Math.random() * 50) + 50;
                const timeStr = (Math.floor(Math.random() * 120) + 40).toString();
                const testAge = Math.floor(Math.random() * ageDays);

                testStmt.run(testId, skillId, student.id, skillName, accuracy, timeStr, testAge);
            }
        }
    });
});

try {
    insertData();
    console.log('\n✅ Successfully inserted 10 more students with random skills and tests!');
    console.log('Login credentials: Use any of the plotted emails with password "password123"');
} catch (e) {
    console.error('Failed to insert data:', e.message);
}

db.close();
