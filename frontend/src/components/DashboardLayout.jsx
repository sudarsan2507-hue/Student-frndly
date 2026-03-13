import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/skills': 'My Skills',
    '/knowledge': 'Knowledge Tracker',
    '/calendar': 'Calendar & Notes',
    '/messages': 'Messages',
    '/admin': 'Admin Overview',
};

const DashboardLayout = ({ children }) => {
    const location = useLocation();
    const title = PAGE_TITLES[location.pathname] || 'Dashboard';

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <main className="dashboard-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
