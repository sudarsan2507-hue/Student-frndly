import logger from '../utils/logger.js';

const MIN_SKILL_STRENGTH = 10;

class AdminService {
    constructor(storage, skillService) {
        this._storage = storage;
        this.skillService = skillService;
    }

    async getPendingStudents() {
        return this._storage.getPendingUsers();
    }

    async approveStudent(adminId, userId) {
        const user = await this._storage.findUserById(userId);
        if (!user) throw new Error('User not found');
        if (user.role === 'admin') throw new Error('Cannot change admin status');
        const updated = this._storage.approveUser(userId);
        this._storage.insertAuditLog({ adminId, action: 'approve', targetId: userId, details: { email: user.email } });
        return updated;
    }

    async rejectStudent(adminId, userId) {
        const user = await this._storage.findUserById(userId);
        if (!user) throw new Error('User not found');
        if (user.role === 'admin') throw new Error('Cannot change admin status');
        const updated = this._storage.rejectUser(userId);
        this._storage.insertAuditLog({ adminId, action: 'reject', targetId: userId, details: { email: user.email } });
        return updated;
    }

    async getAllStudentAnalytics() {
        const students = await this._storage.getAllStudentsWithStats();

        const total = students.length;
        const approved = students.filter(s => s.status === 'approved').length;
        const pending = students.filter(s => s.status === 'pending').length;
        const rejected = students.filter(s => s.status === 'rejected').length;

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

    async sendMessage(fromId, toId, { type, subject, content, meetingDate }) {
        const student = await this._storage.findUserById(toId);
        if (!student) throw new Error('Student not found');
        const msg = this._storage.createMessage({ fromUserId: fromId, toUserId: toId, type, subject, content, meetingDate });
        this._storage.insertAuditLog({ adminId: fromId, action: 'send_message', targetId: toId, details: { type, subject } });
        return msg;
    }

    async getAuditLog({ limit = 100, offset = 0 } = {}) {
        return this._storage.getAuditLog({ limit, offset });
    }

    async getStudentMessages(adminId, studentId) {
        return this._storage.findMessagesSentByAdmin(adminId, studentId);
    }

    async getStudentDetail(studentId) {
        const student = await this._storage.findUserById(studentId);
        if (!student) throw new Error('Student not found');

        const skills = await this._storage.findSkillsByUserId(studentId);
        const tests = await this._storage.findQuickTestsByUserId(studentId);
        const completedTests = tests.filter(t => t.completedAt != null)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        const avgAccuracy = completedTests.length > 0
            ? Math.round(completedTests.reduce((s, t) => s + (Number(t.accuracy) || 0), 0) / completedTests.length)
            : 0;

        return {
            id: student.id,
            name: student.name,
            email: student.email,
            status: student.status,
            createdAt: student.createdAt,
            skills,
            tests: completedTests,
            avgAccuracy,
            totalSkills: skills.length,
            totalTests: completedTests.length
        };
    }
}

export default AdminService;
