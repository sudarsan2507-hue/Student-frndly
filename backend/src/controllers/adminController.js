/**
 * Admin controller
 * Handles admin API endpoints — all routes are admin-only
 */
class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }

    /** GET /api/admin/pending */
    getPendingStudents = async (req, res, next) => {
        try {
            const students = await this.adminService.getPendingStudents();
            res.json({ success: true, data: students });
        } catch (err) { next(err); }
    };

    /** POST /api/admin/approve/:userId */
    approveStudent = async (req, res, next) => {
        try {
            const user = await this.adminService.approveStudent(req.params.userId);
            res.json({ success: true, message: 'Student approved', data: user });
        } catch (err) { next(err); }
    };

    /** POST /api/admin/reject/:userId */
    rejectStudent = async (req, res, next) => {
        try {
            const user = await this.adminService.rejectStudent(req.params.userId);
            res.json({ success: true, message: 'Student rejected', data: user });
        } catch (err) { next(err); }
    };

    /** GET /api/admin/analytics */
    getAnalytics = async (req, res, next) => {
        try {
            const data = await this.adminService.getAllStudentAnalytics();
            res.json({ success: true, data });
        } catch (err) { next(err); }
    };

    /** POST /api/admin/message/:studentId — send a message/tip/meeting */
    sendMessage = async (req, res, next) => {
        try {
            const { studentId } = req.params;
            const { type, subject, content, meetingDate } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
            const msg = await this.adminService.sendMessage(req.user.id, studentId, { type, subject, content, meetingDate });
            res.status(201).json({ success: true, data: msg });
        } catch (err) { next(err); }
    };

    /** GET /api/admin/messages/:studentId — get messages sent to a student */
    getStudentMessages = async (req, res, next) => {
        try {
            const msgs = this.adminService.storage.findMessagesSentByAdmin(req.user.id, req.params.studentId);
            res.json({ success: true, data: msgs });
        } catch (err) { next(err); }
    };

    /** GET /api/admin/student/:studentId — get full student detail */
    getStudentDetail = async (req, res, next) => {
        try {
            const detail = await this.adminService.getStudentDetail(req.params.studentId);
            res.json({ success: true, data: detail });
        } catch (err) { next(err); }
    };
}

export default AdminController;
