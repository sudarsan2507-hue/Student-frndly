import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
                <h2 style={{
                    margin: 0,
                    background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '-0.5px'
                }}>
                    Skill Tracker
                </h2>
                <nav style={{ display: 'flex', gap: '32px' }}>
                    <a
                        onClick={() => navigate('/dashboard')}
                        style={{
                            cursor: 'pointer',
                            color: '#cbd5e1',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '15px',
                            transition: 'all 0.3s',
                            position: 'relative',
                            padding: '4px 0'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = '#cbd5e1';
                        }}
                    >
                        Dashboard
                    </a>
                    <a
                        onClick={() => navigate('/skills')}
                        style={{
                            cursor: 'pointer',
                            color: '#cbd5e1',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '15px',
                            transition: 'all 0.3s',
                            position: 'relative',
                            padding: '4px 0'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = '#cbd5e1';
                        }}
                    >
                        Skills
                    </a>
                    <a
                        onClick={() => navigate('/knowledge')}
                        style={{
                            cursor: 'pointer',
                            color: '#cbd5e1',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '15px',
                            transition: 'all 0.3s',
                            position: 'relative',
                            padding: '4px 0'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = '#cbd5e1';
                        }}
                    >
                        Knowledge
                    </a>
                </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                    background: 'rgba(167, 139, 250, 0.1)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                }}>
                    <span style={{
                        color: '#a78bfa',
                        fontSize: '13px',
                        fontWeight: 600
                    }}>
                        {user?.email}
                    </span>
                    <span style={{
                        color: '#64748b',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600
                    }}>
                        {user?.role}
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '10px 24px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#fca5a5',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.target.style.color = '#ef4444';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 16px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.target.style.color = '#fca5a5';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Header;

