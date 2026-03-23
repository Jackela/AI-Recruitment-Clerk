import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    authService = {
      validateJwtPayload: jest.fn(),
    } as any;

    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    strategy = new JwtStrategy(authService, configService as any);
  });

  describe('validate', () => {
    it('should return user when payload is valid', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const user = { id: 'user-123', email: 'test@example.com' };
      authService.validateJwtPayload.mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(result).toEqual(user);
      expect(authService.validateJwtPayload).toHaveBeenCalledWith(payload);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      authService.validateJwtPayload.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when service throws', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      authService.validateJwtPayload.mockRejectedValue(
        new Error('Token error'),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
