import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';
import api from '../services/api';
import './AdminDashboard.css';

/* ─── SVG Pie Chart ─────────────────────────────────────────── */
const PieChart = ({ data, size = 180 }) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!total) return <p className="no-data-text">No data available</p>;
    let cumAngle = -Math.PI / 2;
    const r = size / 2 - 14;
    const cx = size / 2;
    const slices = data.map(d => {
        const angle = (d.value / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(cumAngle);
        const y1 = cx + r * Math.sin(cumAngle);
        cumAngle += angle;
        const x2 = cx + r * Math.cos(cumAngle);
        const y2 = cx + r * Math.sin(cumAngle);
        return { ...d, path: `M${cx},${cx} L${x1},${y1} A${r},${r},0,${angle > Math.PI ? 1 : 0},1,${x2},${y2}Z`, pct: Math.round((d.value / total) * 100) };
    });
    return (
        <div className="chart-wrap">
            <svg width={size} height={size}>
                {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}><title>{s.label}: {s.pct}%</title></path>)}
                <text x={cx} y={cx - 4} textAnchor="middle" fill="#0f172a" fontSize={18} fontWeight="700">{total}</text>
                <text x={cx} y={cx + 14} textAnchor="middle" fill="#64748b" fontSize={10}>total</text>
            </svg>
            <div className="chart-legend">
                {slices.map((s, i) => (
                    <div key={i} className="legend-row">
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                        <span className="legend-name">{s.label}</span>
                        <span className="legend-pct">{s.pct}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Strength Bar ───────────────────────────────────────────── */
const StrengthBar = ({ value, max = 100, color }) => (
    <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }} />
    </div>
);

const getAccuracyColor = (v) => v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444';

/* ─── Student Card ───────────────────────────────────────────── */
const StudentCard = ({ student, onSelect, onSendMessage }) => {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[Math.abs(student.id.charCodeAt(0)) % colors.length];
    const initials = (student.name || student.email).slice(0, 2).toUpperCase();
    const statusCfg = { approved: ['#dcfce7', '#166534'], pending: ['#fef9c3', '#713f12'], rejected: ['#fee2e2', '#7f1d1d'] };
    const [bg, fg] = statusCfg[student.status] || ['#f1f5f9', '#334155'];

    return (
        <div className="student-card">
            <div className="student-card-header">
                <div className="student-avatar" style={{ background: color }}>{initials}</div>
                <div className="student-info">
                    <div className="student-name">{student.name || 'Unnamed Student'}</div>
                    <div className="student-email">{student.email}</div>
                </div>
                <span className="status-pill" style={{ background: bg, color: fg }}>{student.status}</span>
            </div>

            <div className="student-metrics">
                <div className="metric-row">
                    <span className="metric-key">Skills</span>
                    <span className="metric-val">{student.totalSkills}</span>
                </div>
                <div className="metric-row">
                    <span className="metric-key">Tests Taken</span>
                    <span className="metric-val">{student.totalTests}</span>
                </div>
                <div className="metric-row">
                    <span className="metric-key">Avg Accuracy</span>
                    <span className="metric-val" style={{ color: getAccuracyColor(student.avgAccuracy) }}>
                        {student.totalTests > 0 ? `${student.avgAccuracy}%` : '—'}
                    </span>
                </div>
                {student.totalTests > 0 && <StrengthBar value={student.avgAccuracy} color={getAccuracyColor(student.avgAccuracy)} />}
            </div>

            <div className="student-card-actions">
                <button className="card-btn card-btn--primary" onClick={() => onSelect(student)}>View Profile</button>
                <button className="card-btn card-btn--secondary" onClick={() => onSendMessage(student)}>Send Message</button>
            </div>
        </div>
    );
};

/* ─── Student Detail Modal ───────────────────────────────────── */
const StudentDetailModal = ({ student, onClose, onSendMessage }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/student/${student.id}`)
            .then(r => setDetail(r.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [student.id]);

    const skillCategories = {};
    (detail?.skills || []).forEach(s => {
        skillCategories[s.category] = (skillCategories[s.category] || 0) + 1;
    });
    const catPie = Object.entries(skillCategories).map(([label, value], i) => ({
        label, value, color: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][i % 5]
    }));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{detail?.name || student.name || 'Student'}</h2>
                        <span className="modal-subtitle">{detail?.email || student.email}</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>&#x2715;</button>
                </div>

                {loading ? (
                    <div className="modal-loading"><div className="spinner-sm" /></div>
                ) : (
                    <div className="modal-body">

                        {/* Stats row */}
                        <div className="detail-stats">
                            {[
                                { label: 'Total Skills', value: detail?.totalSkills || 0, color: '#6366f1' },
                                { label: 'Tests Taken', value: detail?.totalTests || 0, color: '#10b981' },
                                { label: 'Avg Accuracy', value: detail?.avgAccuracy ? `${detail.avgAccuracy}%` : '—', color: '#f59e0b' },
                            ].map((s, i) => (
                                <div key={i} className="detail-stat" style={{ borderTop: `3px solid ${s.color}` }}>
                                    <div className="detail-stat-val" style={{ color: s.color }}>{s.value}</div>
                                    <div className="detail-stat-lbl">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Skills & Category Chart */}
                        <div className="detail-section">
                            <h3 className="section-title">Skill Categories</h3>
                            {catPie.length > 0
                                ? <PieChart data={catPie} size={160} />
                                : <p className="no-data-text">No skills recorded yet</p>
                            }
                        </div>

                        {/* Skills table */}
                        {detail?.skills?.length > 0 && (
                            <div className="detail-section">
                                <h3 className="section-title">Skills</h3>
                                <table className="detail-table">
                                    <thead><tr><th>Skill</th><th>Category</th><th>Half-Life (days)</th></tr></thead>
                                    <tbody>
                                        {detail.skills.map(sk => (
                                            <tr key={sk.id}>
                                                <td>{sk.name}</td>
                                                <td>{sk.category}</td>
                                                <td>{sk.halfLife}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Recent tests */}
                        {detail?.tests?.length > 0 && (
                            <div className="detail-section">
                                <h3 className="section-title">Recent Tests</h3>
                                <table className="detail-table">
                                    <thead><tr><th>Skill</th><th>Accuracy</th><th>Date</th></tr></thead>
                                    <tbody>
                                        {detail.tests.slice(0, 5).map(t => (
                                            <tr key={t.id}>
                                                <td>{t.skillName || t.skillId}</td>
                                                <td>
                                                    <span style={{ color: getAccuracyColor(t.accuracy), fontWeight: 700 }}>
                                                        {t.accuracy}%
                                                    </span>
                                                </td>
                                                <td>{new Date(t.completedAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <button className="card-btn card-btn--primary" style={{ width: '100%', marginTop: 8 }}
                            onClick={() => { onClose(); onSendMessage(student); }}>
                            Send Message or Schedule Meeting
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Send Message Modal ─────────────────────────────────────── */
const SendMessageModal = ({ student, onClose, adminId }) => {
    const [form, setForm] = useState({ type: 'tip', subject: '', content: '', meetingDate: '' });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSend = async () => {
        if (!form.content.trim()) return;
        setSending(true);
        try {
            await api.post(`/admin/message/${student.id}`, form);
            setSent(true);
            setTimeout(onClose, 1500);
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to send');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel modal-panel--sm" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Send Message</h2>
                        <span className="modal-subtitle">To: {student.name || student.email}</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>&#x2715;</button>
                </div>

                {sent ? (
                    <div className="modal-sent">Message delivered successfully.</div>
                ) : (
                    <div className="modal-body">
                        <div className="form-field">
                            <label className="form-label">Type</label>
                            <select name="type" value={form.type} onChange={onChange} className="form-select">
                                <option value="tip">Tip / Feedback</option>
                                <option value="meeting">Meeting Invite</option>
                                <option value="alert">Academic Alert</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label className="form-label">Subject</label>
                            <input name="subject" value={form.subject} onChange={onChange}
                                placeholder="e.g. Review your JavaScript skills" className="form-input" />
                        </div>
                        {form.type === 'meeting' && (
                            <div className="form-field">
                                <label className="form-label">Meeting Date &amp; Time</label>
                                <input type="datetime-local" name="meetingDate" value={form.meetingDate}
                                    onChange={onChange} className="form-input" />
                            </div>
                        )}
                        <div className="form-field">
                            <label className="form-label">Message</label>
                            <textarea name="content" value={form.content} onChange={onChange}
                                placeholder="Write your message here..." rows={4} className="form-textarea" />
                        </div>
                        <button className="card-btn card-btn--primary" style={{ width: '100%' }}
                            onClick={handleSend} disabled={sending || !form.content.trim()}>
                            {sending ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Main AdminDashboard ────────────────────────────────────── */
const AdminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [messageTarget, setMessageTarget] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await adminService.getAnalytics();
            setData(res.data);
            setLastRefresh(new Date());
            setError('');
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load admin data');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, [load]);

    if (loading) return <div className="admin-loading"><div className="spinner" /><p>Loading…</p></div>;
    if (error) return <div className="admin-error"><p>{error}</p><button onClick={load} className="card-btn card-btn--primary">Retry</button></div>;
    if (!data) return null;

    const { summary, retentionDistribution, students } = data;
    const pending = students.filter(s => s.status === 'pending');
    const approved = students.filter(s => s.status === 'approved');
    const filteredStudents = students.filter(s =>
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const statusPie = [
        { label: 'Approved', value: summary.approved, color: '#10b981' },
        { label: 'Pending', value: summary.pending, color: '#f59e0b' },
        { label: 'Rejected', value: summary.rejected, color: '#ef4444' },
    ];
    const retentionPie = [
        { label: 'Strong', value: retentionDistribution.Strong || 0, color: '#10b981' },
        { label: 'Stable', value: retentionDistribution.Stable || 0, color: '#6366f1' },
        { label: 'Fading', value: retentionDistribution.Fading || 0, color: '#f59e0b' },
        { label: 'Critical', value: retentionDistribution.Critical || 0, color: '#ef4444' },
    ];

    return (
        <div className="admin-page">

            {/* Modals */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onSendMessage={s => { setSelectedStudent(null); setMessageTarget(s); }}
                />
            )}
            {messageTarget && (
                <SendMessageModal
                    student={messageTarget}
                    onClose={() => setMessageTarget(null)}
                />
            )}

            {/* Page Header */}
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">Overview</h1>
                    <p className="admin-subtitle">
                        Administrator Panel &mdash; {students.length} students &bull; last updated {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <button className="refresh-btn" onClick={load}>Refresh</button>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                {[
                    { label: 'Total Students', value: summary.total, color: '#6366f1' },
                    { label: 'Approved', value: summary.approved, color: '#10b981' },
                    { label: 'Pending Review', value: summary.pending, color: '#f59e0b' },
                    { label: 'Rejected', value: summary.rejected, color: '#ef4444' },
                ].map((c, i) => (
                    <div key={i} className="summary-card" style={{ borderTop: `3px solid ${c.color}` }}>
                        <div className="summary-num" style={{ color: c.color }}>{c.value}</div>
                        <div className="summary-lbl">{c.label}</div>
                        {c.label === 'Pending Review' && c.value > 0 && (
                            <div className="summary-action" onClick={() => setActiveTab('approvals')}>
                                {c.value} need action &rarr;
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                <div className="chart-card">
                    <h3 className="chart-title">Student Status</h3>
                    <PieChart data={statusPie} size={180} />
                </div>
                <div className="chart-card">
                    <h3 className="chart-title">Skill Retention</h3>
                    <PieChart data={retentionPie} size={180} />
                </div>
                <div className="chart-card chart-card--bar">
                    <h3 className="chart-title">Accuracy by Student</h3>
                    <div className="bar-list">
                        {approved.filter(s => s.totalTests > 0).slice(0, 8).map(s => (
                            <div key={s.id} className="bar-row">
                                <span className="bar-name">{s.name || s.email.split('@')[0]}</span>
                                <div className="bar-track">
                                    <div className="bar-fill" style={{
                                        width: `${s.avgAccuracy}%`,
                                        background: getAccuracyColor(s.avgAccuracy)
                                    }} />
                                    <span className="bar-val">{s.avgAccuracy}%</span>
                                </div>
                            </div>
                        ))}
                        {approved.filter(s => s.totalTests > 0).length === 0 && (
                            <p className="no-data-text">No test data yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                {[
                    { key: 'overview', label: 'All Students' },
                    { key: 'approvals', label: `Pending Approvals${pending.length > 0 ? ` (${pending.length})` : ''}` },
                ].map(tab => (
                    <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}>
                        {tab.label}
                    </button>
                ))}
                <div className="tab-search">
                    <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
                </div>
            </div>

            {/* All Students — Card Grid */}
            {activeTab === 'overview' && (
                <div className="student-grid">
                    {filteredStudents.length === 0 && <p className="no-data-text">No students found.</p>}
                    {filteredStudents.map(s => (
                        <StudentCard key={s.id} student={s}
                            onSelect={setSelectedStudent}
                            onSendMessage={setMessageTarget}
                        />
                    ))}
                </div>
            )}

            {/* Pending Approvals Table */}
            {activeTab === 'approvals' && (
                <PendingTable students={pending} onRefresh={load} />
            )}
        </div>
    );
};

/* ─── Pending Approvals Table ────────────────────────────────── */
const PendingTable = ({ students, onRefresh }) => {
    const [busy, setBusy] = useState({});

    const act = async (id, action) => {
        setBusy(p => ({ ...p, [id]: action }));
        try {
            await (action === 'approve' ? adminService.approve(id) : adminService.reject(id));
            onRefresh();
        } catch (e) { alert(e.response?.data?.message || 'Action failed'); }
        finally { setBusy(p => { const n = { ...p }; delete n[id]; return n; }); }
    };

    if (!students.length) return <div className="empty-state">No pending approvals at this time.</div>;

    return (
        <div className="table-card">
            <table className="data-table">
                <thead>
                    <tr><th>Name</th><th>Email</th><th>Registered</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {students.map(s => (
                        <tr key={s.id}>
                            <td>{s.name || '—'}</td>
                            <td>{s.email}</td>
                            <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button className="approve-btn" disabled={!!busy[s.id]}
                                    onClick={() => act(s.id, 'approve')}>
                                    {busy[s.id] === 'approve' ? '…' : 'Approve'}
                                </button>
                                <button className="reject-btn" disabled={!!busy[s.id]}
                                    onClick={() => act(s.id, 'reject')}>
                                    {busy[s.id] === 'reject' ? '…' : 'Reject'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboard;
