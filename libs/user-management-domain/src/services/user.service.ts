import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import type { CreateUserDto, UpdateUserDto, UserDto } from '../index';
import { UserRole, UserStatus } from '../index';

/**
 * User repository interface.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options: {
    skip?: number;
    take?: number;
    organizationId?: string;
  }): Promise<User[]>;
  count(options: { organizationId?: string }): Promise<number>;
  create(user: User): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  search(query: string, organizationId?: string): Promise<User[]>;
  findByStatus(status: UserStatus, organizationId?: string): Promise<User[]>;
}

/**
 * User service for managing users.
 */
@Injectable()
export class UserService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Create a new user.
   */
  public async async createUser(dto: CreateUserDto): Promise<UserDto> {
    // Validate user data
    const validation = User.validateCreate({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Check for duplicate email
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = User.hashPassword(dto.password);

    // Create user entity
    const user = new User({
      id: this.generateId(),
      email: dto.email,
      passwordHash,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: dto.organizationId,
      role: dto.role || UserRole.USER,
      status: dto.status || UserStatus.PENDING,
      isActive: dto.status === UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.create(user);
    return this.toDto(savedUser);
  }

  /**
   * Find user by ID.
   */
  public async async findById(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.toDto(user);
  }

  /**
   * Find user by email.
   */
  public async async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? this.toDto(user) : null;
  }

  /**
   * Get all users with pagination.
   */
  public async async findAll(
    options: { skip?: number; take?: number; organizationId?: string } = {},
  ): Promise<{
    users: UserDto[];
    total: number;
  }> {
    const [users, total] = await Promise.all([
      this.userRepository.findAll(options),
      this.userRepository.count({ organizationId: options.organizationId }),
    ]);

    return {
      users: users.map((u) => this.toDto(u)),
      total,
    };
  }

  /**
   * Update user.
   */
  public async async updateUser(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Handle email update
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Handle status transition
    if (dto.status && dto.status !== user.status) {
      if (!user.canTransitionTo(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${user.status} to ${dto.status}`,
        );
      }
    }

    // Update profile
    const updates: Partial<User> = {};

    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.organizationId !== undefined)
      updates.organizationId = dto.organizationId;
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.status !== undefined) {
      updates.status = dto.status;
      updates.isActive = dto.status === UserStatus.ACTIVE;
    }

    updates.updatedAt = new Date();

    const updatedUser = await this.userRepository.update(id, updates);
    return this.toDto(updatedUser);
  }

  /**
   * Delete user.
   */
  public async async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    await this.userRepository.delete(id);
  }

  /**
   * Search users.
   */
  public async async searchUsers(
    query: string,
    organizationId?: string,
  ): Promise<UserDto[]> {
    const users = await this.userRepository.search(query, organizationId);
    return users.map((u) => this.toDto(u));
  }

  /**
   * Filter users by status.
   */
  public async async filterByStatus(
    status: UserStatus,
    organizationId?: string,
  ): Promise<UserDto[]> {
    const users = await this.userRepository.findByStatus(
      status,
      organizationId,
    );
    return users.map((u) => this.toDto(u));
  }

  /**
   * Activate user.
   */
  public async async activateUser(id: string): Promise<UserDto> {
    return this.updateUser(id, { status: UserStatus.ACTIVE });
  }

  /**
   * Deactivate user.
   */
  public async async deactivateUser(id: string): Promise<UserDto> {
    return this.updateUser(id, { status: UserStatus.INACTIVE });
  }

  /**
   * Suspend user.
   */
  public async async suspendUser(id: string): Promise<UserDto> {
    return this.updateUser(id, { status: UserStatus.SUSPENDED });
  }

  /**
   * Bulk activate users.
   */
  public async async bulkActivate(
    ids: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    await Promise.all(
      ids.map(async (id) => {
        try {
          await this.activateUser(id);
          success++;
        } catch (_error) {
          failed++;
        }
      }),
    );

    return { success, failed };
  }

  /**
   * Bulk deactivate users.
   */
  public async bulkDeactivate(
    ids: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    await Promise.all(
      ids.map(async (id) => {
        try {
          await this.deactivateUser(id);
          success++;
        } catch (_error) {
          failed++;
        }
      }),
    );

    return { success, failed };
  }

  /**
   * Bulk delete users.
   */
  public async async bulkDelete(
    ids: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    await Promise.all(
      ids.map(async (id) => {
        try {
          await this.deleteUser(id);
          success++;
        } catch (_error) {
          failed++;
        }
      }),
    );

    return { success, failed };
  }

  /**
   * Convert User entity to UserDto.
   */
  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Generate unique ID.
   */
  private generateId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
