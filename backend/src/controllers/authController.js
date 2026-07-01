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
                return res.status(403).json({
                    success: false,
                    status: 'pending',
                    message: 'Your account is awaiting admin approval. Please check back later.'
                });
            }

            if (user.status === 'rejected') {
                return res.status(403).json({
                    success: false,
                    status: 'rejected',
                    message: 'Your account has been rejected. Please contact your administrator.'
                });
            }

            const token = this.authService.generateToken(user);

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status }
                }
            });
        } catch (error) {
            next(error);
        }
    };

    register = async (req, res, next) => {
        try {
            const { firstName, lastName, email, password } = req.body;

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
            const lastTrimmed = (lastName || '').trim().slice(0, MAX_NAME_LEN);

            const existing = await this.authService.findUserByEmail(email);
            if (existing) {
                return res.status(409).json({ success: false, message: 'An account with this email already exists' });
            }

            const user = await this.authService.registerUser({
                name: `${firstTrimmed} ${lastTrimmed}`.trim() || email.split('@')[0],
                email,
                password,
                role: 'student',
                status: 'pending'
            });

            res.status(201).json({
                success: true,
                message: 'Account created! Awaiting admin approval before you can log in.',
                data: { id: user.id, email: user.email, name: user.name, status: user.status }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default AuthController;
