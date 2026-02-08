import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <div className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1 className="page-title">{getPageTitle(window.location.pathname)}</h1>
                    </div>

                    <div className="header-right">
                        <div className="user-info">
                            <div className="user-avatar">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                                <span className="user-email">{user?.email}</span>
                                <span className="user-role">{user?.role}</span>
                            </div>
                        </div>

                        <button className="logout-btn" onClick={handleLogout}>
                            <span>🚪</span>
                            Logout
                        </button>
                    </div>
                </header>

                <main className="dashboard-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

const getPageTitle = (pathname) => {
    if (pathname.includes('/skills')) return 'My Skills';
    if (pathname.includes('/knowledge')) return 'Knowledge Tracker';
    if (pathname.includes('/dashboard')) return 'Dashboard';
    return 'Skill Tracker';
};

export default DashboardLayout;
