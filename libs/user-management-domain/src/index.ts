// User Management Domain Exports
export * from './domain/index';
export * from './application/index';
export * from './infrastructure/index';

// Temporary exports for immediate fixes
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    id?: string;
    organizationId?: string;
    permissions?: string[];
    [key: string]: any;
  };
  fingerprint?: string;
}

export interface UserDto {
  id: string;
  email: string;
  username?: string;
  isActive?: boolean;
  name?: string;
  organizationId?: string;
  permissions?: string[];
  roles?: string[];
  role?: UserRole | string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum Permission {
  // Existing permissions (colon style)
  READ_USERS = 'read:users',
  READ_USER = 'read:user',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',
  DELETE_RESUME = 'delete:resume',
  ADMIN = 'admin',
  READ_ANALYSIS = 'read:analysis',
  VIEW_ANALYTICS = 'view:analytics',
  TRACK_METRICS = 'track:metrics',
  GENERATE_REPORT = 'generate:report',
  SYSTEM_CONFIG = 'system:config',

  // Additional permissions used by gateway (snake style)
  CREATE_JOB = 'create_job',
  READ_JOB = 'read_job',
  UPDATE_JOB = 'update_job',
  UPLOAD_RESUME = 'upload_resume',
  READ_RESUME = 'read_resume',
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  MANAGE_USER = 'manage_user',
}

// Missing Authentication DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  role?: UserRole;
  status?: UserStatus;
  updatedAt?: Date;
}

export interface UserPreferencesDto {
  userId: string;
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export interface UserActivityDto {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  expiresIn?: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

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
  USER = 'user'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

// Permission checking utility functions
export function hasAllPermissions(userPermissions: string[] = [], requiredPermissions: string[] = []): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}
