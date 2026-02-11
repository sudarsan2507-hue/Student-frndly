import React, { useState, useEffect } from 'react';
import quickTestService from '../services/quickTestService';
import './QuickTest.css';

const QuickTest = ({ skill, onComplete, onClose }) => {
    const [test, setTest] = useState(null);
    const [answers, setAnswers] = useState({});
    const [startTime, setStartTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [timeElapsed, setTimeElapsed] = useState(0);

    useEffect(() => {
        generateTest();
    }, []);

    // Timer
    useEffect(() => {
        if (!startTime || submitting) return;

        const interval = setInterval(() => {
            setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, submitting]);

    const generateTest = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await quickTestService.generateTest(skill.id);
            setTest(response.data);
            setStartTime(Date.now());
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate test');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionId, answerIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answerIndex
        }));
    };

    const handleSubmit = async () => {
        // Check if all questions answered
        if (Object.keys(answers).length !== test.questions.length) {
            setError('Please answer all questions');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const totalTime = Math.floor((Date.now() - startTime) / 1000);
            console.log("Submitting test:", { testId: test.id, answers, totalTime });

            const response = await quickTestService.submitTest(test.id, answers, totalTime);
            console.log("Submission response:", response);

            // Call onComplete with results
            onComplete(response.data);
        } catch (err) {
            console.error("Submission error:", err);
            setError(err.response?.data?.message || 'Failed to submit test');
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="quick-test-modal">
                <div className="quick-test-content">
                    <div className="loading">Generating test...</div>
                </div>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="quick-test-modal">
                <div className="quick-test-content">
                    <div className="error-message">{error || 'Failed to load test'}</div>
                    <button onClick={onClose} className="btn-secondary">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="quick-test-modal">
            <div className="quick-test-content">
                <div className="test-header">
                    <div>
                        <h2>Quick Test: {skill.name}</h2>
                        <p className="test-description">
                            Answer these questions to update your skill decay rate
                        </p>
                    </div>
                    <div className="test-timer">
                        ⏱️ {formatTime(timeElapsed)}
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="test-questions">
                    {test.questions.map((question, qIndex) => (
                        <div key={question.id} className="question-block">
                            <div className="question-number">Question {qIndex + 1}</div>
                            <div className="question-text">{question.question}</div>

                            <div className="question-options">
                                {question.options.map((option, optIndex) => (
                                    <button
                                        key={optIndex}
                                        className={`option-button ${answers[question.id] === optIndex ? 'selected' : ''}`}
                                        onClick={() => handleAnswerSelect(question.id, optIndex)}
                                        disabled={submitting}
                                    >
                                        <span className="option-letter">
                                            {String.fromCharCode(65 + optIndex)}
                                        </span>
                                        <span className="option-text">{option}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="test-actions">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn-primary"
                        disabled={submitting || Object.keys(answers).length !== test.questions.length}
                    >
                        {submitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickTest;
