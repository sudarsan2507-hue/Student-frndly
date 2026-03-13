import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = {
    student: [
        { path: '/dashboard', icon: 'grid', label: 'Dashboard' },
        { path: '/skills', icon: 'target', label: 'Skills' },
        { path: '/knowledge', icon: 'brain', label: 'Knowledge' },
        { path: '/calendar', icon: 'calendar', label: 'Calendar' },
        { path: '/messages', icon: 'mail', label: 'Messages', badge: true },
    ],
    admin: [
        { path: '/admin', icon: 'monitor', label: 'Overview' },
        { path: '/admin/students', icon: 'users', label: 'Students' },
    ]
};

const SVGIcon = ({ name }) => {
    const icons = {
        grid: <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" />,
        target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
        brain: <path d="M9.5 2a2.5 2.5 0 0 1 5 0c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5c0-2.76 2.24-5 5-5zm2.5 13v4m-4-2h8" />,
        calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
        mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
        monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
        users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
        logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    };
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {icons[name]}
        </svg>
    );
};

const Sidebar = ({ unreadCount = 0 }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const items = NAV_ITEMS[user?.role] || NAV_ITEMS.student;
    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="sidebar-brand">StudentFrndly</span>
                {user?.role === 'admin' && <span className="sidebar-role-badge">Administrator</span>}
            </div>

            <nav className="sidebar-nav">
                {items.map(item => (
                    <button
                        key={item.path}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="nav-icon"><SVGIcon name={item.icon} /></span>
                        <span className="nav-label">{item.label}</span>
                        {item.badge && unreadCount > 0 && (
                            <span className="nav-unread">{unreadCount}</span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="user-avatar-small">{user?.email?.charAt(0).toUpperCase()}</div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user?.name || user?.email?.split('@')[0]}</span>
                        <span className="sidebar-user-role">{user?.role}</span>
                    </div>
                </div>
                <button className="nav-item logout-item" onClick={handleLogout}>
                    <span className="nav-icon"><SVGIcon name="logout" /></span>
                    <span className="nav-label">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
