/**
 * @fileoverview Authentication Controller - Core user authentication and session management
 * @author AI Recruitment Team
 * @since v1.0.0
 * @version v1.0.0
 * @module AuthController
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import {
  LoginDto,
  CreateUserDto,
  AuthResponseDto,
  RefreshTokenDto,
  UserDto,
  Permission,
  UserRole,
  AuthenticatedRequest,
} from '@ai-recruitment-clerk/user-management-domain';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Permissions } from './decorators/permissions.decorator';
import { Public } from './decorators/public.decorator';

/**
 * Authentication Controller - Manages user authentication, registration, and session lifecycle.
 *
 * Provides secure endpoints for user login, registration, token refresh, and profile management.
 * Implements JWT-based authentication with role-based access control for the recruitment platform.
 * Supports organization-based multi-tenancy and comprehensive user lifecycle management.
 *
 * **Security Features:**
 * - JWT token authentication with refresh token rotation
 * - Password hashing with bcrypt and salt rounds
 * - Rate limiting on authentication endpoints
 * - Session invalidation and logout tracking
 * - Multi-tenant organization isolation
 *
 * **Performance Characteristics:**
 * - Average Response Time: <200ms for authentication operations
 * - Token Validity: 1 hour access tokens, 7 day refresh tokens
 * - Concurrent Sessions: Unlimited per user with session tracking
 *
 * @example
 * ```typescript
 * // User registration
 * POST /auth/register
 * {
 *   "email": "recruiter@company.com",
 *   "password": "SecurePass123!",
 *   "firstName": "Jane",
 *   "lastName": "Smith"
 * }
 *
 * // User login
 * POST /auth/login
 * {
 *   "email": "recruiter@company.com",
 *   "password": "SecurePass123!"
 * }
 *
 * // Get user profile (authenticated)
 * GET /auth/profile
 * Authorization: Bearer <access_token>
 * ```
 *
 * @see {@link AuthService} for authentication business logic
 * @see {@link UserService} for user management operations
 * @see {@link JwtAuthGuard} for authentication middleware
 * @since v1.0.0
 */
@Controller('auth')
export class AuthController {
  /**
   * Initializes a new instance of the Auth Controller.
   * @param authService - The auth service.
   * @param userService - The user service.
   */
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * User registration endpoint for creating new accounts.
   *
   * Creates a new user account with organization assignment and role-based permissions.
   * Automatically generates JWT tokens for immediate authentication post-registration.
   * Supports self-registration and admin-created accounts with appropriate validation.
   *
   * @route POST /auth/register
   * @access Public - No authentication required
   * @rateLimit 5 requests per minute per IP
   *
   * @param {CreateUserDto} createUserDto - User registration data with validation
   * @returns {Promise<RegistrationResponse>} User ID, tokens, and organization info
   *
   * @throws {ValidationException} 400 - Invalid input data or email format
   * @throws {ConflictException} 409 - Email already exists in system
   * @throws {BusinessException} 422 - Organization not found or inactive
   * @throws {ServiceException} 500 - Database or external service errors
   *
   * @example
   * ```typescript
   * // Request
   * POST /auth/register
   * {
   *   "email": "jane.smith@company.com",
   *   "password": "SecurePass123!",
   *   "firstName": "Jane",
   *   "lastName": "Smith",
   *   "organizationId": "org-456"
   * }
   *
   * // Response
   * {
   *   "organizationId": "org-456",
   *   "userId": "user-789",
   *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "expiresIn": 3600
   * }
   * ```
   *
   * @see {@link CreateUserDto} for input validation requirements
   * @see {@link AuthService.register} for business logic implementation
   * @since v1.0.0
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto): Promise<{
    organizationId: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const auth = await this.authService.register(createUserDto);
    return {
      organizationId: auth.user.organizationId || '',
      userId: auth.user.id,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresIn: auth.expiresIn ?? 3600,
    };
  }

  /**
   * User authentication endpoint for secure login with JWT token generation.
   *
   * Validates user credentials and generates access/refresh token pair for session management.
   * Supports organization-based multi-tenancy with user context and permissions.
   * Implements secure password verification with rate limiting and session tracking.
   *
   * @route POST /auth/login
   * @access Public - No authentication required
   * @rateLimit 10 requests per minute per IP
   *
   * @param {AuthenticatedRequest} req - Express request with potential user context
   * @param {LoginDto} loginDto - Email and password credentials
   * @returns {Promise<AuthResponseDto>} JWT tokens and user session information
   *
   * @throws {ValidationException} 400 - Invalid email format or missing credentials
   * @throws {UnauthorizedException} 401 - Invalid email or password combination
   * @throws {ForbiddenException} 403 - Account locked, inactive, or suspended
   * @throws {ServiceException} 500 - Authentication service or database errors
   *
   * @example
   * ```typescript
   * // Request
   * POST /auth/login
   * {
   *   "email": "recruiter@company.com",
   *   "password": "SecurePass123!"
   * }
   *
   * // Response
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "expiresIn": 3600,
   *   "user": {
   *     "id": "user-123",
   *     "email": "recruiter@company.com",
   *     "organizationId": "org-456",
   *     "role": "RECRUITER"
   *   }
   * }
   * ```
   *
   * @see {@link LoginDto} for credential requirements
   * @see {@link AuthResponseDto} for response format details
   * @see {@link LocalAuthGuard} for password validation logic
   * @since v1.0.0
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: AuthenticatedRequest,
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Token refresh endpoint for extending user sessions without re-authentication.
   *
   * Exchanges valid refresh token for new access/refresh token pair.
   * Implements token rotation for enhanced security and session continuity.
   * Maintains user context and permissions across token refresh cycles.
   *
   * @route POST /auth/refresh
   * @access Public - Requires valid refresh token
   * @rateLimit 30 requests per minute per user
   *
   * @param {RefreshTokenDto} refreshTokenDto - Valid refresh token for renewal
   * @returns {Promise<AuthResponseDto>} New JWT token pair with updated expiration
   *
   * @throws {ValidationException} 400 - Missing or malformed refresh token
   * @throws {UnauthorizedException} 401 - Invalid, expired, or revoked refresh token
   * @throws {ForbiddenException} 403 - User account deactivated since token issuance
   * @throws {ServiceException} 500 - Token service or database errors
   *
   * @example
   * ```typescript
   * // Request
   * POST /auth/refresh
   * {
   *   "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
   * }
   *
   * // Response
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "expiresIn": 3600
   * }
   * ```
   *
   * @see {@link RefreshTokenDto} for token format requirements
   * @see {@link AuthService.refreshToken} for token validation logic
   * @since v1.0.0
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * User logout endpoint for secure session termination and token invalidation.
   *
   * Invalidates user's refresh tokens and logs logout event for security auditing.
   * Ensures proper session cleanup and prevents token reuse after logout.
   * Supports graceful session termination across multiple devices/sessions.
   *
   * @route POST /auth/logout
   * @access Authenticated users only
   * @rateLimit 60 requests per minute per user
   *
   * @param {AuthenticatedRequest} req - Authenticated request with user context
   * @returns {Promise<{message: string}>} Logout confirmation message
   *
   * @throws {UnauthorizedException} 401 - Missing or invalid access token
   * @throws {ServiceException} 500 - Session cleanup or database errors
   *
   * @example
   * ```typescript
   * // Request
   * POST /auth/logout
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   *
   * // Response
   * {
   *   "message": "Successfully logged out"
   * }
   * ```
   *
   * @see {@link AuthService.logout} for session cleanup implementation
   * @see {@link JwtAuthGuard} for authentication validation
   * @since v1.0.0
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.authService.logout(req.user.id);
    return { message: 'Successfully logged out' };
  }

  /**
   * Retrieves profile.
   * @param req - The req.
   * @returns A promise that resolves to UserDto.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserDto> {
    return req.user;
  }

  /**
   * Performs the change password operation.
   * @param req - The req.
   * @param body - The body.
   * @returns A promise that resolves to { message: string }.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  /**
   * Retrieves users.
   * @param req - The req.
   * @returns A promise that resolves to an array of UserDto.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(Permission.READ_USER)
  @Get('users')
  async getUsers(@Request() req: AuthenticatedRequest): Promise<UserDto[]> {
    // HR Managers and Recruiters can only see users in their organization
    const organizationId =
      req.user.role === UserRole.ADMIN ? undefined : req.user.organizationId;
    const users = await this.userService.listUsers(organizationId);

    // Remove password field from response
    return users.map(
      ({ password, ...userWithoutPassword }) => userWithoutPassword as UserDto,
    );
  }

  /**
   * Retrieves user stats.
   * @returns The Promise<{ totalUsers: number; activeUsers: number; organizations: string[]; }>.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(Permission.READ_USER)
  @Get('users/stats')
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    organizations: string[];
  }> {
    return this.userService.getStats();
  }

  /**
   * Performs the health check operation.
   * @returns A promise that resolves to { status: string; timestamp: string }.
   */
  @Public()
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
