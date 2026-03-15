import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, UpdateQuery } from 'mongoose';
import type { CreateUserDto } from '@ai-recruitment-clerk/user-management-domain';
import {
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

/**
 * User entity interface for MongoDB storage.
 */
export interface UserEntity {
  _id?: string;
  id: string;
  email: string;
  username?: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  organizationId?: string;
  teamIds?: string[];
  status: UserStatus;
  lastLogin?: Date;
  lastActivity?: Date;
  avatarUrl?: string;
  securityFlags?: {
    tokens_revoked?: boolean;
    account_locked?: boolean;
    password_reset_required?: boolean;
    two_factor_enabled?: boolean;
  };
  preferences?: {
    language?: string;
    theme?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
  settings?: {
    emailVisibility?: boolean;
    profileVisibility?: 'public' | 'organization' | 'private';
  };
  auditLog?: Array<{
    action: string;
    timestamp: Date;
    performedBy?: string;
    details?: Record<string, unknown>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_SCHEMA_NAME = 'User';

/**
 * Repository for user data access and manipulation.
 */
@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(USER_SCHEMA_NAME)
    private readonly userModel: Model<UserEntity>,
  ) {}

  /**
   * Create a new user with password hash.
   */
  async create(
    createUserData: CreateUserDto & { password: string },
  ): Promise<UserEntity> {
    const existingUser = await this.findByEmail(createUserData.email);
    if (existingUser) {
      throw new ConflictException(
        `User with email ${createUserData.email} already exists`,
      );
    }

    const userId = this.generateUserId();
    const now = new Date();

    const userData: Partial<UserEntity> = {
      id: userId,
      email: createUserData.email.toLowerCase(),
      username: createUserData.username || createUserData.email.split('@')[0],
      password: createUserData.password,
      firstName: createUserData.firstName || '',
      lastName: createUserData.lastName || '',
      role: createUserData.role || UserRole.USER,
      organizationId: createUserData.organizationId,
      teamIds: [],
      status: createUserData.status || UserStatus.ACTIVE,
      securityFlags: {},
      preferences: {
        language: 'en',
        theme: 'light',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
      },
      settings: {
        emailVisibility: false,
        profileVisibility: 'organization',
      },
      auditLog: [
        {
          action: 'USER_CREATED',
          timestamp: now,
          details: { createdBy: 'system' },
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const user = new this.userModel(userData);
    const savedUser = await user.save();
    return this.mapToEntity(savedUser);
  }

  /**
   * Find user by ID with roles.
   */
  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({ id }).exec();
    return user ? this.mapToEntity(user) : null;
  }

  /**
   * Find user by email.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    if (!email) return null;
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .exec();
    return user ? this.mapToEntity(user) : null;
  }

  /**
   * Find user by username.
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    if (!username) return null;
    const user = await this.userModel
      .findOne({ username: username.toLowerCase() })
      .exec();
    return user ? this.mapToEntity(user) : null;
  }

  /**
   * Find users by role.
   */
  async findByRole(role: UserRole): Promise<UserEntity[]> {
    const users = await this.userModel.find({ role }).exec();
    return users.map((user) => this.mapToEntity(user));
  }

  /**
   * Find users by organization ID.
   */
  async findByOrganizationId(organizationId: string): Promise<UserEntity[]> {
    if (!organizationId) return [];
    const users = await this.userModel.find({ organizationId }).exec();
    return users.map((user) => this.mapToEntity(user));
  }

  /**
   * Find users by team ID.
   */
  async findByTeamId(teamId: string): Promise<UserEntity[]> {
    if (!teamId) return [];
    const users = await this.userModel.find({ teamIds: teamId }).exec();
    return users.map((user) => this.mapToEntity(user));
  }

  /**
   * Verify password for user.
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) return false;

    // Support both hashed ($2) and plain text (development)
    if (user.password?.startsWith('$2')) {
      try {
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, user.password);
      } catch {
        // If bcrypt is not available, return false
        return false;
      }
    }
    return user.password === password;
  }

  /**
   * Update last login timestamp.
   */
  async updateLastLogin(userId: string): Promise<void> {
    const now = new Date();
    await this.userModel
      .updateOne(
        { id: userId },
        {
          lastLogin: now,
          lastActivity: now,
          updatedAt: now,
        },
      )
      .exec();
  }

  /**
   * Update user profile.
   */
  async updateProfile(
    userId: string,
    updateData: Partial<
      Pick<UserEntity, 'firstName' | 'lastName' | 'email' | 'username'>
    >,
  ): Promise<UserEntity> {
    const updateQuery: UpdateQuery<UserEntity> = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (updateData.email) {
      updateQuery.email = updateData.email.toLowerCase();
      const existingUser = await this.userModel
        .findOne({
          email: updateQuery.email,
          id: { $ne: userId },
        })
        .exec();

      if (existingUser) {
        throw new ConflictException(
          `User with email ${updateQuery.email} already exists`,
        );
      }
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ id: userId }, updateQuery, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.mapToEntity(updatedUser);
  }

  /**
   * Update avatar URL.
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity> {
    const now = new Date();
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { id: userId },
        {
          avatarUrl,
          updatedAt: now,
          $push: {
            auditLog: {
              action: 'AVATAR_UPDATED',
              timestamp: now,
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.mapToEntity(updatedUser);
  }

  /**
   * Update user preferences.
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserEntity['preferences']>,
  ): Promise<UserEntity> {
    const now = new Date();
    const updateData: UpdateQuery<UserEntity> = {
      updatedAt: now,
    };

    if (preferences) {
      Object.entries(preferences).forEach(([key, value]) => {
        updateData[`preferences.${key}`] = value;
      });
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ id: userId }, updateData, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.mapToEntity(updatedUser);
  }

  /**
   * Update user settings.
   */
  async updateSettings(
    userId: string,
    settings: Partial<UserEntity['settings']>,
  ): Promise<UserEntity> {
    const now = new Date();
    const updateData: UpdateQuery<UserEntity> = {
      updatedAt: now,
    };

    if (settings) {
      Object.entries(settings).forEach(([key, value]) => {
        updateData[`settings.${key}`] = value;
      });
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ id: userId }, updateData, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.mapToEntity(updatedUser);
  }

  /**
   * Check if user has permission.
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    const rolePermissions = this.getRolePermissions(user.role);
    const userPermissions = user.permissions || [];

    return (
      rolePermissions.includes('*') ||
      rolePermissions.includes(permission) ||
      userPermissions.includes(permission)
    );
  }

  /**
   * Check if user is member of organization.
   */
  async isOrganizationMember(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.organizationId === organizationId;
  }

  /**
   * Check if user is member of team.
   */
  async isTeamMember(userId: string, teamId: string): Promise<boolean> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    return user?.teamIds?.includes(teamId) ?? false;
  }

  /**
   * Delete user with cleanup.
   */
  async delete(userId: string): Promise<void> {
    const result = await this.userModel.deleteOne({ id: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Add user to team.
   */
  async addToTeam(userId: string, teamId: string): Promise<void> {
    const result = await this.userModel
      .updateOne(
        { id: userId },
        { $addToSet: { teamIds: teamId }, updatedAt: new Date() },
      )
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Remove user from team.
   */
  async removeFromTeam(userId: string, teamId: string): Promise<void> {
    const result = await this.userModel
      .updateOne(
        { id: userId },
        { $pull: { teamIds: teamId }, updatedAt: new Date() },
      )
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Get audit trail for user.
   */
  async getAuditTrail(userId: string): Promise<UserEntity['auditLog']> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    return user?.auditLog || [];
  }

  /**
   * Get permissions for a role.
   */
  private getRolePermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'],
      [UserRole.HR_MANAGER]: [
        'read:users',
        'write:users',
        'read:analysis',
        'generate:report',
      ],
      [UserRole.RECRUITER]: ['read:users', 'read:analysis'],
      [UserRole.USER]: ['read:user'],
    };
    return permissions[role] || [];
  }

  /**
   * Generate unique user ID.
   */
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map MongoDB document to UserEntity.
   */
  private mapToEntity(doc: Record<string, unknown> | unknown): UserEntity {
    const d = doc as Record<string, unknown>;
    return {
      _id: d._id?.toString() || '',
      id: d.id as string,
      email: d.email as string,
      username: d.username as string | undefined,
      password: d.password as string,
      firstName: d.firstName as string,
      lastName: d.lastName as string,
      role: d.role as UserRole,
      permissions: d.permissions as string[] | undefined,
      organizationId: d.organizationId as string | undefined,
      teamIds: (d.teamIds as string[] | undefined) || [],
      status: d.status as UserStatus,
      lastLogin: d.lastLogin as Date | undefined,
      lastActivity: d.lastActivity as Date | undefined,
      avatarUrl: d.avatarUrl as string | undefined,
      securityFlags: d.securityFlags as Record<string, unknown> | undefined,
      preferences: d.preferences as Record<string, unknown> | undefined,
      settings: d.settings as Record<string, unknown> | undefined,
      auditLog: d.auditLog as
        | Array<{
            action: string;
            timestamp: Date;
            performedBy?: string;
            details?: Record<string, unknown>;
          }>
        | undefined,
      createdAt: d.createdAt as Date,
      updatedAt: d.updatedAt as Date,
    };
  }
}
