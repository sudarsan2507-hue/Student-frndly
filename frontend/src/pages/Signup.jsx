import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

const stagger = {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
    item: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }
};

const Signup = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

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
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            setError('');
            await authService.googleLogin(credentialResponse.credential);
            // Google signup also goes through pending — show success message
            setSuccess('Google account registered! Awaiting admin approval before you can log in.');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Google sign-up failed';
            // If account already exists and is approved, just redirect
            if (err.response?.data?.status === 'approved') {
                navigate('/check-in');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            {/* Left Panel */}
            <div className="signup-left">
                <div className="brand-logo">
                    <svg className="brand-mark" width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <defs>
                            <linearGradient id="sg1" x1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#7c3aed" />
                                <stop offset="1" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                        <rect width="48" height="48" rx="12" fill="url(#sg1)" />
                        <path d="M14 30 L20 18 L26 30" stroke="rgba(255,255,255,0.95)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <circle cx="34" cy="18" r="6" fill="rgba(255,255,255,0.95)" />
                    </svg>
                    <span className="brand-name">Student Frndly</span>
                </div>

                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                    <h1>Track Your Learning,<br />Master Your Skills</h1>
                    <p className="hero-sub">Join thousands of students who beat the forgetting curve with data-driven practice.</p>
                    <div className="slider-dots">
                        <span className="dot active" /><span className="dot" /><span className="dot" />
                    </div>
                </motion.div>

                <div className="signup-left-visuals" aria-hidden="true">
                    <span className="shape shape--1" />
                    <span className="shape shape--2" />
                    <span className="shape shape--3" />
                    <span className="shape shape--4" />
                </div>

                <Link to="/login" className="back-link">← Back to login</Link>
            </div>

            {/* Right Panel */}
            <div className="signup-right">
                <motion.div
                    className="signup-form-container"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                >
                    <h2>Create an account</h2>
                    <p className="login-prompt">
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                className="sg-success"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35 }}
                            >
                                <span className="sg-success-icon">🎉</span>
                                <strong>Account created!</strong>
                                <p>{success}</p>
                                <small>An admin will review your request. You'll be able to log in once approved.</small>
                                <Link to="/login" className="sg-goto-login">Go to Login →</Link>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                onSubmit={handleSubmit}
                                variants={stagger.container}
                                initial="hidden"
                                animate="show"
                            >
                                {/* Google Sign Up */}
                                <motion.div className="sg-google-wrap" variants={stagger.item}>
                                    {GOOGLE_ENABLED ? (
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setError('Google sign-up failed. Please try again.')}
                                            width="380"
                                            shape="rectangular"
                                            theme="outline"
                                            size="large"
                                            text="signup_with"
                                            logo_alignment="center"
                                        />
                                    ) : (
                                        <button type="button" className="sg-google-placeholder" disabled title="Add VITE_GOOGLE_CLIENT_ID to enable">
                                            <GoogleIcon /> Sign up with Google
                                            <span className="sg-setup-badge">Setup required</span>
                                        </button>
                                    )}
                                </motion.div>

                                <motion.div className="sg-divider" variants={stagger.item}>
                                    <span>or sign up with email</span>
                                </motion.div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            className="sg-error"
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.div className="form-row" variants={stagger.item}>
                                    <div className="form-group">
                                        <input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
                                    </div>
                                </motion.div>

                                <motion.div className="form-group" variants={stagger.item}>
                                    <input type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} required />
                                </motion.div>

                                <motion.div className="form-group password-group" variants={stagger.item}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Password (min 6 characters)"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </motion.div>

                                <motion.div className="form-checkbox" variants={stagger.item}>
                                    <label className="checkbox-container">
                                        <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
                                        <span className="checkmark" />
                                        <span className="label-text">I agree to the <a href="#">Terms &amp; Conditions</a></span>
                                    </label>
                                </motion.div>

                                <motion.button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                    variants={stagger.item}
                                    whileHover={{ scale: loading ? 1 : 1.015 }}
                                    whileTap={{ scale: loading ? 1 : 0.98 }}
                                >
                                    {loading ? <span className="sg-spinner" /> : 'Create account'}
                                </motion.button>

                                <motion.p variants={stagger.item} style={{ fontSize: 12, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                                    ⏳ New accounts require admin approval before login
                                </motion.p>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Eye = () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOff = () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default Signup;
