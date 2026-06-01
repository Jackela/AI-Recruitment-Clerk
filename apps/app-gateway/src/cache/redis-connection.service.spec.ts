import { RedisConnectionService } from './redis-connection.service';
import { ConfigService } from '@nestjs/config';

describe('RedisConnectionService', () => {
  let service: RedisConnectionService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    service = new RedisConnectionService(configService);
  });

  describe('getConnectionStatus', () => {
    it('should return initial disconnected state', () => {
      const status = service.getConnectionStatus();

      expect(status.state).toBe('disconnected');
      expect(status.connected).toBe(false);
      expect(status.attempts).toBe(0);
    });
  });

  describe('isRedisAvailable', () => {
    it('should return false when not connected', async () => {
      const available = await service.isRedisAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getRedisClient', () => {
    it('should return null when not connected', () => {
      const client = service.getRedisClient();

      expect(client).toBeNull();
    });
  });
});
