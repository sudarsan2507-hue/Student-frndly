import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import skillService from '../services/skillService';
import noteService from '../services/noteService';
import PageTransition from '../components/PageTransition';
import DecayChart, { Sparkline } from '../components/DecayChart';
import QuickTest from '../components/QuickTest';
import TestResults from '../components/TestResults';
import { useAuth } from '../context/AuthContext';
import { bandOf, bandLabel, daysUntil, AT_RISK, MASTERED } from '../utils/decayCalculations';
import './Dashboard.css';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } };

const relativeDays = (days) => {
    if (days < 1) return 'today';
    if (days < 2) return 'yesterday';
    return `${Math.round(days)} days ago`;
};

/** One-sentence summary of the student's situation — the page's headline. */
const summarise = (skills) => {
    if (!skills.length) return { lead: 'Nothing is being tracked yet.', sub: 'Add a skill and this page will show you how fast it fades.' };
    const weak = skills.filter((s) => s.currentStrength < AT_RISK);
    const fading = skills.filter((s) => s.currentStrength >= AT_RISK && s.currentStrength < MASTERED);
    const strong = skills.length - weak.length - fading.length;
    if (weak.length === skills.length) {
        return { lead: `All ${skills.length} of your skills are at risk.`, sub: 'One quick test today starts rebuilding the strongest of them.' };
    }
    if (weak.length) {
        return {
            lead: `${weak.length} of ${skills.length} skills ${weak.length === 1 ? 'is' : 'are'} at risk.`,
            sub: `${fading.length} more ${fading.length === 1 ? 'is' : 'are'} fading. Practise one today to hold it above ${AT_RISK}%.`,
        };
    }
    const soonest = fading.map((s) => ({ s, d: daysUntil(s, AT_RISK) })).filter((x) => x.d != null).sort((a, b) => a.d - b.d)[0];
    if (soonest) {
        return {
            lead: 'Everything is holding, for now.',
            sub: `${soonest.s.name} drops below ${AT_RISK}% in about ${Math.max(1, Math.round(soonest.d))} days unless you practise it.`,
        };
    }
    return { lead: `All ${strong} skills are strong.`, sub: 'Keep the streak. The chart shows how quickly that changes without practice.' };
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [skills, setSkills] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTest, setActiveTest] = useState(null);
    const [testResults, setTestResults] = useState(null);

    useEffect(() => { loadSkills(); loadTodayNotes(); }, []);

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

    const loadTodayNotes = async () => {
        try {
            const dateString = new Date().toISOString().split('T')[0];
            const response = await noteService.getNotes(dateString);
            setNotes(response.data || []);
        } catch {
            // Non-critical: notes widget failure shouldn't block the dashboard
        }
    };

    const sorted = useMemo(() => [...skills].sort((a, b) => a.currentStrength - b.currentStrength), [skills]);
    const stats = useMemo(() => ({
        total: skills.length,
        average: skills.length ? Math.round(skills.reduce((sum, s) => sum + s.currentStrength, 0) / skills.length) : 0,
        mastered: skills.filter((s) => s.currentStrength >= MASTERED).length,
        atRisk: skills.filter((s) => s.currentStrength < AT_RISK).length,
    }), [skills]);
    const summary = summarise(skills);
    const priority = sorted[0];

    const today = new Date();
    const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];

    const renderMiniCalendar = () => {
        const year = today.getFullYear(), month = today.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const cells = [];
        for (let i = 0; i < startOffset; i++) cells.push(<span key={`p${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(<span key={d} className={d === today.getDate() ? 'active' : ''}>{d}</span>);
        }
        return cells;
    };

    return (
        <PageTransition>
            <div className="dash">
                <header className="dash-head">
                    <p className="dash-date">
                        {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {firstName ? `, ${firstName}` : ''}
                    </p>
                    {loading ? (
                        <div className="dash-skeleton">
                            <span className="sk sk-h1" /><span className="sk sk-sub" />
                        </div>
                    ) : (
                        <>
                            <h1 className="dash-lead">{summary.lead}</h1>
                            <p className="dash-sub">{summary.sub}</p>
                            <div className="dash-actions">
                                {priority && (
                                    <button className="btn btn-primary" onClick={() => setActiveTest(priority)}>
                                        Test {priority.name}
                                    </button>
                                )}
                                <button className="btn btn-ghost" onClick={() => navigate('/skills')}>
                                    {skills.length ? 'All skills' : 'Add a skill'}
                                </button>
                            </div>
                        </>
                    )}
                </header>

                {error ? (
                    <div className="dash-error">
                        <p>{error}</p>
                        <button className="btn btn-ghost" onClick={loadSkills}>Try again</button>
                    </div>
                ) : !loading && (
                    <motion.div className="dash-grid" variants={containerVariants} initial="hidden" animate="show">
                        <div className="dash-main">
                            <motion.dl className="dash-stats" variants={itemVariants}>
                                <div><dt>Skills</dt><dd>{stats.total}</dd></div>
                                <div><dt>Average strength</dt><dd>{stats.average}<small>%</small></dd></div>
                                <div><dt>Mastered</dt><dd>{stats.mastered}</dd></div>
                                <div className={stats.atRisk ? 'is-weak' : ''}><dt>At risk</dt><dd>{stats.atRisk}</dd></div>
                            </motion.dl>

                            {skills.length > 0 && (
                                <motion.section className="dash-chart" variants={itemVariants} aria-labelledby="chart-title">
                                    <div className="dash-section-head">
                                        <h2 id="chart-title">The next two weeks</h2>
                                        <p>Where each skill lands if you leave it alone.</p>
                                    </div>
                                    <DecayChart skills={skills} days={14} />
                                </motion.section>
                            )}

                            <motion.section className="dash-skills" variants={itemVariants} aria-labelledby="skills-title">
                                <div className="dash-section-head row">
                                    <h2 id="skills-title">Weakest first</h2>
                                    {skills.length > 0 && (
                                        <button className="link" onClick={() => navigate('/skills')}>See all {skills.length}</button>
                                    )}
                                </div>
                                {skills.length === 0 ? (
                                    <div className="dash-empty">
                                        <p>No skills yet. Add the first one and come back tomorrow to watch it move.</p>
                                        <button className="btn btn-primary" onClick={() => navigate('/skills')}>Add a skill</button>
                                    </div>
                                ) : (
                                    <ul className="skill-rows">
                                        {sorted.slice(0, 5).map((skill) => {
                                            const band = bandOf(skill.currentStrength);
                                            return (
                                                <li key={skill.id} className={`skill-row band-${band}`}>
                                                    <button className="skill-row-main" onClick={() => navigate(`/skills/${skill.id}`)}>
                                                        <span className="skill-row-name">{skill.name}</span>
                                                        <span className="skill-row-meta">{skill.category} · practised {relativeDays(skill.daysSinceLastPractice)}</span>
                                                    </button>
                                                    <Sparkline skill={skill} />
                                                    <span className="skill-row-strength">
                                                        <strong>{Math.round(skill.currentStrength)}%</strong>
                                                        <em>{bandLabel[band]}</em>
                                                    </span>
                                                    <button className="btn btn-small" onClick={() => setActiveTest(skill)}>Test</button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </motion.section>
                        </div>

                        <aside className="dash-aside">
                            <motion.section className="widget" variants={itemVariants}>
                                <div className="widget-head">
                                    <h3>{today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
                                    <button className="link" onClick={() => navigate('/calendar')}>Open calendar</button>
                                </div>
                                <div className="mini-cal">
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="mini-cal-dow">{d}</span>)}
                                    {renderMiniCalendar()}
                                </div>
                            </motion.section>

                            <motion.section className="widget" variants={itemVariants}>
                                <div className="widget-head">
                                    <h3>Today&rsquo;s notes</h3>
                                    <button className="link" onClick={() => navigate('/calendar')}>{notes.length ? 'Edit' : 'Add'}</button>
                                </div>
                                {notes.length === 0 ? (
                                    <p className="widget-empty">Nothing written today.</p>
                                ) : (
                                    <ul className="dash-notes">
                                        {notes.slice(0, 3).map((note, i) => (
                                            <li key={note.id || i}>{note.content.length > 90 ? note.content.slice(0, 90) + '…' : note.content}</li>
                                        ))}
                                        {notes.length > 3 && <li className="more">+{notes.length - 3} more</li>}
                                    </ul>
                                )}
                            </motion.section>
                        </aside>
                    </motion.div>
                )}

                {activeTest && (
                    <QuickTest skill={activeTest} onComplete={(r) => { setActiveTest(null); setTestResults(r); loadSkills(); }} onClose={() => setActiveTest(null)} />
                )}
                {testResults && (
                    <TestResults results={testResults.results} skill={testResults.skill} onClose={() => setTestResults(null)} />
                )}
            </div>
        </PageTransition>
    );
};

export default Dashboard;
