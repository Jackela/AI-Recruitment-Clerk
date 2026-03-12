import { ConflictException, NotFoundException } from '@nestjs/common';
import type { UserEntity } from './user.repository';
import { UserRepository, USER_SCHEMA_NAME } from './user.repository';
import type { CreateUserDto } from '@ai-recruitment-clerk/user-management-domain';
import {
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

type StoredUser = UserEntity & { _id: string };

/**
 * Creates a mock repository with in-memory storage for testing.
 */
const createMockRepository = () => {
  const store = new Map<string, StoredUser>();

  const clone = (doc: StoredUser | null): StoredUser | null => {
    if (!doc) return null;
    return {
      ...doc,
      securityFlags: { ...doc.securityFlags },
      preferences: {
        ...doc.preferences,
        notifications: { ...doc.preferences?.notifications },
      },
      settings: { ...doc.settings },
      teamIds: [...(doc.teamIds || [])],
      auditLog: doc.auditLog ? [...doc.auditLog.map((a) => ({ ...a }))] : [],
    } as StoredUser;
  };

  const matchQuery = (doc: StoredUser, query: Record<string, any>): boolean => {
    return Object.entries(query).every(([key, value]) => {
      if (key === 'teamIds') {
        return doc.teamIds?.includes(value);
      }
      if (key === 'id' && value?.$ne) {
        return doc.id !== value.$ne;
      }
      if (value && typeof value === 'object' && '$ne' in value) {
        return (doc as any)[key] !== value.$ne;
      }
      if (value && typeof value === 'object' && '$in' in value) {
        return value.$in.includes((doc as any)[key]);
      }
      if (value && typeof value === 'object' && '$addToSet' in value) {
        return true;
      }
      if (value && typeof value === 'object' && '$pull' in value) {
        return true;
      }
      if (value && typeof value === 'object' && '$push' in value) {
        return true;
      }
      return (doc as any)[key] === value;
    });
  };

  class MockUserModel {
    private readonly document: StoredUser;

    constructor(data: Partial<UserEntity>) {
      this.document = {
        ...(data as StoredUser),
        _id: (data.id as string) ?? `mock-${Date.now()}`,
      };
      this.document.securityFlags = this.document.securityFlags ?? {};
      this.document.preferences = this.document.preferences ?? {
        language: 'en',
        theme: 'light',
        timezone: 'UTC',
        notifications: { email: true, push: false, sms: false },
      };
      this.document.settings = this.document.settings ?? {
        emailVisibility: false,
        profileVisibility: 'organization',
      };
      this.document.teamIds = this.document.teamIds ?? [];
      this.document.auditLog = this.document.auditLog ?? [];
    }

    async save(): Promise<StoredUser> {
      store.set(this.document.id, { ...this.document });
      return clone(this.document) as StoredUser;
    }

    static findOne(query: Record<string, any>) {
      return {
        exec: async (): Promise<StoredUser | null> => {
          for (const doc of store.values()) {
            if (matchQuery(doc, query)) {
              return clone(doc);
            }
          }
          return null;
        },
      };
    }

    static find(query: Record<string, any> = {}) {
      return {
        exec: async (): Promise<StoredUser[]> => {
          const results: StoredUser[] = [];
          for (const doc of store.values()) {
            if (matchQuery(doc, query)) {
              results.push(clone(doc) as StoredUser);
            }
          }
          return results;
        },
      };
    }

    static findOneAndUpdate(
      filter: Record<string, any>,
      update: Record<string, any>,
      options?: { new?: boolean },
    ) {
      return {
        exec: async (): Promise<StoredUser | null> => {
          for (const [id, doc] of store.entries()) {
            if (matchQuery(doc, filter)) {
              const updated = { ...doc } as StoredUser;

              // Handle $push for auditLog
              if (update.$push?.auditLog) {
                updated.auditLog = [
                  ...(updated.auditLog || []),
                  update.$push.auditLog,
                ];
              }

              // Handle other updates
              Object.entries(update).forEach(([key, value]) => {
                if (key.startsWith('preferences.')) {
                  const field = key.split('.')[1];
                  updated.preferences = updated.preferences || {};
                  (updated.preferences as any)[field] = value;
                } else if (key.startsWith('settings.')) {
                  const field = key.split('.')[1];
                  updated.settings = updated.settings || {};
                  (updated.settings as any)[field] = value;
                } else if (
                  key !== '$push' &&
                  key !== '$addToSet' &&
                  key !== '$pull'
                ) {
                  (updated as any)[key] = value;
                }
              });

              store.set(id, updated);
              return options?.new ? clone(updated) : clone(doc);
            }
          }
          return null;
        },
      };
    }

    static updateOne(filter: Record<string, any>, update: Record<string, any>) {
      return {
        exec: async (): Promise<{ matchedCount: number }> => {
          for (const [id, doc] of store.entries()) {
            if (matchQuery(doc, filter)) {
              const updated = { ...doc } as StoredUser;

              // Handle $addToSet
              if (update.$addToSet?.teamIds) {
                const teamId = update.$addToSet.teamIds;
                if (!updated.teamIds?.includes(teamId)) {
                  updated.teamIds = [...(updated.teamIds || []), teamId];
                }
              }

              // Handle $pull
              if (update.$pull?.teamIds) {
                updated.teamIds =
                  updated.teamIds?.filter((t) => t !== update.$pull.teamIds) ||
                  [];
              }

              Object.entries(update).forEach(([key, value]) => {
                if (!key.startsWith('$')) {
                  (updated as any)[key] = value;
                }
              });

              store.set(id, updated);
              return { matchedCount: 1 };
            }
          }
          return { matchedCount: 0 };
        },
      };
    }

    static deleteOne(filter: Record<string, any>) {
      return {
        exec: async (): Promise<{ deletedCount: number }> => {
          for (const [id, doc] of store.entries()) {
            if (matchQuery(doc, filter)) {
              store.delete(id);
              return { deletedCount: 1 };
            }
          }
          return { deletedCount: 0 };
        },
      };
    }

    static countDocuments(query: Record<string, any> = {}) {
      return {
        exec: async (): Promise<number> => {
          let count = 0;
          for (const doc of store.values()) {
            if (matchQuery(doc, query)) {
              count++;
            }
          }
          return count;
        },
      };
    }
  }

  const repository = new UserRepository(MockUserModel as any);
  return { repository, store };
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let store: Map<string, StoredUser>;

  beforeEach(() => {
    const setup = createMockRepository();
    repository = setup.repository;
    store = setup.store;
  });

  const createTestUser = async (
    overrides: Partial<CreateUserDto> = {},
  ): Promise<UserEntity> => {
    const base: CreateUserDto & { password: string } = {
      email: 'test@example.com',
      password: '$2b$10$hashedPassword123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      organizationId: 'org-1',
      status: UserStatus.ACTIVE,
      ...overrides,
    };
    return repository.create(base);
  };

  describe('User CRUD', () => {
    it('should create user with password hash', async () => {
      const hashedPassword = '$2b$10$hashedPassword123';
      const result = await createTestUser({ password: hashedPassword });

      expect(result).toMatchObject({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      expect(result.password).toBe(hashedPassword);
      expect(result.id).toMatch(/^user-/);
      expect(store.has(result.id)).toBe(true);
    });

    it('should reject duplicate email on create', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      await expect(
        createTestUser({ email: 'duplicate@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should read user by ID with roles', async () => {
      const created = await createTestUser({ role: UserRole.RECRUITER });

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.role).toBe(UserRole.RECRUITER);
      expect(found?.securityFlags).toBeDefined();
      expect(found?.preferences).toBeDefined();
    });

    it('should return null when user not found by ID', async () => {
      const result = await repository.findById('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should update user profile successfully', async () => {
      const user = await createTestUser();

      const updated = await repository.updateProfile(user.id, {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('Name');
      expect(updated.email).toBe('updated@example.com');
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      await expect(
        repository.updateProfile('nonexistent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete user with cleanup', async () => {
      const user = await createTestUser();

      await repository.delete(user.id);

      expect(store.has(user.id)).toBe(false);
      const found = await repository.findById(user.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundException when deleting non-existent user', async () => {
      await expect(repository.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Authentication Queries', () => {
    it('should find user by email (case insensitive)', async () => {
      await createTestUser({ email: 'test@example.com' });

      const found = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(found).not.toBeNull();
      expect(found?.email).toBe('test@example.com');
    });

    it('should return null for empty email', async () => {
      const result = await repository.findByEmail('');
      expect(result).toBeNull();
    });

    it('should find user by username', async () => {
      await createTestUser({ username: 'testuser' });

      const found = await repository.findByUsername('testuser');

      expect(found).not.toBeNull();
      expect(found?.username).toBe('testuser');
    });

    it('should return null for empty username', async () => {
      const result = await repository.findByUsername('');
      expect(result).toBeNull();
    });

    it('should verify password for plain text (development mode)', async () => {
      const user = await createTestUser({ password: 'plainPassword123' });

      const isValid = await repository.verifyPassword(
        user.id,
        'plainPassword123',
      );

      expect(isValid).toBe(true);
    });

    it('should verify password for hashed password', async () => {
      const bcrypt = await import('bcrypt');
      const plainPassword = 'securePassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const user = await createTestUser({ password: hashedPassword });

      const isValid = await repository.verifyPassword(user.id, plainPassword);

      expect(isValid).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const user = await createTestUser({ password: 'correctPassword' });

      const isValid = await repository.verifyPassword(user.id, 'wrongPassword');

      expect(isValid).toBe(false);
    });

    it('should return false when verifying password for non-existent user', async () => {
      const isValid = await repository.verifyPassword(
        'nonexistent',
        'anyPassword',
      );
      expect(isValid).toBe(false);
    });

    it('should update last login timestamp', async () => {
      const user = await createTestUser();
      const beforeUpdate = new Date();

      await repository.updateLastLogin(user.id);

      const stored = store.get(user.id)!;
      expect(stored.lastLogin).toBeDefined();
      expect(stored.lastLogin!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
      expect(stored.lastActivity).toBeDefined();
    });
  });

  describe('Permission Checks', () => {
    it('should find users by role', async () => {
      await createTestUser({
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });
      await createTestUser({ email: 'user1@example.com', role: UserRole.USER });
      await createTestUser({ email: 'user2@example.com', role: UserRole.USER });

      const admins = await repository.findByRole(UserRole.ADMIN);
      const users = await repository.findByRole(UserRole.USER);

      expect(admins).toHaveLength(1);
      expect(users).toHaveLength(2);
    });

    it('should check if admin has all permissions', async () => {
      const admin = await createTestUser({ role: UserRole.ADMIN });

      const hasPermission = await repository.hasPermission(
        admin.id,
        'read:users',
      );

      expect(hasPermission).toBe(true);
    });

    it('should check if user has specific permission', async () => {
      const user = await createTestUser({ role: UserRole.USER });

      const hasReadUser = await repository.hasPermission(user.id, 'read:user');
      const hasAdmin = await repository.hasPermission(user.id, 'admin');

      expect(hasReadUser).toBe(true);
      expect(hasAdmin).toBe(false);
    });

    it('should check organization membership', async () => {
      const user = await createTestUser({ organizationId: 'org-123' });

      const isMember = await repository.isOrganizationMember(
        user.id,
        'org-123',
      );
      const isNotMember = await repository.isOrganizationMember(
        user.id,
        'org-456',
      );

      expect(isMember).toBe(true);
      expect(isNotMember).toBe(false);
    });

    it('should check team membership', async () => {
      const user = await createTestUser({});
      await repository.addToTeam(user.id, 'team-1');

      const isMember = await repository.isTeamMember(user.id, 'team-1');
      const isNotMember = await repository.isTeamMember(user.id, 'team-2');

      expect(isMember).toBe(true);
      expect(isNotMember).toBe(false);
    });

    it('should find users by organization ID', async () => {
      await createTestUser({
        email: 'u1@example.com',
        organizationId: 'org-a',
      });
      await createTestUser({
        email: 'u2@example.com',
        organizationId: 'org-a',
      });
      await createTestUser({
        email: 'u3@example.com',
        organizationId: 'org-b',
      });

      const orgAUsers = await repository.findByOrganizationId('org-a');

      expect(orgAUsers).toHaveLength(2);
    });

    it('should return empty array for invalid organization ID', async () => {
      const result = await repository.findByOrganizationId('');
      expect(result).toEqual([]);
    });

    it('should find users by team ID', async () => {
      const user1 = await createTestUser({ email: 'u1@example.com' });
      const user2 = await createTestUser({ email: 'u2@example.com' });
      await repository.addToTeam(user1.id, 'team-x');
      await repository.addToTeam(user2.id, 'team-x');

      const teamUsers = await repository.findByTeamId('team-x');

      expect(teamUsers).toHaveLength(2);
    });
  });

  describe('Profile Updates', () => {
    it('should update avatar URL', async () => {
      const user = await createTestUser();

      const updated = await repository.updateAvatar(
        user.id,
        'https://example.com/avatar.jpg',
      );

      expect(updated.avatarUrl).toBe('https://example.com/avatar.jpg');
      const stored = store.get(user.id)!;
      expect(
        stored.auditLog?.some((log) => log.action === 'AVATAR_UPDATED'),
      ).toBe(true);
    });

    it('should throw NotFoundException when updating avatar for non-existent user', async () => {
      await expect(
        repository.updateAvatar(
          'nonexistent',
          'https://example.com/avatar.jpg',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update preferences', async () => {
      const user = await createTestUser();

      const updated = await repository.updatePreferences(user.id, {
        language: 'es',
        theme: 'dark',
      });

      expect(updated.preferences?.language).toBe('es');
      expect(updated.preferences?.theme).toBe('dark');
    });

    it('should update settings', async () => {
      const user = await createTestUser();

      const updated = await repository.updateSettings(user.id, {
        emailVisibility: true,
        profileVisibility: 'public',
      });

      expect(updated.settings?.emailVisibility).toBe(true);
      expect(updated.settings?.profileVisibility).toBe('public');
    });

    it('should add user to team', async () => {
      const user = await createTestUser();

      await repository.addToTeam(user.id, 'team-new');

      const stored = store.get(user.id)!;
      expect(stored.teamIds).toContain('team-new');
    });

    it('should throw NotFoundException when adding non-existent user to team', async () => {
      await expect(
        repository.addToTeam('nonexistent', 'team-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove user from team', async () => {
      const user = await createTestUser();
      await repository.addToTeam(user.id, 'team-1');

      await repository.removeFromTeam(user.id, 'team-1');

      const stored = store.get(user.id)!;
      expect(stored.teamIds).not.toContain('team-1');
    });

    it('should get audit trail for user', async () => {
      const user = await createTestUser();
      await repository.updateAvatar(user.id, 'https://example.com/avatar.jpg');

      const auditTrail = await repository.getAuditTrail(user.id);

      expect(auditTrail).toBeDefined();
      expect(auditTrail?.length).toBeGreaterThan(0);
      expect(auditTrail?.some((log) => log.action === 'USER_CREATED')).toBe(
        true,
      );
      expect(auditTrail?.some((log) => log.action === 'AVATAR_UPDATED')).toBe(
        true,
      );
    });

    it('should return empty audit trail for user without audit entries', async () => {
      const user = await createTestUser();
      const stored = store.get(user.id)!;
      stored.auditLog = [];
      store.set(user.id, stored);

      const auditTrail = await repository.getAuditTrail(user.id);

      expect(auditTrail).toEqual([]);
    });
  });

  describe('Schema export', () => {
    it('should export USER_SCHEMA_NAME constant', () => {
      expect(USER_SCHEMA_NAME).toBe('User');
    });
  });
});
