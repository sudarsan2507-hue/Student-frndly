import { revokeToken } from '../services/authService.js';
import { resetDemoAccountIfNeeded } from '../services/demoResetService.js';
import logger from '../utils/logger.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME_LEN = 100;
const MAX_PASSWORD_LEN = 128;

class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }
            if (!EMAIL_RE.test(email)) {
                return res.status(400).json({ success: false, message: 'Invalid email format' });
            }
            if (typeof password !== 'string' || password.length > MAX_PASSWORD_LEN) {
                return res.status(400).json({ success: false, message: 'Invalid password' });
            }

            const user = await this.authService.validateCredentials(email, password);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            if (user.status === 'pending') {
                return res.status(403).json({ success: false, status: 'pending', message: 'Your account is awaiting admin approval. Please check back later.' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ success: false, status: 'rejected', message: 'Your account has been rejected. Please contact your administrator.' });
            }

            const token = this.authService.generateToken(user);
            res.json({
                success: true,
                message: 'Login successful',
                data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } }
            });
        } catch (error) {
            next(error);
        }
    };

    register = async (req, res, next) => {
        try {
            const { firstName, lastName, email, password, accountType } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }
            if (!EMAIL_RE.test(email)) {
                return res.status(400).json({ success: false, message: 'Invalid email format' });
            }
            if (typeof password !== 'string' || password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            }
            if (password.length > MAX_PASSWORD_LEN) {
                return res.status(400).json({ success: false, message: 'Password too long' });
            }

            const firstTrimmed = (firstName || '').trim().slice(0, MAX_NAME_LEN);
            const lastTrimmed  = (lastName  || '').trim().slice(0, MAX_NAME_LEN);

            const existing = await this.authService.findUserByEmail(email);
            if (existing) {
                return res.status(409).json({ success: false, message: 'An account with this email already exists' });
            }

            const isCompany = accountType === 'company';
            const user = await this.authService.registerUser({
                name: `${firstTrimmed} ${lastTrimmed}`.trim() || email.split('@')[0],
                email,
                password,
                role:   isCompany ? 'admin'   : 'student',
                status: isCompany ? 'pending' : 'approved',
            });

            if (!isCompany) {
                const token = this.authService.generateToken(user);
                return res.status(201).json({
                    success: true,
                    message: 'Account created! Welcome aboard.',
                    data: {
                        token,
                        user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
                        autoLogin: true,
                    }
                });
            }

            res.status(201).json({
                success: true,
                message: 'Company account created! An admin will review and approve your request.',
                data: { id: user.id, email: user.email, name: user.name, status: user.status, autoLogin: false }
            });
        } catch (error) {
            next(error);
        }
    };

    /** POST /api/auth/google — verify Google ID token, issue app JWT */
    googleLogin = async (req, res, next) => {
        try {
            const { credential, accountType } = req.body;
            if (!credential) {
                return res.status(400).json({ success: false, message: 'Google credential is required' });
            }

            const user = await this.authService.verifyGoogleCredential(credential, accountType || 'individual');

            if (user.status === 'pending') {
                return res.status(403).json({ success: false, status: 'pending', message: 'Your account is awaiting admin approval. Please check back later.' });
            }
            if (user.status === 'rejected') {
                return res.status(403).json({ success: false, status: 'rejected', message: 'Your account has been rejected. Please contact your administrator.' });
            }

            const token = this.authService.generateToken(user);
            res.json({
                success: true,
                message: 'Login successful',
                data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/logout — revoke the current token server-side, and if
     * this was one of the two public demo accounts, wipe and re-seed their
     * data back to the canonical demo dataset so the next visitor who logs
     * in sees a fresh, fully-working demo rather than whatever the previous
     * visitor left behind.
     */
    logout = async (req, res) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let decoded = null;
        if (token) {
            try {
                decoded = this.authService.verifyToken(token);
                if (decoded?.jti) revokeToken(decoded.jti);
            } catch { /* already invalid — nothing to revoke */ }
        }
        if (decoded?.email) {
            try {
                await resetDemoAccountIfNeeded(this.authService.storage, decoded.email);
            } catch (err) {
                // Never fail the logout itself over a demo-reset hiccup
                logger.error('Demo reset on logout failed', { message: err.message });
            }
        }
        res.json({ success: true, message: 'Logged out' });
    };
}

export default AuthController;
