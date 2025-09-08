import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    // Clear the in-memory stores for each test
    (service as any).users.clear();
    (service as any).emailToIdMap.clear();
    // Re-initialize default users
    (service as any).initializeDefaultUsers();
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UserService);
    });

    it('should initialize with default users', async () => {
      const stats = await service.getStats();
      expect(stats.totalUsers).toBe(3); // admin, hr, recruiter
      expect(stats.activeUsers).toBe(3);
      expect(stats.organizations).toContain('org-001');
    });

    it('should initialize admin user correctly', async () => {
      const admin = await service.findById('admin-001');
      expect(admin).toBeDefined();
      expect(admin!.email).toBe('admin@ai-recruitment.com');
      expect(admin!.role).toBe(UserRole.ADMIN);
      expect(admin!.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('create', () => {
    const validUserData: CreateUserDto & { password: string } = {
      email: 'test@example.com',
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      organizationId: 'org-001',
      status: UserStatus.ACTIVE,
    };

    it('should create a new user successfully', async () => {
      const result = await service.create(validUserData);

      expect(result).toBeDefined();
      expect(result.email).toBe(validUserData.email);
      expect(result.firstName).toBe(validUserData.firstName);
      expect(result.lastName).toBe(validUserData.lastName);
      expect(result.role).toBe(validUserData.role);
      expect(result.organizationId).toBe(validUserData.organizationId);
      expect(result.status).toBe(validUserData.status);
      expect(result.id).toMatch(/^user-\d+-[a-z0-9]+$/);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.name).toBe('Test User');
    });

    it('should create user with minimal required fields', async () => {
      const minimalUserData = {
        email: 'minimal@example.com',
        password: 'password123',
        firstName: 'Min',
        lastName: 'User',
        role: UserRole.USER,
      };

      const result = await service.create(minimalUserData);

      expect(result).toBeDefined();
      expect(result.email).toBe(minimalUserData.email);
      expect(result.firstName).toBe(minimalUserData.firstName);
      expect(result.lastName).toBe(minimalUserData.lastName);
      expect(result.role).toBe(UserRole.USER);
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result.organizationId).toBeUndefined();
    });

    it('should generate unique user IDs for concurrent creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.create({
          email: `concurrent${i}@example.com`,
          password: 'password123',
          firstName: 'Concurrent',
          lastName: `User${i}`,
          role: UserRole.USER,
        }),
      );

      const results = await Promise.all(promises);
      const ids = results.map((user) => user.id);
      const uniqueIds = [...new Set(ids)];

      expect(uniqueIds).toHaveLength(10);
      results.forEach((user) => {
        expect(user.id).toMatch(/^user-\d+-[a-z0-9]+$/);
      });
    });

    it('should handle name getter correctly', async () => {
      const user = await service.create({
        email: 'name-test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
      });

      expect(user.name).toBe('John Doe');
    });
  });

  describe('findById', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'findbyid@example.com',
        password: 'password123',
        firstName: 'Find',
        lastName: 'ById',
        role: UserRole.USER,
      });
    });

    it('should find user by ID successfully', async () => {
      const result = await service.findById(testUser.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(testUser.id);
      expect(result!.email).toBe(testUser.email);
      expect(result!.firstName).toBe(testUser.firstName);
    });

    it('should return null when user not found', async () => {
      const result = await service.findById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should find default users', async () => {
      const admin = await service.findById('admin-001');
      expect(admin).toBeDefined();
      expect(admin!.email).toBe('admin@ai-recruitment.com');
    });
  });

  describe('findByEmail', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'findbyemail@example.com',
        password: 'password123',
        firstName: 'Find',
        lastName: 'ByEmail',
        role: UserRole.USER,
      });
    });

    it('should find user by email successfully', async () => {
      const result = await service.findByEmail('findbyemail@example.com');

      expect(result).toBeDefined();
      expect(result!.id).toBe(testUser.id);
      expect(result!.email).toBe('findbyemail@example.com');
    });

    it('should return null when user not found', async () => {
      const result = await service.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });

    it('should find default users by email', async () => {
      const admin = await service.findByEmail('admin@ai-recruitment.com');
      expect(admin).toBeDefined();
      expect(admin!.id).toBe('admin-001');
    });
  });

  describe('findByOrganizationId', () => {
    beforeEach(async () => {
      await Promise.all([
        service.create({
          email: 'org1-user1@example.com',
          password: 'password123',
          firstName: 'Org1',
          lastName: 'User1',
          role: UserRole.USER,
          organizationId: 'test-org-001',
        }),
        service.create({
          email: 'org1-user2@example.com',
          password: 'password123',
          firstName: 'Org1',
          lastName: 'User2',
          role: UserRole.USER,
          organizationId: 'test-org-001',
        }),
        service.create({
          email: 'org2-user1@example.com',
          password: 'password123',
          firstName: 'Org2',
          lastName: 'User1',
          role: UserRole.USER,
          organizationId: 'test-org-002',
        }),
      ]);
    });

    it('should find users by organization ID', async () => {
      const result = await service.findByOrganizationId('test-org-001');

      expect(result).toHaveLength(2);
      expect(
        result.every((user) => user.organizationId === 'test-org-001'),
      ).toBe(true);
    });

    it('should return empty array for non-existent organization', async () => {
      const result = await service.findByOrganizationId('non-existent-org');
      expect(result).toEqual([]);
    });

    it('should find default organization users', async () => {
      const result = await service.findByOrganizationId('org-001');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((user) => user.organizationId === 'org-001')).toBe(
        true,
      );
    });
  });

  describe('updatePassword', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'passwordtest@example.com',
        password: 'oldPassword',
        firstName: 'Password',
        lastName: 'Test',
        role: UserRole.USER,
      });
    });

    it('should update password successfully', async () => {
      const newPassword = 'newHashedPassword123';
      const beforeUpdate = testUser.updatedAt.getTime();

      // Add a small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));
      await service.updatePassword(testUser.id, newPassword);

      const updatedUser = await service.findById(testUser.id);
      expect(updatedUser!.password).toBe(newPassword);
      expect(updatedUser!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate,
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        service.updatePassword('non-existent-id', 'newPassword'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLastActivity', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'activitytest@example.com',
        password: 'password123',
        firstName: 'Activity',
        lastName: 'Test',
        role: UserRole.USER,
      });
    });

    it('should update last activity successfully', async () => {
      const beforeUpdate = new Date();
      await service.updateLastActivity(testUser.id);

      const updatedUser = await service.findById(testUser.id);
      expect(updatedUser!.lastActivity).toBeDefined();
      expect(updatedUser!.lastActivity!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should not throw error for non-existent user', async () => {
      await expect(
        service.updateLastActivity('non-existent-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('updateUser', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'updatetest@example.com',
        password: 'password123',
        firstName: 'Update',
        lastName: 'Test',
        role: UserRole.USER,
        organizationId: 'org-001',
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        status: UserStatus.INACTIVE,
      };

      const beforeUpdate = testUser.updatedAt.getTime();
      // Add a small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));
      const result = await service.updateUser(testUser.id, updateData);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(result.name).toBe('Updated Name');
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('should update email and update mapping', async () => {
      const newEmail = 'newemail@example.com';
      const result = await service.updateUser(testUser.id, { email: newEmail });

      expect(result.email).toBe(newEmail);

      // Verify old email mapping is removed and new one is created
      const foundByNewEmail = await service.findByEmail(newEmail);
      const foundByOldEmail = await service.findByEmail(testUser.email);

      expect(foundByNewEmail!.id).toBe(testUser.id);
      expect(foundByOldEmail).toBeNull();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        service.updateUser('non-existent-id', { firstName: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'deletetest@example.com',
        password: 'password123',
        firstName: 'Delete',
        lastName: 'Test',
        role: UserRole.USER,
      });
    });

    it('should delete user successfully', async () => {
      await service.deleteUser(testUser.id);

      const deletedUser = await service.findById(testUser.id);
      expect(deletedUser).toBeNull();

      // Verify email mapping is also removed
      const foundByEmail = await service.findByEmail(testUser.email);
      expect(foundByEmail).toBeNull();
    });

    it('should not throw error for non-existent user', async () => {
      await expect(
        service.deleteUser('non-existent-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('listUsers', () => {
    beforeEach(async () => {
      await Promise.all([
        service.create({
          email: 'list1@example.com',
          password: 'password123',
          firstName: 'List',
          lastName: 'User1',
          role: UserRole.USER,
          organizationId: 'list-org-001',
        }),
        service.create({
          email: 'list2@example.com',
          password: 'password123',
          firstName: 'List',
          lastName: 'User2',
          role: UserRole.USER,
          organizationId: 'list-org-001',
        }),
        service.create({
          email: 'list3@example.com',
          password: 'password123',
          firstName: 'List',
          lastName: 'User3',
          role: UserRole.USER,
          organizationId: 'list-org-002',
        }),
      ]);
    });

    it('should list all users without filter', async () => {
      const result = await service.listUsers();

      // Should include default users (3) + test users (3) = 6
      expect(result.length).toBe(6);
    });

    it('should filter users by organization', async () => {
      const result = await service.listUsers('list-org-001');

      expect(result).toHaveLength(2);
      expect(
        result.every((user) => user.organizationId === 'list-org-001'),
      ).toBe(true);
    });

    it('should return empty array for non-existent organization', async () => {
      const result = await service.listUsers('non-existent-org');
      expect(result).toEqual([]);
    });
  });

  describe('Security Flags', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await service.create({
        email: 'securitytest@example.com',
        password: 'password123',
        firstName: 'Security',
        lastName: 'Test',
        role: UserRole.USER,
      });
    });

    describe('updateSecurityFlag', () => {
      it('should update security flag successfully', async () => {
        await service.updateSecurityFlag(testUser.id, 'tokens_revoked', true);

        const updatedUser = await service.findById(testUser.id);
        expect(updatedUser!.securityFlags!.tokens_revoked).toBe(true);
      });

      it('should initialize security flags if they do not exist', async () => {
        await service.updateSecurityFlag(
          testUser.id,
          'two_factor_enabled',
          true,
        );

        const updatedUser = await service.findById(testUser.id);
        expect(updatedUser!.securityFlags).toBeDefined();
        expect(updatedUser!.securityFlags!.two_factor_enabled).toBe(true);
      });

      it('should handle account locking with status change', async () => {
        await service.updateSecurityFlag(testUser.id, 'account_locked', true);

        const updatedUser = await service.findById(testUser.id);
        expect(updatedUser!.securityFlags!.account_locked).toBe(true);
        expect(updatedUser!.status).toBe(UserStatus.SUSPENDED);
      });

      it('should handle account unlocking with status restoration', async () => {
        // First lock the account
        await service.updateSecurityFlag(testUser.id, 'account_locked', true);
        // Then unlock it
        await service.updateSecurityFlag(testUser.id, 'account_locked', false);

        const updatedUser = await service.findById(testUser.id);
        expect(updatedUser!.securityFlags!.account_locked).toBe(false);
        expect(updatedUser!.status).toBe(UserStatus.ACTIVE);
      });

      it('should throw NotFoundException for non-existent user', async () => {
        await expect(
          service.updateSecurityFlag('non-existent-id', 'tokens_revoked', true),
        ).rejects.toThrow(NotFoundException);
      });

      it('should update all security flag types', async () => {
        const flags: Array<
          | 'tokens_revoked'
          | 'account_locked'
          | 'password_reset_required'
          | 'two_factor_enabled'
        > = [
          'tokens_revoked',
          'account_locked',
          'password_reset_required',
          'two_factor_enabled',
        ];

        for (const flag of flags) {
          await service.updateSecurityFlag(testUser.id, flag, true);
        }

        const updatedUser = await service.findById(testUser.id);
        flags.forEach((flag) => {
          expect(updatedUser!.securityFlags![flag]).toBe(true);
        });
      });
    });

    describe('getSecurityFlags', () => {
      it('should return security flags for existing user', async () => {
        await service.updateSecurityFlag(testUser.id, 'tokens_revoked', true);

        const flags = await service.getSecurityFlags(testUser.id);
        expect(flags).toBeDefined();
        expect(flags!.tokens_revoked).toBe(true);
      });

      it('should return null for non-existent user', async () => {
        const flags = await service.getSecurityFlags('non-existent-id');
        expect(flags).toBeNull();
      });

      it('should return null for user without security flags', async () => {
        const newUser = await service.create({
          email: 'noflags@example.com',
          password: 'password123',
          firstName: 'No',
          lastName: 'Flags',
          role: UserRole.USER,
        });

        const flags = await service.getSecurityFlags(newUser.id);
        expect(flags).toBeNull();
      });
    });

    describe('hasSecurityFlag', () => {
      it('should return true when flag exists and is true', async () => {
        await service.updateSecurityFlag(testUser.id, 'tokens_revoked', true);

        const hasFlag = await service.hasSecurityFlag(
          testUser.id,
          'tokens_revoked',
        );
        expect(hasFlag).toBe(true);
      });

      it('should return false when flag exists and is false', async () => {
        await service.updateSecurityFlag(testUser.id, 'tokens_revoked', false);

        const hasFlag = await service.hasSecurityFlag(
          testUser.id,
          'tokens_revoked',
        );
        expect(hasFlag).toBe(false);
      });

      it('should return false when flag does not exist', async () => {
        const hasFlag = await service.hasSecurityFlag(
          testUser.id,
          'tokens_revoked',
        );
        expect(hasFlag).toBe(false);
      });

      it('should return false for non-existent user', async () => {
        const hasFlag = await service.hasSecurityFlag(
          'non-existent-id',
          'tokens_revoked',
        );
        expect(hasFlag).toBe(false);
      });
    });

    describe('clearSecurityFlags', () => {
      it('should clear all security flags successfully', async () => {
        // Set multiple flags
        await service.updateSecurityFlag(testUser.id, 'tokens_revoked', true);
        await service.updateSecurityFlag(
          testUser.id,
          'two_factor_enabled',
          true,
        );

        await service.clearSecurityFlags(testUser.id);

        const updatedUser = await service.findById(testUser.id);
        expect(updatedUser!.securityFlags).toEqual({});
      });

      it('should throw NotFoundException for non-existent user', async () => {
        await expect(
          service.clearSecurityFlags('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await Promise.all([
        service.create({
          email: 'stats1@example.com',
          password: 'password123',
          firstName: 'Stats',
          lastName: 'User1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          organizationId: 'stats-org-001',
        }),
        service.create({
          email: 'stats2@example.com',
          password: 'password123',
          firstName: 'Stats',
          lastName: 'User2',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          organizationId: 'stats-org-001',
        }),
        service.create({
          email: 'stats3@example.com',
          password: 'password123',
          firstName: 'Stats',
          lastName: 'User3',
          role: UserRole.USER,
          status: UserStatus.INACTIVE,
          organizationId: 'stats-org-002',
        }),
      ]);
    });

    it('should return comprehensive user statistics', async () => {
      const stats = await service.getStats();

      // 3 default users + 3 test users = 6 total
      expect(stats.totalUsers).toBe(6);
      // 3 default active + 2 test active = 5 active
      expect(stats.activeUsers).toBe(5);
      expect(stats.organizations).toContain('org-001');
      expect(stats.organizations).toContain('stats-org-001');
      expect(stats.organizations).toContain('stats-org-002');
    });

    it('should handle users with no organization', async () => {
      await service.create({
        email: 'noorg@example.com',
        password: 'password123',
        firstName: 'No',
        lastName: 'Org',
        role: UserRole.USER,
      });

      const stats = await service.getStats();
      expect(stats.totalUsers).toBe(7);
      expect(stats.activeUsers).toBe(6);
    });

    it('should filter out undefined organizations', async () => {
      const stats = await service.getStats();
      expect(stats.organizations.every((org) => org !== undefined)).toBe(true);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty string email in findByEmail', async () => {
      const result = await service.findByEmail('');
      expect(result).toBeNull();
    });

    it('should handle special characters in user data', async () => {
      const specialUser = await service.create({
        email: 'test+special@example.co.uk',
        password: 'p@ssw0rd!@#$',
        firstName: 'Spëcîál',
        lastName: "O'Connor-Smith",
        role: UserRole.USER,
      });

      expect(specialUser.email).toBe('test+special@example.co.uk');
      expect(specialUser.firstName).toBe('Spëcîál');
      expect(specialUser.lastName).toBe("O'Connor-Smith");
      expect(specialUser.name).toBe("Spëcîál O'Connor-Smith");
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(1000);
      const user = await service.create({
        email: 'longstring@example.com',
        password: 'password123',
        firstName: longString,
        lastName: 'Test',
        role: UserRole.USER,
      });

      expect(user.firstName).toBe(longString);
      expect(user.firstName.length).toBe(1000);
    });

    it('should generate unique IDs under high concurrency', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        service.create({
          email: `stress${i}@example.com`,
          password: 'password123',
          firstName: 'Stress',
          lastName: `Test${i}`,
          role: UserRole.USER,
        }),
      );

      const results = await Promise.all(promises);
      const ids = results.map((user) => user.id);
      const uniqueIds = [...new Set(ids)];

      expect(uniqueIds).toHaveLength(100);
    });

    it('should handle updateUser with empty update object', async () => {
      const user = await service.create({
        email: 'empty-update@example.com',
        password: 'password123',
        firstName: 'Empty',
        lastName: 'Update',
        role: UserRole.USER,
      });

      const beforeUpdate = user.updatedAt.getTime();
      // Add a small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      const result = await service.updateUser(user.id, {});
      expect(result.firstName).toBe('Empty');
      expect(result.lastName).toBe('Update');
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });
});
