import api from './api';

const adminService = {
    /** Get pending student approvals */
    getPending: () => api.get('/admin/pending').then(r => r.data),

    /** Approve a student */
    approve: (userId) => api.post(`/admin/approve/${userId}`).then(r => r.data),

    /** Reject a student */
    reject: (userId) => api.post(`/admin/reject/${userId}`).then(r => r.data),

    /** Full student analytics for the dashboard */
    getAnalytics: () => api.get('/admin/analytics').then(r => r.data),
};

export default adminService;
