/**
 * Admin service
 * Business logic for admin operations: approvals, student analytics
 */
class AdminService {
    constructor(storage, skillService) {
        this.storage = storage;  // exposed for direct queries in controller
        this.skillService = skillService;
    }

    /** Get all pending approval requests */
    async getPendingStudents() {
        return this.storage.getPendingUsers();
    }

    /** Approve a student account */
    async approveStudent(userId) {
        const user = await this.storage.findUserById(userId);
        if (!user) throw new Error('User not found');
        if (user.role === 'admin') throw new Error('Cannot change admin status');
        return this.storage.approveUser(userId);
    }

    /** Reject a student account */
    async rejectStudent(userId) {
        const user = await this.storage.findUserById(userId);
        if (!user) throw new Error('User not found');
        if (user.role === 'admin') throw new Error('Cannot change admin status');
        return this.storage.rejectUser(userId);
    }

    /**
     * Get all students with their skill analytics
     * Used for the admin real-time dashboard
     */
    async getAllStudentAnalytics() {
        const students = await this.storage.getAllStudentsWithStats();

        // Aggregate across all students
        const total = students.length;
        const approved = students.filter(s => s.status === 'approved').length;
        const pending = students.filter(s => s.status === 'pending').length;
        const rejected = students.filter(s => s.status === 'rejected').length;

        // Skill retention distribution across all students
        const retentionCounts = { Strong: 0, Stable: 0, Fading: 0, Critical: 0 };
        const allSkills = students.flatMap(s => (s.skills || []).map(sk => ({
            ...sk,
            daysSinceLastPractice: sk.lastPracticedAt
                ? Math.max(0, (Date.now() - new Date(sk.lastPracticedAt)) / 86400000)
                : 999
        })));

        allSkills.forEach(skill => {
            const multiplier = skill.adaptiveDecayMultiplier || 1.0;
            const halfLife = skill.halfLife || 7;
            const days = skill.daysSinceLastPractice || 0;
            let status = 'Stable';
            if (multiplier < 0.8) status = 'Strong';
            else if (multiplier > 1.2) status = 'Critical';
            if (days > halfLife * 2) status = 'Fading';
            retentionCounts[status] = (retentionCounts[status] || 0) + 1;
        });

        return {
            summary: { total, approved, pending, rejected },
            retentionDistribution: retentionCounts,
            students
        };
    }
    /** Send a message/tip/meeting invite from admin to a student */
    async sendMessage(fromId, toId, { type, subject, content, meetingDate }) {
        const student = await this.storage.findUserById(toId);
        if (!student) throw new Error('Student not found');
        return this.storage.createMessage({ fromUserId: fromId, toUserId: toId, type, subject, content, meetingDate });
    }

    /** Get full student detail: profile + skills + tests + messages */
    async getStudentDetail(studentId) {
        const student = await this.storage.findUserById(studentId);
        if (!student) throw new Error('Student not found');
        const skills = this.storage.db.prepare(`SELECT * FROM skills WHERE userId = ?`).all(studentId);
        const tests = this.storage.db.prepare(`SELECT * FROM quick_tests WHERE userId = ? AND completedAt IS NOT NULL ORDER BY completedAt DESC`).all(studentId);
        const avgAccuracy = tests.length > 0
            ? Math.round(tests.reduce((s, t) => s + (Number(t.accuracy) || 0), 0) / tests.length)
            : 0;
        return {
            id: student.id, name: student.name, email: student.email,
            status: student.status, createdAt: student.createdAt,
            skills, tests, avgAccuracy,
            totalSkills: skills.length, totalTests: tests.length
        };
    }
}

export default AdminService;
