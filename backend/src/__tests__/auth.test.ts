import { UserRepository } from '../repositories/UserRepository';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../utils/auth';

describe('Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
    avatar: '👤',
  };

  describe('Password Hashing', () => {
    it('should hash password', async () => {
      const hash = await hashPassword(testUser.password);
      expect(hash).not.toBe(testUser.password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should compare password with hash', async () => {
      const hash = await hashPassword(testUser.password);
      const match = await comparePassword(testUser.password, hash);
      expect(match).toBe(true);
    });

    it('should not match invalid password', async () => {
      const hash = await hashPassword(testUser.password);
      const match = await comparePassword('WrongPassword123!', hash);
      expect(match).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    it('should generate valid token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: testUser.email,
        username: testUser.username,
      };

      const token = generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should verify valid token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: testUser.email,
        username: testUser.username,
      };

      const token = generateToken(payload);
      const verified = verifyToken(token);

      expect(verified).toBeTruthy();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.username).toBe(payload.username);
    });

    it('should reject invalid token', () => {
      const verified = verifyToken('invalid.token.here');
      expect(verified).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should create new user', async () => {
      const passwordHash = await hashPassword(testUser.password);
      const user = await UserRepository.create(
        testUser.email,
        testUser.username,
        passwordHash,
        testUser.avatar
      );

      expect(user).toBeTruthy();
      expect(user.email).toBe(testUser.email);
      expect(user.username).toBe(testUser.username);
      expect(user.avatar).toBe(testUser.avatar);
      expect(user.id).toBeTruthy();
    });

    it('should not allow duplicate email', async () => {
      const passwordHash = await hashPassword(testUser.password);

      // First user
      await UserRepository.create(
        'unique@example.com',
        'uniqueuser',
        passwordHash
      );

      // Try to create duplicate email
      expect(async () => {
        await UserRepository.create(
          'unique@example.com',
          'differentusername',
          passwordHash
        );
      }).rejects.toThrow();
    });

    it('should not allow duplicate username', async () => {
      const passwordHash = await hashPassword(testUser.password);

      // First user
      await UserRepository.create(
        'user1@example.com',
        'username123',
        passwordHash
      );

      // Try to create duplicate username
      expect(async () => {
        await UserRepository.create(
          'user2@example.com',
          'username123',
          passwordHash
        );
      }).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    it('should find user by email', async () => {
      const passwordHash = await hashPassword('password123');
      const created = await UserRepository.create(
        'finduser@example.com',
        'findutils',
        passwordHash
      );

      const found = await UserRepository.findByEmail('finduser@example.com');
      expect(found).toBeTruthy();
      expect(found?.id).toBe(created.id);
    });

    it('should find user by username', async () => {
      const passwordHash = await hashPassword('password123');
      const created = await UserRepository.create(
        'usernameuser@example.com',
        'findbyusername',
        passwordHash
      );

      const found = await UserRepository.findByUsername('findbyusername');
      expect(found).toBeTruthy();
      expect(found?.id).toBe(created.id);
    });

    it('should find user by ID', async () => {
      const passwordHash = await hashPassword('password123');
      const created = await UserRepository.create(
        'iduser@example.com',
        'idusername',
        passwordHash
      );

      const found = await UserRepository.findById(created.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('User Updates', () => {
    it('should update last login', async () => {
      const passwordHash = await hashPassword('password123');
      const user = await UserRepository.create(
        'loginuser@example.com',
        'loginusername',
        passwordHash
      );

      const before = user.last_login;
      await UserRepository.updateLastLogin(user.id);

      const after = await UserRepository.findById(user.id);
      expect(after?.last_login).not.toBe(before);
    });

    it('should soft delete user', async () => {
      const passwordHash = await hashPassword('password123');
      const user = await UserRepository.create(
        'deleteuser@example.com',
        'deleteusername',
        passwordHash
      );

      expect(user.is_active).toBe(true);

      await UserRepository.delete(user.id);

      const deleted = await UserRepository.findById(user.id);
      expect(deleted?.is_active).toBe(false);
    });
  });
});
