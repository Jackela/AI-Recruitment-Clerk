import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import type { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    authService = {
      validateUser: jest.fn(),
    } as any;

    strategy = new LocalStrategy(authService);
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      authService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(result).toEqual(user);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
