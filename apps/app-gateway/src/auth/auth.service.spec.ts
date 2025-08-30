import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { CreateUserDto, LoginDto, UserRole, UserStatus } from '@ai-recruitment-clerk/user-management-domain';

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
    })
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn()
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateLastActivity: jest.fn().mockResolvedValue(undefined),
    updatePassword: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService }
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
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: 'org-001'
      };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue({
        id: 'user-1',
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: createUserDto.role,
        organizationId: createUserDto.organizationId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password'
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
        role: UserRole.RECRUITER
      };

      mockUserService.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: createUserDto.role,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password'
      });

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-1',
        email: loginDto.email,
        firstName: 'Test',
        lastName: 'User',
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.RECRUITER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
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
        password: 'wrongpassword'
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
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
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: '$2b$12$KTvBL3XuNPpy4zJ9eSlUgOlyTu8IqB96KPkLEvJm1bOnp2pnm3.sq' // hashed 'admin123'
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
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: '$2b$12$KTvBL3XuNPpy4zJ9eSlUgOlyTu8IqB96KPkLEvJm1bOnp2pnm3.sq' // hashed 'admin123'
      };

      mockUserService.findByEmail.mockResolvedValue(mockUserWithPassword);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = 'header.payload.signature'; // Valid JWT format
      const mockPayload = { sub: 'user-1', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 3600 };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password'
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

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});