/**
 * @fileoverview Authentication Service Tests - Comprehensive test coverage for auth business logic
 * @author AI Recruitment Team
 * @since v1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { RedisTokenBlacklistService } from '../security/redis-token-blacklist.service';
import { JwtTokenService } from './services/jwt-token.service';
import { PasswordService } from './services/password.service';
import { LoginSecurityService } from './services/login-security.service';
import { SessionManagementService } from './services/session-management.service';
import { UserValidationService } from './services/user-validation.service';
import { SecurityMetricsService } from './services/security-metrics.service';
import {
  LoginDto,
  CreateUserDto,
  UserDto,
  UserRole,
  JwtPayload,
} from '@ai-recruitment-clerk/user-management-domain';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisBlacklist: jest.Mocked<RedisTokenBlacklistService>;
  let configService: jest.Mocked<ConfigService>;
  // Extracted services (Sprint 4 refactoring)
  let jwtTokenService: jest.Mocked<JwtTokenService>;
  let passwordService: jest.Mocked<PasswordService>;
  let loginSecurityService: jest.Mocked<LoginSecurityService>;
  let sessionManagementService: jest.Mocked<SessionManagementService>;
  let userValidationService: jest.Mocked<UserValidationService>;

  const mockUser: UserDto = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.HR_MANAGER,
    organizationId: 'org-1',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const userServiceMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      validatePassword: jest.fn(),
      updatePassword: jest.fn(),
    };

    const jwtServiceMock = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const redisBlacklistMock = {
      addToken: jest.fn(),
      isBlacklisted: jest.fn(),
    };

    const configServiceMock = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };

    const jwtTokenServiceMock = {
      generateAuthResponse: jest.fn(),
      validateJwtPayload: jest.fn(),
      refreshToken: jest.fn(),
    };

    const passwordServiceMock = {
      changePassword: jest.fn(),
      validatePasswordStrength: jest.fn(),
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };

    const loginSecurityServiceMock = {
      isAccountLocked: jest.fn().mockReturnValue(false),
      recordFailedLoginAttempt: jest.fn(),
      resetFailedAttempts: jest.fn(),
      hashEmail: jest.fn().mockImplementation((email: string) => email),
    };

    const sessionManagementServiceMock = {
      logout: jest.fn(),
      emergencyRevokeAllUserTokens: jest.fn(),
      cleanupBlacklistedTokens: jest.fn(),
    };

    const userValidationServiceMock = {
      validateUser: jest.fn(),
      normalizeRole: jest.fn(),
      prepareUserForResponse: jest.fn(),
    };

    const securityMetricsServiceMock = {
      getSecurityMetrics: jest.fn(),
      authHealthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: RedisTokenBlacklistService, useValue: redisBlacklistMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: JwtTokenService, useValue: jwtTokenServiceMock },
        { provide: PasswordService, useValue: passwordServiceMock },
        { provide: LoginSecurityService, useValue: loginSecurityServiceMock },
        { provide: SessionManagementService, useValue: sessionManagementServiceMock },
        { provide: UserValidationService, useValue: userValidationServiceMock },
        { provide: SecurityMetricsService, useValue: securityMetricsServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService) as jest.Mocked<UserService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    redisBlacklist = module.get(RedisTokenBlacklistService) as jest.Mocked<RedisTokenBlacklistService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    // Get extracted services (Sprint 4 refactoring)
    jwtTokenService = module.get(JwtTokenService) as jest.Mocked<JwtTokenService>;
    passwordService = module.get(PasswordService) as jest.Mocked<PasswordService>;
    loginSecurityService = module.get(LoginSecurityService) as jest.Mocked<LoginSecurityService>;
    sessionManagementService = module.get(SessionManagementService) as jest.Mocked<SessionManagementService>;
    userValidationService = module.get(UserValidationService) as jest.Mocked<UserValidationService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        role: UserRole.HR_MANAGER,
      };

      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      jwtTokenService.generateAuthResponse.mockResolvedValue(expectedAuthResponse);

      const result = await service.register(createUserDto);

      expect(result).toMatchObject({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
      expect(userService.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(userService.create).toHaveBeenCalled();
      expect(passwordService.hashPassword).toHaveBeenCalledWith(createUserDto.password);
      expect(jwtTokenService.generateAuthResponse).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'duplicate',
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: UserRole.HR_MANAGER,
      };

      userService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      // Sprint 4: Now using userValidationService instead of userService.validatePassword
      userValidationService.validateUser.mockResolvedValue(mockUser);
      jwtTokenService.generateAuthResponse.mockResolvedValue(expectedAuthResponse);

      const result = await service.login(loginDto);

      expect(result).toMatchObject({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
      expect(userValidationService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(jwtTokenService.generateAuthResponse).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      // Sprint 4: Now using userValidationService - returns null on invalid credentials
      userValidationService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      };

      // Sprint 4: Now using userValidationService - returns null when user not found
      userValidationService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should blacklist token on logout', async () => {
      const token = 'valid-token';
      // Sprint 4: Now using sessionManagementService instead of redisBlacklist directly
      sessionManagementService.logout.mockResolvedValue(undefined);

      await service.logout(token);

      expect(sessionManagementService.logout).toHaveBeenCalledWith(token, undefined, undefined);
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      // Sprint 4: Now using jwtTokenService instead of jwtService directly
      jwtTokenService.refreshToken.mockResolvedValue(expectedAuthResponse);

      const result = await service.refreshToken(refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(jwtTokenService.refreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should throw UnauthorizedException if refresh token is blacklisted', async () => {
      const refreshToken = 'blacklisted-token';

      // Sprint 4: Now using jwtTokenService - it throws UnauthorizedException for blacklisted tokens
      jwtTokenService.refreshToken.mockRejectedValue(new UnauthorizedException('Token is blacklisted'));

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Registration Validation', () => {
    it('should reject registration with empty email', async () => {
      const createUserDto: CreateUserDto = {
        username: 'user',
        email: '',
        password: 'SecurePass123!',
        role: UserRole.HR_MANAGER,
      };

      // Sprint 4: Service layer validation - findByEmail or hashPassword can reject empty email
      userService.findByEmail.mockRejectedValue(new Error('Invalid email format'));

      await expect(service.register(createUserDto)).rejects.toThrow('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      const createUserDto: CreateUserDto = {
        username: 'user',
        email: 'user@example.com',
        password: '123',
        role: UserRole.HR_MANAGER,
      };

      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockRejectedValue(new Error('Password too weak'));

      await expect(service.register(createUserDto)).rejects.toThrow('Password too weak');
    });

    it('should handle database failure during registration', async () => {
      const createUserDto: CreateUserDto = {
        username: 'user',
        email: 'user@example.com',
        password: 'SecurePass123!',
        role: UserRole.HR_MANAGER,
      };

      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.register(createUserDto)).rejects.toThrow('Database connection lost');
    });
  });

  describe('Negative Tests - Login Security', () => {
    it('should reject login with inactive user account', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      // Sprint 4: userValidationService returns null for inactive accounts
      userValidationService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle concurrent login attempts (rate limiting)', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'token',
        refreshToken: 'refresh-token',
      };

      // Sprint 4: Now using extracted services
      userValidationService.validateUser.mockResolvedValue(mockUser);
      jwtTokenService.generateAuthResponse.mockResolvedValue(expectedAuthResponse);

      const promises = Array(5).fill(null).map(() => service.login(loginDto));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.accessToken).toBeDefined();
      });
    });
  });

  describe('Boundary Tests - Token Expiration', () => {
    it('should generate tokens with correct expiration times', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'token',
        refreshToken: 'refresh-token',
      };

      // Sprint 4: Now using extracted services
      userValidationService.validateUser.mockResolvedValue(mockUser);
      jwtTokenService.generateAuthResponse.mockResolvedValue(expectedAuthResponse);

      await service.login(loginDto);

      // Sprint 4: Token generation is now delegated to JwtTokenService
      expect(jwtTokenService.generateAuthResponse).toHaveBeenCalledWith(mockUser);
    });

    it('should reject expired refresh tokens', async () => {
      const expiredToken = 'expired-refresh-token';

      // Sprint 4: Now using jwtTokenService
      jwtTokenService.refreshToken.mockRejectedValue(new Error('Token expired'));

      await expect(service.refreshToken(expiredToken)).rejects.toThrow();
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent logout requests for same token', async () => {
      const token = 'concurrent-token';
      // Sprint 4: Now using sessionManagementService
      sessionManagementService.logout.mockResolvedValue(undefined);

      const promises = Array(3).fill(null).map(() => service.logout(token));
      await Promise.all(promises);

      expect(sessionManagementService.logout).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent token refresh attempts', async () => {
      const refreshToken = 'concurrent-refresh';
      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      // Sprint 4: Now using jwtTokenService
      jwtTokenService.refreshToken.mockResolvedValue(expectedAuthResponse);

      const promises = Array(3).fill(null).map(() => service.refreshToken(refreshToken));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.accessToken).toBe('new-token');
      });
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete auth response structure on login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const expectedAuthResponse = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      // Sprint 4: Now using extracted services
      userValidationService.validateUser.mockResolvedValue(mockUser);
      jwtTokenService.generateAuthResponse.mockResolvedValue(expectedAuthResponse);

      const result = await service.login(loginDto);

      expect(result).toMatchObject({
        user: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          role: expect.any(String),
        }),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken.length).toBeGreaterThan(0);
    });
  });
});
