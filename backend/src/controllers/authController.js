/**
 * Authentication controller
 * Handles login, register, status checks
 */
class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * Login — blocks pending/rejected accounts
     * POST /api/auth/login
     */
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }

            const user = await this.authService.validateCredentials(email, password);

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            // Block pending accounts
            if (user.status === 'pending') {
                return res.status(403).json({
                    success: false,
                    status: 'pending',
                    message: 'Your account is awaiting admin approval. Please check back later.'
                });
            }

            // Block rejected accounts
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

    /**
     * Register new student (starts as pending)
     * POST /api/auth/register
     */
    register = async (req, res, next) => {
        try {
            const { firstName, lastName, email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }

            const existing = await this.authService.storage.findUserByEmail(email);
            if (existing) {
                return res.status(409).json({ success: false, message: 'An account with this email already exists' });
            }

            const user = await this.authService.registerUser({
                name: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
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
