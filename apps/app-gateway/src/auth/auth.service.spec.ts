import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisTokenBlacklistService } from '../security/redis-token-blacklist.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const createDependencies = () => {
  const userService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastActivity: jest.fn(),
  } as unknown as jest.Mocked<UserService>;

  const jwtService = {
    sign: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const values: Record<string, string> = {
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_SECRET: 'secret',
        BCRYPT_ROUNDS: '6',
      };
      return values[key];
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const blacklistService = {
    blacklistToken: jest.fn(),
    blacklistAllUserTokens: jest.fn(),
  } as unknown as jest.Mocked<RedisTokenBlacklistService>;

  return { userService, jwtService, configService, blacklistService };
};

describe('AuthService (with explicit mocks)', () => {
  let service: AuthService;
  let deps: ReturnType<typeof createDependencies>;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
    (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>).mockImplementation(
      async () => 'hashed-password',
    );
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockImplementation(
      async () => true,
    );

    deps = createDependencies();
    deps.jwtService.sign.mockImplementation((payload) =>
      `token-${payload['sub']}-${payload['tokenType'] || 'access'}`,
    );

    service = new AuthService(
      deps.userService,
      deps.jwtService,
      deps.configService,
      deps.blacklistService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('creates user when email is unused', async () => {
      deps.userService.findByEmail.mockResolvedValue(null);
      deps.userService.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'user',
        organizationId: 'org-1',
      } as any);

      const response = await service.register({
        email: 'test@example.com',
        password: 'P@ssw0rd!',
        name: 'Test User',
      } as any);

      expect(deps.userService.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-password' }),
      );
      expect(response.accessToken).toContain('token-user-1');
      expect(response.refreshToken).toContain('refresh');
    });

    it('throws conflict when email already exists', async () => {
      deps.userService.findByEmail.mockResolvedValue({ id: 'u1' } as any);

      await expect(
        service.register({
          email: 'test@example.com',
          password: '123456',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const baseUser = {
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed-password',
      role: 'user',
      organizationId: 'org-1',
    } as any;

    it('returns tokens for valid credentials', async () => {
      deps.userService.findByEmail.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockImplementation(
        async () => true,
      );

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct',
      } as any);

      expect(deps.userService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result.accessToken).toContain('token-user-1');
      expect(result.refreshToken).toContain('refresh');
    });

    it('throws unauthorized for invalid credentials', async () => {
      deps.userService.findByEmail.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockImplementation(
        async () => false,
      );

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
