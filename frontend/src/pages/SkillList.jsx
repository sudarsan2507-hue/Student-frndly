import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickTest from '../components/QuickTest';
import TestResults from '../components/TestResults';
import skillService from '../services/skillService';
import './SkillList.css';

const SkillList = () => {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Quick Test states
    const [activeTest, setActiveTest] = useState(null);
    const [testResults, setTestResults] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category: 'General',
        initialProficiency: 70
    });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        loadSkills();
    }, []);

    const loadSkills = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await skillService.getUserSkills();
            setSkills(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load skills');
        } finally {
            setLoading(false);
        }
    };

    // Derived State: Today's Skills (Highest Risk)
    // Priority: Strength < 50% OR Not practiced > 7 days
    const focusSkills = skills
        .filter(s => s.currentStrength < 60 || s.daysSinceLastPractice > 7)
        .sort((a, b) => a.currentStrength - b.currentStrength) // Weakest first
        .slice(0, 3);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.name.trim()) {
            setFormError('Skill name is required');
            return;
        }

        setFormLoading(true);

        try {
            await skillService.createSkill({
                name: formData.name.trim(),
                category: formData.category,
                initialProficiency: Number(formData.initialProficiency)
            });

            setFormData({
                name: '',
                category: 'General',
                initialProficiency: 70
            });
            setShowForm(false);
            await loadSkills();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create skill');
        } finally {
            setFormLoading(false);
        }
    };

    const handleMarkAsPracticed = async (skillId) => {
        try {
            await skillService.markAsPracticed(skillId);
            await loadSkills(); // Refresh to show new date/strength
        } catch (err) {
            console.error("Mark as practiced error:", err);
            if (err.response?.status === 404 && err.response?.data?.message?.includes('not found')) {
                await loadSkills();
                alert('Skills refreshed. Please try again.');
            } else {
                alert(err.response?.data?.message || 'Failed to update skill');
            }
        }
    };

    const handleDelete = async (skillId) => {
        if (!window.confirm('Are you sure you want to delete this skill?')) {
            return;
        }

        try {
            await skillService.deleteSkill(skillId);
            await loadSkills();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete skill');
        }
    };

    const handleStartTest = async (skill) => {
        // Ensure ID is valid before starting
        if (!skill || !skill.id) {
            console.error('Invalid skill for test:', skill);
            return;
        }
        setActiveTest(skill);
    };

    const handleSchedule = (skill) => {
        navigate('/calendar', { state: { scheduleSkill: skill } });
    };

    const handleTestComplete = async (results) => {
        setActiveTest(null);
        setTestResults(results);
        await loadSkills(); // Refresh to show new strength
    };

    const handleCloseTest = () => {
        setActiveTest(null);
    };

    const handleCloseResults = () => {
        setTestResults(null);
    };

    const getStrengthColor = (strength) => {
        if (strength >= 70) return '#10b981';
        if (strength >= 40) return '#f59e0b';
        return '#ef4444';
    };

    const getDecayStatus = (strength) => {
        if (strength >= 70) return { label: 'Strong', color: '#10b981', icon: '📈' };
        if (strength >= 40) return { label: 'Moderate', color: '#f59e0b', icon: '📊' };
        return { label: 'Weak', color: '#ef4444', icon: '📉' };
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    };

    return (
        <div className="skills-page">
            {/* Header Actions */}
            <div className="skills-header-actions">
                <button
                    className="add-skill-btn"
                    onClick={() => setShowForm(!showForm)}
                >
                    <span className="btn-icon">+</span>
                    Add New Skill
                </button>
            </div>

            {/* Today's Skills Section (Action Hub) */}
            {!loading && !error && focusSkills.length > 0 && (
                <div className="todays-skills-section">
                    <div className="section-header">
                        <h2>🔥 Today's Priorities</h2>
                        <p>These skills are at risk of decay. Give them some attention!</p>
                    </div>
                    <div className="focus-grid">
                        {focusSkills.map(skill => (
                            <div key={skill.id} className="focus-skill-card">
                                <div className="focus-header">
                                    <h3>{skill.name}</h3>
                                    <span className="focus-badge" style={{
                                        backgroundColor: skill.currentStrength < 40 ? '#fee2e2' : '#fef3c7',
                                        color: skill.currentStrength < 40 ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {skill.currentStrength < 40 ? 'Critical' : 'Needs Review'}
                                    </span>
                                </div>
                                <div className="focus-bar-container">
                                    <div className="focus-bar-bg">
                                        <div
                                            className="focus-bar-fill"
                                            style={{
                                                width: `${skill.currentStrength}%`,
                                                backgroundColor: getStrengthColor(skill.currentStrength)
                                            }}
                                        />
                                    </div>
                                    <span className="focus-strength">{skill.currentStrength}%</span>
                                </div>
                                <div className="focus-actions">
                                    <button className="btn-tiny primary" onClick={() => handleStartTest(skill)}>Take Test</button>
                                    <button className="btn-tiny secondary" onClick={() => handleMarkAsPracticed(skill.id)}>Mark Reviewed</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Skill Form */}
            {showForm && (
                <div className="skill-form-card">
                    <div className="form-header">
                        <h3>Add New Skill</h3>
                        <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        {formError && (
                            <div className="form-error">{formError}</div>
                        )}

                        <div className="form-group">
                            <label>Skill Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., React Development"
                                disabled={formLoading}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    disabled={formLoading}
                                >
                                    <option>General</option>
                                    <option>Programming</option>
                                    <option>Design</option>
                                    <option>Language</option>
                                    <option>Business</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Initial Proficiency ({formData.initialProficiency}%)</label>
                                <input
                                    type="range"
                                    name="initialProficiency"
                                    min="0"
                                    max="100"
                                    value={formData.initialProficiency}
                                    onChange={handleInputChange}
                                    disabled={formLoading}
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit" disabled={formLoading}>
                                {formLoading ? 'Creating...' : 'Create Skill'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Loading/Error/Empty States */}
            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading skills...</p>
                </div>
            )}

            {error && !loading && (
                <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={loadSkills} className="retry-btn">Retry</button>
                </div>
            )}

            {!loading && !error && skills.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🎯</div>
                    <h3>No skills yet</h3>
                    <p>Start tracking your skills by creating your first one!</p>
                    <button className="add-skill-btn" onClick={() => setShowForm(true)}>
                        <span className="btn-icon">+</span>
                        Add Your First Skill
                    </button>
                </div>
            )}

            {/* All Skills Grid */}
            {!loading && !error && skills.length > 0 && (
                <>
                    <h2 className="grid-title">All Skills</h2>
                    <div className="skills-grid">
                        {skills.map((skill) => {
                            const decayStatus = getDecayStatus(skill.currentStrength);
                            const strengthColor = getStrengthColor(skill.currentStrength);

                            return (
                                <div key={skill.id} className="skill-card">
                                    <div className="skill-card-header">
                                        <div className="skill-title-section">
                                            <h3 className="skill-name">{skill.name}</h3>
                                            <span className="skill-category">{skill.category}</span>
                                        </div>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(skill.id)}
                                            title="Delete skill"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    {/* Circular Progress */}
                                    <div className="skill-strength-circle">
                                        <svg className="progress-ring" width="140" height="140">
                                            <circle
                                                className="progress-ring-bg"
                                                cx="70"
                                                cy="70"
                                                r="60"
                                            />
                                            <circle
                                                className="progress-ring-fill"
                                                cx="70"
                                                cy="70"
                                                r="60"
                                                stroke={strengthColor}
                                                strokeDasharray={`${skill.currentStrength * 3.77} 377`}
                                            />
                                        </svg>
                                        <div className="progress-text">
                                            <span className="strength-value" style={{ color: strengthColor }}>
                                                {skill.currentStrength}%
                                            </span>
                                            <span className="strength-label">Strength</span>
                                        </div>
                                    </div>

                                    {/* Decay Status */}
                                    <div className="decay-status" style={{ borderColor: decayStatus.color + '40' }}>
                                        <span className="decay-icon">{decayStatus.icon}</span>
                                        <span className="decay-label" style={{ color: decayStatus.color }}>
                                            {decayStatus.label}
                                        </span>
                                    </div>

                                    {/* Metadata */}
                                    <div className="skill-metadata">
                                        <div className="metadata-item">
                                            <span className="metadata-label">Last Practiced</span>
                                            <span className="metadata-value">{formatDate(skill.lastPracticedAt)}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <span className="metadata-label">Days Idle</span>
                                            <span className="metadata-value">{Math.floor(skill.daysSinceLastPractice || 0)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="skill-actions-grid">
                                        <button
                                            className="action-btn practice-btn"
                                            onClick={() => handleMarkAsPracticed(skill.id)}
                                            title="Update last practiced date"
                                        >
                                            <span>✓</span>
                                            Practiced
                                        </button>
                                        <button
                                            className="action-btn test-btn"
                                            onClick={() => handleStartTest(skill)}
                                            title="Take a quick test"
                                        >
                                            <span>📝</span>
                                            Test
                                        </button>
                                        <button
                                            className="action-btn schedule-btn"
                                            onClick={() => handleSchedule(skill)}
                                            title="Schedule practice session"
                                        >
                                            <span>📅</span>
                                            Schedule
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Quick Test Modal */}
            {activeTest && (
                <QuickTest
                    skill={activeTest}
                    onComplete={handleTestComplete}
                    onClose={handleCloseTest}
                />
            )}

            {/* Test Results Modal */}
            {testResults && (
                <TestResults
                    results={testResults.results}
                    skill={testResults.skill}
                    onClose={handleCloseResults}
                />
            )}
        </div>
    );
};

export default SkillList;
