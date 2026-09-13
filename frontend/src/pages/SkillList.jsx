import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickTest from '../components/QuickTest';
import TestResults from '../components/TestResults';
import { Sparkline } from '../components/DecayChart';
import skillService from '../services/skillService';
import retentionService from '../services/retentionService';
import { bandOf, bandLabel, AT_RISK } from '../utils/decayCalculations';
import './SkillList.css';

const SkillList = () => {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
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
    const [retentionMap, setRetentionMap] = useState({});
    const [loadingRetention, setLoadingRetention] = useState({});
    const [busy, setBusy] = useState({});

    useEffect(() => {
        loadSkills();
    }, []);

    useEffect(() => {
        // Prefetch predictions for today's focus skills to surface urgency
        if (focusSkills && focusSkills.length) {
            focusSkills.forEach(s => {
                if (s && s.id && !retentionMap[s.id]) fetchPrediction(s.id);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skills]);

    const loadSkills = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await skillService.getUserSkills();
            setSkills(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load your skills.");
        } finally {
            setLoading(false);
        }
    };

    // Derived State: Today's Skills (Highest Risk)
    // Priority: Strength < 60% OR Not practiced > 7 days
    const filteredSkills = skills.filter(skill => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || skill.name?.toLowerCase().includes(query) || skill.category?.toLowerCase().includes(query);
        const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...new Set(skills.map(skill => skill.category).filter(Boolean))];

    const focusSkills = filteredSkills
        .filter(s => s.currentStrength < 60 || s.daysSinceLastPractice > 7)
        .sort((a, b) => a.currentStrength - b.currentStrength) // Weakest first
        .slice(0, 3);

    const atRiskCount = skills.filter(s => s.currentStrength < AT_RISK).length;

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
            setFormError('Give the skill a name.');
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
            setFormError(err.response?.data?.message || "Couldn't create the skill.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleMarkAsPracticed = async (skillId) => {
        setBusy(prev => ({ ...prev, [skillId]: true }));
        try {
            await skillService.markAsPracticed(skillId);
            await loadSkills(); // Refresh to show new date/strength
        } catch (err) {
            console.error("Mark as practiced error:", err);
            if (err.response?.status === 404 && err.response?.data?.message?.includes('not found')) {
                await loadSkills();
                alert('Skills refreshed. Please try again.');
            } else {
                alert(err.response?.data?.message || "Couldn't update the skill.");
            }
        } finally {
            setBusy(prev => ({ ...prev, [skillId]: false }));
        }
    };

    const handleDelete = async (skill) => {
        if (!window.confirm(`Delete "${skill.name}"? Its practice history goes with it.`)) {
            return;
        }

        try {
            await skillService.deleteSkill(skill.id);
            await loadSkills();
        } catch (err) {
            alert(err.response?.data?.message || "Couldn't delete the skill.");
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

    const handleOpenDetails = (skillId) => {
        navigate(`/skills/${skillId}`);
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

    const fetchPrediction = async (skillId) => {
        if (!skillId) return;
        if (retentionMap[skillId]) return; // cached

        setLoadingRetention(prev => ({ ...prev, [skillId]: true }));
        try {
            const data = await retentionService.predictRetention(skillId);
            setRetentionMap(prev => ({ ...prev, [skillId]: data }));
        } catch (err) {
            console.error('Retention prediction error', err);
        } finally {
            setLoadingRetention(prev => ({ ...prev, [skillId]: false }));
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        return `${diffDays} days ago`;
    };

    const openForm = () => { setShowForm(true); setFormError(''); };

    return (
        <div className="sl">
            <header className="sl-head">
                <div>
                    <h1>Skills</h1>
                    {!loading && !error && skills.length > 0 && (
                        <p className="sl-count">
                            {skills.length} tracked
                            {atRiskCount > 0 && <> · <span className="is-weak">{atRiskCount} at risk</span></>}
                        </p>
                    )}
                </div>
                <button className="btn btn-primary" onClick={() => showForm ? setShowForm(false) : openForm()}>
                    {showForm ? 'Close' : 'Add a skill'}
                </button>
            </header>

            {/* Add Skill Form — inline, under the header */}
            {showForm && (
                <form className="sl-form" onSubmit={handleSubmit}>
                    {formError && <p className="sl-form-error" role="alert">{formError}</p>}
                    <div className="sl-form-grid">
                        <label className="sl-field sl-field--wide">
                            <span>Name</span>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="React hooks, French verbs, SQL joins…"
                                disabled={formLoading}
                                autoFocus
                            />
                        </label>
                        <label className="sl-field">
                            <span>Category</span>
                            <select name="category" value={formData.category} onChange={handleInputChange} disabled={formLoading}>
                                <option>General</option>
                                <option>Programming</option>
                                <option>Design</option>
                                <option>Language</option>
                                <option>Business</option>
                            </select>
                        </label>
                        <label className="sl-field">
                            <span>How well you know it now <b className="tnum">{formData.initialProficiency}%</b></span>
                            <input
                                type="range"
                                name="initialProficiency"
                                min="0"
                                max="100"
                                value={formData.initialProficiency}
                                onChange={handleInputChange}
                                disabled={formLoading}
                            />
                        </label>
                    </div>
                    <div className="sl-form-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={formLoading}>
                            {formLoading ? 'Saving…' : 'Save skill'}
                        </button>
                    </div>
                </form>
            )}

            {/* Loading/Error/Empty States */}
            {loading && (
                <div className="sl-skeleton" aria-busy="true">
                    {[0, 1, 2, 3].map(i => <span key={i} className="sk" />)}
                </div>
            )}

            {error && !loading && (
                <div className="sl-error">
                    <p>{error}</p>
                    <button onClick={loadSkills} className="btn btn-ghost">Try again</button>
                </div>
            )}

            {!loading && !error && skills.length === 0 && !showForm && (
                <div className="sl-empty">
                    <h2>Nothing tracked yet</h2>
                    <p>Add a skill with a rough sense of how well you know it. From then on this page tells you when it starts to slip.</p>
                    <button className="btn btn-primary" onClick={openForm}>Add your first skill</button>
                </div>
            )}

            {!loading && !error && skills.length > 0 && (
                <>
                    <div className="sl-toolbar">
                        <input
                            type="search"
                            className="sl-search"
                            placeholder="Search by name or category"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search skills"
                        />
                        {categories.length > 2 && (
                            <div className="sl-chips" role="tablist" aria-label="Filter by category">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        type="button"
                                        role="tab"
                                        aria-selected={selectedCategory === category}
                                        className={`sl-chip ${selectedCategory === category ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Needs attention — the weakest three, with the two actions that matter */}
                    {focusSkills.length > 0 && (
                        <section className="sl-focus" aria-labelledby="focus-title">
                            <div className="sl-section-head">
                                <h2 id="focus-title">Needs attention</h2>
                                <p>Weakest first. A test resets the clock and re-measures; marking practised just resets the clock.</p>
                            </div>
                            <ul className="sl-focus-list">
                                {focusSkills.map(skill => {
                                    const band = bandOf(skill.currentStrength);
                                    const prediction = retentionMap[skill.id];
                                    return (
                                        <li key={skill.id} className={`sl-focus-item band-${band}`}>
                                            <div className="sl-focus-main">
                                                <button className="sl-name" onClick={() => handleOpenDetails(skill.id)}>{skill.name}</button>
                                                <span className="sl-focus-meta">
                                                    <strong>{Math.round(skill.currentStrength)}%</strong> · {bandLabel[band].toLowerCase()} · practised {formatDate(skill.lastPracticedAt)}
                                                    {prediction?.retention != null && <> · predicted retention {Math.round(prediction.retention)}%</>}
                                                </span>
                                            </div>
                                            <div className="sl-focus-actions">
                                                <button className="btn btn-primary btn-small" onClick={() => handleStartTest(skill)}>Test now</button>
                                                <button className="btn btn-small" onClick={() => handleMarkAsPracticed(skill.id)} disabled={!!busy[skill.id]}>
                                                    {busy[skill.id] ? 'Saving…' : 'Mark practised'}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {/* All skills */}
                    <section className="sl-all" aria-labelledby="all-title">
                        <div className="sl-section-head row">
                            <h2 id="all-title">All skills</h2>
                            {filteredSkills.length !== skills.length && (
                                <span className="sl-filter-note">{filteredSkills.length} of {skills.length}</span>
                            )}
                        </div>

                        {filteredSkills.length === 0 ? (
                            <div className="sl-empty compact">
                                <p>Nothing matches that search or category.</p>
                                <button className="link" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>Clear filters</button>
                            </div>
                        ) : (
                            <ul className="sl-rows">
                                {filteredSkills.map((skill) => {
                                    const band = bandOf(skill.currentStrength);
                                    const prediction = retentionMap[skill.id];
                                    return (
                                        <li key={skill.id} className={`sl-row band-${band}`}>
                                            <div className="sl-row-main">
                                                <button className="sl-name" onClick={() => handleOpenDetails(skill.id)} title="Open details">
                                                    {skill.name}
                                                </button>
                                                <span className="sl-row-meta">
                                                    {skill.category} · practised {formatDate(skill.lastPracticedAt)}
                                                    {prediction?.retention != null && <> · predicted {Math.round(prediction.retention)}%</>}
                                                </span>
                                            </div>

                                            <Sparkline skill={skill} width={96} height={26} />

                                            <div className="sl-row-strength">
                                                <span className="sl-bar" aria-hidden="true"><i style={{ width: `${skill.currentStrength}%` }} /></span>
                                                <strong>{Math.round(skill.currentStrength)}%</strong>
                                                <em>{bandLabel[band]}</em>
                                            </div>

                                            <div className="sl-row-actions">
                                                <button className="btn btn-small" onClick={() => handleStartTest(skill)}>Test</button>
                                                <button className="link" onClick={() => handleMarkAsPracticed(skill.id)} disabled={!!busy[skill.id]}>
                                                    {busy[skill.id] ? 'Saving…' : 'Practised'}
                                                </button>
                                                <button className="link" onClick={() => handleSchedule(skill)}>Schedule</button>
                                                {!prediction && (
                                                    <button className="link" onClick={() => fetchPrediction(skill.id)} disabled={!!loadingRetention[skill.id]}>
                                                        {loadingRetention[skill.id] ? 'Predicting…' : 'Predict'}
                                                    </button>
                                                )}
                                                <button className="sl-delete" onClick={() => handleDelete(skill)} aria-label={`Delete ${skill.name}`} title="Delete">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
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
