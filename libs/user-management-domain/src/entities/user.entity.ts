import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../index';

/**
 * User entity representing a user in the system.
 */
export class User {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  passwordHash!: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus)
  status: UserStatus = UserStatus.PENDING;

  @IsBoolean()
  isActive = false;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @IsDate()
  @IsOptional()
  lastLoginAt?: Date;

  /**
   * Create a new user instance.
   */
  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = partial.updatedAt || new Date();
  }

  /**
   * Validate user creation data.
   */
  static validateCreate(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.password) {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.push('Password must contain uppercase, lowercase, and number');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Hash password using a simple hash function.
   * In production, use bcrypt or similar.
   */
  static hashPassword(password: string): string {
    // Simple hash for demonstration - use bcrypt in production
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password against hash.
   */
  static verifyPassword(password: string, hash: string): boolean {
    return User.hashPassword(password) === hash;
  }

  /**
   * Update user profile.
   */
  public updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    if (updates.email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        errors.push('Invalid email format');
      } else {
        this.email = updates.email;
      }
    }

    if (updates.firstName !== undefined) {
      this.firstName = updates.firstName;
    }

    if (updates.lastName !== undefined) {
      this.lastName = updates.lastName;
    }

    if (errors.length === 0) {
      this.updatedAt = new Date();
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Activate user account.
   */
  public activate(): void {
    this.status = UserStatus.ACTIVE;
    this.isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * Deactivate user account.
   */
  public deactivate(): void {
    this.status = UserStatus.INACTIVE;
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Suspend user account.
   */
  public suspend(): void {
    this.status = UserStatus.SUSPENDED;
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Check if user can transition to a new status.
   */
  public canTransitionTo(newStatus: UserStatus): boolean {
    const transitions: Record<UserStatus, UserStatus[]> = {
      [UserStatus.PENDING]: [UserStatus.ACTIVE, UserStatus.SUSPENDED],
      [UserStatus.ACTIVE]: [UserStatus.INACTIVE, UserStatus.SUSPENDED],
      [UserStatus.INACTIVE]: [UserStatus.ACTIVE, UserStatus.SUSPENDED],
      [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.INACTIVE],
    };

    return transitions[this.status]?.includes(newStatus) ?? false;
  }

  /**
   * Get full name.
   */
  public getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.username || this.email;
  }

  /**
   * Record login.
   */
  public recordLogin(): void {
    this.lastLoginAt = new Date();
  }
}
