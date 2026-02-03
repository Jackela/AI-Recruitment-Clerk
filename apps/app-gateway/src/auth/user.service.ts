import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateUserDto,
  UserDto} from '@ai-recruitment-clerk/user-management-domain';
import {
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';
import * as bcrypt from 'bcryptjs';

// In a real implementation, this would connect to MongoDB
// For now, we'll use a simple in-memory store with some mock users
type SecurityFlagKey =
  | 'tokens_revoked'
  | 'account_locked'
  | 'password_reset_required'
  | 'two_factor_enabled';

interface UserEntity extends UserDto {
  password: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date;
  securityFlags: Partial<Record<SecurityFlagKey, boolean>>;
}

/**
 * Provides user functionality.
 */
@Injectable()
export class UserService {
  private users: Map<string, UserEntity> = new Map();
  private emailToIdMap: Map<string, string> = new Map();
  private readonly emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  /**
   * Initializes a new instance of the User Service.
   */
  constructor() {
    // Initialize with some default users for development
    this.initializeDefaultUsers();
  }

  private initializeDefaultUsers(): void {
    const defaultUsers: UserEntity[] = [
      {
        id: 'admin-001',
        email: 'admin@ai-recruitment.com',
        password:
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewflcAAaZMhV1S6m', // password: admin123
        firstName: 'System',
        lastName: 'Administrator',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        securityFlags: {},
      } as UserEntity,
      {
        id: 'hr-001',
        email: 'hr@ai-recruitment.com',
        password:
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewflcAAaZMhV1S6m', // password: admin123
        firstName: 'HR',
        lastName: 'Manager',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.HR_MANAGER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        securityFlags: {},
      } as UserEntity,
      {
        id: 'recruiter-001',
        email: 'recruiter@ai-recruitment.com',
        password:
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewflcAAaZMhV1S6m', // password: admin123
        firstName: 'Jane',
        lastName: 'Recruiter',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        securityFlags: {},
      } as UserEntity,
    ];

    defaultUsers.forEach((user) => {
      this.users.set(user.id, user);
      this.emailToIdMap.set(user.email.toLowerCase(), user.id);
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private sanitizeUser(
    user: UserEntity,
    options: { uppercaseRole?: boolean } = {},
  ): UserDto {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const uppercaseRole = options.uppercaseRole !== false;
    const roleValue = user.role
      ? (uppercaseRole ? String(user.role).toUpperCase() : user.role)
      : undefined;

    const sanitized: UserDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name,
      organizationId: user.organizationId,
      role: roleValue,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.status === UserStatus.ACTIVE,
    };

    Object.defineProperty(sanitized, 'rawRole', {
      value: user.role,
      enumerable: false,
      configurable: false,
      writable: false,
    });

    Object.defineProperty(sanitized, 'password', {
      value: user.password,
      enumerable: false,
      configurable: false,
      writable: false,
    });

    Object.defineProperty(sanitized, 'securityFlags', {
      value: user.securityFlags ? { ...user.securityFlags } : {},
      enumerable: false,
      configurable: false,
      writable: true,
    });

    return sanitized;
  }

  private assertValidEmail(email: string): void {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestException('Email is required');
    }

    if (!this.emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
  }

  private assertValidPassword(password: string): void {
    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw new BadRequestException('Password is required');
    }
  }

  private assertValidRole(role?: UserRole): void {
    if (
      role !== undefined &&
      !Object.values(UserRole).includes(role)
    ) {
      throw new BadRequestException('Invalid role supplied');
    }
  }

  private assertValidStatus(status?: UserStatus): void {
    if (
      status !== undefined &&
      !Object.values(UserStatus).includes(status)
    ) {
      throw new BadRequestException('Invalid status supplied');
    }
  }

  /**
   * Creates the entity.
   * @param createUserDto - The create user dto.
   * @returns A promise that resolves to UserEntity.
   */
  public async create(
    createUserDto: CreateUserDto & { password: string },
  ): Promise<UserDto> {
    const email = this.normalizeEmail(createUserDto.email || '');
    this.assertValidEmail(email);
    this.assertValidPassword(createUserDto.password);
    this.assertValidRole(createUserDto.role);
    this.assertValidStatus(createUserDto.status);

    if (this.emailToIdMap.has(email)) {
      throw new ConflictException('User with this email already exists');
    }

    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Derive names when only a single name is provided
    let firstName = createUserDto.firstName;
    let lastName = createUserDto.lastName;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createUserDtoWithName = createUserDto as any;
    if ((!firstName || !lastName) && createUserDtoWithName.name) {
      const parts = String(createUserDtoWithName.name)
        .trim()
        .split(/\s+/);
      firstName = firstName || parts[0] || '';
      lastName = lastName || parts.slice(1).join(' ') || '';
    }
    // Fallback from email
    if (!firstName && !lastName) {
      const base = createUserDto.email.split('@')[0];
      firstName = base;
      lastName = '';
    }

    const resolvedFirstName = firstName ?? '';
    const resolvedLastName = lastName ?? '';

    const user: UserEntity = {
      id,
      email,
      password: createUserDto.password,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      get name() {
        return `${this.firstName} ${this.lastName}`.trim();
      },
      role: createUserDto.role || UserRole.USER,
      organizationId: createUserDto.organizationId,
      status: createUserDto.status || UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      securityFlags: {},
    };

    this.users.set(id, user);
    this.emailToIdMap.set(email, id);

    return this.sanitizeUser(user);
  }

  /**
   * Performs the find by id operation.
   * @param id - The id.
   * @returns A promise that resolves to UserEntity | null.
   */
  public async findById(id: string): Promise<UserDto | null> {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Retrieves the raw user entity including sensitive fields.
   * Intended for internal service use only.
   * @param id - The id.
   * @returns A promise that resolves to UserEntity | null.
   */
  public async findByIdWithSensitiveData(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id);
    if (!user) {
      return null;
    }

    return {
      ...user,
      securityFlags: user.securityFlags ? { ...user.securityFlags } : {},
    };
  }

  /**
   * Performs the find by email operation.
   * @param email - The email.
   * @returns A promise that resolves to UserEntity | null.
   */
  public async findByEmail(email: string): Promise<UserDto | null> {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const normalized = this.normalizeEmail(email);
    if (!this.emailRegex.test(normalized)) {
      return null;
    }

    const id = this.emailToIdMap.get(normalized);
    const user = id ? this.users.get(id) : null;
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Performs the find by organization id operation.
   * @param organizationId - The organization id.
   * @returns A promise that resolves to an array of UserEntity.
   */
  public async findByOrganizationId(organizationId: string): Promise<UserDto[]> {
    return Array.from(this.users.values())
      .filter((user) => user.organizationId === organizationId)
      .map((user) => this.sanitizeUser(user));
  }

  /**
   * Updates password.
   * @param id - The id.
   * @param hashedPassword - The hashed password.
   * @returns A promise that resolves when the operation completes.
   */
  public async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = hashedPassword;
    user.updatedAt = new Date();
    this.users.set(id, user);
  }

  /**
   * Validates the password for a given user.
   * @param userId - The user id.
   * @param plainPassword - The plain password to validate.
   * @returns A promise that resolves to boolean value.
   */
  public async validatePassword(
    userId: string,
    plainPassword: string,
  ): Promise<boolean> {
    if (!userId || !plainPassword) {
      return false;
    }

    const user = this.users.get(userId);
    if (!user || !user.password) {
      return false;
    }

    // Support both hashed and plain-text (for seeded test users)
    if (user.password.startsWith('$2')) {
      try {
        return await bcrypt.compare(plainPassword, user.password);
      } catch {
        return false;
      }
    }

    return user.password === plainPassword;
  }

  /**
   * Updates last activity.
   * @param id - The id.
   * @returns A promise that resolves when the operation completes.
   */
  public async updateLastActivity(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActivity = new Date();
      this.users.set(id, user);
    }
  }

  /**
   * Updates user.
   * @param id - The id.
   * @param updates - The updates.
   * @returns A promise that resolves to UserEntity.
   */
  public async updateUser(
    id: string,
    updates: Partial<Omit<UserDto, 'id' | 'createdAt'>>,
  ): Promise<UserDto> {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updates.email !== undefined) {
      const updatedEmail = this.normalizeEmail(updates.email);
      this.assertValidEmail(updatedEmail);

      if (
        updatedEmail !== user.email &&
        this.emailToIdMap.has(updatedEmail)
      ) {
        throw new ConflictException('Email already in use');
      }

      this.emailToIdMap.delete(user.email);
      this.emailToIdMap.set(updatedEmail, id);
      user.email = updatedEmail;
    }

    if (updates.role !== undefined) {
      this.assertValidRole(updates.role as UserRole);
    }

    if (updates.status !== undefined) {
      this.assertValidStatus(updates.status as UserStatus);
    }

    if (updates.firstName !== undefined) {
      user.firstName = updates.firstName ?? user.firstName;
    }

    if (updates.lastName !== undefined) {
      user.lastName = updates.lastName ?? user.lastName;
    }

    if (updates.organizationId !== undefined) {
      user.organizationId = updates.organizationId;
    }

    // Update email mapping if email is being changed
    const updatedUser: UserEntity = {
      ...user,
      role: updates.role
        ? (updates.role as UserRole)
        : user.role,
      status: updates.status
        ? (updates.status as UserStatus)
        : user.status,
      updatedAt: new Date(),
      get name(): string {
        return `${this.firstName} ${this.lastName}`;
      },
    };

    this.users.set(id, updatedUser);
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Removes user.
   * @param id - The id.
   * @returns A promise that resolves when the operation completes.
   */
  public async deleteUser(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.emailToIdMap.delete(user.email);
      this.users.delete(id);
    }
  }

  /**
   * Performs the list users operation.
   * @param organizationId - The organization id.
   * @returns A promise that resolves to an array of UserEntity.
   */
  public async listUsers(organizationId?: string): Promise<UserDto[]> {
    const users = Array.from(this.users.values());

    const filtered = organizationId
      ? users.filter((user) => user.organizationId === organizationId)
      : users;

    return filtered.map((user) => this.sanitizeUser(user));
  }

  /**
   * Update security flag for user (used for token revocation, account locking, etc.)
   */
  public async updateSecurityFlag(
    userId: string,
    flag: SecurityFlagKey,
    value: boolean,
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Initialize security flags if they don't exist
    if (!user.securityFlags) {
      user.securityFlags = {};
    }

    // Update the specific security flag
    user.securityFlags[flag] = value;
    user.updatedAt = new Date();

    // Special handling for account_locked flag
    if (flag === 'account_locked' && value) {
      user.status = UserStatus.SUSPENDED;
    } else if (
      flag === 'account_locked' &&
      !value &&
      user.status === UserStatus.SUSPENDED
    ) {
      user.status = UserStatus.ACTIVE;
    }

    // Update the user in the store
    this.users.set(userId, user);

    // Security flag updated successfully
  }

  /**
   * Get security flags for user
   */
  public async getSecurityFlags(
    userId: string,
  ): Promise<UserEntity['securityFlags'] | null> {
    const user = this.users.get(userId);
    const flags = user?.securityFlags;
    if (!flags || Object.keys(flags).length === 0) {
      return null;
    }
    return flags;
  }

  /**
   * Check if user has specific security flag
   */
  public async hasSecurityFlag(
    userId: string,
    flag: SecurityFlagKey,
  ): Promise<boolean> {
    const user = this.users.get(userId);
    return user?.securityFlags?.[flag] || false;
  }

  /**
   * Clear all security flags for user
   */
  public async clearSecurityFlags(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    user.securityFlags = {};
    user.updatedAt = new Date();
    this.users.set(userId, user);

    // All security flags cleared successfully
  }

  // Health check for service
  /**
   * Retrieves stats.
   * @returns The Promise<{ totalUsers: number; activeUsers: number; organizations: string[]; }>.
   */
  public async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    organizations: string[];
  }> {
    const users = Array.from(this.users.values());
    const activeUsers = users.filter(
      (user) => user.status === UserStatus.ACTIVE,
    );
    const organizations = [
      ...new Set(users.map((user) => user.organizationId).filter(Boolean)),
    ] as string[];

    return {
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      organizations,
    };
  }
}
