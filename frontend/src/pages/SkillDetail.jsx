import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import skillService from '../services/skillService';
import retentionService from '../services/retentionService';
import './SkillDetail.css';

const SkillDetail = () => {
    const { skillId } = useParams();
    const navigate = useNavigate();

    const [skill, setSkill] = useState(null);
    const [retention, setRetention] = useState(null);
    const [threshold, setThreshold] = useState(50);
    const [thresholdResult, setThresholdResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [thresholdLoading, setThresholdLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadSkill = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await skillService.getSkillById(skillId);
                const skillData = response?.data || response;

                if (!skillData) {
                    setError('Skill not found');
                    return;
                }

                setSkill(skillData);

                setPredictionLoading(true);
                try {
                    const retentionData = await retentionService.predictRetention(skillId);
                    setRetention(retentionData);
                } catch (predictionError) {
                    console.error('Retention prediction error:', predictionError);
                } finally {
                    setPredictionLoading(false);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load skill details');
            } finally {
                setLoading(false);
            }
        };

        if (skillId) loadSkill();
    }, [skillId]);

    const strengthColor = useMemo(() => {
        const strength = skill?.currentStrength ?? 0;
        if (strength >= 70) return '#10b981';
        if (strength >= 40) return '#f59e0b';
        return '#ef4444';
    }, [skill]);

    const riskLabel = useMemo(() => {
        const strength = skill?.currentStrength ?? 0;
        if (strength >= 70) return { label: 'Strong retention', tone: 'good' };
        if (strength >= 40) return { label: 'Needs review', tone: 'warn' };
        return { label: 'High risk', tone: 'danger' };
    }, [skill]);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const handlePredictThreshold = async () => {
        try {
            setThresholdLoading(true);
            setThresholdResult(null);
            const data = await retentionService.estimateThresholdDate(skillId, Number(threshold));
            setThresholdResult(data);
        } catch (err) {
            setThresholdResult({ error: err.response?.data?.error || err.message || 'Failed to estimate threshold date' });
        } finally {
            setThresholdLoading(false);
        }
    };

    const handleMarkAsPracticed = async () => {
        try {
            await skillService.markAsPracticed(skillId);
            const refreshed = await skillService.getSkillById(skillId);
            const refreshedData = refreshed?.data || refreshed;
            setSkill(refreshedData);
            const updatedRetention = await retentionService.predictRetention(skillId);
            setRetention(updatedRetention);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark skill as practiced');
        }
    };

    const handleStartTest = () => {
        navigate('/skills', { state: { startTestSkillId: skillId } });
    };

    if (loading) {
        return (
            <div className="skill-detail-page">
                <div className="skill-detail-shell loading-shell">
                    <div className="detail-spinner" />
                    <p>Loading skill details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="skill-detail-page">
                <div className="skill-detail-shell error-shell">
                    <h2>Couldn’t load skill</h2>
                    <p>{error}</p>
                    <div className="detail-actions">
                        <button className="detail-btn secondary" onClick={() => navigate('/skills')}>Back to Skills</button>
                        <button className="detail-btn primary" onClick={() => window.location.reload()}>Try again</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="skill-detail-page">
            <div className="skill-detail-shell">
                <button className="back-link" onClick={() => navigate('/skills')}>
                    ← Back to Skills
                </button>

                <div className="detail-hero">
                    <div>
                        <p className="detail-kicker">Retention overview</p>
                        <h1>{skill?.name}</h1>
                        <div className="detail-meta-row">
                            <span className="detail-pill">{skill?.category || 'General'}</span>
                            <span className={`detail-pill ${riskLabel.tone}`}>{riskLabel.label}</span>
                        </div>
                    </div>

                    <div className="hero-score-card" style={{ borderColor: `${strengthColor}22` }}>
                        <span className="hero-score-label">Current Strength</span>
                        <span className="hero-score-value" style={{ color: strengthColor }}>
                            {skill?.currentStrength ?? 0}%
                        </span>
                        <span className="hero-score-sub">Last practiced {formatDate(skill?.lastPracticedAt)}</span>
                    </div>
                </div>

                <div className="detail-grid">
                    <section className="detail-card stats-card">
                        <h2>Skill stats</h2>
                        <div className="stats-grid">
                            <div className="stat-box">
                                <span className="stat-label">Days idle</span>
                                <strong>{Math.floor(skill?.daysSinceLastPractice || 0)}</strong>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">Initial proficiency</span>
                                <strong>{skill?.initialProficiency ?? 50}%</strong>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">Half-life</span>
                                <strong>{skill?.halfLife ?? 7} days</strong>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">Adaptive multiplier</span>
                                <strong>{skill?.adaptiveDecayMultiplier ?? 1}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="detail-card retention-card">
                        <div className="card-header-row">
                            <h2>Retention prediction</h2>
                            <button className="detail-btn secondary small" onClick={handleMarkAsPracticed}>Mark practiced</button>
                        </div>

                        <div className="retention-visual">
                            <div className="retention-ring" style={{ '--retention-accent': strengthColor }}>
                                <div className="retention-ring-inner">
                                    <span className="ring-label">Retention</span>
                                    <span className="ring-value">{predictionLoading ? '...' : `${retention?.retention ?? 0}%`}</span>
                                </div>
                            </div>

                            <div className="retention-summary">
                                <p>{retention?.explanation || 'Fetching your retention score helps estimate how much of the skill is still active.'}</p>
                                <div className="mini-grid">
                                    <div>
                                        <span>Days unpracticed</span>
                                        <strong>{predictionLoading ? '...' : (retention?.daysUnpracticed ?? '—')}</strong>
                                    </div>
                                    <div>
                                        <span>Decay factor</span>
                                        <strong>{predictionLoading ? '...' : (retention?.decayFactor ?? '—')}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="detail-card threshold-card">
                        <h2>Threshold estimate</h2>
                        <p className="subtle-text">See when this skill will fall below a chosen retention level.</p>

                        <div className="threshold-controls">
                            <label>
                                Threshold (%)
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={threshold}
                                    onChange={(e) => setThreshold(e.target.value)}
                                />
                            </label>
                            <button className="detail-btn primary" onClick={handlePredictThreshold} disabled={thresholdLoading}>
                                {thresholdLoading ? 'Estimating...' : 'Estimate date'}
                            </button>
                        </div>

                        {thresholdResult && !thresholdResult.error && (
                            <div className="threshold-result">
                                <div>
                                    <span>Days until threshold</span>
                                    <strong>{thresholdResult.daysUntilThreshold}</strong>
                                </div>
                                <div>
                                    <span>Estimated date</span>
                                    <strong>{formatDate(thresholdResult.estimatedDate)}</strong>
                                </div>
                            </div>
                        )}

                        {thresholdResult?.error && (
                            <div className="threshold-error">{thresholdResult.error}</div>
                        )}
                    </section>

                    <section className="detail-card action-card">
                        <h2>Actions</h2>
                        <div className="detail-actions stack">
                            <button className="detail-btn primary" onClick={handleStartTest}>Take quick test</button>
                            <button className="detail-btn secondary" onClick={() => navigate('/calendar', { state: { scheduleSkill: skill } })}>Schedule practice</button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SkillDetail;
