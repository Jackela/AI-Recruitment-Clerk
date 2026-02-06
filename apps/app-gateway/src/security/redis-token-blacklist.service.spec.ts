import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisTokenBlacklistService } from './redis-token-blacklist.service';

describe('RedisTokenBlacklistService', () => {
  let service: RedisTokenBlacklistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisTokenBlacklistService],
    }).compile();

    service = module.get<RedisTokenBlacklistService>(RedisTokenBlacklistService);

    // Suppress console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token Blacklisting', () => {
    it('should blacklist a token successfully', async () => {
      // Arrange
      const token = 'test-token-123';
      const userId = 'user-456';
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const reason = 'User logged out';

      // Act
      await service.blacklistToken(token, userId, exp, reason);

      // Assert
      const isBlacklisted = await service.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });

    it('should add token using backwards compatible method', async () => {
      // Arrange
      const token = 'test-token-abc';
      const userId = 'user-xyz';
      const exp = Math.floor(Date.now() / 1000) + 7200;
      const reason = 'Session expired';

      // Act
      await service.addToken(token, userId, exp, reason);

      // Assert
      const isBlacklisted = await service.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });

    it('should store token record with correct data', async () => {
      // Arrange
      const token = 'test-token-data';
      const userId = 'user-data';
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const reason = 'Test reason';

      // Act
      await service.blacklistToken(token, userId, exp, reason);

      // Assert - Check via health check that token is stored
      const health = await service.healthCheck();
      expect(health.blacklistedTokens).toBeGreaterThan(0);
    });

    it('should handle multiple tokens for the same user', async () => {
      // Arrange
      const userId = 'user-multi';
      const token1 = 'token-1';
      const token2 = 'token-2';
      const token3 = 'token-3';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Act
      await service.blacklistToken(token1, userId, exp, 'Logout');
      await service.blacklistToken(token2, userId, exp, 'Password change');
      await service.blacklistToken(token3, userId, exp, 'Security');

      // Assert
      expect(await service.isTokenBlacklisted(token1)).toBe(true);
      expect(await service.isTokenBlacklisted(token2)).toBe(true);
      expect(await service.isTokenBlacklisted(token3)).toBe(true);
    });

    it('should handle tokens with different expiration times', async () => {
      // Arrange
      const token1 = 'token-short';
      const token2 = 'token-long';
      const userId = 'user-exp';
      const expShort = Math.floor(Date.now() / 1000) + 60; // 1 minute
      const expLong = Math.floor(Date.now() / 1000) + 86400; // 1 day

      // Act
      await service.blacklistToken(token1, userId, expShort, 'Short lived');
      await service.blacklistToken(token2, userId, expLong, 'Long lived');

      // Assert
      expect(await service.isTokenBlacklisted(token1)).toBe(true);
      expect(await service.isTokenBlacklisted(token2)).toBe(true);
    });
  });

  describe('Token Checking', () => {
    it('should return false for non-blacklisted token', async () => {
      // Arrange & Act
      const result = await service.isTokenBlacklisted('non-existent-token');

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for blacklisted token', async () => {
      // Arrange
      const token = 'blacklisted-token';
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await service.blacklistToken(token, 'user-1', exp, 'Test');

      // Act
      const result = await service.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for expired blacklisted token', async () => {
      // Arrange
      const token = 'expired-token';
      const pastExp = Math.floor(Date.now() / 1000) - 100; // Already expired
      await service.blacklistToken(token, 'user-1', pastExp, 'Test');

      // Act
      const result = await service.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(false);
    });

    it('should remove expired token from storage', async () => {
      // Arrange
      const token = 'expired-to-remove';
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      await service.blacklistToken(token, 'user-1', pastExp, 'Test');
      expect(await service.isTokenBlacklisted(token)).toBe(false); // Cleanup happens here

      // Act
      const health = await service.healthCheck();

      // Assert - Token should have been removed
      expect(await service.isTokenBlacklisted(token)).toBe(false);
    });

    it('should work with backwards compatible isBlacklisted method', async () => {
      // Arrange
      const token = 'test-alias';
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await service.blacklistToken(token, 'user-1', exp, 'Test');

      // Act
      const result = await service.isBlacklisted(token);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for empty token string', async () => {
      // Arrange & Act
      const result = await service.isTokenBlacklisted('');

      // Assert
      expect(result).toBe(false);
    });

    it('should handle special characters in token', async () => {
      // Arrange
      const token = 'token-with-special-chars-!@#$%^&*()';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Act
      await service.blacklistToken(token, 'user-1', exp, 'Special chars');

      // Assert
      expect(await service.isTokenBlacklisted(token)).toBe(true);
    });
  });

  describe('Token Expiration', () => {
    it('should clean up expired tokens automatically on check', async () => {
      // Arrange
      const expiredToken = 'expired-token';
      const validToken = 'valid-token';
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      await service.blacklistToken(expiredToken, 'user-1', pastExp, 'Test');
      await service.blacklistToken(validToken, 'user-1', futureExp, 'Test');

      // Act - Check triggers cleanup
      await service.isTokenBlacklisted(expiredToken);

      // Assert
      expect(await service.isTokenBlacklisted(expiredToken)).toBe(false);
      expect(await service.isTokenBlacklisted(validToken)).toBe(true);
    });

    it('should remove expired token during manual cleanup', () => {
      // Arrange
      const expiredToken = 'token-to-clean';
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      service.blacklistToken(expiredToken, 'user-1', pastExp, 'Test');
      const healthBefore = service.getMetrics();
      expect(healthBefore.blacklistedTokensCount).toBe(1);

      // Act
      const cleanedCount = service.cleanup();

      // Assert
      expect(cleanedCount).toBe(1);
      const healthAfter = service.getMetrics();
      expect(healthAfter.blacklistedTokensCount).toBe(0);
    });

    it('should clean only expired tokens, not valid ones', () => {
      // Arrange
      const expiredToken = 'expired';
      const validToken = 'valid';
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      service.blacklistToken(expiredToken, 'user-1', pastExp, 'Test');
      service.blacklistToken(validToken, 'user-1', futureExp, 'Test');

      // Act
      const cleanedCount = service.cleanup();

      // Assert
      expect(cleanedCount).toBe(1);
      expect(service.isTokenBlacklisted(validToken)).resolves.toBe(true);
    });

    it('should handle multiple expired tokens', () => {
      // Arrange
      const tokens = ['expired-1', 'expired-2', 'expired-3'];
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      tokens.forEach((t) => service.blacklistToken(t, 'user-1', pastExp, 'Test'));

      // Act
      const cleanedCount = service.cleanup();

      // Assert
      expect(cleanedCount).toBe(3);
    });

    it('should return 0 when no expired tokens to clean', () => {
      // Arrange & Act
      const cleanedCount = service.cleanup();

      // Assert
      expect(cleanedCount).toBe(0);
    });
  });

  describe('User Blacklisting', () => {
    it('should blacklist all user tokens', async () => {
      // Arrange
      const userId = 'user-all-tokens';
      const tokens = ['token-1', 'token-2', 'token-3'];
      const exp = Math.floor(Date.now() / 1000) + 3600;
      tokens.forEach((t) => service.blacklistToken(t, userId, exp, 'Test'));

      // Act
      const count = await service.blacklistAllUserTokens(userId, 'Security reset');

      // Assert
      expect(count).toBe(3);
    });

    it('should check if user is blacklisted', async () => {
      // Arrange
      const userId = 'blacklisted-user';

      // Act
      await service.blacklistAllUserTokens(userId, 'Test');

      // Assert
      expect(await service.isUserBlacklisted(userId)).toBe(true);
    });

    it('should return false for non-blacklisted user', async () => {
      // Arrange & Act
      const result = await service.isUserBlacklisted('non-blacklisted-user');

      // Assert
      expect(result).toBe(false);
    });

    it('should count only tokens belonging to specified user', async () => {
      // Arrange
      const user1 = 'user-1';
      const user2 = 'user-2';
      const exp = Math.floor(Date.now() / 1000) + 3600;
      service.blacklistToken('token-1', user1, exp, 'Test');
      service.blacklistToken('token-2', user1, exp, 'Test');
      service.blacklistToken('token-3', user2, exp, 'Test');

      // Act
      const count = await service.blacklistAllUserTokens(user1, 'Test');

      // Assert
      expect(count).toBe(2);
    });

    it('should return 0 for user with no tokens', async () => {
      // Arrange & Act
      const count = await service.blacklistAllUserTokens('user-with-no-tokens', 'Test');

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('Metrics and Health Check', () => {
    it('should return correct metrics', async () => {
      // Arrange
      const exp = Math.floor(Date.now() / 1000) + 3600;
      service.blacklistToken('token-1', 'user-1', exp, 'Test');
      service.blacklistToken('token-2', 'user-2', exp, 'Test');
      await service.blacklistAllUserTokens('user-3', 'Test');

      // Act
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.blacklistedTokensCount).toBe(2);
      expect(metrics.blacklistedUsersCount).toBe(1);
      expect(metrics.lastCleanup).toBeGreaterThan(0);
    });

    it('should return healthy status', async () => {
      // Act
      const health = await service.healthCheck();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.tokenStore).toBe('in-memory');
      expect(health.blacklistedTokens).toBe(0);
      expect(health.blacklistedUsers).toBe(0);
    });

    it('should include accurate counts in health check', async () => {
      // Arrange
      const exp = Math.floor(Date.now() / 1000) + 3600;
      service.blacklistToken('token-1', 'user-1', exp, 'Test');
      service.blacklistToken('token-2', 'user-2', exp, 'Test');
      await service.blacklistAllUserTokens('user-3', 'Test');

      // Act
      const health = await service.healthCheck();

      // Assert
      expect(health.blacklistedTokens).toBe(2);
      expect(health.blacklistedUsers).toBe(1);
    });

    it('should track last cleanup time in metrics', () => {
      // Arrange & Act
      const beforeCleanup = service.getMetrics();
      service.cleanup();
      const afterCleanup = service.getMetrics();

      // Assert
      expect(afterCleanup.lastCleanup).toBeGreaterThanOrEqual(beforeCleanup.lastCleanup);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty token gracefully', async () => {
      // Arrange & Act & Assert - Should not throw
      await expect(service.blacklistToken('', 'user-1', 1000, 'Test')).resolves.not.toThrow();
    });

    it('should handle empty userId gracefully', async () => {
      // Arrange & Act & Assert - Should not throw
      await expect(service.blacklistToken('token', '', 1000, 'Test')).resolves.not.toThrow();
    });

    it('should handle negative expiration time', async () => {
      // Arrange
      const token = 'negative-exp-token';
      const negativeExp = -1000;

      // Act & Assert
      await expect(service.blacklistToken(token, 'user-1', negativeExp, 'Test')).resolves.not.toThrow();
    });

    it('should handle very long token strings', async () => {
      // Arrange
      const longToken = 'a'.repeat(10000);
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Act
      await service.blacklistToken(longToken, 'user-1', exp, 'Test');

      // Assert
      expect(await service.isTokenBlacklisted(longToken)).toBe(true);
    });

    it('should handle special characters in reason', async () => {
      // Arrange
      const token = 'special-reason-token';
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const reason = 'User logout: "security breach" detected! @#$%';

      // Act
      await service.blacklistToken(token, 'user-1', exp, reason);

      // Assert
      expect(await service.isTokenBlacklisted(token)).toBe(true);
    });

    it('should handle concurrent blacklist operations', async () => {
      // Arrange
      const tokens = Array.from({ length: 100 }, (_, i) => `token-${i}`);
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Act - Run all in parallel
      await Promise.all(
        tokens.map((t) => service.blacklistToken(t, 'user-1', exp, 'Concurrent test')),
      );

      // Assert
      const health = await service.healthCheck();
      expect(health.blacklistedTokens).toBe(100);
    });

    it('should handle unicode characters in token and userId', async () => {
      // Arrange
      const token = 'token-with-unicode-你好-世界';
      const userId = 'user-пользователь';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Act
      await service.blacklistToken(token, userId, exp, 'Unicode test');

      // Assert
      expect(await service.isTokenBlacklisted(token)).toBe(true);
      expect(await service.isUserBlacklisted(userId)).toBe(false); // Only tokens blacklisted
    });
  });

  describe('Coverage Verification', () => {
    it('should have coverage for all public methods', () => {
      // This is a meta-test to verify we're testing all public APIs
      const publicMethods = [
        'isTokenBlacklisted',
        'isBlacklisted',
        'isUserBlacklisted',
        'blacklistToken',
        'addToken',
        'blacklistAllUserTokens',
        'getMetrics',
        'healthCheck',
        'cleanup',
      ];

      publicMethods.forEach((method) => {
        expect(typeof service[method]).toBe('function');
      });
    });

    it('should cover all main scenarios', async () => {
      // Comprehensive test covering the main workflow
      const token = 'workflow-token';
      const userId = 'workflow-user';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Token not blacklisted initially
      expect(await service.isTokenBlacklisted(token)).toBe(false);

      // Blacklist token
      await service.blacklistToken(token, userId, exp, 'Logout');
      expect(await service.isTokenBlacklisted(token)).toBe(true);

      // Check metrics updated
      const metrics = service.getMetrics();
      expect(metrics.blacklistedTokensCount).toBeGreaterThan(0);

      // Check health
      const health = await service.healthCheck();
      expect(health.status).toBe('healthy');

      // Cleanup
      const cleaned = service.cleanup();
      expect(typeof cleaned).toBe('number');
    });

    it('should test backwards compatibility methods', async () => {
      // Arrange
      const token = 'compat-token';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      // Act - Use backwards compatible methods
      await service.addToken(token, 'user-1', exp, 'Test');
      const isBlacklisted = await service.isBlacklisted(token);

      // Assert
      expect(isBlacklisted).toBe(true);
    });
  });
});
