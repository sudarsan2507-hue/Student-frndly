import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import skillService from '../services/skillService';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import './Dashboard.css';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // Calculate statistics
    const totalSkills = skills.length;
    const averageStrength = skills.length > 0
        ? Math.round(skills.reduce((sum, s) => sum + s.currentStrength, 0) / skills.length)
        : 0;

    // Derived state
    const weakSkills = skills.filter(s => s.currentStrength < 40).length;
    const masteredSkills = skills.filter(s => s.currentStrength >= 80).length;

    const getStrengthColor = (strength) => {
        if (strength >= 80) return '#10b981'; // Green
        if (strength >= 50) return '#3b82f6'; // Blue
        if (strength >= 30) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    return (
        <PageTransition>
            <div className="dashboard-page">
                {/* Hero Section */}
                <div className="hero-banner">
                    <div className="hero-content">
                        <h1>Track your learning progress Easier <br /> With Student Frndly "Sync 'N' go"</h1>
                        <button className="btn-hero" onClick={() => navigate('/skills')}>Get Started</button>
                    </div>
                    <div className="hero-illustration">
                        <span className="hero-emoji">🚀</span>
                    </div>
                </div>

                {loading ? (
                    <div className="dashboard-loading">
                        <div className="spinner"></div>
                        <p>Loading your dashboard...</p>
                    </div>
                ) : error ? (
                    <div className="dashboard-error">
                        <p>{error}</p>
                        <button onClick={loadSkills}>Retry</button>
                    </div>
                ) : (
                    <motion.div
                        className="dashboard-content-grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {/* Main Interaction Area */}
                        <div className="dashboard-main-area">

                            {/* Stats Ribbon */}
                            <motion.div className="stats-ribbon" variants={itemVariants}>
                                <div className="stat-pill">
                                    <span className="stat-label">Total Skills</span>
                                    <span className="stat-value">{totalSkills}</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="stat-label">Avg. Strength</span>
                                    <span className="stat-value">{averageStrength}%</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="stat-label">Mastered</span>
                                    <span className="stat-value">{masteredSkills}</span>
                                </div>
                                <div className="stat-pill highlight">
                                    <span className="stat-label">At Risk</span>
                                    <span className="stat-value warning">{weakSkills}</span>
                                </div>
                            </motion.div>

                            {/* Performance Chart Placeholder (Styled as Educactus Chart) */}
                            <motion.div className="chart-card" variants={itemVariants}>
                                <div className="card-header">
                                    <h2>Student Performance</h2>
                                    <button className="btn-icon">•••</button>
                                </div>
                                <div className="chart-area">
                                    {/* Abstract Visual Representation of a Chart */}
                                    <div className="chart-visual">
                                        <div className="chart-line-path"></div>
                                        <div className="chart-point active">
                                            <div className="tooltip">
                                                <span>Average</span>
                                                <strong>{averageStrength}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-months">
                                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span className="active">Jul</span><span>Aug</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* My Skills Grid */}
                            <div className="skills-section">
                                <h2>My Skills</h2>
                                <div className="skills-grid-list">
                                    {skills.slice(0, 4).map(skill => (
                                        <motion.div
                                            key={skill.id}
                                            className="skill-card-minimal"
                                            variants={itemVariants}
                                            whileHover={{ y: -4, boxShadow: "0 10px 20px rgba(0,0,0,0.05)" }}
                                            onClick={() => navigate(`/skills`)}
                                        >
                                            <div className="skill-icon-placeholder" style={{ background: getStrengthColor(skill.currentStrength) + '20', color: getStrengthColor(skill.currentStrength) }}>
                                                📚
                                            </div>
                                            <div className="skill-info">
                                                <h3>{skill.name}</h3>
                                                <div className="skill-progress-mini">
                                                    <div className="progress-bar-bg">
                                                        <div className="progress-bar-fill" style={{ width: `${skill.currentStrength}%`, background: getStrengthColor(skill.currentStrength) }}></div>
                                                    </div>
                                                    <span>{skill.currentStrength}%</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <motion.button
                                        className="add-new-card"
                                        variants={itemVariants}
                                        onClick={() => navigate('/skills')}
                                    >
                                        <span>+</span>
                                        <p>Add New Skill</p>
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="dashboard-right-sidebar">

                            {/* Calendar Widget */}
                            <motion.div className="calendar-widget" variants={itemVariants}>
                                <div className="widget-header">
                                    <h3>February 2026</h3>
                                    <button className="btn-icon">→</button>
                                </div>
                                <div className="mini-calendar-grid">
                                    <div className="cal-row header">
                                        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                                    </div>
                                    <div className="cal-row">
                                        <span className="muted">29</span><span className="muted">30</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                    </div>
                                    <div className="cal-row">
                                        <span>6</span><span className="active">7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span>
                                    </div>
                                    <div className="cal-row">
                                        <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Recent Activity / Personal Notes */}
                            <motion.div className="notes-widget" variants={itemVariants}>
                                <div className="widget-header">
                                    <h3>Personal Notes</h3>
                                </div>
                                <ul className="notes-list">
                                    <li>Check Official IELTS Practice Materials Volume 2</li>
                                    <li>C1 English (Advanced) - prepare new materials</li>
                                    <li>Business English vocabulary study</li>
                                </ul>
                            </motion.div>

                            {/* Documents/Files Widget */}
                            <motion.div className="files-widget" variants={itemVariants}>
                                <div className="widget-header">
                                    <h3>Recent Documents</h3>
                                </div>
                                <div className="file-item">
                                    <div className="file-icon pdf">PDF</div>
                                    <div className="file-info">
                                        <h4>C2_Proficient.pdf</h4>
                                        <span>313 KB • 01 Jul, 2026</span>
                                    </div>
                                </div>
                                <div className="file-item">
                                    <div className="file-icon doc">DOC</div>
                                    <div className="file-info">
                                        <h4>Computing SB 1-3</h4>
                                        <span>478 KB • 03 Jul, 2026</span>
                                    </div>
                                </div>
                            </motion.div>

                        </div>
                    </motion.div>
                )}
            </div>
        </PageTransition>
    );
};

export default Dashboard;
