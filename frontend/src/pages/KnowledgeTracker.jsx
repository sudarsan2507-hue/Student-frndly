import React, { useState, useEffect } from 'react';
import knowledgeService from '../services/knowledgeService';
import './KnowledgeTracker.css';

const KnowledgeTracker = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSlowLoading, setIsSlowLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        let slowLoadingTimer;

        try {
            setLoading(true);
            setIsSlowLoading(false);
            setError('');

            slowLoadingTimer = setTimeout(() => {
                setIsSlowLoading(true);
            }, 5000);

            const response = await knowledgeService.getOverview({ timeoutMs: 12000 });
            const overviewData = response?.data;

            if (!overviewData || !Array.isArray(overviewData.skills) || !overviewData.stats) {
                throw new Error('Received unexpected knowledge data format');
            }

            setData(overviewData);
        } catch (err) {
            if (err.code === 'ECONNABORTED') {
                setError('Knowledge analysis timed out. Please retry.');
            } else {
                setError(err.response?.data?.message || err.message || 'Failed to load knowledge data');
            }
        } finally {
            clearTimeout(slowLoadingTimer);
            setLoading(false);
            setIsSlowLoading(false);
        }
    };

    const getStrengthColor = (strength) => {
        if (strength >= 70) return '#10b981';
        if (strength >= 40) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) {
        return (
            <div className="knowledge-loading">
                <div className="spinner"></div>
                <p>Analyzing learning patterns...</p>
                {isSlowLoading && (
                    <>
                        <p className="knowledge-loading-subtext">This is taking longer than usual.</p>
                        <button onClick={loadData} className="retry-btn">Retry now</button>
                    </>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="knowledge-error">
                <p>{error}</p>
                <button onClick={loadData} className="retry-btn">Retry</button>
            </div>
        );
    }

    if (!data || !data.skills || data.skills.length === 0) {
        return (
            <div className="knowledge-empty">
                <h3>No Map Available Yet</h3>
                <p>Start learning skills to generate your knowledge graph.</p>
            </div>
        );
    }

    const { skills, stats } = data;

    return (
        <div className="knowledge-page">
            {/* Header Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <span>🧠</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.averageStrength}%</div>
                        <div className="stat-label">Brain Health</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <span>💪</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.skillsStrong}</div>
                        <div className="stat-label">Mastered Skills</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                        <span>⚠️</span>
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.skillsNeedingAttention}</div>
                        <div className="stat-label">At Risk</div>
                    </div>
                </div>
            </div>

            {/* Insight Cards */}
            <div className="insights-container">
                <h2 style={{ color: '#1e293b', marginBottom: '24px' }}>Knowledge Analysis</h2>

                {skills.map(skill => (
                    <div key={skill.id} className="insight-card">
                        <div className="insight-header">
                            <div className="insight-title">
                                <h3>{skill.name} <span className="insight-category">{skill.category}</span></h3>
                            </div>
                            <div className="insight-badges">
                                <div className="status-badge" style={{
                                    backgroundColor: `${skill.statusColor}20`,
                                    color: skill.statusColor,
                                    border: `1px solid ${skill.statusColor}40`
                                }}>
                                    <span className="status-dot" style={{ background: skill.statusColor, width: 8, height: 8, borderRadius: '50%' }}></span>
                                    {skill.retentionStatus}
                                </div>
                            </div>
                        </div>

                        <div className="insight-body">
                            <div className="metric-column">
                                <div className="metric-item">
                                    <span className="metric-label">Current Strength</span>
                                    <span className="metric-value" style={{ color: getStrengthColor(skill.currentStrength) }}>
                                        {skill.currentStrength}%
                                    </span>
                                </div>
                                <div className="strength-bar-mini">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${skill.currentStrength}%`,
                                            background: getStrengthColor(skill.currentStrength)
                                        }}
                                    />
                                </div>

                                <div className="metric-item" style={{ marginTop: '12px' }}>
                                    <span className="metric-label">Test Performance</span>
                                    <div className="test-history-mini">
                                        {skill.recentTests && skill.recentTests.slice().reverse().map((test, i) => (
                                            <div
                                                key={i}
                                                className="history-bar"
                                                title={`Score: ${test.accuracy}%`}
                                                style={{
                                                    height: `${Math.max(20, test.accuracy)}%`,
                                                    backgroundColor: test.accuracy >= 80 ? '#10b981' : test.accuracy >= 50 ? '#f59e0b' : '#ef4444'
                                                }}
                                            />
                                        ))}
                                        {(!skill.recentTests || skill.recentTests.length === 0) && <span style={{ fontSize: '12px', color: '#64748b' }}>No data</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="explanation-column">
                                <div className="explanation-title">Insight</div>
                                <div className="explanation-text">
                                    {skill.decayExplanation}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KnowledgeTracker;
