class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }

    getPendingStudents = async (req, res, next) => {
        try {
            const students = await this.adminService.getPendingStudents();
            res.json({ success: true, data: students });
        } catch (err) { next(err); }
    };

    approveStudent = async (req, res, next) => {
        try {
            const user = await this.adminService.approveStudent(req.params.userId);
            res.json({ success: true, message: 'Student approved', data: user });
        } catch (err) { next(err); }
    };

    rejectStudent = async (req, res, next) => {
        try {
            const user = await this.adminService.rejectStudent(req.params.userId);
            res.json({ success: true, message: 'Student rejected', data: user });
        } catch (err) { next(err); }
    };

    getAnalytics = async (req, res, next) => {
        try {
            const data = await this.adminService.getAllStudentAnalytics();
            res.json({ success: true, data });
        } catch (err) { next(err); }
    };

    sendMessage = async (req, res, next) => {
        try {
            const { studentId } = req.params;
            const { type, subject, content, meetingDate } = req.body;
            if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
            const msg = await this.adminService.sendMessage(req.user.id, studentId, { type, subject, content, meetingDate });
            res.status(201).json({ success: true, data: msg });
        } catch (err) { next(err); }
    };

    getStudentMessages = async (req, res, next) => {
        try {
            const msgs = await this.adminService.getStudentMessages(req.user.id, req.params.studentId);
            res.json({ success: true, data: msgs });
        } catch (err) { next(err); }
    };

    getStudentDetail = async (req, res, next) => {
        try {
            const detail = await this.adminService.getStudentDetail(req.params.studentId);
            res.json({ success: true, data: detail });
        } catch (err) { next(err); }
    };
}

export default AdminController;
