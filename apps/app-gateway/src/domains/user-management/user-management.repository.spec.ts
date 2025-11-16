import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import {
  UserManagementRepository,
  UserEntity,
} from './user-management.repository';
import {
  CreateUserDto,
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

type StoredUser = UserEntity & { _id: string };
type QueryObject = Record<string, unknown>;
type UpdateObject = Record<string, unknown>;

const isNotEqualClause = (value: unknown): value is { $ne: unknown } => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      '$ne' in (value as Record<string, unknown>),
  );
};

const createRepository = () => {
  const store = new Map<string, StoredUser>();

  const clone = (doc: StoredUser | null): StoredUser | null => {
    if (!doc) {
      return null;
    }

    return {
      ...doc,
      securityFlags: doc.securityFlags
        ? { ...doc.securityFlags }
        : undefined,
      preferences: doc.preferences
        ? {
            ...doc.preferences,
            notifications: doc.preferences.notifications
              ? { ...doc.preferences.notifications }
              : undefined,
          }
        : undefined,
    };
  };

  const matchQuery = (doc: StoredUser, query: QueryObject): boolean => {
    const docRecord = doc as unknown as Record<string, unknown>;
    return Object.entries(query).every(([key, value]) => {
      if (isNotEqualClause(value)) {
        return docRecord[key] !== value.$ne;
      }
      return docRecord[key] === value;
    });
  };

  const applyUpdate = (target: StoredUser, update: UpdateObject): void => {
    const targetRecord = target as unknown as Record<string, unknown>;
    const assignValue = (path: string, value: unknown) => {
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        const parentValue = (targetRecord[parent] ??
          (targetRecord[parent] = {})) as Record<string, unknown>;
        parentValue[child] = value;
      } else {
        targetRecord[path] = value;
      }
    };

    for (const [key, value] of Object.entries(update)) {
      if (key === '$set' && value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(
          ([nestedKey, nestedValue]) => assignValue(nestedKey, nestedValue),
        );
        continue;
      }

      assignValue(key, value);
    }
  };

  class MockUserModel {
    private readonly document: StoredUser;

    constructor(data: Partial<UserEntity>) {
      this.document = {
        ...(data as StoredUser),
        _id: (data.id as string) ?? `mock-${Date.now()}`,
      };
      this.document.securityFlags = this.document.securityFlags ?? {};
      this.document.preferences =
        this.document.preferences ?? {
          language: 'en',
          notifications: { email: true, push: false, sms: false },
        };
    }

    async save() {
      store.set(this.document.id, { ...this.document });
      return clone(this.document);
    }

    static findOne(query: QueryObject) {
      return {
        exec: async () => {
          for (const doc of store.values()) {
            if (matchQuery(doc, query)) {
              return clone(doc);
            }
          }
          return null;
        },
      };
    }

    static find(query: QueryObject) {
      return {
        exec: async () =>
          Array.from(store.values())
            .filter((doc) => matchQuery(doc, query))
            .map((doc) => clone(doc)),
      };
    }

    static findOneAndUpdate(
      filter: QueryObject,
      update: UpdateObject,
      options?: { new?: boolean },
    ) {
      return {
        exec: async () => {
          for (const [id, doc] of store.entries()) {
            if (matchQuery(doc, filter)) {
              const updated = { ...doc } as StoredUser;
              applyUpdate(updated, update);
              store.set(id, updated);
              return options?.new ? clone(updated) : clone(doc);
            }
          }
          return null;
        },
      };
    }

    static updateOne(filter: QueryObject, update: UpdateObject) {
      return {
        exec: async () => {
          for (const [id, doc] of store.entries()) {
            if (matchQuery(doc, filter)) {
              const updated = { ...doc };
              applyUpdate(updated, update);
              store.set(id, updated);
              return { matchedCount: 1 };
            }
          }
          return { matchedCount: 0 };
        },
      };
    }

    static deleteOne(filter: QueryObject) {
      return {
        exec: async () => {
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

    static insertMany(docs: Partial<UserEntity>[]) {
      const saved = docs.map((doc) => {
        const stored: StoredUser = {
          ...(doc as StoredUser),
          _id: doc.id ?? `mock-${Date.now()}`,
        };
        store.set(stored.id, stored);
        return clone(stored);
      });
      return saved;
    }
  }

  const repository = new UserManagementRepository(
    MockUserModel as unknown as Model<UserEntity>,
  );
  return { repository, store };
};

describe('UserManagementRepository (lightweight)', () => {
  let repository: UserManagementRepository;
  let store: Map<string, StoredUser>;

  beforeEach(() => {
    const setup = createRepository();
    repository = setup.repository;
    store = setup.store;
  });

  const createUser = async (overrides: Partial<CreateUserDto> = {}) => {
    const base: CreateUserDto & { password: string } = {
      email: 'test@example.com',
      password: 'hashedPassword123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      organizationId: 'org-1',
      status: UserStatus.ACTIVE,
      ...overrides,
    };
    return repository.create(base);
  };

  it('creates user with defaults and generated id', async () => {
    const result = await createUser();

    expect(result).toMatchObject({
      email: 'test@example.com',
      firstName: 'Test',
      status: UserStatus.ACTIVE,
      securityFlags: {},
      preferences: {
        language: 'en',
        notifications: { email: true, push: false, sms: false },
      },
    });
    expect(result.id).toMatch(/^user-/);
    expect(store.has(result.id)).toBe(true);
  });

  it('rejects duplicate email addresses', async () => {
    await createUser();

    await expect(
      repository.create({
        email: 'test@example.com',
        password: 'another',
        firstName: 'Other',
        lastName: 'User',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates user fields by id', async () => {
    const user = await createUser();

    const updated = await repository.updateById(user.id, {
      firstName: 'Updated',
      email: 'updated@example.com',
    });

    expect(updated.firstName).toBe('Updated');
    expect(updated.email).toBe('updated@example.com');
  });

  it('updates security flags', async () => {
    const user = await createUser();

    await repository.updateSecurityFlag(user.id, 'account_locked', true);

    const stored = store.get(user.id);
    expect(stored).toBeDefined();
    if (!stored) {
      return;
    }
    expect(stored.securityFlags?.account_locked).toBe(true);
    expect(stored.status).toBe(UserStatus.SUSPENDED);
  });

  it('throws NotFoundException when updating missing user', async () => {
    await expect(
      repository.updateSecurityFlag('missing', 'account_locked', true),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes user by id', async () => {
    const user = await createUser();

    await repository.deleteById(user.id);

    expect(store.has(user.id)).toBe(false);
  });

  it('returns null when user not found by id', async () => {
    const result = await repository.findById('unknown');
    expect(result).toBeNull();
  });
});
