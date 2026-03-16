import { UserRole, UserStatus } from '../index';
import { User } from './user.entity';

describe('User Entity', () => {
  describe('User Creation', () => {
    it('should create user with valid data', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.id).toBe('user-1');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.status).toBe(UserStatus.PENDING);
      expect(user.isActive).toBe(false);
    });

    it('should set default status to PENDING', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
      });

      expect(user.status).toBe(UserStatus.PENDING);
    });

    it('should set creation timestamps', () => {
      const before = new Date();
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
      });
      const after = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('validateCreate', () => {
    it('should validate valid user data', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing email', () => {
      const result = User.validateCreate({
        email: '',
        password: 'Password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should reject invalid email format', () => {
      const result = User.validateCreate({
        email: 'invalid-email',
        password: 'Password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject missing password', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject short password', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: 'short1',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain uppercase, lowercase, and number',
      );
    });

    it('should reject password without lowercase', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: 'PASSWORD123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain uppercase, lowercase, and number',
      );
    });

    it('should reject password without number', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: 'PasswordABC',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain uppercase, lowercase, and number',
      );
    });

    it('should validate with optional first and last name', () => {
      const result = User.validateCreate({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password consistently', () => {
      const password = 'TestPassword123';
      const hash1 = User.hashPassword(password);
      const hash2 = User.hashPassword(password);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different passwords', () => {
      const hash1 = User.hashPassword('Password1');
      const hash2 = User.hashPassword('Password2');

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', () => {
      const password = 'TestPassword123';
      const hash = User.hashPassword(password);

      expect(User.verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'TestPassword123';
      const hash = User.hashPassword(password);

      expect(User.verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('should produce 64 character hex hash', () => {
      const hash = User.hashPassword('TestPassword123');

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('Profile Update', () => {
    let user: User;

    beforeEach(() => {
      user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should update first name', () => {
      const result = user.updateProfile({ firstName: 'Jane' });

      expect(result.success).toBe(true);
      expect(user.firstName).toBe('Jane');
    });

    it('should update last name', () => {
      const result = user.updateProfile({ lastName: 'Smith' });

      expect(result.success).toBe(true);
      expect(user.lastName).toBe('Smith');
    });

    it('should update email', () => {
      const result = user.updateProfile({ email: 'new@example.com' });

      expect(result.success).toBe(true);
      expect(user.email).toBe('new@example.com');
    });

    it('should reject invalid email format', () => {
      const result = user.updateProfile({ email: 'invalid-email' });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email format');
      expect(user.email).toBe('test@example.com');
    });

    it('should update multiple fields', () => {
      const result = user.updateProfile({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      });

      expect(result.success).toBe(true);
      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Smith');
      expect(user.email).toBe('jane@example.com');
    });

    it('should update timestamp on successful update', () => {
      const beforeUpdate = user.updatedAt;

      setTimeout(() => {
        user.updateProfile({ firstName: 'Jane' });
        expect(user.updatedAt.getTime()).toBeGreaterThan(
          beforeUpdate.getTime(),
        );
      }, 10);
    });

    it('should not update timestamp on failed update', () => {
      const beforeUpdate = user.updatedAt;

      user.updateProfile({ email: 'invalid' });

      expect(user.updatedAt).toEqual(beforeUpdate);
    });
  });

  describe('User Status Transitions', () => {
    it('should activate pending user', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.PENDING,
      });

      user.activate();

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.isActive).toBe(true);
    });

    it('should deactivate active user', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
        isActive: true,
      });

      user.deactivate();

      expect(user.status).toBe(UserStatus.INACTIVE);
      expect(user.isActive).toBe(false);
    });

    it('should suspend user', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
        isActive: true,
      });

      user.suspend();

      expect(user.status).toBe(UserStatus.SUSPENDED);
      expect(user.isActive).toBe(false);
    });

    it('should update timestamp on status change', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.PENDING,
      });
      const beforeUpdate = user.updatedAt;

      setTimeout(() => {
        user.activate();
        expect(user.updatedAt.getTime()).toBeGreaterThan(
          beforeUpdate.getTime(),
        );
      }, 10);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow PENDING to ACTIVE', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.PENDING,
      });

      expect(user.canTransitionTo(UserStatus.ACTIVE)).toBe(true);
    });

    it('should allow PENDING to SUSPENDED', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.PENDING,
      });

      expect(user.canTransitionTo(UserStatus.SUSPENDED)).toBe(true);
    });

    it('should not allow PENDING to INACTIVE', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.PENDING,
      });

      expect(user.canTransitionTo(UserStatus.INACTIVE)).toBe(false);
    });

    it('should allow ACTIVE to INACTIVE', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
      });

      expect(user.canTransitionTo(UserStatus.INACTIVE)).toBe(true);
    });

    it('should allow ACTIVE to SUSPENDED', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
      });

      expect(user.canTransitionTo(UserStatus.SUSPENDED)).toBe(true);
    });

    it('should allow INACTIVE to ACTIVE', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.INACTIVE,
      });

      expect(user.canTransitionTo(UserStatus.ACTIVE)).toBe(true);
    });

    it('should allow SUSPENDED to ACTIVE', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.SUSPENDED,
      });

      expect(user.canTransitionTo(UserStatus.ACTIVE)).toBe(true);
    });

    it('should allow SUSPENDED to INACTIVE', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        status: UserStatus.SUSPENDED,
      });

      expect(user.canTransitionTo(UserStatus.INACTIVE)).toBe(true);
    });
  });

  describe('getFullName', () => {
    it('should return full name when first and last name exist', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user.getFullName()).toBe('John Doe');
    });

    it('should return username when no first/last name', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        username: 'johndoe',
      });

      expect(user.getFullName()).toBe('johndoe');
    });

    it('should return email when no username or names', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
      });

      expect(user.getFullName()).toBe('test@example.com');
    });
  });

  describe('recordLogin', () => {
    it('should record login timestamp', () => {
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
      });

      const before = new Date();
      user.recordLogin();
      const after = new Date();

      expect(user.lastLoginAt).toBeDefined();
      expect(user.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(user.lastLoginAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
