import AuthService from '../services/authService.js';

/**
 * Authentication middleware
 * Validates JWT tokens and protects routes
 */
const createAuthMiddleware = (storage) => {
    const authService = new AuthService(storage);

    /**
     * Verify JWT token from Authorization header
     * Attaches decoded user info to req.user
     */
    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Extract "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const decoded = authService.verifyToken(token);

        if (!decoded) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Attach user info to request
        req.user = decoded;
        next();
    };

    return { authenticateToken };
};

export default createAuthMiddleware;
