import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory revoked-token set keyed by jti.
// Cleared every 25 h — anything older than JWT_EXPIRES_IN is already invalid.
const revokedTokens = new Set();
setInterval(() => revokedTokens.clear(), 25 * 60 * 60 * 1000).unref();

export const revokeToken  = (jti) => { if (jti) revokedTokens.add(jti); };
export const isTokenRevoked = (jti) => revokedTokens.has(jti);

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
            { id: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
            secret,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    verifyToken(token) {
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) throw new Error('JWT_SECRET environment variable is not set');
            const decoded = jwt.verify(token, secret);
            if (decoded.jti && isTokenRevoked(decoded.jti)) return null;
            return decoded;
        } catch (error) {
            logger.warn('Token verification failed', { reason: error.message });
            return null;
        }
    }

    async registerUser({ name, email, password, role, status }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.storage.createUser({ name, email, password: hashedPassword, role, status });
    }

    /**
     * Verify a Google ID token and return the matching app user.
     * Creates account with role/status based on accountType.
     */
    async verifyGoogleCredential(credential, accountType = 'individual') {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable is not set');

        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
        const payload = ticket.getPayload();

        const { email, name } = payload;
        if (!email) throw new Error('Google account has no email address');

        return this._findOrCreateGoogleUser({
            email,
            name: name || email.split('@')[0],
            accountType,
        });
    }

    async _findOrCreateGoogleUser({ email, name, accountType }) {
        const existing = await this.storage.findUserByEmail(email);

        if (existing) {
            const { password: _, ...u } = existing;
            return u;
        }

        const isCompany = accountType === 'company';
        const randomHash = await bcrypt.hash(crypto.randomUUID(), 10);
        const user = await this.storage.createUser({
            name,
            email,
            password: randomHash,
            role:   isCompany ? 'admin'   : 'student',
            status: isCompany ? 'pending' : 'pending',
        });

        const { password: _, ...u } = user;
        return u;
    }
}

export default AuthService;
