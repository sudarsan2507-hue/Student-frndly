import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useMotion } from '../context/MotionContext';
import VoxelPortrait from '../components/VoxelPortrait';
import ThemeToggle from '../components/ThemeToggle';
import './Login.css';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
    const navigate = useNavigate();
    const { login, loginDirect } = useAuth();
    const { enableMotion } = useMotion() || { enableMotion: true };

    // build -> she forms voxel-by-voxel, resolving into the real image
    // ask   -> "log in or sign up?" prompt, no form shown yet
    // form  -> the chosen form is revealed
    const [stage, setStage] = useState('build');

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errorStatus, setErrorStatus] = useState('');

    const handleChange = (e) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
        if (error) { setError(''); setErrorStatus(''); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setErrorStatus(''); setLoading(true);
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate(result.user.role === 'admin' ? '/admin' : '/check-in', { replace: true });
            } else {
                setErrorStatus(result.status || '');
                setError(result.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (cr) => {
        setLoading(true); setError('');
        try {
            const { user } = await authService.googleLogin(cr.credential);
            loginDirect(user);
            navigate(user.role === 'admin' ? '/admin' : '/check-in', { replace: true });
        } catch (err) {
            const d = err.response?.data;
            setErrorStatus(d?.status || '');
            setError(d?.message || err.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lr-root">
            {/* ── Full-screen voxel build, behind everything ── */}
            <VoxelPortrait
                animate={enableMotion}
                onComplete={() => setTimeout(() => setStage((s) => (s === 'build' ? 'ask' : s)), 650)}
            />

            <div className="lr-topbar">
                <span className="lr-brand">StudentFrndly</span>
                <ThemeToggle />
            </div>

            <div className="lr-tagline">
                <h2>Half of what you learn is gone in a week. This keeps score.</h2>
                <p>Track each skill, watch it fade, and get told the day to practise it.</p>
            </div>

            {/* ── She asks: log in, or sign up? Nothing else shows until you pick. ── */}
            <AnimatePresence>
                {stage === 'ask' && (
                    <motion.div
                        className="lr-ask"
                        initial={{ opacity: 0, y: 22, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.25 } }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        <motion.div
                            className="lr-ask-bubble"
                            animate={enableMotion ? { y: [0, -6, 0] } : {}}
                            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <div className="lr-ask-who">
                                <span className="lr-ask-avatar" aria-hidden="true">✦</span>
                                <span className="lr-ask-name">StudentFrndly</span>
                            </div>
                            <p>Hey — log in, or make an account?</p>
                            <div className="lr-ask-actions">
                                <button type="button" className="lr-ask-btn lr-ask-btn--primary" onClick={() => setStage('form')}>
                                    Log in
                                </button>
                                <button type="button" className="lr-ask-btn" onClick={() => navigate('/signup')}>
                                    Sign up
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Form card, overlaid on the voxel scene — only once chosen ── */}
            {stage === 'form' && (
            <div className="lr-form-side">
                <motion.div
                    className="lr-card"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <div className="lr-card-head">
                        <h1>Welcome back</h1>
                        <p>Sign in to see what has faded since last time.</p>
                    </div>

                    {GOOGLE_ENABLED ? (
                        <div className="lr-google-wrap">
                            <div className="lr-google-label">
                                <span className="lr-google-line" />
                                <span>Continue with</span>
                                <span className="lr-google-line" />
                            </div>
                            <div className="lr-google">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google sign-in failed')}
                                    width="340" shape="rectangular"
                                    theme="filled_black" size="large"
                                    logo_alignment="center"
                                />
                            </div>
                        </div>
                    ) : (
                        <button className="lr-google-stub" disabled>
                            <GoogleIcon /> Continue with Google
                        </button>
                    )}

                    <div className="lr-divider"><span>or sign in with email</span></div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className={`lr-err ${errorStatus === 'pending' ? 'lr-err--pending' : ''}`}
                                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            >
                                {errorStatus === 'pending' ? '⏳' : '⚠️'} {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="lr-form">
                        <div className="lr-field">
                            <span className="lr-field-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></span>
                            <input
                                type="email" name="email" placeholder="Email address"
                                value={formData.email} onChange={handleChange}
                                required autoComplete="email"
                            />
                        </div>

                        <div className="lr-field lr-field--pw">
                            <span className="lr-field-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                            <input
                                type={showPw ? 'text' : 'password'} name="password"
                                placeholder="Password"
                                value={formData.password} onChange={handleChange}
                                required autoComplete="current-password"
                            />
                            <button type="button" className="lr-eye" onClick={() => setShowPw(p => !p)}>
                                {showPw ? <EyeOff /> : <Eye />}
                            </button>
                        </div>

                        <motion.button
                            type="submit" className="lr-submit" disabled={loading}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.97 }}
                        >
                            {loading ? <Spinner /> : 'Log in'}
                        </motion.button>
                    </form>

                    <p className="lr-switch">New here? <Link to="/signup">Create an account</Link></p>
                </motion.div>
            </div>
            )}
        </div>
    );
}

/* ── SVG Scene ─────────────────────────────────────────── */

function BrandIcon() {
    return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <defs><linearGradient id="bgi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
            <rect width="38" height="38" rx="11" fill="url(#bgi)" />
            <path d="M11 24L16 13L21 24" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="28" cy="15" r="5" fill="white" opacity="0.95" />
        </svg>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

function Spinner() {
    return <span className="lr-spinner" />;
}

function Eye() {
    return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function EyeOff() {
    return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
