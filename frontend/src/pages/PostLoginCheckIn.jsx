import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import QuickTest from '../components/QuickTest';
import skillService from '../services/skillService';
import './PostLoginCheckIn.css';

const PostLoginCheckIn = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [recommendedSkill, setRecommendedSkill] = useState(null);
    const [showTest, setShowTest] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkSessionAndSkills();
    }, []);

    const checkSessionAndSkills = async () => {
        // 1. Check if already checked in this session
        const hasCheckedIn = sessionStorage.getItem('hasCheckedIn');
        if (hasCheckedIn) {
            navigate('/dashboard');
            return;
        }

        try {
            // 2. Fetch skills to find a recommendation
            const response = await skillService.getUserSkills();
            const skills = response.data || [];

            if (skills.length === 0) {
                // No skills to test, skip flow
                completeCheckIn();
                return;
            }

            // 3. Find recommended skill (lowest strength or random)
            // Prioritize skills needing attention (< 50%)
            let target = skills.find(s => s.currentStrength < 50);

            // If none weak, pick oldest practiced? Or just random?
            // Let's pick random from the list to keep it varied if all are strong
            if (!target) {
                target = skills[Math.floor(Math.random() * skills.length)];
            }

            setRecommendedSkill(target);
            setLoading(false);

        } catch (err) {
            console.error('Failed to fetch skills for check-in', err);
            // On error, just go to dashboard
            completeCheckIn();
        }
    };

    const completeCheckIn = () => {
        sessionStorage.setItem('hasCheckedIn', 'true');
        navigate('/dashboard');
    };

    const handleTakeTest = () => {
        setShowTest(true);
    };

    const handleTestComplete = (results) => {
        // Show results briefly or just continue?
        // QuickTest usually shows results modal? 
        // The current QuickTest component calls onComplete with results.
        // We can just proceed to dashboard after test.
        // Or we could show a "Great job!" toast.
        // For now, simple flow:
        completeCheckIn();
    };

    const handleSkip = () => {
        completeCheckIn();
    };

    if (loading) {
        return (
            <div className="check-in-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (showTest && recommendedSkill) {
        return (
            <div className="check-in-test-wrapper">
                <QuickTest
                    skill={recommendedSkill}
                    onComplete={handleTestComplete}
                    onClose={handleSkip} // Closing test = skipping remainder
                />
            </div>
        );
    }

    const strength = Math.round(recommendedSkill.currentStrength);
    const band = strength >= 70 ? 'strong' : strength >= 40 ? 'fading' : 'weak';

    return (
        <div className="check-in-page">
            <div className="check-in-card">
                <p className="ci-eyebrow">Before you start</p>
                <h1>One quick test?</h1>
                <p className="ci-lead">
                    Your weakest skill right now is <strong>{recommendedSkill.name}</strong>. A two-minute test
                    re-measures it and resets its clock.
                </p>

                <div className={`ci-skill band-${band}`}>
                    <span className="ci-skill-name">{recommendedSkill.name}</span>
                    <span className="ci-skill-strength"><strong>{strength}%</strong> strength</span>
                </div>

                <div className="check-in-actions">
                    <button className="btn btn-ghost" onClick={handleSkip}>
                        Not now
                    </button>
                    <button className="btn btn-primary" onClick={handleTakeTest}>
                        Take the test
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostLoginCheckIn;
