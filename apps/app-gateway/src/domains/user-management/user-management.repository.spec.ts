import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, connect, Connection } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  UserManagementRepository,
  UserEntity,
  USER_SCHEMA_NAME,
} from './user-management.repository';
import {
  CreateUserDto,
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

// Define Mongoose Schema for testing
import { Schema } from 'mongoose';

const UserSchema = new Schema<UserEntity>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: false, default: '' },
  lastName: { type: String, required: false, default: '' },
  role: { type: String, enum: Object.values(UserRole), required: true },
  organizationId: { type: String },
  status: { type: String, enum: Object.values(UserStatus), required: true },
  lastActivity: { type: Date },
  securityFlags: {
    type: {
      tokens_revoked: { type: Boolean },
      account_locked: { type: Boolean },
      password_reset_required: { type: Boolean },
      two_factor_enabled: { type: Boolean },
    },
    default: {},
    _id: false,
  },
  preferences: {
    type: {
      language: { type: String, default: 'en' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
    },
    default: {
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
    },
    _id: false,
  },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

describe('UserManagementRepository', () => {
  let repository: UserManagementRepository;
  let userModel: Model<UserEntity>;
  let module: TestingModule;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    // Create MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'user-management-test',
        port: 0, // Use random port
      },
    });

    const mongoUri = mongoServer.getUri();

    // Create test module with MongoDB connection
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: USER_SCHEMA_NAME, schema: UserSchema },
        ]),
      ],
      providers: [UserManagementRepository],
    }).compile();

    repository = module.get<UserManagementRepository>(UserManagementRepository);
    userModel = module.get<Model<UserEntity>>(getModelToken(USER_SCHEMA_NAME));

    // Get the mongoose connection
    const mongoose = require('mongoose');
    mongoConnection = mongoose.connection;
  });

  beforeEach(async () => {
    // Clear all documents before each test
    await userModel.deleteMany({}).exec();
  });

  afterAll(async () => {
    // Cleanup
    if (module) {
      await module.close();
    }
    if (mongoConnection) {
      await mongoConnection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(UserManagementRepository);
    });

    it('should have userModel injected', () => {
      expect(userModel).toBeDefined();
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
      const result = await repository.create(validUserData);

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
      expect(result.securityFlags).toEqual({});
      expect(result.preferences).toEqual({
        language: 'en',
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
      });
    });

    it('should create user with minimal required fields', async () => {
      const minimalUserData = {
        email: 'minimal@example.com',
        password: 'password123',
      };

      const result = await repository.create(minimalUserData);

      expect(result).toBeDefined();
      expect(result.email).toBe(minimalUserData.email);
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.role).toBe(UserRole.USER);
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result.organizationId).toBeUndefined();
    });

    it('should throw ConflictException when email already exists', async () => {
      await repository.create(validUserData);

      await expect(
        repository.create({ ...validUserData, firstName: 'Another' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle database errors gracefully', async () => {
      // Create user with invalid data that will cause MongoDB error
      const invalidUserData = {
        email: '', // Empty email should cause validation error
        password: 'password123',
      };

      await expect(repository.create(invalidUserData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'findbyid@example.com',
        password: 'password123',
        firstName: 'Find',
        lastName: 'ById',
      });
    });

    it('should find user by ID successfully', async () => {
      const result = await repository.findById(testUser.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(testUser.id);
      expect(result!.email).toBe(testUser.email);
      expect(result!.firstName).toBe(testUser.firstName);
    });

    it('should return null when user not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid MongoDB connection
      jest.spyOn(userModel, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.findById(testUser.id)).rejects.toThrow(
        'Failed to find user by ID',
      );
    });
  });

  describe('findByEmail', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'findbyemail@example.com',
        password: 'password123',
        firstName: 'Find',
        lastName: 'ByEmail',
      });
    });

    it('should find user by email successfully', async () => {
      const result = await repository.findByEmail('findbyemail@example.com');

      expect(result).toBeDefined();
      expect(result!.id).toBe(testUser.id);
      expect(result!.email).toBe('findbyemail@example.com');
    });

    it('should be case insensitive for email search', async () => {
      const result = await repository.findByEmail('FINDBYEMAIL@EXAMPLE.COM');
      expect(result).toBeDefined();
      expect(result!.id).toBe(testUser.id);
    });

    it('should return null when user not found', async () => {
      const result = await repository.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });

    it('should return null for empty email', async () => {
      const result = await repository.findByEmail('');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow(
        'Failed to find user by email',
      );
    });
  });

  describe('findByOrganizationId', () => {
    beforeEach(async () => {
      await Promise.all([
        repository.create({
          email: 'org1-user1@example.com',
          password: 'password123',
          firstName: 'Org1',
          lastName: 'User1',
          organizationId: 'org-001',
        }),
        repository.create({
          email: 'org1-user2@example.com',
          password: 'password123',
          firstName: 'Org1',
          lastName: 'User2',
          organizationId: 'org-001',
        }),
        repository.create({
          email: 'org2-user1@example.com',
          password: 'password123',
          firstName: 'Org2',
          lastName: 'User1',
          organizationId: 'org-002',
        }),
      ]);
    });

    it('should find users by organization ID', async () => {
      const result = await repository.findByOrganizationId('org-001');

      expect(result).toHaveLength(2);
      expect(result.every((user) => user.organizationId === 'org-001')).toBe(
        true,
      );
    });

    it('should return empty array for non-existent organization', async () => {
      const result = await repository.findByOrganizationId('non-existent-org');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty organization ID', async () => {
      const result = await repository.findByOrganizationId('');
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'find').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.findByOrganizationId('org-001')).rejects.toThrow(
        'Failed to find users by organization ID',
      );
    });
  });

  describe('updateById', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'updatetest@example.com',
        password: 'password123',
        firstName: 'Update',
        lastName: 'Test',
        organizationId: 'org-001',
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        status: UserStatus.INACTIVE,
      };

      const result = await repository.updateById(testUser.id, updateData);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        testUser.updatedAt.getTime(),
      );
    });

    it('should update email with conflict checking', async () => {
      // Create another user first
      await repository.create({
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      });

      const updateData = { email: 'newemail@example.com' };
      const result = await repository.updateById(testUser.id, updateData);

      expect(result.email).toBe('newemail@example.com');
    });

    it('should throw ConflictException when updating to existing email', async () => {
      // Create another user
      await repository.create({
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      });

      const updateData = { email: 'existing@example.com' };

      await expect(
        repository.updateById(testUser.id, updateData),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const updateData = { firstName: 'Updated' };

      await expect(
        repository.updateById('non-existent-id', updateData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'findOneAndUpdate').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(
        repository.updateById(testUser.id, { firstName: 'Test' }),
      ).rejects.toThrow('Failed to update user');
    });
  });

  describe('updatePassword', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'passwordtest@example.com',
        password: 'oldPassword',
        firstName: 'Password',
        lastName: 'Test',
      });
    });

    it('should update password successfully', async () => {
      const newPassword = 'newHashedPassword123';

      await repository.updatePassword(testUser.id, newPassword);

      const updatedUser = await repository.findById(testUser.id);
      expect(updatedUser!.password).toBe(newPassword);
      expect(updatedUser!.updatedAt.getTime()).toBeGreaterThan(
        testUser.updatedAt.getTime(),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        repository.updatePassword('non-existent-id', 'newPassword'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'updateOne').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(
        repository.updatePassword(testUser.id, 'newPassword'),
      ).rejects.toThrow('Failed to update password');
    });
  });

  describe('updateLastActivity', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'activitytest@example.com',
        password: 'password123',
        firstName: 'Activity',
        lastName: 'Test',
      });
    });

    it('should update last activity successfully', async () => {
      const beforeUpdate = new Date();
      await repository.updateLastActivity(testUser.id);

      const updatedUser = await repository.findById(testUser.id);
      expect(updatedUser!.lastActivity).toBeDefined();
      expect(updatedUser!.lastActivity!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should not throw error for non-existent user', async () => {
      // This method should not throw error for non-existent users
      await expect(
        repository.updateLastActivity('non-existent-id'),
      ).resolves.toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'updateOne').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.updateLastActivity(testUser.id)).rejects.toThrow(
        'Failed to update last activity',
      );
    });
  });

  describe('updateSecurityFlag', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'securitytest@example.com',
        password: 'password123',
        firstName: 'Security',
        lastName: 'Test',
      });
    });

    it('should update security flag successfully', async () => {
      await repository.updateSecurityFlag(testUser.id, 'tokens_revoked', true);

      const updatedUser = await repository.findById(testUser.id);
      expect(updatedUser!.securityFlags!.tokens_revoked).toBe(true);
    });

    it('should handle account locking with status change', async () => {
      await repository.updateSecurityFlag(testUser.id, 'account_locked', true);

      const updatedUser = await repository.findById(testUser.id);
      expect(updatedUser!.securityFlags!.account_locked).toBe(true);
      expect(updatedUser!.status).toBe(UserStatus.SUSPENDED);
    });

    it('should handle account unlocking with status change', async () => {
      // First lock the account
      await repository.updateSecurityFlag(testUser.id, 'account_locked', true);
      // Then unlock it
      await repository.updateSecurityFlag(testUser.id, 'account_locked', false);

      const updatedUser = await repository.findById(testUser.id);
      expect(updatedUser!.securityFlags!.account_locked).toBe(false);
      expect(updatedUser!.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        repository.updateSecurityFlag(
          'non-existent-id',
          'tokens_revoked',
          true,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'updateOne').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(
        repository.updateSecurityFlag(testUser.id, 'tokens_revoked', true),
      ).rejects.toThrow('Failed to update security flag');
    });
  });

  describe('deleteById', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'deletetest@example.com',
        password: 'password123',
        firstName: 'Delete',
        lastName: 'Test',
      });
    });

    it('should delete user successfully', async () => {
      await repository.deleteById(testUser.id);

      const deletedUser = await repository.findById(testUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(repository.deleteById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'deleteOne').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.deleteById(testUser.id)).rejects.toThrow(
        'Failed to delete user',
      );
    });
  });

  describe('softDeleteById', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'softdeletetest@example.com',
        password: 'password123',
        firstName: 'SoftDelete',
        lastName: 'Test',
      });
    });

    it('should soft delete user successfully', async () => {
      await repository.softDeleteById(testUser.id, 'Test deletion');

      const softDeletedUser = await repository.findById(testUser.id);
      expect(softDeletedUser).toBeDefined();
      expect(softDeletedUser!.status).toBe(UserStatus.INACTIVE);
    });

    it('should handle non-existent user', async () => {
      await expect(
        repository.softDeleteById('non-existent-id'),
      ).rejects.toThrow('Failed to soft delete user');
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await Promise.all([
        repository.create({
          email: 'findmany1@example.com',
          password: 'password123',
          firstName: 'Find',
          lastName: 'Many1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          organizationId: 'org-001',
        }),
        repository.create({
          email: 'findmany2@example.com',
          password: 'password123',
          firstName: 'Find',
          lastName: 'Many2',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          organizationId: 'org-001',
        }),
        repository.create({
          email: 'findmany3@example.com',
          password: 'password123',
          firstName: 'Find',
          lastName: 'Many3',
          role: UserRole.USER,
          status: UserStatus.INACTIVE,
          organizationId: 'org-002',
        }),
      ]);
    });

    it('should find all users without filter', async () => {
      const result = await repository.findMany();

      expect(result.totalCount).toBe(3);
      expect(result.users).toHaveLength(3);
    });

    it('should filter users by status', async () => {
      const result = await repository.findMany({ status: UserStatus.ACTIVE });

      expect(result.totalCount).toBe(2);
      expect(result.users).toHaveLength(2);
      expect(
        result.users.every((user) => user.status === UserStatus.ACTIVE),
      ).toBe(true);
    });

    it('should filter users by organization', async () => {
      const result = await repository.findMany({ organizationId: 'org-001' });

      expect(result.totalCount).toBe(2);
      expect(result.users).toHaveLength(2);
      expect(
        result.users.every((user) => user.organizationId === 'org-001'),
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await repository.findMany({}, { limit: 2, skip: 1 });

      expect(result.totalCount).toBe(3);
      expect(result.users).toHaveLength(2);
    });

    it('should support sorting', async () => {
      const result = await repository.findMany({}, { sort: { firstName: 1 } });

      expect(result.totalCount).toBe(3);
      expect(result.users[0].firstName).toBe('Find');
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'find').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.findMany()).rejects.toThrow(
        'Failed to find users',
      );
    });
  });

  describe('existsById', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'existstest@example.com',
        password: 'password123',
        firstName: 'Exists',
        lastName: 'Test',
      });
    });

    it('should return true for existing user', async () => {
      const result = await repository.existsById(testUser.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const result = await repository.existsById('non-existent-id');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'countDocuments').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.existsById(testUser.id)).rejects.toThrow(
        'Failed to check user existence',
      );
    });
  });

  describe('existsByEmail', () => {
    let testUser: UserEntity;

    beforeEach(async () => {
      testUser = await repository.create({
        email: 'existsemailtest@example.com',
        password: 'password123',
        firstName: 'ExistsEmail',
        lastName: 'Test',
      });
    });

    it('should return true for existing email', async () => {
      const result = await repository.existsByEmail(
        'existsemailtest@example.com',
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const result = await repository.existsByEmail('nonexistent@example.com');
      expect(result).toBe(false);
    });

    it('should return false for empty email', async () => {
      const result = await repository.existsByEmail('');
      expect(result).toBe(false);
    });

    it('should be case insensitive', async () => {
      const result = await repository.existsByEmail(
        'EXISTSEMAILTEST@EXAMPLE.COM',
      );
      expect(result).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'countDocuments').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(
        repository.existsByEmail('test@example.com'),
      ).rejects.toThrow('Failed to check user existence by email');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await Promise.all([
        repository.create({
          email: 'stats1@example.com',
          password: 'password123',
          firstName: 'Stats',
          lastName: 'User1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          organizationId: 'org-001',
        }),
        repository.create({
          email: 'stats2@example.com',
          password: 'password123',
          firstName: 'Stats',
          lastName: 'User2',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          organizationId: 'org-001',
        }),
        repository.create({
          email: 'stats3@example.com',
          password: 'password123',
          firstName: 'Stats',
          lastName: 'User3',
          role: UserRole.USER,
          status: UserStatus.INACTIVE,
          organizationId: 'org-002',
        }),
      ]);
    });

    it('should return comprehensive user statistics', async () => {
      const stats = await repository.getStats();

      expect(stats.totalUsers).toBe(3);
      expect(stats.activeUsers).toBe(2);
      expect(stats.usersByStatus[UserStatus.ACTIVE]).toBe(2);
      expect(stats.usersByStatus[UserStatus.INACTIVE]).toBe(1);
      expect(stats.usersByRole[UserRole.USER]).toBe(2);
      expect(stats.usersByRole[UserRole.ADMIN]).toBe(1);
      expect(stats.organizations).toEqual(['org-001', 'org-002']);
    });

    it('should handle empty database', async () => {
      await userModel.deleteMany({}).exec();

      const stats = await repository.getStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.activeUsers).toBe(0);
      expect(stats.usersByStatus).toEqual({});
      expect(stats.usersByRole).toEqual({});
      expect(stats.organizations).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'countDocuments').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.getStats()).rejects.toThrow(
        'Failed to get user statistics',
      );
    });
  });

  describe('bulkCreate', () => {
    const bulkUserData = [
      {
        email: 'bulk1@example.com',
        password: 'password123',
        firstName: 'Bulk',
        lastName: 'User1',
        role: UserRole.USER,
      },
      {
        email: 'bulk2@example.com',
        password: 'password123',
        firstName: 'Bulk',
        lastName: 'User2',
        role: UserRole.ADMIN,
      },
      {
        email: 'bulk3@example.com',
        password: 'password123',
        firstName: 'Bulk',
        lastName: 'User3',
      },
    ];

    it('should create multiple users successfully', async () => {
      const result = await repository.bulkCreate(bulkUserData);

      expect(result).toHaveLength(3);
      expect(result[0].email).toBe('bulk1@example.com');
      expect(result[1].role).toBe(UserRole.ADMIN);
      expect(result[2].role).toBe(UserRole.USER); // Default role
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userModel, 'insertMany').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      await expect(repository.bulkCreate(bulkUserData)).rejects.toThrow(
        'Failed to bulk create users',
      );
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed data gracefully', async () => {
      // Test with undefined values
      const malformedData = {
        email: undefined as any,
        password: 'password123',
      };

      await expect(repository.create(malformedData)).rejects.toThrow();
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(1000);
      const userData = {
        email: 'longstring@example.com',
        password: 'password123',
        firstName: longString,
        lastName: 'Test',
      };

      const result = await repository.create(userData);
      expect(result.firstName).toBe(longString);
    });

    it('should handle special characters in email', async () => {
      const userData = {
        email: 'test+special@example.co.uk',
        password: 'password123',
        firstName: 'Special',
        lastName: 'Char',
      };

      const result = await repository.create(userData);
      expect(result.email).toBe('test+special@example.co.uk');
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.create({
          email: `concurrent${i}@example.com`,
          password: 'password123',
          firstName: 'Concurrent',
          lastName: `User${i}`,
        }),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const emails = results.map((user) => user.email);
      const uniqueEmails = [...new Set(emails)];
      expect(uniqueEmails).toHaveLength(10); // All unique
    });
  });

  describe('Private Methods', () => {
    it('should generate unique user IDs', async () => {
      const user1 = await repository.create({
        email: 'unique1@example.com',
        password: 'password123',
      });

      const user2 = await repository.create({
        email: 'unique2@example.com',
        password: 'password123',
      });

      expect(user1.id).not.toBe(user2.id);
      expect(user1.id).toMatch(/^user-\d+-[a-z0-9]+$/);
      expect(user2.id).toMatch(/^user-\d+-[a-z0-9]+$/);
    });

    it('should map MongoDB documents to entities correctly', async () => {
      const userData = {
        email: 'mapping@example.com',
        password: 'password123',
        firstName: 'Map',
        lastName: 'Test',
        role: UserRole.ADMIN,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
      };

      const result = await repository.create(userData);

      expect(result._id).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.firstName).toBe(userData.firstName);
      expect(result.lastName).toBe(userData.lastName);
      expect(result.role).toBe(userData.role);
      expect(result.organizationId).toBe(userData.organizationId);
      expect(result.status).toBe(userData.status);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.securityFlags).toBeDefined();
      expect(result.preferences).toBeDefined();
    });
  });
});
