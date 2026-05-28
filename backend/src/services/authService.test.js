import AuthService from './authService.js';

// Mock storage
class MockStorage {
  constructor() {
    this.users = [];
    this.userIdCounter = 0;
  }

  findUserByEmail(email) {
    return Promise.resolve(this.users.find(u => u.email === email));
  }

  findUserById(id) {
    return Promise.resolve(this.users.find(u => u.id === id));
  }

  createUser(userData) {
    const user = { id: ++this.userIdCounter, ...userData };
    this.users.push(user);
    return Promise.resolve(user);
  }

  updateUser(id, updates) {
    const user = this.users.find(u => u.id === id);
    if (user) Object.assign(user, updates);
    return Promise.resolve(user);
  }
}

describe('AuthService', () => {
  let authService;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    authService = new AuthService(mockStorage);
  });

  describe('registerUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@test.com',
        password: 'password123',
        role: 'student',
        status: 'pending'
      };

      const user = await authService.registerUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe('john@test.com');
      expect(user.password).not.toBe('password123'); // Should be hashed
      expect(user.status).toBe('pending');
    });

    it('should hash the password securely', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@test.com',
        password: 'securepass',
        role: 'student',
        status: 'pending'
      };

      const user1 = await authService.registerUser(userData);
      const user2 = await authService.registerUser({
        ...userData,
        email: 'jane2@test.com'
      });

      // Same password should produce different hashes
      expect(user1.password).not.toBe(user2.password);
    });
  });

  describe('validateCredentials', () => {
    beforeEach(async () => {
      await authService.registerUser({
        name: 'Test User',
        email: 'test@test.com',
        password: 'testpass123',
        role: 'student',
        status: 'approved'
      });
    });

    it('should return user on valid credentials', async () => {
      const user = await authService.validateCredentials('test@test.com', 'testpass123');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@test.com');
    });

    it('should return null on invalid password', async () => {
      const user = await authService.validateCredentials('test@test.com', 'wrongpass');
      expect(user).toBeNull();
    });

    it('should return null on non-existent email', async () => {
      const user = await authService.validateCredentials('nonexist@test.com', 'anypass');
      expect(user).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: '123',
        email: 'test@test.com',
        role: 'student',
        status: 'approved'
      };

      const token = authService.generateToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const user = {
        id: '456',
        email: 'verify@test.com',
        role: 'student'
      };

      const token = authService.generateToken(user);
      const decoded = authService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe('456');
      expect(decoded.email).toBe('verify@test.com');
    });

    it('should return null on invalid token', () => {
      expect(authService.verifyToken('invalid.token.here')).toBeNull();
    });
  });
});
