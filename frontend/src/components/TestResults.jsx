import React from 'react';
import './TestResults.css';

const TestResults = ({ results, skill, onClose }) => {
    const getPerformanceColor = () => {
        const { accuracy } = results;
        if (accuracy >= 80) return '#4caf50';
        if (accuracy >= 60) return '#ff9800';
        return '#f44336';
    };

    return (
        <div className="test-results-modal">
            <div className="test-results-content">
                <div className="results-header">
                    <h2>Test Complete!</h2>
                    <div
                        className="performance-badge"
                        style={{ background: getPerformanceColor() }}
                    >
                        {results.performance}
                    </div>
                </div>

                <div className="results-stats">
                    <div className="stat-card">
                        <div className="stat-label">Accuracy</div>
                        <div className="stat-value" style={{ color: getPerformanceColor() }}>
                            {results.accuracy}%
                        </div>
                        <div className="stat-detail">
                            {results.correctCount !== undefined ? results.correctCount : results.score} of {results.totalQuestions} correct
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">Avg Time</div>
                        <div className="stat-value">
                            {(results.responseTime || results.averageTimePerQuestion || 0).toFixed(1)}s
                        </div>
                        <div className="stat-detail">per question</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">New Strength</div>
                        <div className="stat-value" style={{ color: getPerformanceColor() }}>
                            {skill.currentStrength}%
                        </div>
                        <div className="stat-detail">
                            Decay rate adjusted
                        </div>
                    </div>
                </div>

                <div className="results-info">
                    <h3>What This Means</h3>
                    {results.accuracy >= 80 ? (
                        <p>✨ Excellent performance! Your decay rate has been <strong>reduced</strong>, meaning this skill will degrade more slowly.</p>
                    ) : results.accuracy >= 60 ? (
                        <p>👍 Good performance! Your decay rate has been slightly improved.</p>
                    ) : results.accuracy >= 40 ? (
                        <p>⚠️ Fair performance. No change to your decay rate. Consider practicing more.</p>
                    ) : (
                        <p>❌ Needs practice. Your decay rate has been <strong>increased</strong>. Regular practice is recommended.</p>
                    )}

                    <div className="decay-info">
                        <div className="info-item">
                            <span className="info-label">Half-Life:</span>
                            <span className="info-value">{skill.halfLife} days</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Decay Multiplier:</span>
                            <span className="info-value">{skill.adaptiveDecayMultiplier.toFixed(2)}×</span>
                        </div>
                    </div>
                </div>

                <button onClick={onClose} className="btn-primary">
                    Done
                </button>
            </div>
        </div>
    );
};

export default TestResults;
