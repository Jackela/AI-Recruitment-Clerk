import { GuestUsageEntity } from './guest-usage.entity';

describe('GuestUsageEntity', () => {
  describe('create', () => {
    it('should create a guest usage entity', () => {
      const entity = new GuestUsageEntity({
        deviceId: 'device-123',
        endpoint: '/api/test',
        requestCount: 1,
      });

      expect(entity.deviceId).toBe('device-123');
      expect(entity.endpoint).toBe('/api/test');
      expect(entity.requestCount).toBe(1);
    });
  });

  describe('incrementUsage', () => {
    it('should increment request count', () => {
      const entity = new GuestUsageEntity({
        deviceId: 'device-123',
        endpoint: '/api/test',
        requestCount: 1,
      });

      entity.incrementUsage();

      expect(entity.requestCount).toBe(2);
    });
  });
});
