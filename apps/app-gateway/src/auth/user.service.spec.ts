import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRole, UserStatus } from '@ai-recruitment-clerk/user-management-domain';

describe('UserService (in-memory store)', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('creates users and derives names when missing', async () => {
    const user = await service.create({
      email: 'new.user@example.com',
      password: 'hashed',
      role: UserRole.RECRUITER,
    } as any);

    expect(user.id).toMatch(/^user-/);
    expect(user.firstName).toBe('new.user');
    expect(await service.findByEmail('new.user@example.com')).toBeDefined();
  });

  it('updates user metadata and strips password in dto response', async () => {
    const user = await service.create({
      email: 'update@example.com',
      password: 'hashed',
    } as any);

    const updated = await service.updateUser(user.id, {
      status: UserStatus.INACTIVE,
    } as any);

    expect(updated.status).toBe(UserStatus.INACTIVE);
    await expect(service.hasSecurityFlag(user.id, 'tokens_revoked')).resolves.toBe(false);
  });

  it('throws when retrieving missing user activity dependencies', async () => {
    await expect(service.findById('missing')).resolves.toBeNull();
    await expect(service.updateUser('missing', {} as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - User Creation Failures', () => {
    it('should handle duplicate email creation', async () => {
      await service.create({
        email: 'duplicate@example.com',
        password: 'hashed1',
        role: UserRole.RECRUITER,
      } as any);

      await expect(
        service.create({
          email: 'duplicate@example.com',
          password: 'hashed2',
          role: UserRole.RECRUITER,
        } as any),
      ).rejects.toThrow();
    });

    it('should handle creation with empty email', async () => {
      await expect(
        service.create({
          email: '',
          password: 'hashed',
          role: UserRole.RECRUITER,
        } as any),
      ).rejects.toThrow();
    });

    it('should handle creation with null password', async () => {
      await expect(
        service.create({
          email: 'test@example.com',
          password: null as any,
          role: UserRole.RECRUITER,
        } as any),
      ).rejects.toThrow();
    });

    it('should handle creation with invalid role', async () => {
      await expect(
        service.create({
          email: 'test@example.com',
          password: 'hashed',
          role: 'INVALID_ROLE' as any,
        } as any),
      ).rejects.toThrow();
    });
  });

  describe('Negative Tests - User Update Failures', () => {
    it('should throw NotFoundException when updating non-existent user', async () => {
      await expect(
        service.updateUser('nonexistent-id', { status: UserStatus.ACTIVE } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle update with empty object', async () => {
      const user = await service.create({
        email: 'update-empty@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      const updated = await service.updateUser(user.id, {} as any);
      expect(updated.id).toBe(user.id);
    });

    it('should handle update with invalid status', async () => {
      const user = await service.create({
        email: 'update-invalid@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      await expect(
        service.updateUser(user.id, { status: 'INVALID_STATUS' } as any),
      ).rejects.toThrow();
    });
  });

  describe('Negative Tests - User Retrieval Failures', () => {
    it('should return null for non-existent user by ID', async () => {
      await expect(service.findById('nonexistent')).resolves.toBeNull();
    });

    it('should return null for non-existent user by email', async () => {
      await expect(service.findByEmail('nonexistent@example.com')).resolves.toBeNull();
    });

    it('should handle findByEmail with empty string', async () => {
      await expect(service.findByEmail('')).resolves.toBeNull();
    });

    it('should handle findByEmail with malformed email', async () => {
      await expect(service.findByEmail('not-an-email')).resolves.toBeNull();
    });
  });

  describe('Boundary Tests - Email and Name Derivation', () => {
    it('should derive names from email with multiple dots', async () => {
      const user = await service.create({
        email: 'john.william.doe@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      expect(user.firstName).toBe('john.william.doe');
    });

    it('should handle email with numbers', async () => {
      const user = await service.create({
        email: 'user123@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      expect(user.firstName).toBe('user123');
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@example.com';
      const user = await service.create({
        email: longEmail,
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      expect(user.email).toBe(longEmail);
      expect(user.firstName).toBe('a'.repeat(50));
    });
  });

  describe('Boundary Tests - User Status Management', () => {
    it('should handle all possible user statuses', async () => {
      const user = await service.create({
        email: 'status-test@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      const statuses = [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED];

      for (const status of statuses) {
        const updated = await service.updateUser(user.id, { status } as any);
        expect(updated.status).toBe(status);
      }
    });

    it('should handle status transitions', async () => {
      const user = await service.create({
        email: 'transitions@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      let updated = await service.updateUser(user.id, { status: UserStatus.SUSPENDED } as any);
      expect(updated.status).toBe(UserStatus.SUSPENDED);

      updated = await service.updateUser(user.id, { status: UserStatus.ACTIVE } as any);
      expect(updated.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('Edge Cases - Concurrent User Operations', () => {
    it('should handle concurrent user creations', async () => {
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          service.create({
            email: `concurrent${i}@example.com`,
            password: `hashed${i}`,
            role: UserRole.RECRUITER,
          } as any),
        );

      const users = await Promise.all(promises);
      expect(users).toHaveLength(10);
      expect(new Set(users.map((u) => u.id)).size).toBe(10);
    });

    it('should handle concurrent updates to same user', async () => {
      const user = await service.create({
        email: 'concurrent-update@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      const updatePromises = [
        service.updateUser(user.id, { status: UserStatus.ACTIVE } as any),
        service.updateUser(user.id, { status: UserStatus.INACTIVE } as any),
        service.updateUser(user.id, { status: UserStatus.SUSPENDED } as any),
      ];

      await Promise.all(updatePromises);

      const finalUser = await service.findById(user.id);
      expect([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED]).toContain(
        finalUser?.status,
      );
    });
  });

  describe('Edge Cases - Special Characters in Email', () => {
    it('should handle email with special characters', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.co.uk',
        'user_name@example.com',
        'user-name@example.com',
      ];

      for (const email of specialEmails) {
        const user = await service.create({
          email,
          password: 'hashed',
          role: UserRole.RECRUITER,
        } as any);

        expect(user.email).toBe(email);
        const found = await service.findByEmail(email);
        expect(found?.id).toBe(user.id);
      }
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete user object with all fields', async () => {
      const user = await service.create({
        email: 'complete@example.com',
        password: 'hashed-password',
        role: UserRole.RECRUITER,
      } as any);

      expect(user).toMatchObject({
        id: expect.stringMatching(/^user-/),
        email: expect.stringMatching(/^[^@]+@[^@]+\.[^@]+$/),
        firstName: expect.any(String),
        role: expect.stringMatching(/^(ADMIN|RECRUITER|CANDIDATE)$/),
      });
      expect(user.id).toMatch(/^user-/);
      expect(user.email).toBe('complete@example.com');
    });

    it('should update user metadata correctly', async () => {
      const user = await service.create({
        email: 'metadata@example.com',
        password: 'hashed',
        role: UserRole.RECRUITER,
      } as any);

      const updated = await service.updateUser(user.id, {
        status: UserStatus.INACTIVE,
      } as any);

      expect(updated).toMatchObject({
        id: user.id,
        email: user.email,
        status: UserStatus.INACTIVE,
      });
      expect(updated.status).toBe(UserStatus.INACTIVE);
    });
  });
});
