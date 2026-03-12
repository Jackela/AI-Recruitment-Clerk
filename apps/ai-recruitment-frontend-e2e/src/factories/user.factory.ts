import { TestUser } from '../seeds/users.seed';

export interface UserCreateOptions {
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'HR' | 'CANDIDATE';
  prefix?: string;
}

export class UserFactory {
  private static counter = 0;

  static create(overrides: UserCreateOptions = {}): TestUser {
    const timestamp = Date.now();
    const counter = ++this.counter;
    const prefix = overrides.prefix || 'test';

    return {
      email: overrides.email || `${prefix}.${counter}.${timestamp}@test.com`,
      password: overrides.password || 'Test123!Secure',
      role: overrides.role || 'CANDIDATE',
    };
  }

  static createMany(
    count: number,
    overrides: UserCreateOptions = {},
  ): TestUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createAdmin(
    overrides: Omit<UserCreateOptions, 'role'> = {},
  ): TestUser {
    return this.create({ ...overrides, role: 'ADMIN' });
  }

  static createHR(overrides: Omit<UserCreateOptions, 'role'> = {}): TestUser {
    return this.create({ ...overrides, role: 'HR' });
  }

  static createCandidate(
    overrides: Omit<UserCreateOptions, 'role'> = {},
  ): TestUser {
    return this.create({ ...overrides, role: 'CANDIDATE' });
  }

  static createUniqueBatch(count: number): TestUser[] {
    const timestamp = Date.now();
    return Array.from({ length: count }, (_, i) => ({
      email: `batch.${timestamp}.${i}@test.com`,
      password: 'Test123!Batch',
      role: 'CANDIDATE',
    }));
  }

  static resetCounter(): void {
    this.counter = 0;
  }
}
