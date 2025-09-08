import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserService } from '../../auth/user.service';
import {
  UserDto,
  UpdateUserDto,
  UserPreferencesDto,
  UserStatus,
  UserRole,
} from '@ai-recruitment-clerk/user-management-domain';

// Mock UserService
const mockUserService = {
  findById: jest.fn(),
  findByOrganizationId: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getStats: jest.fn(),
  create: jest.fn(),
  findByEmail: jest.fn(),
  updatePassword: jest.fn(),
  updateLastActivity: jest.fn(),
  listUsers: jest.fn(),
  updateSecurityFlag: jest.fn(),
  getSecurityFlags: jest.fn(),
  hasSecurityFlag: jest.fn(),
  clearSecurityFlags: jest.fn(),
};

describe('UserManagementService', () => {
  let service: UserManagementService;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<UserManagementService>(UserManagementService);
    userService = module.get(UserService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  const mockUser: any = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    name: 'Test User',
    role: UserRole.USER,
    organizationId: 'org-001',
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: new Date(),
    securityFlags: {},
    preferences: {
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
    },
  };

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UserManagementService);
    });

    it('should have userService dependency injected', () => {
      expect(userService).toBeDefined();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        status: UserStatus.INACTIVE,
      };

      const updatedUser = { ...mockUser, ...updateData };
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await service.updateUser('user-123', updateData);

      expect(userService.updateUser).toHaveBeenCalledWith(
        'user-123',
        updateData,
      );
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        name: 'Test User',
        role: UserRole.USER,
        organizationId: 'org-001',
        status: UserStatus.INACTIVE,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        lastActivity: mockUser.lastActivity,
        securityFlags: {},
        preferences: mockUser.preferences,
      });
      // Password should be excluded
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.updateUser.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateUser('non-existent', { firstName: 'Test' }),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    it('should handle empty update data', async () => {
      userService.updateUser.mockResolvedValue(mockUser);

      const result = await service.updateUser('user-123', {});

      expect(userService.updateUser).toHaveBeenCalledWith('user-123', {});
      expect(result.id).toBe('user-123');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('getUserPreferences', () => {
    it('should return mock preferences', async () => {
      const result = await service.getUserPreferences('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      });
    });

    it('should return preferences for different user ID', async () => {
      const result = await service.getUserPreferences('user-456');

      expect(result.userId).toBe('user-456');
      expect(result.language).toBe('en');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const preferences: UserPreferencesDto = {
        userId: 'user-123',
        language: 'es',
        notifications: {
          email: false,
          push: true,
          sms: true,
        },
      };

      const result = await service.updateUserPreferences(
        'user-123',
        preferences,
      );

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        userId: 'user-123',
        language: 'es',
        notifications: {
          email: false,
          push: true,
          sms: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      const preferences: UserPreferencesDto = {
        userId: 'non-existent',
        language: 'en',
        notifications: { email: true, push: false, sms: false },
      };

      await expect(
        service.updateUserPreferences('non-existent', preferences),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateUserPreferences('non-existent', preferences),
      ).rejects.toThrow('User with ID non-existent not found');
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity successfully', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getUserActivity('user-123');

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        activities: [
          {
            id: 'activity-1',
            userId: 'user-123',
            type: 'login',
            description: 'User logged in',
            timestamp: expect.any(Date),
            ipAddress: '127.0.0.1',
            userAgent: 'Test User Agent',
          },
        ],
        totalCount: 1,
        hasMore: false,
        summary: {
          totalActivities: 1,
          recentLogins: 1,
          lastActivity: mockUser.lastActivity,
        },
      });
    });

    it('should handle options parameter', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        page: 1,
        limit: 10,
      };

      const result = await service.getUserActivity('user-123', options);

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result.activities).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.getUserActivity('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserActivity('non-existent')).rejects.toThrow(
        'User with ID non-existent not found',
      );
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getUserProfile('user-123');

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        role: UserRole.USER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        lastActivity: mockUser.lastActivity,
        securityFlags: {},
        preferences: mockUser.preferences,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.getUserProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserProfile('non-existent')).rejects.toThrow(
        'User with ID non-existent not found',
      );
    });
  });

  describe('getUserActivitySummary', () => {
    it('should return activity summary successfully', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getUserActivitySummary('user-123');

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        userId: 'user-123',
        totalLogins: 1,
        lastLoginDate: mockUser.lastActivity,
        totalActivities: 1,
        averageSessionDuration: 30,
        mostActiveHour: 14,
        lastActivity: mockUser.lastActivity,
      });
    });

    it('should handle user without lastActivity', async () => {
      const userWithoutActivity = { ...mockUser, lastActivity: undefined };
      userService.findById.mockResolvedValue(userWithoutActivity);

      const result = await service.getUserActivitySummary('user-123');

      expect(result.lastLoginDate).toBeInstanceOf(Date);
      expect(result.lastActivity).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(
        service.getUserActivitySummary('non-existent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUserActivitySummary('non-existent'),
      ).rejects.toThrow('User with ID non-existent not found');
    });
  });

  describe('updateUserProfile', () => {
    it('should call updateUser method', async () => {
      const updateData: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Profile',
      };

      userService.updateUser.mockResolvedValue({ ...mockUser, ...updateData });

      const result = await service.updateUserProfile('user-123', updateData);

      expect(userService.updateUser).toHaveBeenCalledWith(
        'user-123',
        updateData,
      );
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Profile');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      userService.deleteUser.mockResolvedValue(undefined);

      await service.deleteUser('user-123');

      expect(userService.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should handle userService throwing error', async () => {
      userService.deleteUser.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteUser('user-123')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('softDeleteUser', () => {
    it('should soft delete user successfully', async () => {
      const updatedUser = { ...mockUser, status: UserStatus.INACTIVE };
      userService.updateUser.mockResolvedValue(updatedUser);

      await service.softDeleteUser('user-123', 'Test reason');

      expect(userService.updateUser).toHaveBeenCalledWith('user-123', {
        status: UserStatus.INACTIVE,
        updatedAt: expect.any(Date),
      });
    });

    it('should soft delete without reason', async () => {
      const updatedUser = { ...mockUser, status: UserStatus.INACTIVE };
      userService.updateUser.mockResolvedValue(updatedUser);

      await service.softDeleteUser('user-123');

      expect(userService.updateUser).toHaveBeenCalledWith('user-123', {
        status: UserStatus.INACTIVE,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('getOrganizationUsers', () => {
    const orgUsers = [
      { ...mockUser, id: 'user-1', email: 'user1@example.com' },
      {
        ...mockUser,
        id: 'user-2',
        email: 'user2@example.com',
        status: UserStatus.INACTIVE,
      },
      { ...mockUser, id: 'user-3', email: 'user3@example.com' },
    ];

    it('should return organization users successfully', async () => {
      userService.findByOrganizationId.mockResolvedValue(orgUsers);

      const result = await service.getOrganizationUsers('org-001');

      expect(userService.findByOrganizationId).toHaveBeenCalledWith('org-001');
      expect(result.users).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.users[0]).not.toHaveProperty('password');
    });

    it('should filter by status when provided', async () => {
      userService.findByOrganizationId.mockResolvedValue(orgUsers);

      const result = await service.getOrganizationUsers('org-001', {
        status: UserStatus.ACTIVE,
      });

      expect(result.users).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(
        result.users.every((user) => user.status === UserStatus.ACTIVE),
      ).toBe(true);
    });

    it('should handle options with page and limit', async () => {
      userService.findByOrganizationId.mockResolvedValue(orgUsers);

      const result = await service.getOrganizationUsers('org-001', {
        page: 1,
        limit: 10,
        role: UserRole.USER,
      });

      expect(result.users).toHaveLength(3);
    });

    it('should return empty result for organization with no users', async () => {
      userService.findByOrganizationId.mockResolvedValue([]);

      const result = await service.getOrganizationUsers('empty-org');

      expect(result.users).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('verifyUserPassword', () => {
    it('should verify password successfully for test password', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.verifyUserPassword(
        'user-123',
        'test-password',
      );

      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toBe(true);
    });

    it('should verify password successfully for admin password', async () => {
      const adminUser = { ...mockUser, password: 'admin123-hashed' };
      userService.findById.mockResolvedValue(adminUser);

      const result = await service.verifyUserPassword(
        'admin-123',
        'any-password',
      );

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.verifyUserPassword(
        'user-123',
        'wrong-password',
      );

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      const result = await service.verifyUserPassword(
        'non-existent',
        'any-password',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const updatedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await service.updateUserStatus(
        'user-123',
        UserStatus.SUSPENDED,
        'Security violation',
      );

      expect(userService.updateUser).toHaveBeenCalledWith('user-123', {
        status: UserStatus.SUSPENDED,
        updatedAt: expect.any(Date),
      });
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(result).not.toHaveProperty('password');
    });

    it('should update status without reason', async () => {
      const updatedUser = { ...mockUser, status: UserStatus.PENDING };
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await service.updateUserStatus(
        'user-123',
        UserStatus.PENDING,
      );

      expect(userService.updateUser).toHaveBeenCalledWith('user-123', {
        status: UserStatus.PENDING,
        updatedAt: expect.any(Date),
      });
      expect(result.status).toBe(UserStatus.PENDING);
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.updateUser.mockResolvedValue(null);

      await expect(
        service.updateUserStatus('non-existent', UserStatus.INACTIVE),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateUserStatus('non-existent', UserStatus.INACTIVE),
      ).rejects.toThrow('User with ID non-existent not found');
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status successfully', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 85,
        organizations: ['org-001', 'org-002', 'org-003'],
      };
      userService.getStats.mockResolvedValue(mockStats);

      const result = await service.getHealthStatus();

      expect(userService.getStats).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'healthy',
        totalUsers: 100,
        activeUsers: 85,
        recentActivity: 85, // Simple approximation
      });
    });

    it('should handle zero users scenario', async () => {
      const emptyStats = {
        totalUsers: 0,
        activeUsers: 0,
        organizations: [],
      };
      userService.getStats.mockResolvedValue(emptyStats);

      const result = await service.getHealthStatus();

      expect(result).toEqual({
        status: 'healthy',
        totalUsers: 0,
        activeUsers: 0,
        recentActivity: 0,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle UserService throwing unexpected errors', async () => {
      userService.findById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.getUserProfile('user-123')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle null/undefined user IDs', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.getUserProfile(null as any)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserProfile(undefined as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty string user ID', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.getUserProfile('')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle malformed update data', async () => {
      userService.updateUser.mockResolvedValue({
        ...mockUser,
        firstName: undefined,
      });

      const result = await service.updateUser('user-123', {
        firstName: undefined,
      });

      expect(result.firstName).toBeUndefined();
      expect(result).not.toHaveProperty('password');
    });

    it('should handle user without preferences in getUserActivity', async () => {
      const userWithoutPrefs = { ...mockUser };
      delete userWithoutPrefs.preferences;
      userService.findById.mockResolvedValue(userWithoutPrefs);

      const result = await service.getUserActivity('user-123');

      expect(result.activities).toHaveLength(1);
      expect(result.summary.lastActivity).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      // Create user
      const updatedMockUser = {
        ...mockUser,
        firstName: 'John',
        lastName: 'Doe',
      };
      userService.updateUser.mockResolvedValue(updatedMockUser);
      const updatedUser = await service.updateUser('user-123', {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(updatedUser.firstName).toBe('John');

      // Get user preferences
      const preferences = await service.getUserPreferences('user-123');
      expect(preferences.userId).toBe('user-123');

      // Update preferences
      userService.findById.mockResolvedValue(mockUser);
      const newPrefs = await service.updateUserPreferences('user-123', {
        userId: 'user-123',
        language: 'es',
        notifications: { email: true, push: true, sms: false },
      });
      expect(newPrefs.language).toBe('es');

      // Soft delete
      const deletedUser = { ...mockUser, status: UserStatus.INACTIVE };
      userService.updateUser.mockResolvedValue(deletedUser);
      await service.softDeleteUser('user-123', 'User requested deletion');

      expect(userService.updateUser).toHaveBeenCalledWith('user-123', {
        status: UserStatus.INACTIVE,
        updatedAt: expect.any(Date),
      });
    });

    it('should handle organization user management flow', async () => {
      const orgUsers = [
        { ...mockUser, id: 'user-1', status: UserStatus.ACTIVE },
        { ...mockUser, id: 'user-2', status: UserStatus.INACTIVE },
        { ...mockUser, id: 'user-3', status: UserStatus.PENDING },
      ];

      userService.findByOrganizationId.mockResolvedValue(orgUsers);

      // Get all organization users
      const allUsers = await service.getOrganizationUsers('org-001');
      expect(allUsers.totalCount).toBe(3);

      // Filter active users only
      const activeUsers = await service.getOrganizationUsers('org-001', {
        status: UserStatus.ACTIVE,
      });
      expect(activeUsers.totalCount).toBe(1);

      // Update user status in organization
      userService.updateUser.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      const suspendedUser = await service.updateUserStatus(
        'user-1',
        UserStatus.SUSPENDED,
      );
      expect(suspendedUser.status).toBe(UserStatus.SUSPENDED);
    });
  });
});
