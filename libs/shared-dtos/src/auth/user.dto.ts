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
  public email!: string;

  @IsString()
  @MinLength(8)
  public password!: string;

  @IsString()
  @IsOptional()
  public username?: string;

  @IsString()
  @IsNotEmpty()
  public firstName!: string;

  @IsString()
  @IsNotEmpty()
  public lastName!: string;

  @IsEnum(UserRole)
  public role!: UserRole;

  @IsString()
  @IsOptional()
  public organizationId?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  public status?: UserStatus = UserStatus.ACTIVE;
}

/**
 * Describes the login data transfer object.
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  public email!: string;

  @IsString()
  @IsNotEmpty()
  public password!: string;
}

/**
 * Describes the user data transfer object.
 */
export class UserDto {
  public id!: string;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: UserRole;
  public organizationId?: string;
  public status!: UserStatus;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Computed property
  /**
   * Performs the name operation.
   * @returns The string value.
   */
  public get name(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

/**
 * Represents the jwt payload.
 */
export class JwtPayload {
  public sub!: string; // user id
  public email!: string;
  public role!: UserRole;
  public organizationId?: string;
  public iat?: number;
  public exp?: number;
  public aud?: string; // audience
  public iss?: string; // issuer
}

/**
 * Describes the auth response data transfer object.
 */
export class AuthResponseDto {
  public accessToken!: string;
  public refreshToken!: string;
  public user!: UserDto;
  public expiresIn!: number;
}

/**
 * Describes the refresh token data transfer object.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  public refreshToken!: string;
}

/**
 * Describes the update user data transfer object.
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  public firstName?: string;

  @IsString()
  @IsOptional()
  public lastName?: string;

  @IsEmail()
  @IsOptional()
  public email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  public role?: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  public status?: UserStatus;

  @IsString()
  @IsOptional()
  public organizationId?: string;
}

/**
 * Describes the user preferences data transfer object.
 */
export class UserPreferencesDto {
  @IsString()
  @IsOptional()
  public language?: string;

  @IsString()
  @IsOptional()
  public timezone?: string;

  @IsString()
  @IsOptional()
  public theme?: string;

  @IsOptional()
  public notifications?: {
    email?: boolean;
    browser?: boolean;
    mobile?: boolean;
  };
}

/**
 * Describes the user activity data transfer object.
 */
export class UserActivityDto {
  public id!: string;
  public userId!: string;
  public action!: string;
  public resource?: string;
  public metadata?: Record<string, unknown>;
  public ipAddress?: string;
  public userAgent?: string;
  public timestamp!: Date;
}
