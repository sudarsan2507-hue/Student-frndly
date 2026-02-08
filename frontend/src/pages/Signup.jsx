import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Signup.css';
// import signupBg from '../assets/signup_background.png'; // Image generation failed

const Signup = () => {
    const navigate = useNavigate();
    const { login } = useAuth(); // We might need a register function in AuthContext later

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        agreeTerms: false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validation logic here
        if (!formData.agreeTerms) {
            alert("Please agree to the Terms & Conditions");
            return;
        }

        setLoading(true);
        console.log("Registering user:", formData);

        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            // navigate('/dashboard'); // Redirect after successful signup
            alert("Signup functionality to be implemented with backend.");
        }, 1500);
    };

    return (
        <div className="signup-container">
            {/* Left Side - Image & Branding */}
            <div className="signup-left">
                <div className="brand-logo">AMU</div>
                <div className="hero-content">
                    <h1>Capturing Moments,<br />Creating Memories</h1>
                    <div className="slider-dots">
                        <span className="dot active"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                </div>
                <Link to="/" className="back-link">
                    Back to website &rarr;
                </Link>
            </div>

            {/* Right Side - Form */}
            <div className="signup-right">
                <div className="signup-form-container">
                    <h2>Create an account</h2>
                    <p className="login-prompt">
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="firstName"
                                    placeholder="First name"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="lastName"
                                    placeholder="Last name"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group password-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>

                        <div className="form-checkbox">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    name="agreeTerms"
                                    checked={formData.agreeTerms}
                                    onChange={handleChange}
                                />
                                <span className="checkmark"></span>
                                <span className="label-text">I agree to the <a href="#">Terms & Conditions</a></span>
                            </label>
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>

                        <div className="divider">
                            <span>Or register with</span>
                        </div>

                        <div className="social-buttons">
                            <button type="button" className="social-btn google">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.908 8.908 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"></path></svg>
                                Google
                            </button>
                            <button type="button" className="social-btn apple">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.67 4.12-1.2 1.95.14 3.3.69 4.11 1.77-3.63 1.77-3 6.94 1.45 8.35-.9.48-1.54 2.85-2.26 3.31zM12.03 5.39c-.16-2.54 2.13-4.8 4.67-4.59.32 2.76-2.8 4.96-4.67 4.59z"></path></svg>
                                Apple
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Signup;
