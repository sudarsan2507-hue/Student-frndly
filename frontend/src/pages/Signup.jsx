import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

const slide = {
    enter: d => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.36, ease: 'easeOut' } },
    exit: d => ({ x: d > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.26, ease: 'easeIn' } })
};

export default function Signup() {
    const navigate = useNavigate();
    const { loginDirect } = useAuth();

    const [step, setStep] = useState(1);
    const [dir, setDir] = useState(1);
    const [accountType, setAccountType] = useState('individual');
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', agreeTerms: false });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const next = () => { setDir(1); setStep(2); setError(''); };
    const back = () => { setDir(-1); setStep(1); setError(''); };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.agreeTerms) { setError('Please agree to the Terms & Conditions'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            const res = await api.post('/auth/register', { ...formData, accountType });
            if (res.data.data?.autoLogin) {
                const { token, user } = res.data.data;
                localStorage.setItem('authToken', token);
                localStorage.setItem('user', JSON.stringify(user));
                loginDirect(user);
                navigate('/check-in', { replace: true });
            } else {
                setSuccess(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (cr) => {
        setLoading(true); setError('');
        try {
            const { user } = await authService.googleLogin(cr.credential);
            if (user?.status === 'approved') {
                loginDirect(user);
                navigate('/check-in', { replace: true });
            } else {
                setSuccess('Google account registered! Awaiting admin approval.');
            }
        } catch (err) {
            const d = err.response?.data;
            if (d?.status === 'approved') navigate('/check-in');
            else setError(d?.message || err.message || 'Google sign-up failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sg-root">
            <div className="lr-blobs" aria-hidden>
                <div className="blob blob--purple" />
                <div className="blob blob--teal" />
                <div className="blob blob--pink" />
            </div>

            {/* ── Left panel: illustration ── */}
            <div className="sg-left">
                <div className="sg-scene">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={accountType}
                            initial={{ opacity: 0, scale: 0.85, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: -16 }}
                            transition={{ duration: 0.42, ease: 'easeOut' }}
                            className="sg-illustration"
                        >
                            {accountType === 'individual' ? <IndividualScene /> : <CompanyScene />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="sg-left-footer">
                    <p className="sg-mode-label">
                        {accountType === 'individual' ? '🎓 Student / Individual' : '🏢 Company / Organization'}
                    </p>
                    <Link to="/login" className="sg-back-home">← Back to login</Link>
                </div>
            </div>

            {/* ── Right panel: steps ── */}
            <div className="sg-right">
                <AnimatePresence mode="wait" custom={dir}>
                    {success ? (
                        <motion.div key="success" className="sg-card sg-success-card"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <div className="sg-success-icon">{accountType === 'company' ? '⏳' : '🎉'}</div>
                            <h2>{accountType === 'company' ? 'Request sent!' : 'You\'re in!'}</h2>
                            <p>{success}</p>
                            {accountType === 'company' && <small>An admin will review your company request. You'll get access once approved.</small>}
                            <Link to="/login" className="sg-goto">Go to Login →</Link>
                        </motion.div>

                    ) : step === 1 ? (
                        /* ── Step 1: Account type ── */
                        <motion.div key="s1" className="sg-card" custom={dir}
                            variants={slide} initial="enter" animate="center" exit="exit">
                            <h1 className="sg-heading">Who are you? 🤔</h1>
                            <p className="sg-sub">Pick the account type that fits you</p>

                            <div className="sg-type-grid">
                                <button
                                    className={`sg-type-btn ${accountType === 'individual' ? 'sg-type-btn--on' : ''}`}
                                    onClick={() => setAccountType('individual')}
                                >
                                    <div className="sg-type-art"><MiniStudent /></div>
                                    <strong>Individual</strong>
                                    <span>Student · Self-learner</span>
                                    <em>✅ Instant access</em>
                                    {accountType === 'individual' && <div className="sg-type-check">✓</div>}
                                </button>

                                <button
                                    className={`sg-type-btn sg-type-btn--company ${accountType === 'company' ? 'sg-type-btn--on sg-type-btn--on-company' : ''}`}
                                    onClick={() => setAccountType('company')}
                                >
                                    <div className="sg-type-art"><MiniCompany /></div>
                                    <strong>Company / Org</strong>
                                    <span>Admin · Team manager</span>
                                    <em>⏳ Requires approval</em>
                                    {accountType === 'company' && <div className="sg-type-check sg-type-check--teal">✓</div>}
                                </button>
                            </div>

                            <motion.button className="sg-cta" onClick={next}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                                Continue as {accountType === 'company' ? 'Company' : 'Individual'} →
                            </motion.button>

                            <p className="sg-switch">Already have an account? <Link to="/login">Log in</Link></p>
                        </motion.div>

                    ) : (
                        /* ── Step 2: Registration form ── */
                        <motion.div key="s2" className="sg-card" custom={dir}
                            variants={slide} initial="enter" animate="center" exit="exit">
                            <button className="sg-back" onClick={back}>← Back</button>

                            <div className="sg-badge">
                                {accountType === 'company' ? '🏢 Company Account' : '🎓 Individual Account'}
                            </div>

                            <h1 className="sg-heading">Create account</h1>
                            <p className="sg-switch" style={{ marginBottom: 20 }}>
                                Have one? <Link to="/login">Log in</Link>
                            </p>

                            {GOOGLE_ENABLED ? (
                                <div className="lr-google" style={{ marginBottom: 16 }}>
                                    <GoogleLogin onSuccess={handleGoogleSuccess}
                                        onError={() => setError('Google sign-up failed')}
                                        width="360" shape="rectangular" theme="filled_black"
                                        size="large" text="signup_with" logo_alignment="center" />
                                </div>
                            ) : (
                                <button className="lr-google-stub" disabled style={{ marginBottom: 16 }}>
                                    <GoogleIcon /> Sign up with Google
                                </button>
                            )}

                            <div className="lr-divider"><span>or with email</span></div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div className="lr-err"
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                        ⚠️ {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="lr-form">
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="lr-field" style={{ flex: 1 }}>
                                        <span className="lr-field-icon">👤</span>
                                        <input type="text" name="firstName" placeholder="First name"
                                            value={formData.firstName} onChange={handleChange} required />
                                    </div>
                                    <div className="lr-field" style={{ flex: 1 }}>
                                        <span className="lr-field-icon">👤</span>
                                        <input type="text" name="lastName" placeholder="Last name"
                                            value={formData.lastName} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className="lr-field">
                                    <span className="lr-field-icon">✉️</span>
                                    <input type="email" name="email" placeholder="Email address"
                                        value={formData.email} onChange={handleChange} required />
                                </div>

                                <div className="lr-field lr-field--pw">
                                    <span className="lr-field-icon">🔒</span>
                                    <input type={showPw ? 'text' : 'password'} name="password"
                                        placeholder="Password (min 6 chars)"
                                        value={formData.password} onChange={handleChange} required />
                                    <button type="button" className="lr-eye" onClick={() => setShowPw(p => !p)}>
                                        {showPw ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>

                                <label className="sg-checkbox">
                                    <input type="checkbox" name="agreeTerms"
                                        checked={formData.agreeTerms} onChange={handleChange} />
                                    <span className="sg-check-box" />
                                    <span>I agree to the <a href="#">Terms &amp; Conditions</a></span>
                                </label>

                                <motion.button type="submit" className="sg-cta" disabled={loading}
                                    whileHover={{ scale: loading ? 1 : 1.02 }}
                                    whileTap={{ scale: loading ? 1 : 0.97 }}>
                                    {loading ? <span className="lr-spinner" /> :
                                        accountType === 'company' ? 'Submit for Approval' : 'Create Account & Enter'}
                                </motion.button>

                                {accountType === 'company' && (
                                    <p className="sg-note">⏳ Company accounts need admin approval before login</p>
                                )}
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

/* ── Illustrations ──────────────────────────────────────── */

function IndividualScene() {
    return (
        <svg viewBox="0 0 340 340" width="320" height="320" fill="none" className="sg-svg">

            {/* thought chain: right → lightbulb */}
            <circle cx={216} cy={170} r={4}  fill="rgba(251,191,36,.3)"  stroke="rgba(251,191,36,.6)"  strokeWidth={1.5} />
            <circle cx={232} cy={153} r={7}  fill="rgba(251,191,36,.22)" stroke="rgba(251,191,36,.55)" strokeWidth={1.5} />
            <circle cx={250} cy={134} r={11} fill="rgba(251,191,36,.18)" stroke="rgba(251,191,36,.5)"  strokeWidth={1.5} />
            <g className="fl1">
                <circle cx={278} cy={106} r={30} fill="rgba(14,11,26,.85)" stroke="rgba(251,191,36,.7)" strokeWidth={2} />
                <circle cx={278} cy={98}  r={11} fill="#fbbf24" />
                <rect x={273} y={107} width={10} height={6}  rx={1.5} fill="#f59e0b" />
                <rect x={274} y={112} width={8}  height={3}  rx={1}   fill="#d97706" />
                <line x1={278} y1={83}  x2={278} y2={80}  stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
                <line x1={290} y1={87}  x2={293} y2={84}  stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
                <line x1={266} y1={87}  x2={263} y2={84}  stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
                <line x1={294} y1={97}  x2={298} y2={97}  stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
                <line x1={262} y1={97}  x2={258} y2={97}  stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
            </g>

            {/* thought chain: left → Σ */}
            <circle cx={126} cy={170} r={4}  fill="rgba(244,114,182,.3)"  stroke="rgba(244,114,182,.6)"  strokeWidth={1.5} />
            <circle cx={108} cy={152} r={7}  fill="rgba(244,114,182,.22)" stroke="rgba(244,114,182,.55)" strokeWidth={1.5} />
            <g className="fl2">
                <circle cx={82} cy={124} r={27} fill="rgba(14,11,26,.85)" stroke="rgba(244,114,182,.7)" strokeWidth={2} />
                <text x={82} y={133} textAnchor="middle" fill="#f472b6" fontSize={22} fontWeight="bold" fontFamily="Georgia,serif">Σ</text>
            </g>

            {/* sparkles */}
            <circle cx={305} cy={78}  r={2.5} fill="#fbbf24" opacity={.7} className="tw1" />
            <circle cx={258} cy={64}  r={2}   fill="#fbbf24" opacity={.5} className="tw2" />
            <circle cx={46}  cy={92}  r={2.5} fill="#f472b6" opacity={.7} className="tw2" />
            <circle cx={82}  cy={76}  r={2}   fill="#f472b6" opacity={.5} className="tw3" />
            <circle cx={170} cy={48}  r={2}   fill="#4ade80" opacity={.6} className="tw1" />

            {/* ── girl character (scaled for 340×340) ── */}
            <ellipse cx={170} cy={333} rx={90} ry={11} fill="#7c3aed" opacity={.18} className="glow-pulse" />

            {/* legs */}
            <ellipse cx={133} cy={308} rx={50} ry={18} fill="#7c3aed" />
            <ellipse cx={207} cy={308} rx={50} ry={18} fill="#6d28d9" />
            <ellipse cx={170} cy={315} rx={38} ry={17} fill="#7c3aed" />

            {/* body */}
            <rect x={133} y={233} width={68} height={80} rx={16} fill="#7c3aed" />
            <rect x={152} y={278} width={34} height={20} rx={7}  fill="#6d28d9" />
            <line x1={166} y1={246} x2={162} y2={264} stroke="#a78bfa" strokeWidth={1.8} strokeLinecap="round" />
            <line x1={174} y1={246} x2={178} y2={264} stroke="#a78bfa" strokeWidth={1.8} strokeLinecap="round" />

            {/* arms */}
            <path d="M133 249 Q102 267 91 294" stroke="#fbbf24" strokeWidth={18} strokeLinecap="round" fill="none" />
            <path d="M201 249 Q232 267 243 294" stroke="#fbbf24" strokeWidth={18} strokeLinecap="round" fill="none" />

            {/* book on lap */}
            <g transform="translate(170,304)">
                <rect x={-55} y={-12} width={50} height={36} rx={3} fill="#4ade80" transform="rotate(-4)" />
                <rect x={5}   y={-12} width={50} height={36} rx={3} fill="#22c55e" transform="rotate(4)" />
                <rect x={-4}  y={-13} width={8}  height={39} rx={2.5} fill="#15803d" />
                <line x1={-42} y1={0}  x2={-12} y2={-2} stroke="rgba(255,255,255,.5)" strokeWidth={1.8} strokeLinecap="round" />
                <line x1={-42} y1={7}  x2={-12} y2={5}  stroke="rgba(255,255,255,.5)" strokeWidth={1.8} strokeLinecap="round" />
                <line x1={12}  y1={0}  x2={42}  y2={-2} stroke="rgba(255,255,255,.5)" strokeWidth={1.8} strokeLinecap="round" />
                <line x1={12}  y1={7}  x2={42}  y2={5}  stroke="rgba(255,255,255,.5)" strokeWidth={1.8} strokeLinecap="round" />
            </g>

            {/* neck */}
            <rect x={158} y={220} width={24} height={18} rx={7} fill="#fbbf24" />

            {/* hair behind */}
            <path d="M124 182 Q108 213 110 254 Q112 278 116 298" stroke="#1e1b4b" strokeWidth={22} strokeLinecap="round" fill="none" />
            <path d="M216 182 Q230 213 228 254 Q226 276 222 295" stroke="#1e1b4b" strokeWidth={18} strokeLinecap="round" fill="none" />

            {/* head */}
            <circle cx={170} cy={178} r={52} fill="#fbbf24" />

            {/* cheeks */}
            <circle cx={136} cy={194} r={13} fill="#f87171" opacity={.28} />
            <circle cx={204} cy={194} r={13} fill="#f87171" opacity={.28} />

            {/* hair top */}
            <path d="M122 170 Q118 118 170 110 Q222 118 218 170 Q202 134 170 130 Q138 134 122 170Z" fill="#1e1b4b" />
            <path d="M148 119 Q170 112 192 119" stroke="#312e81" strokeWidth={4} strokeLinecap="round" fill="none" />

            {/* hair clip */}
            <circle cx={208} cy={134} r={6} fill="#f472b6" />
            <circle cx={218} cy={131} r={4} fill="#ec4899" />

            {/* eyes */}
            <ellipse cx={155} cy={183} rx={8.5} ry={8.5} fill="white" />
            <circle  cx={157} cy={186} r={6}    fill="#1e1b4b" />
            <circle  cx={159} cy={184} r={2}    fill="white" />
            <path d="M146 181 Q155 176 164 181" stroke="#1e1b4b" strokeWidth={2.5} strokeLinecap="round" fill="none" />

            <ellipse cx={185} cy={183} rx={8.5} ry={8.5} fill="white" />
            <circle  cx={187} cy={186} r={6}    fill="#1e1b4b" />
            <circle  cx={189} cy={184} r={2}    fill="white" />
            <path d="M176 181 Q185 176 194 181" stroke="#1e1b4b" strokeWidth={2.5} strokeLinecap="round" fill="none" />

            {/* glasses */}
            <rect x={144} y={175} width={21} height={14} rx={5} stroke="#e2e8f0" strokeWidth={2} fill="rgba(255,255,255,.1)" />
            <rect x={175} y={175} width={21} height={14} rx={5} stroke="#e2e8f0" strokeWidth={2} fill="rgba(255,255,255,.1)" />
            <line x1={165} y1={182} x2={175} y2={182} stroke="#e2e8f0" strokeWidth={2} />
            <line x1={120} y1={182} x2={144} y2={182} stroke="#e2e8f0" strokeWidth={1.8} strokeLinecap="round" />
            <line x1={196} y1={182} x2={218} y2={182} stroke="#e2e8f0" strokeWidth={1.8} strokeLinecap="round" />

            {/* smile */}
            <path d="M160 204 Q170 212 180 204" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" fill="none" />
        </svg>
    );
}

function CompanyScene() {
    return (
        <svg viewBox="0 0 340 340" width="320" height="320" fill="none" className="sg-svg">
            <Star cx={28} cy={35} r={3.5} cls="tw2" />
            <Star cx={310} cy={45} r={4.5} cls="tw1" />
            <Star cx={305} cy={220} r={3} cls="tw3" />
            <Star cx={25} cy={250} r={4} cls="tw2" />
            <Star cx={170} cy={20} r={3} cls="tw1" />

            <g className="fl1" transform="translate(40, 100)"><ChartBar /></g>
            <g className="fl3" transform="translate(285, 260)"><Pencil angle={25} sz={32} /></g>
            <g className="fl2" transform="translate(290, 90)"><Book color="#a78bfa" angle={-12} sz={36} /></g>

            <g transform="translate(170, 180)">
                <OfficeBuilding />
            </g>
        </svg>
    );
}

function OfficeBuilding() {
    return (
        <g>
            <ellipse cx={0} cy={130} rx={90} ry={9} fill="rgba(0,0,0,0.15)" />
            <rect x={-80} y={-28} width={160} height={158} rx={10} fill="#0891b2" />
            <rect x={-50} y={-80} width={100} height={60} rx={10} fill="#7c3aed" />
            <rect x={-24} y={-130} width={48} height={56} rx={8} fill="#6d28d9" />
            <rect x={-4} y={-155} width={8} height={30} rx={3} fill="#a78bfa" />
            <circle cx={0} cy={-158} r={6} fill="#fbbf24" className="pulse-glow" />
            <rect x={-60} y={20} width={28} height={24} rx={4} fill="#fef08a" opacity={0.9} />
            <rect x={-14} y={20} width={28} height={24} rx={4} fill="#fef08a" opacity={0.5} />
            <rect x={32} y={20} width={28} height={24} rx={4} fill="#fef08a" opacity={0.9} />
            <rect x={-60} y={62} width={28} height={24} rx={4} fill="#fef08a" opacity={0.55} />
            <rect x={-14} y={62} width={28} height={24} rx={4} fill="#fef08a" opacity={0.9} />
            <rect x={32} y={62} width={28} height={24} rx={4} fill="#fef08a" opacity={0.4} />
            <rect x={-60} y={104} width={28} height={24} rx={4} fill="#fef08a" opacity={0.9} />
            <rect x={32} y={104} width={28} height={24} rx={4} fill="#fef08a" opacity={0.65} />
            <rect x={-24} y={85} width={48} height={45} rx={5} fill="#0e7490" />
            <rect x={-20} y={-66} width={18} height={14} rx={4} fill="#fef08a" opacity={0.8} />
            <rect x={2} y={-66} width={18} height={14} rx={4} fill="#fef08a" opacity={0.4} />
        </g>
    );
}

function MiniStudent() {
    return (
        <svg viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="30" r="20" fill="#fbbf24" />
            <path d="M20 28 Q22 8 40 6 Q58 8 60 28 Q50 18 40 18 Q30 18 20 28Z" fill="#1e1b4b" />
            <circle cx="33" cy="28" r="3.5" fill="#1e1b4b" />
            <circle cx="47" cy="28" r="3.5" fill="#1e1b4b" />
            <path d="M34 38 Q40 44 46 38" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round" />
            <rect x="20" y="48" width="40" height="28" rx="8" fill="#7c3aed" />
            <rect x="25" y="62" width="30" height="18" rx="6" fill="#22c55e" />
            <line x1="40" y1="62" x2="40" y2="80" stroke="#15803d" strokeWidth="2.5" />
        </svg>
    );
}

function MiniCompany() {
    return (
        <svg viewBox="0 0 80 80" width="80" height="80">
            <rect x="15" y="30" width="50" height="48" rx="5" fill="#0891b2" />
            <rect x="27" y="10" width="26" height="24" rx="5" fill="#7c3aed" />
            <rect x="35" y="2" width="10" height="12" rx="3" fill="#6d28d9" />
            <rect x="20" y="40" width="10" height="10" rx="2" fill="#fef08a" />
            <rect x="35" y="40" width="10" height="10" rx="2" fill="#fef08a" opacity="0.5" />
            <rect x="50" y="40" width="10" height="10" rx="2" fill="#fef08a" />
            <rect x="20" y="56" width="10" height="10" rx="2" fill="#fef08a" opacity="0.6" />
            <rect x="50" y="56" width="10" height="10" rx="2" fill="#fef08a" />
            <rect x="30" y="58" width="20" height="20" rx="4" fill="#0e7490" />
        </svg>
    );
}

/* ── Reused SVG atoms ───────────────────────────────────── */
function Book({ color, angle, sz = 48 }) {
    const w = sz, h = sz * 1.35;
    return (
        <g transform={`rotate(${angle})`}>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={5} fill={color} />
            <rect x={-w / 2} y={-h / 2} width={w * 0.2} height={h} rx={4} fill="rgba(0,0,0,0.18)" />
            <rect x={-w * 0.18} y={-h * 0.35} width={w * 0.56} height={3} rx={1.5} fill="rgba(255,255,255,0.45)" />
            <rect x={-w * 0.18} y={-h * 0.2} width={w * 0.42} height={3} rx={1.5} fill="rgba(255,255,255,0.45)" />
            <rect x={-w * 0.18} y={-h * 0.05} width={w * 0.5} height={3} rx={1.5} fill="rgba(255,255,255,0.45)" />
        </g>
    );
}

function GradCap({ sz = 38 }) {
    return (
        <g>
            <polygon points={`0,${-sz * 0.55} ${-sz},0 0,${sz * 0.35} ${sz},0`} fill="#1e1b4b" />
            <rect x={-sz * 1.05} y={-sz * 0.06} width={sz * 2.1} height={sz * 0.24} rx={sz * 0.12} fill="#312e81" />
            <line x1={sz} y1={0} x2={sz} y2={sz * 0.75} stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={sz} cy={sz * 0.8} r={sz * 0.16} fill="#fbbf24" />
        </g>
    );
}

function Bulb({ sz = 32 }) {
    return (
        <g>
            <circle cx={0} cy={0} r={sz * 1.1} fill="#fbbf24" opacity={0.12} />
            <path d={`M0 ${-sz * 0.7} Q${sz * 0.64} ${-sz * 0.7} ${sz * 0.64} ${-sz * 0.12} Q${sz * 0.64} ${sz * 0.3} ${sz * 0.25} ${sz * 0.55} L${-sz * 0.25} ${sz * 0.55} Q${-sz * 0.64} ${sz * 0.3} ${-sz * 0.64} ${-sz * 0.12} Q${-sz * 0.64} ${-sz * 0.7} 0 ${-sz * 0.7}Z`} fill="#fef08a" />
            <rect x={-sz * 0.26} y={sz * 0.55} width={sz * 0.52} height={sz * 0.17} rx={sz * 0.07} fill="#d1d5db" />
            <rect x={-sz * 0.26} y={sz * 0.73} width={sz * 0.52} height={sz * 0.15} rx={sz * 0.07} fill="#9ca3af" />
            <line x1={0} y1={-sz * 1.06} x2={0} y2={-sz * 0.86} stroke="#fef08a" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={-sz * 0.75} y1={-sz * 0.75} x2={-sz * 0.62} y2={-sz * 0.62} stroke="#fef08a" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={sz * 0.75} y1={-sz * 0.75} x2={sz * 0.62} y2={-sz * 0.62} stroke="#fef08a" strokeWidth={2.5} strokeLinecap="round" />
        </g>
    );
}

function Pencil({ angle = 0, sz = 42 }) {
    return (
        <g transform={`rotate(${angle})`}>
            <rect x={-sz * 0.12} y={-sz * 0.72} width={sz * 0.24} height={sz * 1.28} rx={sz * 0.07} fill="#fbbf24" />
            <polygon points={`0,${sz * 0.65} ${-sz * 0.12},${sz * 0.56} ${sz * 0.12},${sz * 0.56}`} fill="#f87171" />
            <rect x={-sz * 0.12} y={-sz * 0.72} width={sz * 0.24} height={sz * 0.18} rx={sz * 0.05} fill="#9ca3af" />
            <rect x={-sz * 0.12} y={-sz * 0.54} width={sz * 0.24} height={sz * 0.08} fill="#e5e7eb" />
        </g>
    );
}

function ChartBar() {
    return (
        <g className="fl3">
            <rect x={0} y={20} width={18} height={40} rx={4} fill="#34d399" opacity={0.9} />
            <rect x={24} y={0} width={18} height={60} rx={4} fill="#22d3ee" opacity={0.9} />
            <rect x={48} y={10} width={18} height={50} rx={4} fill="#a78bfa" opacity={0.9} />
        </g>
    );
}

function Star({ cx, cy, r, cls }) {
    const p = r;
    return (
        <path className={cls} transform={`translate(${cx},${cy})`}
            d={`M0,${-p} L${p * 0.27},${-p * 0.37} L${p},0 L${p * 0.27},${p * 0.37} L0,${p} L${-p * 0.27},${p * 0.37} L${-p},0 L${-p * 0.27},${-p * 0.37}Z`}
            fill="#fbbf24" />
    );
}

/* ── Shared small components ────────────────────────────── */
function BrandIcon() {
    return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <defs><linearGradient id="bgi2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
            <rect width="38" height="38" rx="11" fill="url(#bgi2)" />
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

function Eye() {
    return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOff() {
    return <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
