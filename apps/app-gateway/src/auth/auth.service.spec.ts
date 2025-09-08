import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import {
  CreateUserDto,
  LoginDto,
  UserRole,
  UserStatus,
  JwtPayload,
} from '@ai-recruitment-clerk/user-management-domain';
import { RedisTokenBlacklistService } from '../security/redis-token-blacklist.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'test-secret';
        case 'JWT_EXPIRES_IN':
          return '1h';
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret';
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        case 'JWT_EXPIRES_IN_SECONDS':
          return '3600';
        default:
          return undefined;
      }
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateLastActivity: jest.fn().mockResolvedValue(undefined),
    updatePassword: jest.fn().mockResolvedValue(undefined),
    updateSecurityFlag: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisTokenBlacklistService = {
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    isUserBlacklisted: jest.fn().mockResolvedValue(false),
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    blacklistAllUserTokens: jest.fn().mockResolvedValue(5),
    blacklistUserTokens: jest.fn().mockResolvedValue(undefined),
    getMetrics: jest.fn().mockReturnValue({ active: 0, expired: 0 }),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: RedisTokenBlacklistService,
          useValue: mockRedisTokenBlacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset specific mocks
    mockUserService.findByEmail.mockReset();
    mockUserService.create.mockReset();
    mockUserService.findById.mockReset();
    mockUserService.updateLastActivity.mockReset();
    mockUserService.updatePassword.mockReset();
    mockUserService.updateSecurityFlag.mockReset();
    mockRedisTokenBlacklistService.isTokenBlacklisted.mockReset();
    mockRedisTokenBlacklistService.isUserBlacklisted.mockReset();
    mockRedisTokenBlacklistService.blacklistToken.mockReset();
    mockJwtService.decode.mockReset();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        organizationId: 'org-001',
      };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue({
        id: 'user-1',
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.RECRUITER,
        organizationId: createUserDto.organizationId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password',
      });

      const result = await service.register(createUserDto);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('expiresIn', 3600);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserService.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: createUserDto.role,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password',
      });

      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-1',
        email: loginDto.email,
        firstName: 'Test',
        lastName: 'User',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.RECRUITER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user', mockUser);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should validate user with correct password', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const mockUserWithPassword = {
        id: 'user-1',
        email,
        firstName: 'Test',
        lastName: 'User',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password:
          '$2b$12$KTvBL3XuNPpy4zJ9eSlUgOlyTu8IqB96KPkLEvJm1bOnp2pnm3.sq', // hashed 'admin123'
      };

      mockUserService.findByEmail.mockResolvedValue(mockUserWithPassword);

      // Test with the password that matches the hash
      const result = await service.validateUser(email, 'admin123');

      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null for wrong password', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      const mockUserWithPassword = {
        id: 'user-1',
        email,
        firstName: 'Test',
        lastName: 'User',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password:
          '$2b$12$KTvBL3XuNPpy4zJ9eSlUgOlyTu8IqB96KPkLEvJm1bOnp2pnm3.sq', // hashed 'admin123'
      };

      mockUserService.findByEmail.mockResolvedValue(mockUserWithPassword);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = 'header.payload.signature'; // Valid JWT format
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        get name() {
          return `${this.firstName} ${this.lastName}`;
        },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password',
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'mock-jwt-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateJwtPayload', () => {
    it('should validate JWT payload successfully', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        aud: 'ai-recruitment-clerk',
        iss: 'ai-recruitment-clerk-auth',
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password',
      };

      mockUserService.findById.mockResolvedValue(mockUser);
      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(false);

      const result = await service.validateJwtPayload(payload, 'mock-token');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
      expect(
        mockRedisTokenBlacklistService.isTokenBlacklisted,
      ).toHaveBeenCalledWith('mock-token');
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000),
      };

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(true);

      await expect(
        service.validateJwtPayload(payload, 'blacklisted-token'),
      ).rejects.toThrow(new UnauthorizedException('Token has been revoked'));
    });

    it('should throw UnauthorizedException for blacklisted user', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000),
      };

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(true);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        new UnauthorizedException('All user tokens have been revoked'),
      );
    });

    it('should throw UnauthorizedException for invalid payload', async () => {
      const invalidPayload = {
        sub: 'user-1',
        email: '', // Missing email
        role: UserRole.RECRUITER,
      } as JwtPayload;

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(false);

      await expect(service.validateJwtPayload(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload'),
      );
    });

    it('should throw UnauthorizedException for token too old', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000) - 25 * 60 * 60, // 25 hours ago (too old)
      };

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(false);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        new UnauthorizedException('Token too old'),
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-user',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000),
      };

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(false);
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000),
      };

      const inactiveUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.INACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(false);
      mockUserService.findById.mockResolvedValue(inactiveUser);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        new UnauthorizedException('User account is not active'),
      );
    });

    it('should throw UnauthorizedException for organization mismatch', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        iat: Math.floor(Date.now() / 1000),
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-002', // Different organization
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedisTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(
        false,
      );
      mockRedisTokenBlacklistService.isUserBlacklisted.mockResolvedValue(false);
      mockUserService.findById.mockResolvedValue(mockUser);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        new UnauthorizedException('Organization mismatch'),
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully with tokens', async () => {
      const userId = 'user-1';
      const accessToken = 'access.token.here';
      const refreshToken = 'refresh.token.here';

      const mockAccessPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
      const mockRefreshPayload = {
        exp: Math.floor(Date.now() / 1000) + 604800,
      };

      mockJwtService.decode
        .mockReturnValueOnce(mockAccessPayload)
        .mockReturnValueOnce(mockRefreshPayload);

      mockRedisTokenBlacklistService.blacklistToken.mockResolvedValue(
        undefined,
      );
      mockUserService.updateLastActivity.mockResolvedValue(undefined);

      await service.logout(userId, accessToken, refreshToken);

      expect(mockJwtService.decode).toHaveBeenCalledTimes(2);
      expect(
        mockRedisTokenBlacklistService.blacklistToken,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockRedisTokenBlacklistService.blacklistToken,
      ).toHaveBeenNthCalledWith(
        1,
        accessToken,
        userId,
        mockAccessPayload.exp,
        'logout',
      );
      expect(
        mockRedisTokenBlacklistService.blacklistToken,
      ).toHaveBeenNthCalledWith(
        2,
        refreshToken,
        userId,
        mockRefreshPayload.exp,
        'logout',
      );
      expect(mockUserService.updateLastActivity).toHaveBeenCalledWith(userId);
    });

    it('should logout user without tokens', async () => {
      const userId = 'user-1';

      mockUserService.updateLastActivity.mockResolvedValue(undefined);

      await service.logout(userId);

      expect(mockJwtService.decode).not.toHaveBeenCalled();
      expect(
        mockRedisTokenBlacklistService.blacklistToken,
      ).not.toHaveBeenCalled();
      expect(mockUserService.updateLastActivity).toHaveBeenCalledWith(userId);
    });

    it('should handle token decoding errors gracefully', async () => {
      const userId = 'user-1';
      const accessToken = 'invalid.access.token';

      mockJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token format');
      });
      mockUserService.updateLastActivity.mockResolvedValue(undefined);

      await service.logout(userId, accessToken);

      expect(mockJwtService.decode).toHaveBeenCalledWith(accessToken);
      expect(
        mockRedisTokenBlacklistService.blacklistToken,
      ).not.toHaveBeenCalled();
      expect(mockUserService.updateLastActivity).toHaveBeenCalledWith(userId);
    });

    it('should handle blacklisting errors gracefully and continue logout', async () => {
      const userId = 'user-1';
      const accessToken = 'access.token.here';

      const mockPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
      mockJwtService.decode.mockReturnValue(mockPayload);
      mockRedisTokenBlacklistService.blacklistToken.mockRejectedValue(
        new Error('Redis error'),
      );
      mockUserService.updateLastActivity.mockResolvedValue(undefined);

      // Should not throw, but continue with logout process
      await service.logout(userId, accessToken);

      expect(
        mockRedisTokenBlacklistService.blacklistToken,
      ).toHaveBeenCalledWith(accessToken, userId, mockPayload.exp, 'logout');
      expect(mockUserService.updateLastActivity).toHaveBeenCalledWith(userId);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-1';
      const currentPassword = 'oldPassword123';
      const newPassword = 'NewPassword123!';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        password: 'hashed-old-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.updatePassword.mockResolvedValue(undefined);

      // Mock bcrypt.compare to validate current password and check new password difference
      const bcrypt = require('bcryptjs');
      jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValueOnce(true) // current password is valid
        .mockResolvedValueOnce(false); // new password is different from current

      // Mock bcrypt.hash for new password
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-new-password');

      await service.changePassword(userId, currentPassword, newPassword);

      expect(mockUserService.findById).toHaveBeenCalledWith(userId);
      expect(mockUserService.updatePassword).toHaveBeenCalledWith(
        userId,
        'hashed-new-password',
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const userId = 'non-existent-user';
      const currentPassword = 'oldPassword123';
      const newPassword = 'NewPassword123!';

      mockUserService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(new NotFoundException('User not found'));

      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      const userId = 'user-1';
      const currentPassword = 'wrongPassword';
      const newPassword = 'NewPassword123!';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed-old-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.findById.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false for incorrect password
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        service.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(
        new UnauthorizedException('Current password is incorrect'),
      );

      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new password same as current', async () => {
      const userId = 'user-1';
      const currentPassword = 'samePassword123!';
      const newPassword = 'samePassword123!';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.findById.mockResolvedValue(mockUser);
      // Mock bcrypt.compare to return true for both current and new password checks
      const bcrypt = require('bcryptjs');
      jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(true); // same as new password

      await expect(
        service.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(
        new BadRequestException(
          'New password must be different from current password',
        ),
      );

      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for weak password', async () => {
      const userId = 'user-1';
      const currentPassword = 'oldPassword123';
      const newPassword = 'weak'; // Fails validation

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.findById.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(userId, currentPassword, newPassword),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('emergencyRevokeAllUserTokens', () => {
    it('should revoke all user tokens in emergency', async () => {
      const userId = 'user-1';
      const reason = 'security_breach';

      mockRedisTokenBlacklistService.blacklistAllUserTokens.mockResolvedValue(
        5,
      );
      mockUserService.updateSecurityFlag.mockResolvedValue(undefined);

      await service.emergencyRevokeAllUserTokens(userId, reason);

      expect(
        mockRedisTokenBlacklistService.blacklistAllUserTokens,
      ).toHaveBeenCalledWith(userId, reason);
      expect(mockUserService.updateSecurityFlag).toHaveBeenCalledWith(
        userId,
        'tokens_revoked',
        true,
      );
    });

    it('should handle emergency revocation errors', async () => {
      const userId = 'user-1';
      const error = new Error('Redis connection failed');

      mockRedisTokenBlacklistService.blacklistAllUserTokens.mockRejectedValue(
        error,
      );

      await expect(
        service.emergencyRevokeAllUserTokens(userId),
      ).rejects.toThrow('Redis connection failed');

      expect(mockUserService.updateSecurityFlag).not.toHaveBeenCalled();
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics', async () => {
      mockRedisTokenBlacklistService.getMetrics.mockReturnValue({
        active: 10,
        expired: 5,
      });

      const metrics = await service.getSecurityMetrics();

      expect(metrics).toEqual({
        blacklistedTokensCount: 0,
        failedLoginAttemptsCount: 0,
        lockedAccountsCount: 0,
        tokenBlacklistMetrics: { active: 10, expired: 5 },
      });
    });
  });

  describe('authHealthCheck', () => {
    it('should return health status', async () => {
      mockRedisTokenBlacklistService.healthCheck.mockResolvedValue({
        status: 'healthy',
        connection: 'ok',
      });

      const health = await service.authHealthCheck();

      expect(health).toEqual({
        status: 'healthy',
        authService: 'operational',
        tokenBlacklist: { status: 'healthy', connection: 'ok' },
        memoryUsage: {
          blacklistedTokens: 0,
          failedAttempts: 0,
        },
      });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
