import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
    constructor(storage) {
        this.storage = storage;
    }

    async findUserByEmail(email) {
        return this.storage.findUserByEmail(email);
    }

    async validateCredentials(email, password) {
        try {
            const user = await this.storage.findUserByEmail(email);
            if (!user) return null;

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) return null;

            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            logger.error('Error validating credentials', { error: error.message });
            return null;
        }
    }

    generateToken(user) {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is not set');

        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            secret,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    verifyToken(token) {
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) throw new Error('JWT_SECRET environment variable is not set');
            return jwt.verify(token, secret);
        } catch (error) {
            logger.warn('Token verification failed', { reason: error.message });
            return null;
        }
    }

    async registerUser({ name, email, password, role, status }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.storage.createUser({ name, email, password: hashedPassword, role, status });
    }
}

export default AuthService;
