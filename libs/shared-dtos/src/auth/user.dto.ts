import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  HR_MANAGER = 'hr_manager',
  RECRUITER = 'recruiter',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Describes the create user data transfer object.
 */
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus = UserStatus.ACTIVE;
}

/**
 * Describes the login data transfer object.
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

/**
 * Describes the user data transfer object.
 */
export class UserDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  role!: UserRole;
  organizationId?: string;
  status!: UserStatus;
  createdAt!: Date;
  updatedAt!: Date;

  // Computed property
  /**
   * Performs the name operation.
   * @returns The string value.
   */
  get name(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

/**
 * Represents the jwt payload.
 */
export class JwtPayload {
  sub!: string; // user id
  email!: string;
  role!: UserRole;
  organizationId?: string;
  iat?: number;
  exp?: number;
  aud?: string; // audience
  iss?: string; // issuer
}

/**
 * Describes the auth response data transfer object.
 */
export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: UserDto;
  expiresIn!: number;
}

/**
 * Describes the refresh token data transfer object.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/**
 * Describes the update user data transfer object.
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

/**
 * Describes the user preferences data transfer object.
 */
export class UserPreferencesDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  theme?: string;

  @IsOptional()
  notifications?: {
    email?: boolean;
    browser?: boolean;
    mobile?: boolean;
  };
}

/**
 * Describes the user activity data transfer object.
 */
export class UserActivityDto {
  id!: string;
  userId!: string;
  action!: string;
  resource?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp!: Date;
}
