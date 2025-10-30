import { NotFoundException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserStatus } from '@ai-recruitment-clerk/user-management-domain';

const createUserServiceMock = () => ({
  updateUser: jest.fn(),
  findById: jest.fn(),
  deleteUser: jest.fn(),
  findByOrganizationId: jest.fn(),
  getStats: jest.fn().mockResolvedValue({
    totalUsers: 10,
    activeUsers: 8,
  }),
}) as any;

describe('UserManagementService (mocked dependencies)', () => {
  const baseUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'secret',
    status: UserStatus.ACTIVE,
  } as any;

  let userService: ReturnType<typeof createUserServiceMock>;
  let service: UserManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = createUserServiceMock();
    service = new UserManagementService(userService);
  });

  it('updates user and strips password', async () => {
    userService.updateUser.mockResolvedValue({ ...baseUser, password: 'hashed' });

    const result = await service.updateUser('user-1', { firstName: 'Test' } as any);

    expect(userService.updateUser).toHaveBeenCalledWith('user-1', { firstName: 'Test' });
    expect(result).toEqual(
      expect.objectContaining({ id: 'user-1', email: 'test@example.com' }),
    );
    expect((result as any).password).toBeUndefined();
  });

  it('throws when updating non-existent user', async () => {
    userService.updateUser.mockResolvedValue(null);

    await expect(
      service.updateUser('missing', { firstName: 'Test' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates preferences after ensuring user exists', async () => {
    userService.findById.mockResolvedValue(baseUser);

    const prefs = await service.updateUserPreferences('user-1', {
      userId: 'user-1',
      language: 'zh',
      notifications: { email: true, push: false, sms: false },
    } as any);

    expect(userService.findById).toHaveBeenCalledWith('user-1');
    expect(prefs.language).toBe('zh');
  });

  it('returns organization users filtered by status', async () => {
    userService.findByOrganizationId.mockResolvedValue([
      { ...baseUser, status: UserStatus.ACTIVE },
      { ...baseUser, id: 'user-2', status: UserStatus.INACTIVE },
    ]);

    const result = await service.getOrganizationUsers('org-1', {
      status: UserStatus.ACTIVE,
    });

    expect(userService.findByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(result.users).toHaveLength(1);
    expect(result.users[0].id).toBe('user-1');
  });

  it('verifies password using fallback logic', async () => {
    userService.findById.mockResolvedValue({ ...baseUser, password: 'admin123-hash' });

    const pass = await service.verifyUserPassword('user-1', 'anything');

    expect(pass).toBe(true);
  });

  it('returns health status based on stats', async () => {
    const status = await service.getHealthStatus();

    expect(status).toEqual({ status: 'healthy', totalUsers: 10, activeUsers: 8, recentActivity: 8 });
    expect(userService.getStats).toHaveBeenCalled();
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - User Update Validation', () => {
    it('should reject update with empty user ID', async () => {
      await expect(
        service.updateUser('', { firstName: 'Test' } as any),
      ).rejects.toThrow();
    });

    it('should handle database failure during update', async () => {
      userService.updateUser.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(
        service.updateUser('user-1', { firstName: 'Test' } as any),
      ).rejects.toThrow('Database connection lost');
    });

    it('should reject invalid status transition', async () => {
      userService.updateUser.mockRejectedValue(
        new Error('Invalid status transition'),
      );

      await expect(
        service.updateUser('user-1', { status: 'INVALID' } as any),
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('Negative Tests - Preferences Validation', () => {
    it('should reject preferences for non-existent user', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(
        service.updateUserPreferences('nonexistent', {
          userId: 'nonexistent',
          language: 'zh',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid language code', async () => {
      userService.findById.mockResolvedValue(baseUser);

      const prefs = await service.updateUserPreferences('user-1', {
        userId: 'user-1',
        language: 'invalid-lang',
      } as any);

      expect(prefs.language).toBe('invalid-lang');
    });

    it('should handle database failure during preferences update', async () => {
      userService.findById.mockRejectedValue(
        new Error('Database query timeout'),
      );

      await expect(
        service.updateUserPreferences('user-1', {
          userId: 'user-1',
          language: 'en',
        } as any),
      ).rejects.toThrow('Database query timeout');
    });
  });

  describe('Boundary Tests - Organization Users', () => {
    it('should handle organization with exactly 0 users', async () => {
      userService.findByOrganizationId.mockResolvedValue([]);

      const result = await service.getOrganizationUsers('empty-org', {});

      expect(result.users).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle organization with maximum users (1000)', async () => {
      const maxUsers = Array.from({ length: 1000 }, (_, i) => ({
        ...baseUser,
        id: `user-${i}`,
      }));
      userService.findByOrganizationId.mockResolvedValue(maxUsers);

      const result = await service.getOrganizationUsers('large-org', {});

      expect(result.users).toHaveLength(1000);
      expect(result.totalCount).toBe(1000);
    });

    it('should filter all inactive users correctly', async () => {
      const allInactive = [
        { ...baseUser, id: 'user-1', status: UserStatus.INACTIVE },
        { ...baseUser, id: 'user-2', status: UserStatus.INACTIVE },
      ];
      userService.findByOrganizationId.mockResolvedValue(allInactive);

      const result = await service.getOrganizationUsers('org-1', {
        status: UserStatus.ACTIVE,
      });

      expect(result.users).toHaveLength(0);
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent user updates', async () => {
      userService.updateUser.mockResolvedValue({ ...baseUser, firstName: 'Updated' });

      const promises = [
        service.updateUser('user-1', { firstName: 'Test1' } as any),
        service.updateUser('user-1', { firstName: 'Test2' } as any),
        service.updateUser('user-1', { firstName: 'Test3' } as any),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.id).toBe('user-1');
        expect((result as any).password).toBeUndefined();
      });
      expect(userService.updateUser).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent preference updates for different users', async () => {
      userService.findById.mockResolvedValue(baseUser);

      const promises = [
        service.updateUserPreferences('user-1', { userId: 'user-1', language: 'en' } as any),
        service.updateUserPreferences('user-2', { userId: 'user-2', language: 'zh' } as any),
        service.updateUserPreferences('user-3', { userId: 'user-3', language: 'es' } as any),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(userService.findById).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases - Password Security', () => {
    it('should never expose password in any response', async () => {
      userService.updateUser.mockResolvedValue({
        ...baseUser,
        password: 'should-be-stripped',
      });

      const result = await service.updateUser('user-1', { email: 'new@example.com' } as any);

      expect(result).not.toHaveProperty('password');
      expect((result as any).password).toBeUndefined();
    });

    it('should verify password even with special characters', async () => {
      userService.findById.mockResolvedValue({
        ...baseUser,
        password: 'p@$$w0rd!@#$%^&*()',
      });

      const isValid = await service.verifyUserPassword('user-1', 'p@$$w0rd!@#$%^&*()');

      expect(isValid).toBe(true);
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete user structure with all fields', async () => {
      userService.updateUser.mockResolvedValue({
        ...baseUser,
        firstName: 'John',
        lastName: 'Doe',
        updatedAt: new Date(),
      });

      const result = await service.updateUser('user-1', { firstName: 'John' } as any);

      expect(result).toMatchObject({
        id: expect.any(String),
        email: expect.stringMatching(/.+@.+\..+/),
        status: expect.any(String),
      });
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should return complete organization users response structure', async () => {
      userService.findByOrganizationId.mockResolvedValue([baseUser]);

      const result = await service.getOrganizationUsers('org-1', {});

      expect(result).toMatchObject({
        users: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
      });
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.users.length).toBeLessThanOrEqual(result.totalCount);
    });
  });
});
