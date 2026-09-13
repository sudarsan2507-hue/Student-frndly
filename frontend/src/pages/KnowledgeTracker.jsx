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
            <header className="kt-head">
                <h1>Knowledge</h1>
                <p>How well your understanding is holding up, skill by skill.</p>
            </header>

            {/* Header Stats */}
            <dl className="kt-stats">
                <div>
                    <dt>Average strength</dt>
                    <dd>{stats.averageStrength}<small>%</small></dd>
                </div>
                <div>
                    <dt>Mastered</dt>
                    <dd>{stats.skillsStrong}</dd>
                </div>
                <div className={stats.skillsNeedingAttention ? 'is-weak' : ''}>
                    <dt>Needs attention</dt>
                    <dd>{stats.skillsNeedingAttention}</dd>
                </div>
            </dl>

            {/* Insight Cards */}
            <div className="insights-container">
                <h2 className="kt-section-title">Skill by skill</h2>

                {skills.map(skill => (
                    <div key={skill.id} className="insight-card">
                        <div className="insight-header">
                            <div className="insight-title">
                                <h3>{skill.name}</h3>
                                <span className="insight-category">{skill.category}</span>
                            </div>
                            <div className="status-badge" style={{ color: skill.statusColor }}>
                                <span className="status-dot" style={{ background: skill.statusColor }} />
                                {skill.retentionStatus}
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
                                        {(!skill.recentTests || skill.recentTests.length === 0) && <span className="test-history-empty">No tests yet</span>}
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
