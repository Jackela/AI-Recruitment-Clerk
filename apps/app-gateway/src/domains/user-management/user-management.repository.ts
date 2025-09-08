import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import {
  CreateUserDto,
  UserDto,
  UserRole,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

// User Entity Schema for MongoDB
export interface UserEntity {
  _id?: string;
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId?: string;
  status: UserStatus;
  lastActivity?: Date;
  securityFlags?: {
    tokens_revoked?: boolean;
    account_locked?: boolean;
    password_reset_required?: boolean;
    two_factor_enabled?: boolean;
  };
  preferences?: {
    language?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Define mongoose schema name
export const USER_SCHEMA_NAME = 'User';

@Injectable()
export class UserManagementRepository {
  constructor(
    @InjectModel(USER_SCHEMA_NAME)
    private readonly userModel: Model<UserEntity>,
  ) {}

  /**
   * Create a new user in the database
   */
  async create(
    createUserData: CreateUserDto & { password: string },
  ): Promise<UserEntity> {
    try {
      // Check if user with email already exists
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
        email: createUserData.email,
        password: createUserData.password,
        firstName: createUserData.firstName || '',
        lastName: createUserData.lastName || '',
        role: createUserData.role || UserRole.USER,
        organizationId: createUserData.organizationId,
        status: createUserData.status || UserStatus.ACTIVE,
        securityFlags: {},
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            push: false,
            sms: false,
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      const user = new this.userModel(userData);
      const savedUser = await user.save();
      return this.mapToEntity(savedUser);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserEntity | null> {
    try {
      const user = await this.userModel.findOne({ id }).exec();
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      if (!email) {
        return null;
      }
      const user = await this.userModel
        .findOne({ email: email.toLowerCase() })
        .exec();
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find users by organization ID
   */
  async findByOrganizationId(organizationId: string): Promise<UserEntity[]> {
    try {
      if (!organizationId) {
        return [];
      }
      const users = await this.userModel.find({ organizationId }).exec();
      return users.map((user) => this.mapToEntity(user));
    } catch (error) {
      throw new Error(
        `Failed to find users by organization ID: ${error.message}`,
      );
    }
  }

  /**
   * Update user by ID
   */
  async updateById(
    id: string,
    updateData: Partial<Omit<UserEntity, 'id' | 'createdAt' | '_id'>>,
  ): Promise<UserEntity> {
    try {
      const updateQuery: UpdateQuery<UserEntity> = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Handle email updates - normalize to lowercase
      if (updateData.email) {
        updateQuery.email = updateData.email.toLowerCase();

        // Check if new email already exists (excluding current user)
        const existingUser = await this.userModel
          .findOne({
            email: updateQuery.email,
            id: { $ne: id },
          })
          .exec();

        if (existingUser) {
          throw new ConflictException(
            `User with email ${updateQuery.email} already exists`,
          );
        }
      }

      const updatedUser = await this.userModel
        .findOneAndUpdate({ id }, updateQuery, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return this.mapToEntity(updatedUser);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    try {
      const result = await this.userModel
        .updateOne(
          { id },
          {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        )
        .exec();

      if (result.matchedCount === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Update user's last activity timestamp
   */
  async updateLastActivity(id: string): Promise<void> {
    try {
      await this.userModel
        .updateOne(
          { id },
          {
            lastActivity: new Date(),
            updatedAt: new Date(),
          },
        )
        .exec();
    } catch (error) {
      throw new Error(`Failed to update last activity: ${error.message}`);
    }
  }

  /**
   * Update security flag for user
   */
  async updateSecurityFlag(
    userId: string,
    flag: keyof UserEntity['securityFlags'],
    value: boolean,
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };
      updateData[`securityFlags.${flag}`] = value;

      // Special handling for account locking
      if (flag === 'account_locked') {
        updateData.status = value ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
      }

      const result = await this.userModel
        .updateOne({ id: userId }, updateData)
        .exec();

      if (result.matchedCount === 0) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update security flag: ${error.message}`);
    }
  }

  /**
   * Delete user by ID
   */
  async deleteById(id: string): Promise<void> {
    try {
      const result = await this.userModel.deleteOne({ id }).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Soft delete user (mark as inactive)
   */
  async softDeleteById(id: string, reason?: string): Promise<void> {
    try {
      await this.updateById(id, {
        status: UserStatus.INACTIVE,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw new Error(`Failed to soft delete user: ${error.message}`);
    }
  }

  /**
   * Find users with filtering and pagination
   */
  async findMany(
    filter: FilterQuery<UserEntity> = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: any;
      projection?: any;
    } = {},
  ): Promise<{ users: UserEntity[]; totalCount: number }> {
    try {
      const query = this.userModel.find(filter);

      if (options.projection) {
        query.select(options.projection);
      }

      if (options.sort) {
        query.sort(options.sort);
      }

      if (options.skip) {
        query.skip(options.skip);
      }

      if (options.limit) {
        query.limit(options.limit);
      }

      const [users, totalCount] = await Promise.all([
        query.exec(),
        this.userModel.countDocuments(filter).exec(),
      ]);

      return {
        users: users.map((user) => this.mapToEntity(user)),
        totalCount,
      };
    } catch (error) {
      throw new Error(`Failed to find users: ${error.message}`);
    }
  }

  /**
   * Check if user exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    try {
      const count = await this.userModel.countDocuments({ id }).exec();
      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error.message}`);
    }
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      if (!email) {
        return false;
      }
      const count = await this.userModel
        .countDocuments({ email: email.toLowerCase() })
        .exec();
      return count > 0;
    } catch (error) {
      throw new Error(
        `Failed to check user existence by email: ${error.message}`,
      );
    }
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByStatus: Record<UserStatus, number>;
    usersByRole: Record<UserRole, number>;
    organizations: string[];
  }> {
    try {
      const [totalUsers, statusAggregation, roleAggregation, orgAggregation] =
        await Promise.all([
          this.userModel.countDocuments().exec(),
          this.userModel
            .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
            .exec(),
          this.userModel
            .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
            .exec(),
          this.userModel.distinct('organizationId').exec(),
        ]);

      const usersByStatus = statusAggregation.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<UserStatus, number>,
      );

      const usersByRole = roleAggregation.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<UserRole, number>,
      );

      return {
        totalUsers,
        activeUsers: usersByStatus[UserStatus.ACTIVE] || 0,
        usersByStatus,
        usersByRole,
        organizations: orgAggregation.filter(Boolean),
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  /**
   * Bulk create users
   */
  async bulkCreate(
    usersData: (CreateUserDto & { password: string })[],
  ): Promise<UserEntity[]> {
    try {
      const now = new Date();
      const preparedUsers = usersData.map((userData) => ({
        id: this.generateUserId(),
        email: userData.email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role || UserRole.USER,
        organizationId: userData.organizationId,
        status: userData.status || UserStatus.ACTIVE,
        securityFlags: {},
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            push: false,
            sms: false,
          },
        },
        createdAt: now,
        updatedAt: now,
      }));

      const savedUsers = await this.userModel.insertMany(preparedUsers, {
        ordered: false,
      });
      return savedUsers.map((user) => this.mapToEntity(user));
    } catch (error) {
      throw new Error(`Failed to bulk create users: ${error.message}`);
    }
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map MongoDB document to UserEntity
   */
  private mapToEntity(doc: any): UserEntity {
    return {
      _id: doc._id?.toString(),
      id: doc.id,
      email: doc.email,
      password: doc.password,
      firstName: doc.firstName,
      lastName: doc.lastName,
      role: doc.role,
      organizationId: doc.organizationId,
      status: doc.status,
      lastActivity: doc.lastActivity,
      securityFlags: doc.securityFlags || {},
      preferences: doc.preferences || {
        language: 'en',
        notifications: { email: true, push: false, sms: false },
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
