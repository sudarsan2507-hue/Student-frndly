import AuthService from '../services/authService.js';

/**
 * Authentication controller
 * Handles HTTP requests for authentication endpoints
 */
class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * Login handler
     * POST /api/auth/login
     */
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Validate credentials
            const user = await this.authService.validateCredentials(email, password);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT token
            const token = this.authService.generateToken(user);

            // Return success response
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default AuthController;
