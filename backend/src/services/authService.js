import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Authentication service
 * Handles credential validation, token generation, and verification
 */
class AuthService {
    constructor(storage) {
        this.storage = storage;
    }

    /**
     * Validate user credentials
     * @param {string} email - User email
     * @param {string} password - Plain text password
     * @returns {Promise<Object|null>} User object if valid, null otherwise
     */
    async validateCredentials(email, password) {
        try {
            const user = await this.storage.findUserByEmail(email);

            if (!user) {
                return null;
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return null;
            }

            // Return user without password
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Error validating credentials:', error);
            return null;
        }
    }

    /**
     * Generate JWT token for authenticated user
     * @param {Object} user - User object (without password)
     * @returns {string} JWT token
     */
    generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
    }

    /**
     * Verify and decode JWT token
     * @param {string} token - JWT token
     * @returns {Object|null} Decoded token payload if valid, null otherwise
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return null;
        }
    }
}

export default AuthService;
