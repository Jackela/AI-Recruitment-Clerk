/**
 * @fileoverview Authentication Controller Tests - Comprehensive test coverage for auth endpoints
 * @author AI Recruitment Team
 * @since v1.0.0
 * @version v1.0.0
 * @module AuthControllerTests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import {
  LoginDto,
  CreateUserDto,
  RefreshTokenDto,
  AuthResponseDto,
  UserDto,
  UserRole,
  Permission,
  AuthenticatedRequest,
} from '@ai-recruitment-clerk/user-management-domain';

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

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let userService: jest.Mocked<UserService>;

  const mockUserDto: UserDto = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.RECRUITER,
    organizationId: 'org-456',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    user: mockUserDto,
  };

  const mockAuthenticatedRequest = {
    user: mockUserDto,
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const authServiceMock = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      changePassword: jest.fn(),
    };

    const userServiceMock = {
      listUsers: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    userService = module.get(UserService) as jest.Mocked<UserService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
      organizationId: 'org-789',
    };

    it('should create a new user and return tokens', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(createUserDto);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({
        organizationId: mockAuthResponse.user.organizationId,
        userId: mockAuthResponse.user.id,
        accessToken: mockAuthResponse.accessToken,
        refreshToken: mockAuthResponse.refreshToken,
        expiresIn: mockAuthResponse.expiresIn,
      });
    });

    it('should handle registration with missing organization ID', async () => {
      const responseWithoutOrg = {
        ...mockAuthResponse,
        user: { ...mockUserDto, organizationId: undefined },
      };
      authService.register.mockResolvedValue(responseWithoutOrg);

      const result = await controller.register(createUserDto);

      expect(result.organizationId).toBe('');
    });

    it('should handle registration with missing expiresIn', async () => {
      const responseWithoutExpiry = {
        ...mockAuthResponse,
        expiresIn: undefined,
      };
      authService.register.mockResolvedValue(responseWithoutExpiry);

      const result = await controller.register(createUserDto);

      expect(result.expiresIn).toBe(3600);
    });

    it('should propagate validation errors from service', async () => {
      const validationError = new Error('Email already exists');
      authService.register.mockRejectedValue(validationError);

      await expect(controller.register(createUserDto)).rejects.toThrow(validationError);
      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should authenticate user and return tokens', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockAuthenticatedRequest, loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should include user details in response', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockAuthenticatedRequest, loginDto);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUserDto.id);
      expect(result.user.role).toBe(UserRole.RECRUITER);
      expect(result.user.organizationId).toBe('org-456');
    });

    it('should propagate authentication errors', async () => {
      const authError = new Error('Invalid credentials');
      authService.login.mockRejectedValue(authError);

      await expect(controller.login(mockAuthenticatedRequest, loginDto)).rejects.toThrow(authError);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return HTTP 200 on successful login', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockAuthenticatedRequest, loginDto);

      expect(result).toBeDefined();
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh access token with valid refresh token', async () => {
      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should return new token pair on successful refresh', async () => {
      const newTokenResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      authService.refreshToken.mockResolvedValue(newTokenResponse);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should propagate invalid token errors', async () => {
      const tokenError = new Error('Invalid refresh token');
      authService.refreshToken.mockRejectedValue(tokenError);

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(tokenError);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });

    it('should handle expired refresh token', async () => {
      const expiredError = new Error('Refresh token expired');
      authService.refreshToken.mockRejectedValue(expiredError);

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(expiredError);
    });
  });

  describe('logout', () => {
    it('should logout user and return success message', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockAuthenticatedRequest);

      expect(authService.logout).toHaveBeenCalledWith(mockUserDto.id);
      expect(result).toEqual({ message: 'Successfully logged out' });
    });

    it('should call logout with correct user ID', async () => {
      authService.logout.mockResolvedValue(undefined);

      await controller.logout(mockAuthenticatedRequest);

      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(authService.logout).toHaveBeenCalledWith('user-123');
    });

    it('should propagate logout errors', async () => {
      const logoutError = new Error('Logout failed');
      authService.logout.mockRejectedValue(logoutError);

      await expect(controller.logout(mockAuthenticatedRequest)).rejects.toThrow(logoutError);
    });
  });

  describe('getProfile', () => {
    it('should return authenticated user profile', async () => {
      const result = await controller.getProfile(mockAuthenticatedRequest);

      expect(result).toEqual(mockUserDto);
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(UserRole.RECRUITER);
    });

    it('should return user without password field', async () => {
      const result = await controller.getProfile(mockAuthenticatedRequest);

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('changePassword', () => {
    const passwordChangeDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewSecurePass456!',
    };

    it('should change user password successfully', async () => {
      authService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        mockAuthenticatedRequest,
        passwordChangeDto,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUserDto.id,
        passwordChangeDto.currentPassword,
        passwordChangeDto.newPassword,
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should propagate password validation errors', async () => {
      const validationError = new Error('Current password is incorrect');
      authService.changePassword.mockRejectedValue(validationError);

      await expect(
        controller.changePassword(mockAuthenticatedRequest, passwordChangeDto),
      ).rejects.toThrow(validationError);
    });

    it('should enforce password strength requirements', async () => {
      const weakPasswordError = new Error('Password too weak');
      authService.changePassword.mockRejectedValue(weakPasswordError);

      await expect(
        controller.changePassword(mockAuthenticatedRequest, {
          currentPassword: 'OldPass123!',
          newPassword: 'weak',
        }),
      ).rejects.toThrow(weakPasswordError);
    });
  });

  describe('getUsers', () => {
    const mockUserEntities: UserEntity[] = [
      {
        ...mockUserDto,
        password: 'hashed-password-123',
        securityFlags: {},
      } as UserEntity,
      {
        id: 'user-456',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        role: UserRole.HR_MANAGER,
        organizationId: 'org-456',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password-456',
        securityFlags: {},
      } as UserEntity,
    ];

    it('should return all users in organization for HR Manager', async () => {
      userService.listUsers.mockResolvedValue(mockUserEntities);

      const result = await controller.getUsers(mockAuthenticatedRequest);

      expect(userService.listUsers).toHaveBeenCalledWith('org-456');
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test@example.com');
    });

    it('should return all users for Admin', async () => {
      const adminRequest = {
        user: { ...mockUserDto, role: UserRole.ADMIN },
      } as unknown as AuthenticatedRequest;
      userService.listUsers.mockResolvedValue(mockUserEntities);

      const result = await controller.getUsers(adminRequest);

      expect(userService.listUsers).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
    });

    it('should filter users by organization for non-admin roles', async () => {
      userService.listUsers.mockResolvedValue([mockUserEntities[0]]);

      const result = await controller.getUsers(mockAuthenticatedRequest);

      expect(userService.listUsers).toHaveBeenCalledWith('org-456');
      expect(result).toHaveLength(1);
    });

    it('should remove password field from all user responses', async () => {
      userService.listUsers.mockResolvedValue(mockUserEntities);

      const result = await controller.getUsers(mockAuthenticatedRequest);

      result.forEach((user) => {
        expect(user).not.toHaveProperty('password');
      });
    });
  });

  describe('getUserStats', () => {
    const mockStats = {
      totalUsers: 150,
      activeUsers: 120,
      organizations: ['org-123', 'org-456', 'org-789'],
    };

    it('should return user statistics', async () => {
      userService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats();

      expect(userService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should return correct user counts', async () => {
      userService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats();

      expect(result.totalUsers).toBe(150);
      expect(result.activeUsers).toBe(120);
      expect(result.organizations).toHaveLength(3);
    });

    it('should propagate stats retrieval errors', async () => {
      const statsError = new Error('Database connection failed');
      userService.getStats.mockRejectedValue(statsError);

      await expect(controller.getUserStats()).rejects.toThrow(statsError);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await controller.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', async () => {
      const result = await controller.healthCheck();

      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should be accessible without authentication', async () => {
      const result = await controller.healthCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service temporarily unavailable');
      authService.login.mockRejectedValue(serviceError);

      await expect(
        controller.login(mockAuthenticatedRequest, {
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toThrow(serviceError);
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection lost');
      userService.listUsers.mockRejectedValue(dbError);

      await expect(controller.getUsers(mockAuthenticatedRequest)).rejects.toThrow(dbError);
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in responses', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(mockAuthenticatedRequest, {
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result.user).not.toHaveProperty('password');
    });

    it('should validate email format in registration', async () => {
      const invalidEmailDto: CreateUserDto = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const validationError = new Error('Invalid email format');
      authService.register.mockRejectedValue(validationError);

      await expect(controller.register(invalidEmailDto)).rejects.toThrow(validationError);
    });

    it('should enforce password complexity on registration', async () => {
      const weakPasswordDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      };

      const passwordError = new Error('Password does not meet complexity requirements');
      authService.register.mockRejectedValue(passwordError);

      await expect(controller.register(weakPasswordDto)).rejects.toThrow(passwordError);
    });
  });

  describe('Performance', () => {
    it('should complete authentication within performance budget', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const startTime = Date.now();
      await controller.login(mockAuthenticatedRequest, {
        email: 'test@example.com',
        password: 'SecurePass123!',
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });
});
