import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Signup.css';

const Signup = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', agreeTerms: false });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.agreeTerms) { setError('Please agree to the Terms & Conditions'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }

        setLoading(true);
        try {
            const res = await api.post('/auth/register', formData);
            setSuccess(res.data.message || 'Account created! Awaiting admin approval.');
            // Don't navigate — show the pending message
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            {/* Left Side */}
            <div className="signup-left">
                <div className="brand-logo">SF</div>
                <div className="hero-content">
                    <h1>Track Your Learning,<br />Master Your Skills</h1>
                    <div className="slider-dots">
                        <span className="dot active" /><span className="dot" /><span className="dot" />
                    </div>
                </div>
                <Link to="/login" className="back-link">← Back to login</Link>
            </div>

            {/* Right Side - Form */}
            <div className="signup-right">
                <div className="signup-form-container">
                    <h2>Create an account</h2>
                    <p className="login-prompt">
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>

                    {/* Success state */}
                    {success && (
                        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#065f46' }}>
                            <strong>🎉 Account created!</strong><br />
                            {success}<br />
                            <small style={{ display: 'block', marginTop: 8, color: '#047857' }}>
                                An admin will review your request. You'll be able to log in once approved.
                            </small>
                            <Link to="/login" style={{ display: 'inline-block', marginTop: 12, color: '#065f46', fontWeight: 700, textDecoration: 'underline' }}>
                                Go to Login →
                            </Link>
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit}>
                            {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#7f1d1d', fontSize: 14 }}>{error}</div>}

                            <div className="form-row">
                                <div className="form-group">
                                    <input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <input type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} required />
                            </div>

                            <div className="form-group password-group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Password (min 6 characters)"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>

                            <div className="form-checkbox">
                                <label className="checkbox-container">
                                    <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
                                    <span className="checkmark" />
                                    <span className="label-text">I agree to the <a href="#">Terms &amp; Conditions</a></span>
                                </label>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Creating account…' : 'Create account'}
                            </button>

                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
                                ⏳ New accounts require admin approval before login
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup;
