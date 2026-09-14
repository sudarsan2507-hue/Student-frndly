/**
 * Canonical dataset for the two public demo accounts. Applied on first
 * setup and re-applied every time either account logs out, so anyone who
 * visits the deployed app always sees the same "fully populated, working"
 * demo — nothing a previous visitor did (deleted skills, weird test
 * answers, etc.) carries over.
 */

export const ADMIN_EMAIL = 'admin@test.com';
export const STUDENT_EMAIL = 'gugugaga@test.com';
export const DEMO_PASSWORD = 'password';
export const DEMO_EMAILS = [ADMIN_EMAIL, STUDENT_EMAIL];

// Must match quickTestService.generateQuestions()'s templates exactly (same
// question text, same order, same correctIndex) — the ML adaptive-difficulty
// endpoint calibrates item difficulty by matching on question index/text
// across every test in the system, so demo tests need to use the same bank.
const QUESTION_TEMPLATES = (skillName) => [
    { question: `How would you describe your current proficiency in ${skillName}?`, options: ['Expert', 'Intermediate', 'Beginner', 'Just learning'], correctIndex: 1 },
    { question: `When did you last practice ${skillName}?`, options: ['Today', 'This week', 'This month', 'Longer ago'], correctIndex: 0 },
    { question: `Can you recall a key concept from ${skillName}?`, options: ['Yes, multiple concepts', 'Yes, one concept', 'Maybe with hints', 'Not really'], correctIndex: 0 },
    { question: `How confident are you in applying ${skillName}?`, options: ['Very confident', 'Somewhat confident', 'Not very confident', 'Not confident'], correctIndex: 0 },
    { question: `What is the best way to maintain your skills in ${skillName}?`, options: ['Regular practice and testing', 'Occasional review', 'Hope for the best', 'Never practice'], correctIndex: 0 },
];

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
};

const makeQuestions = (skillName, seed) =>
    QUESTION_TEMPLATES(skillName).map((t, i) => ({ id: `q${seed}_${i}`, ...t }));

/** Build one completed test row for a skill, at `daysBack` days ago, hitting `correctCount` of 5 right. */
const makeCompletedTest = (skillId, userId, skillName, daysBack, correctCount) => {
    const seed = `${skillId}_${daysBack}`;
    const questions = makeQuestions(skillName, seed);
    const answers = {};
    questions.forEach((q, i) => {
        // answer correctly for the first `correctCount` items, wrong after that —
        // varying which items are "wrong" across calls would need more params,
        // this is enough spread for a demo decay/anomaly signal.
        answers[q.id] = i < correctCount ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
    });
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const totalTime = 25 + Math.random() * 20;
    return {
        skillId, userId, skillName, questions, answers,
        score: correctCount,
        accuracy,
        totalTime,
        averageTimePerQuestion: totalTime / questions.length,
        responseTime: totalTime / questions.length,
        confidence: accuracy >= 70 ? 'high' : accuracy >= 40 ? 'medium' : 'low',
        completedAt: daysAgo(daysBack),
        createdAt: daysAgo(daysBack),
    };
};

/**
 * Full demo dataset for the student account: skills across every retention
 * band, several with real multi-attempt test history (so the decay-rate
 * fit, spaced-repetition schedule, anomaly detection and IRT models all
 * have real signal to work with, not just a single data point), a couple
 * of calendar events and notes, and a message thread with the admin.
 */
export function buildStudentDataset(userId) {
    const skills = [
        { id: `${userId}-sk1`, name: 'React Development', category: 'Programming', initialProficiency: 90, halfLife: 12, lastPracticedAt: daysAgo(1) },
        { id: `${userId}-sk2`, name: 'Python Basics', category: 'Programming', initialProficiency: 80, halfLife: 9, lastPracticedAt: daysAgo(6) },
        { id: `${userId}-sk3`, name: 'Data Structures', category: 'Computer Science', initialProficiency: 75, halfLife: 7, lastPracticedAt: daysAgo(18) },
        { id: `${userId}-sk4`, name: 'Spanish Vocabulary', category: 'Language', initialProficiency: 85, halfLife: 14, lastPracticedAt: daysAgo(0) },
        { id: `${userId}-sk5`, name: 'Public Speaking', category: 'Soft Skills', initialProficiency: 70, halfLife: 6, lastPracticedAt: daysAgo(10) },
        { id: `${userId}-sk6`, name: 'Linear Algebra', category: 'Mathematics', initialProficiency: 65, halfLife: 5, lastPracticedAt: daysAgo(25) },
    ].map((s) => ({ ...s, userId, createdAt: daysAgo(40), updatedAt: s.lastPracticedAt, baseDecayRate: 0.1, adaptiveDecayMultiplier: 1.0 }));

    const bySkill = Object.fromEntries(skills.map((s) => [s.name, s]));

    const quickTests = [
        // React: consistently strong — clean decay-fit curve
        makeCompletedTest(bySkill['React Development'].id, userId, 'React Development', 30, 5),
        makeCompletedTest(bySkill['React Development'].id, userId, 'React Development', 20, 5),
        makeCompletedTest(bySkill['React Development'].id, userId, 'React Development', 10, 4),
        makeCompletedTest(bySkill['React Development'].id, userId, 'React Development', 3, 5),

        // Python: gradually fading — measurable decay
        makeCompletedTest(bySkill['Python Basics'].id, userId, 'Python Basics', 35, 5),
        makeCompletedTest(bySkill['Python Basics'].id, userId, 'Python Basics', 22, 4),
        makeCompletedTest(bySkill['Python Basics'].id, userId, 'Python Basics', 12, 3),
        makeCompletedTest(bySkill['Python Basics'].id, userId, 'Python Basics', 6, 3),

        // Public Speaking: one real anomaly (a sudden drop) for the z-score model
        makeCompletedTest(bySkill['Public Speaking'].id, userId, 'Public Speaking', 28, 4),
        makeCompletedTest(bySkill['Public Speaking'].id, userId, 'Public Speaking', 21, 4),
        makeCompletedTest(bySkill['Public Speaking'].id, userId, 'Public Speaking', 14, 1), // the anomaly
        makeCompletedTest(bySkill['Public Speaking'].id, userId, 'Public Speaking', 10, 4),

        // Linear Algebra: a couple of low-scoring attempts, feeds the at-risk score
        makeCompletedTest(bySkill['Linear Algebra'].id, userId, 'Linear Algebra', 25, 2),
        makeCompletedTest(bySkill['Linear Algebra'].id, userId, 'Linear Algebra', 15, 2),
    ];

    const calendarEvents = [
        { id: `${userId}-cal1`, userId, skillId: bySkill['Data Structures'].id, date: daysAgo(-2).slice(0, 10), type: 'scheduled', status: 'pending' },
        { id: `${userId}-cal2`, userId, skillId: bySkill['Linear Algebra'].id, date: daysAgo(-4).slice(0, 10), type: 'scheduled', status: 'pending' },
        { id: `${userId}-cal3`, userId, skillId: bySkill['React Development'].id, date: daysAgo(3).slice(0, 10), type: 'practice', status: 'completed' },
    ];

    const notes = [
        { id: `${userId}-note1`, userId, date: daysAgo(1).slice(0, 10), content: 'Reviewed React hooks today — useEffect cleanup still trips me up sometimes.' },
        { id: `${userId}-note2`, userId, date: daysAgo(10).slice(0, 10), content: 'Public speaking practice went rough this week, need to slow down and breathe.' },
    ];

    return { skills, quickTests, calendarEvents, notes };
}

export function buildMessages(adminId, studentId) {
    return [
        {
            fromUserId: adminId, toUserId: studentId, type: 'tip', subject: 'Linear Algebra is fading',
            content: "Your Linear Algebra retention has dropped below 40% — a quick 5-question test today would help a lot before it slips further.",
        },
        {
            fromUserId: studentId, toUserId: adminId, type: 'feedback', subject: 'Thanks!',
            content: 'Appreciate the heads up — scheduled a practice session for later this week.',
        },
    ];
}
