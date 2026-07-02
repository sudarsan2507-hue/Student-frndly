import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
    const navigate = useNavigate();
    const { login, loginDirect } = useAuth();
    const cardRef = useRef(null);

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errorStatus, setErrorStatus] = useState('');

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current) return;
        const r = cardRef.current.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 10;
        const y = ((e.clientY - r.top) / r.height - 0.5) * -10;
        cardRef.current.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    }, []);

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
            <Blobs />

            {/* ── Left: illustrated scene ── */}
            <div className="lr-scene">
                <StudyScene />
                <div className="lr-tagline">
                    <h2>Master what you learn,<br />before it fades.</h2>
                    <p>Track skills · Fight forgetting · Level up daily</p>
                    <div className="lr-pills">
                        <span>📚 Skills</span><span>🧠 Retention</span><span>📈 Progress</span>
                    </div>
                </div>
            </div>

            {/* ── Right: glass form card ── */}
            <div className="lr-form-side">
                <motion.div
                    ref={cardRef}
                    className="lr-card"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ transition: 'transform 0.12s ease' }}
                >
                    <div className="lr-card-head">
                        <h1>Welcome back 👋</h1>
                        <p>Sign in to keep your streak alive.</p>
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
                            <span className="lr-field-icon">✉️</span>
                            <input
                                type="email" name="email" placeholder="Email address"
                                value={formData.email} onChange={handleChange}
                                required autoComplete="email"
                            />
                        </div>

                        <div className="lr-field lr-field--pw">
                            <span className="lr-field-icon">🔒</span>
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
                            {loading ? <Spinner /> : 'Log in →'}
                        </motion.button>
                    </form>

                    <p className="lr-switch">New here? <Link to="/signup">Create an account</Link></p>
                </motion.div>
            </div>
        </div>
    );
}

/* ── SVG Scene ─────────────────────────────────────────── */

function StudyScene() {
    return (
        <svg viewBox="0 0 400 400" width="360" height="360" fill="none" xmlns="http://www.w3.org/2000/svg" className="study-svg">

            {/* ── Thought bubble chain: right → lightbulb ── */}
            <circle cx={252} cy={200} r={5}  fill="rgba(251,191,36,.3)"  stroke="rgba(251,191,36,.6)"  strokeWidth={1.5} />
            <circle cx={272} cy={180} r={8}  fill="rgba(251,191,36,.22)" stroke="rgba(251,191,36,.55)" strokeWidth={1.5} />
            <circle cx={295} cy={158} r={12} fill="rgba(251,191,36,.18)" stroke="rgba(251,191,36,.5)"  strokeWidth={1.5} />
            <g className="fl1">
                <circle cx={328} cy={124} r={36} fill="rgba(14,11,26,.85)" stroke="rgba(251,191,36,.7)" strokeWidth={2} />
                <circle cx={328} cy={115} r={13} fill="#fbbf24" />
                <rect x={322} y={126} width={12} height={8}  rx={2} fill="#f59e0b" />
                <rect x={323} y={133} width={10} height={3}  rx={1} fill="#d97706" />
                <line x1={328} y1={98}  x2={328} y2={94}  stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={342} y1={102} x2={345} y2={99}  stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={314} y1={102} x2={311} y2={99}  stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={346} y1={113} x2={350} y2={113} stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={310} y1={113} x2={306} y2={113} stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" />
            </g>

            {/* ── Thought bubble chain: left → Σ ── */}
            <circle cx={150} cy={200} r={5}  fill="rgba(244,114,182,.3)"  stroke="rgba(244,114,182,.6)"  strokeWidth={1.5} />
            <circle cx={130} cy={178} r={8}  fill="rgba(244,114,182,.22)" stroke="rgba(244,114,182,.55)" strokeWidth={1.5} />
            <g className="fl2">
                <circle cx={98} cy={146} r={32} fill="rgba(14,11,26,.85)" stroke="rgba(244,114,182,.7)" strokeWidth={2} />
                <text x={98} y={157} textAnchor="middle" fill="#f472b6" fontSize={26} fontWeight="bold" fontFamily="Georgia,serif">Σ</text>
            </g>

            {/* ── Thought bubble chain: top → open book ── */}
            <circle cx={200} cy={152} r={5}  fill="rgba(52,211,153,.3)"  stroke="rgba(52,211,153,.6)"  strokeWidth={1.5} />
            <circle cx={200} cy={130} r={8}  fill="rgba(52,211,153,.22)" stroke="rgba(52,211,153,.55)" strokeWidth={1.5} />
            <g className="fl3">
                <circle cx={200} cy={101} r={28} fill="rgba(14,11,26,.85)" stroke="rgba(52,211,153,.7)" strokeWidth={2} />
                <rect x={185} y={91}  width={13} height={20} rx={2} fill="#4ade80" />
                <rect x={202} y={91}  width={13} height={20} rx={2} fill="#22c55e" />
                <rect x={197} y={90}  width={6}  height={22} rx={2} fill="#15803d" />
            </g>

            {/* sparkles */}
            <circle cx={362} cy={92}  r={3}   fill="#fbbf24" opacity={.7} className="tw1" />
            <circle cx={308} cy={76}  r={2.5} fill="#fbbf24" opacity={.5} className="tw2" />
            <circle cx={50}  cy={108} r={3}   fill="#f472b6" opacity={.7} className="tw2" />
            <circle cx={96}  cy={90}  r={2.5} fill="#f472b6" opacity={.5} className="tw3" />
            <circle cx={178} cy={60}  r={2.5} fill="#4ade80" opacity={.6} className="tw1" />
            <circle cx={224} cy={62}  r={2}   fill="#4ade80" opacity={.5} className="tw3" />

            {/* ── Girl character ── */}

            {/* ground glow */}
            <ellipse cx={200} cy={392} rx={108} ry={13} fill="#7c3aed" opacity={.18} className="glow-pulse" />

            {/* legs cross-legged */}
            <ellipse cx={158} cy={364} rx={58} ry={22} fill="#7c3aed" />
            <ellipse cx={242} cy={364} rx={58} ry={22} fill="#6d28d9" />
            <ellipse cx={200} cy={372} rx={44} ry={20} fill="#7c3aed" />

            {/* body */}
            <rect x={160} y={278} width={80} height={92} rx={18} fill="#7c3aed" />
            <rect x={180} y={330} width={40} height={24} rx={8}  fill="#6d28d9" />
            <line x1={196} y1={292} x2={192} y2={312} stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
            <line x1={204} y1={292} x2={208} y2={312} stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />

            {/* arms */}
            <path d="M160 296 Q124 316 110 348" stroke="#fbbf24" strokeWidth={22} strokeLinecap="round" fill="none" />
            <path d="M240 296 Q276 316 290 348" stroke="#fbbf24" strokeWidth={22} strokeLinecap="round" fill="none" />

            {/* open book on lap */}
            <g transform="translate(200,356)">
                <rect x={-65} y={-14} width={58} height={42} rx={4} fill="#4ade80" transform="rotate(-4)" />
                <rect x={7}   y={-14} width={58} height={42} rx={4} fill="#22c55e" transform="rotate(4)" />
                <rect x={-5}  y={-15} width={10} height={46} rx={3} fill="#15803d" />
                <line x1={-50} y1={0}  x2={-14} y2={-2} stroke="rgba(255,255,255,.5)" strokeWidth={2} strokeLinecap="round" />
                <line x1={-50} y1={8}  x2={-14} y2={6}  stroke="rgba(255,255,255,.5)" strokeWidth={2} strokeLinecap="round" />
                <line x1={-50} y1={16} x2={-22} y2={14} stroke="rgba(255,255,255,.5)" strokeWidth={2} strokeLinecap="round" />
                <line x1={14}  y1={0}  x2={50}  y2={-2} stroke="rgba(255,255,255,.5)" strokeWidth={2} strokeLinecap="round" />
                <line x1={14}  y1={8}  x2={50}  y2={6}  stroke="rgba(255,255,255,.5)" strokeWidth={2} strokeLinecap="round" />
            </g>

            {/* neck */}
            <rect x={186} y={264} width={28} height={22} rx={8} fill="#fbbf24" />

            {/* long hair flowing behind — drawn before head */}
            <path d="M148 215 Q130 252 132 300 Q134 328 138 354" stroke="#1e1b4b" strokeWidth={26} strokeLinecap="round" fill="none" />
            <path d="M252 215 Q268 252 266 300 Q264 326 260 348" stroke="#1e1b4b" strokeWidth={22} strokeLinecap="round" fill="none" />

            {/* head */}
            <circle cx={200} cy={210} r={60} fill="#fbbf24" />

            {/* cheeks */}
            <circle cx={162} cy={228} r={16} fill="#f87171" opacity={.28} />
            <circle cx={238} cy={228} r={16} fill="#f87171" opacity={.28} />

            {/* hair top */}
            <path d="M144 202 Q140 142 200 134 Q260 142 256 202 Q238 160 200 156 Q162 160 144 202Z" fill="#1e1b4b" />
            <path d="M174 143 Q200 136 226 143" stroke="#312e81" strokeWidth={5} strokeLinecap="round" fill="none" />

            {/* hair clip */}
            <circle cx={244} cy={162} r={7} fill="#f472b6" />
            <circle cx={256} cy={158} r={5} fill="#ec4899" />

            {/* eyes — downward studying gaze */}
            <ellipse cx={182} cy={216} rx={10} ry={10} fill="white" />
            <circle  cx={184} cy={219} r={7}   fill="#1e1b4b" />
            <circle  cx={186} cy={217} r={2.5} fill="white" />
            <path d="M172 213 Q182 208 192 213" stroke="#1e1b4b" strokeWidth={3} strokeLinecap="round" fill="none" />

            <ellipse cx={218} cy={216} rx={10} ry={10} fill="white" />
            <circle  cx={220} cy={219} r={7}   fill="#1e1b4b" />
            <circle  cx={222} cy={217} r={2.5} fill="white" />
            <path d="M208 213 Q218 208 228 213" stroke="#1e1b4b" strokeWidth={3} strokeLinecap="round" fill="none" />

            {/* glasses */}
            <rect x={170} y={208} width={24} height={16} rx={6} stroke="#e2e8f0" strokeWidth={2.5} fill="rgba(255,255,255,.1)" />
            <rect x={206} y={208} width={24} height={16} rx={6} stroke="#e2e8f0" strokeWidth={2.5} fill="rgba(255,255,255,.1)" />
            <line x1={194} y1={216} x2={206} y2={216} stroke="#e2e8f0" strokeWidth={2.5} />
            <line x1={144} y1={216} x2={170} y2={216} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
            <line x1={230} y1={216} x2={254} y2={216} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />

            {/* smile */}
            <path d="M188 240 Q200 249 212 240" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" fill="none" />
        </svg>
    );
}

/* ── Shared bits ────────────────────────────────────────── */

function Blobs() {
    return (
        <div className="lr-blobs" aria-hidden>
            <div className="blob blob--purple" />
            <div className="blob blob--teal" />
            <div className="blob blob--pink" />
        </div>
    );
}

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
