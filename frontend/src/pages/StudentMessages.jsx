import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './StudentMessages.css';

const TYPE_CONFIG = {
    tip: { label: 'Tip', color: '#6366f1', bg: '#eef2ff' },
    meeting: { label: 'Meeting', color: '#0891b2', bg: '#ecfeff' },
    alert: { label: 'Alert', color: '#dc2626', bg: '#fef2f2' },
};

const StudentMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);

    const load = async () => {
        try {
            const res = await api.get('/messages');
            setMessages(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const markRead = async (id) => {
        await api.post(`/messages/${id}/read`).catch(() => { });
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: 1 } : m));
    };

    const toggleExpand = (msg) => {
        setExpanded(expanded === msg.id ? null : msg.id);
        if (!msg.isRead) markRead(msg.id);
    };

    const unread = messages.filter(m => !m.isRead).length;

    return (
        <div className="sm-page">
            <div className="sm-header">
                <div>
                    <h1 className="sm-title">Messages from Admin</h1>
                    <p className="sm-subtitle">
                        {loading ? 'Loading...' : `${messages.length} messages${unread > 0 ? ` · ${unread} unread` : ''}`}
                    </p>
                </div>
            </div>

            {loading && <div className="sm-loading"><div className="spinner-sm" /></div>}

            {!loading && messages.length === 0 && (
                <div className="sm-empty">
                    <div className="sm-empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                    </div>
                    <p>No messages yet. Check back later.</p>
                </div>
            )}

            <div className="sm-list">
                {messages.map(msg => {
                    const tc = TYPE_CONFIG[msg.type] || TYPE_CONFIG.tip;
                    const isOpen = expanded === msg.id;
                    return (
                        <div
                            key={msg.id}
                            className={`sm-item ${!msg.isRead ? 'sm-item--unread' : ''} ${isOpen ? 'sm-item--open' : ''}`}
                            onClick={() => toggleExpand(msg)}
                        >
                            <div className="sm-item-header">
                                <div className="sm-type-badge" style={{ background: tc.bg, color: tc.color }}>
                                    {tc.label}
                                </div>
                                <div className="sm-meta">
                                    <span className="sm-from">From: {msg.fromName || msg.fromEmail}</span>
                                    <span className="sm-date">{new Date(msg.createdAt).toLocaleString()}</span>
                                </div>
                                {!msg.isRead && <span className="sm-unread-dot" />}
                            </div>

                            <div className="sm-subject">
                                {msg.subject || (msg.type === 'meeting' ? 'Meeting Invitation' : 'Message from Administrator')}
                            </div>

                            {isOpen && (
                                <div className="sm-body">
                                    <p className="sm-content">{msg.content}</p>
                                    {msg.meetingDate && (
                                        <div className="sm-meeting-box">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            <div>
                                                <div className="sm-meeting-label">Scheduled Meeting</div>
                                                <div className="sm-meeting-time">
                                                    {new Date(msg.meetingDate).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentMessages;
