/**
 * @fileoverview User Management Domain - Core authentication and user management types
 * @author AI Recruitment Team
 * @since v1.0.0
 * @version v1.0.0
 * @module UserManagementDomain
 */

// User Management Domain Exports
export * from './domain/index';
export * from './application/index';
export * from './infrastructure/index';

// Core authentication and user types
import { Request } from 'express';

/**
 * Authenticated HTTP request interface extending Express Request with user context.
 *
 * Used throughout the application for endpoints requiring authentication.
 * Provides access to validated user information and security context.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * async getUserData(@Request() req: AuthenticatedRequest) {
 *   const userId = req.user.id;
 *   const orgId = req.user.organizationId;
 *   return await this.userService.getUserData(userId, orgId);
 * }
 * ```
 *
 * @see {@link UserDto} for user data structure details
 * @since v1.0.0
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user context from JWT token validation */
  user: {
    /** JWT subject - unique user identifier */
    sub: string;
    /** User's verified email address */
    email: string;
    /** Internal user ID for database operations */
    id: string;
    /** Organization ID for multi-tenant access control */
    organizationId: string;
    /** Optional array of user permissions for fine-grained access */
    permissions?: string[];
    /** Additional user claims from JWT token */
    [key: string]: any;
  };
  /** Optional device fingerprint for security tracking */
  fingerprint?: string;
}

/**
 * User data transfer object for API responses and client communication.
 *
 * Standardized user representation across all services and components.
 * Excludes sensitive data like passwords and includes optional display fields.
 *
 * @example
 * ```typescript
 * const userResponse: UserDto = {
 *   id: 'user-123',
 *   email: 'john.doe@company.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   role: UserRole.RECRUITER,
 *   organizationId: 'org-456',
 *   permissions: [Permission.READ_RESUMES, Permission.CREATE_JOBS],
 *   isActive: true,
 *   createdAt: new Date('2024-01-15'),
 *   updatedAt: new Date('2024-01-20')
 * };
 * ```
 *
 * @see {@link AuthenticatedRequest} for request context usage
 * @see {@link UserRole} for available user roles
 * @see {@link Permission} for permission definitions
 * @since v1.0.0
 */
export interface UserDto {
  /** Unique user identifier - primary key for user operations */
  id: string;
  /** User's verified email address - used for authentication */
  email: string;
  /** Optional username for display purposes */
  username?: string;
  /** Account activation status - controls login access */
  isActive?: boolean;
  /** Full display name for UI presentation */
  name?: string;
  /** Organization ID for multi-tenant data isolation */
  organizationId?: string;
  /** Array of specific permissions for fine-grained access control */
  permissions?: string[];
  /** Legacy: Array of role names - use role field instead */
  roles?: string[];
  /** Primary user role determining base permissions */
  role?: UserRole | string;
  /** User's first name for personalization */
  firstName?: string;
  /** User's last name for formal communications */
  lastName?: string;
  /** Account status for lifecycle management */
  status?: UserStatus | string;
  /** Account creation timestamp for audit trails */
  createdAt?: Date;
  /** Last modification timestamp for change tracking */
  updatedAt?: Date;
}

/**
 * System permission enumeration for role-based access control.
 *
 * Defines granular permissions for users across the recruitment platform.
 * Used by guards and authorization decorators to control access to endpoints.
 * Supports both colon-style (OAuth2) and snake_case (internal) naming conventions.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Permissions(Permission.READ_USERS, Permission.GENERATE_REPORT)
 * async getUserAnalytics() {
 *   // Only users with both permissions can access
 * }
 * ```
 *
 * @see {@link UserRole} for role-based permission groupings
 * @see {@link AuthenticatedRequest} for user permission context
 * @since v1.0.0
 */
export enum Permission {
  // User management permissions (OAuth2 colon style)
  /** View user list and basic user information */
  READ_USERS = 'read:users',
  /** View individual user detailed information */
  READ_USER = 'read:user',
  /** Create and modify user accounts */
  WRITE_USERS = 'write:users',
  /** Remove user accounts from system */
  DELETE_USERS = 'delete:users',
  /** Remove resume documents from storage */
  DELETE_RESUME = 'delete:resume',
  /** Full administrative access to system */
  ADMIN = 'admin',

  // Analytics and reporting permissions
  /** Access analysis results and scoring data */
  READ_ANALYSIS = 'read:analysis',
  /** View business analytics dashboards */
  VIEW_ANALYTICS = 'view:analytics',
  /** Track and record performance metrics */
  TRACK_METRICS = 'track:metrics',
  /** Generate and download reports */
  GENERATE_REPORT = 'generate:report',
  /** Configure system-wide settings */
  SYSTEM_CONFIG = 'system:config',

  // Business operations permissions (snake_case style)
  /** Create job postings and descriptions */
  CREATE_JOB = 'create_job',
  /** View job details and requirements */
  READ_JOB = 'read_job',
  /** Modify existing job postings */
  UPDATE_JOB = 'update_job',
  /** Upload resume documents for analysis */
  UPLOAD_RESUME = 'upload_resume',
  /** Access resume content and analysis */
  READ_RESUME = 'read_resume',
  /** Create new user accounts */
  CREATE_USER = 'create_user',
  /** Modify user account information */
  UPDATE_USER = 'update_user',
  /** Full user lifecycle management */
  MANAGE_USER = 'manage_user',
}

/**
 * User login credentials for authentication.
 *
 * Standard email/password authentication payload for JWT token generation.
 * Used by login endpoints and authentication middleware.
 *
 * @example
 * ```typescript
 * const loginRequest: LoginDto = {
 *   email: 'user@company.com',
 *   password: 'securePassword123'
 * };
 *
 * const response = await authService.login(loginRequest);
 * const { accessToken, refreshToken } = response;
 * ```
 *
 * @see {@link AuthResponseDto} for login response format
 * @see {@link AuthenticatedRequest} for authenticated session context
 * @since v1.0.0
 */
export interface LoginDto {
  /** User's registered email address for authentication */
  email: string;
  /** User's password - transmitted securely and never stored in plain text */
  password: string;
}

/**
 * User creation payload for new account registration.
 *
 * Contains all required and optional fields for creating new user accounts.
 * Supports both self-registration and admin-created accounts with role assignment.
 *
 * @example
 * ```typescript
 * const newUser: CreateUserDto = {
 *   email: 'recruiter@company.com',
 *   password: 'SecurePass123!',
 *   firstName: 'Jane',
 *   lastName: 'Smith',
 *   organizationId: 'org-456',
 *   role: UserRole.RECRUITER,
 *   status: UserStatus.ACTIVE
 * };
 *
 * const user = await userService.createUser(newUser);
 * ```
 *
 * @see {@link UserDto} for created user response format
 * @see {@link UserRole} for available role options
 * @see {@link UserStatus} for status values
 * @since v1.0.0
 */
export interface CreateUserDto {
  /** User's email address - must be unique across system */
  email: string;
  /** Initial password - must meet security requirements */
  password: string;
  /** User's first name for personalization */
  firstName?: string;
  /** User's last name for formal communications */
  lastName?: string;
  /** Organization ID for multi-tenant assignment */
  organizationId?: string;
  /** Initial user role determining base permissions */
  role?: UserRole;
  /** Initial account status - defaults to PENDING */
  status?: UserStatus;
}

/**
 * User update payload for modifying existing accounts.
 *
 * All fields are optional to support partial updates.
 * Password changes require separate secure endpoint for security.
 *
 * @example
 * ```typescript
 * const userUpdate: UpdateUserDto = {
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   role: UserRole.SENIOR_RECRUITER,
 *   status: UserStatus.ACTIVE,
 *   updatedAt: new Date()
 * };
 *
 * const updatedUser = await userService.updateUser(userId, userUpdate);
 * ```
 *
 * @see {@link UserDto} for updated user response format
 * @see {@link UserRole} for role change options
 * @see {@link UserStatus} for status transition rules
 * @since v1.0.0
 */
export interface UpdateUserDto {
  /** Updated email address - triggers email verification */
  email?: string;
  /** Updated first name */
  firstName?: string;
  /** Updated last name */
  lastName?: string;
  /** Organization transfer - requires admin permissions */
  organizationId?: string;
  /** Role change - requires appropriate admin permissions */
  role?: UserRole;
  /** Status change - follows defined transition rules */
  status?: UserStatus;
  /** Timestamp of update - set automatically by service */
  updatedAt?: Date;
}

/**
 * Defines the shape of the user preferences dto.
 */
export interface UserPreferencesDto {
  userId: string;
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

/**
 * Defines the shape of the user activity dto.
 */
export interface UserActivityDto {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Defines the shape of the auth response dto.
 */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  expiresIn?: number;
}

/**
 * Defines the shape of the refresh token dto.
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * Defines the shape of the jwt payload.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  organizationId?: string;
  permissions?: string[];
  role?: UserRole | string;
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

export enum UserRole {
  ADMIN = 'admin',
  HR_MANAGER = 'hr_manager',
  RECRUITER = 'recruiter',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

// Permission checking utility functions
/**
 * Performs the has all permissions operation.
 * @param userPermissions - The user permissions.
 * @param requiredPermissions - The required permissions.
 * @returns The boolean value.
 */
export function hasAllPermissions(
  userPermissions: string[] = [],
  requiredPermissions: string[] = [],
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission),
  );
}
