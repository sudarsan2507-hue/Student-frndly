import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import './Login.css';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

const stagger = {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
    item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } }
};

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: y * 6, y: x * -6 });
    }, []);

    const handleMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

    const redirect = (user) => navigate(user?.role === 'admin' ? '/admin' : '/check-in');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Email and password are required'); return; }
        setLoading(true);
        const result = await login(email, password);
        setLoading(false);
        if (result.success) redirect(result.user);
        else setError(result.message);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            setError('');
            const { user } = await authService.googleLogin(credentialResponse.credential);
            redirect(user);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lp-root">
            {/* Animated background orbs */}
            <div className="lp-orbs" aria-hidden="true">
                <span className="lp-orb lp-orb-1" />
                <span className="lp-orb lp-orb-2" />
                <span className="lp-orb lp-orb-3" />
                <span className="lp-orb lp-orb-4" />
            </div>

            {/* Left Panel */}
            <motion.div
                className="lp-left"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                <div className="lp-brand">
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                        <defs>
                            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#7c3aed" />
                                <stop offset="1" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                        <rect width="48" height="48" rx="12" fill="url(#lg1)" />
                        <path d="M14 30 L20 18 L26 30" stroke="rgba(255,255,255,0.95)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <circle cx="34" cy="18" r="6" fill="rgba(255,255,255,0.95)" />
                    </svg>
                    <span>Student Frndly</span>
                </div>

                <div className="lp-hero">
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.65, ease: 'easeOut' }}
                    >
                        Learn Smarter,<br />
                        <span className="lp-gradient-text">Not Harder.</span>
                    </motion.h1>
                    <motion.p
                        className="lp-hero-sub"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.55 }}
                    >
                        Track skill decay, beat the forgetting curve, and master your learning path.
                    </motion.p>
                </div>

                {/* Floating stat cards */}
                <div className="lp-stats">
                    {[
                        { num: '94%', label: 'Retention Rate', delay: 0 },
                        { num: '2.5×', label: 'Faster Learning', delay: 1.2 },
                        { num: '500+', label: 'Skills Tracked', delay: 0.6 }
                    ].map(({ num, label, delay }) => (
                        <motion.div
                            key={label}
                            className="lp-stat"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5 + delay * 0.4, delay, ease: 'easeInOut' }}
                            initial={{ opacity: 0, scale: 0.85 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                        >
                            <span className="lp-stat-num">{num}</span>
                            <span className="lp-stat-label">{label}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Decorative grid dots */}
                <div className="lp-grid-dots" aria-hidden="true" />
            </motion.div>

            {/* Right Panel — Form */}
            <div className="lp-right">
                <motion.div
                    ref={cardRef}
                    className="lp-card"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                    <div className="lp-card-header">
                        <h2>Welcome back</h2>
                        <p>Sign in to continue your learning journey</p>
                    </div>

                    {/* Google button */}
                    <div className="lp-google-wrap">
                        {GOOGLE_ENABLED ? (
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Google login failed. Please try again.')}
                                width="340"
                                shape="rectangular"
                                theme="outline"
                                size="large"
                                text="continue_with"
                                logo_alignment="center"
                            />
                        ) : (
                            <button className="lp-google-placeholder" disabled title="Add VITE_GOOGLE_CLIENT_ID to enable">
                                <GoogleIcon />
                                Continue with Google
                                <span className="lp-setup-badge">Setup required</span>
                            </button>
                        )}
                    </div>

                    <div className="lp-divider">
                        <span>or continue with email</span>
                    </div>

                    <motion.form
                        onSubmit={handleSubmit}
                        variants={stagger.container}
                        initial="hidden"
                        animate="show"
                    >
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    className="lp-error"
                                    key="err"
                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.97 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <span>⚠</span> {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div className="lp-field" variants={stagger.item}>
                            <label htmlFor="lp-email">Email address</label>
                            <input
                                id="lp-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                disabled={loading}
                                autoComplete="email"
                            />
                        </motion.div>

                        <motion.div className="lp-field" variants={stagger.item}>
                            <div className="lp-field-row">
                                <label htmlFor="lp-pass">Password</label>
                                <Link to="#" className="lp-forgot">Forgot password?</Link>
                            </div>
                            <div className="lp-pass-wrap">
                                <input
                                    id="lp-pass"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="lp-eye"
                                    onClick={() => setShowPassword(v => !v)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                        </motion.div>

                        <motion.div variants={stagger.item}>
                            <motion.button
                                type="submit"
                                className="lp-submit"
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.015 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                            >
                                {loading ? (
                                    <span className="lp-spinner" />
                                ) : 'Sign in'}
                            </motion.button>
                        </motion.div>
                    </motion.form>

                    <p className="lp-signup-link">
                        Don't have an account? <Link to="/signup">Create one</Link>
                    </p>

                    <div className="lp-test-creds">
                        <span>Test: </span>
                        <code>student@test.com</code>
                        <span> / </span>
                        <code>password</code>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* Inline SVG icons — no dependency needed */
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Eye = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOff = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default Login;
