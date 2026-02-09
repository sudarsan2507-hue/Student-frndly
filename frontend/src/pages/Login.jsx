import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

/**
 * Login page component with modern split-screen design
 */
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    /**
     * Validate form inputs
     */
    const validateForm = () => {
        if (!email) {
            setError('Email is required');
            return false;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Email format is invalid');
            return false;
        }

        if (!password) {
            setError('Password is required');
            return false;
        }

        return true;
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        const result = await login(email, password);

        setLoading(false);

        if (result.success) {
            navigate('/check-in');
        } else {
            setError(result.message);
        }
    };

    const handleSocialLogin = (provider) => {
        console.log(`Login with ${provider}`);
        // TODO: Implement social login
    };

    return (
        <div className="login-container">
            {/* Left Side - Form */}
            <div className="login-left">
                <div className="login-card">
                    <h1>Welcome back!</h1>
                    <p className="login-subtitle">
                        Simplify your workflow and boost your productivity
                    </p>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Username"
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group password-group">
                            <div className="password-label-row">
                                <label htmlFor="password">Password</label>
                                <a href="#" className="forgot-password">
                                    Forgot Password?
                                </a>
                            </div>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="divider"></div>

                    <div className="social-login">
                        <button
                            type="button"
                            className="social-button"
                            onClick={() => handleSocialLogin('google')}
                            title="Login with Google"
                        >
                            G
                        </button>
                        <button
                            type="button"
                            className="social-button"
                            onClick={() => handleSocialLogin('apple')}
                            title="Login with Apple"
                        >
                            A
                        </button>
                        <button
                            type="button"
                            className="social-button"
                            onClick={() => handleSocialLogin('facebook')}
                            title="Login with Facebook"
                        >
                            f
                        </button>
                    </div>

                    <div className="register-link" style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#5f6368' }}>
                        Don't have an account? <a href="/signup" style={{ color: '#1a1a1a', fontWeight: '600', textDecoration: 'none' }}>Sign up</a>
                    </div>

                    <div className="test-credentials">
                        <p><strong>TEST CREDENTIALS:</strong></p>
                        <p>Email: student@test.com</p>
                        <p>Password: password</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Illustration */}
            <div className="login-right">
                <div className="illustration-container">
                    <img
                        src="/login-illustration.png"
                        alt="Person meditating with productivity tools"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    <div className="illustration-text">
                        <h2>Make your work easier and organized</h2>
                        <p>Track your learning progress with Student Frndly</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
