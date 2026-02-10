import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/skills', icon: '🎯', label: 'Skills' },
        { path: '/knowledge', icon: '🧠', label: 'Knowledge' },
        { path: '/calendar', icon: '📅', label: 'Calendar' }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <span className="logo-icon">📚</span>
                    <span className="logo-text">Skill Tracker</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                        title={item.label}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-version">v1.0.0</div>
            </div>
        </aside>
    );
};

export default Sidebar;
