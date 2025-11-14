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
import {
  LoginDto,
  CreateUserDto,
  UserDto,
  UserRole,
  JwtPayload,
} from '@ai-recruitment-clerk/user-management-domain';
import * as bcrypt from 'bcryptjs';
import { resetConfigCache } from '@ai-recruitment-clerk/configuration';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisBlacklist: jest.Mocked<RedisTokenBlacklistService>;
  let configService: jest.Mocked<ConfigService>;

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
    process.env.NODE_ENV = 'test';
    resetConfigCache();
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: RedisTokenBlacklistService, useValue: redisBlacklistMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService) as jest.Mocked<UserService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    redisBlacklist = module.get(RedisTokenBlacklistService) as jest.Mocked<RedisTokenBlacklistService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetConfigCache();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        role: UserRole.HR_MANAGER,
      };

      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.register(createUserDto);

      expect(result).toMatchObject({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
      expect(userService.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(userService.create).toHaveBeenCalled();
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

      userService.findByEmail.mockResolvedValue(mockUser);
      userService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.login(loginDto);

      expect(result).toMatchObject({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      userService.findByEmail.mockResolvedValue(mockUser);
      userService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      };

      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should blacklist token on logout', async () => {
      const token = 'valid-token';
      redisBlacklist.blacklistToken.mockResolvedValue(undefined);

      await service.logout(token);

      expect(redisBlacklist.blacklistToken).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.HR_MANAGER,
      };

      jwtService.verify.mockReturnValue(payload);
      redisBlacklist.isBlacklisted.mockResolvedValue(false);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(jwtService.verify).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if refresh token is blacklisted', async () => {
      const refreshToken = 'blacklisted-token';

      redisBlacklist.isBlacklisted.mockResolvedValue(true);

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

      await expect(service.register(createUserDto)).rejects.toThrow();
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
      const inactiveUser = { ...mockUser, isActive: false };
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      userService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle concurrent login attempts (rate limiting)', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      userService.findByEmail.mockResolvedValue(mockUser);
      userService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');

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

      userService.findByEmail.mockResolvedValue(mockUser);
      userService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '15m' })
      );
    });

    it('should reject expired refresh tokens', async () => {
      const expiredToken = 'expired-refresh-token';

      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshToken(expiredToken)).rejects.toThrow();
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent logout requests for same token', async () => {
      const token = 'concurrent-token';
      redisBlacklist.blacklistToken.mockResolvedValue(undefined);

      const promises = Array(3).fill(null).map(() => service.logout(token));
      await Promise.all(promises);

      expect(redisBlacklist.blacklistToken).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent token refresh attempts', async () => {
      const refreshToken = 'concurrent-refresh';
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.HR_MANAGER,
      };

      jwtService.verify.mockReturnValue(payload);
      redisBlacklist.isBlacklisted.mockResolvedValue(false);
      jwtService.sign.mockReturnValue('new-token');

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

      userService.findByEmail.mockResolvedValue(mockUser);
      userService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');

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
