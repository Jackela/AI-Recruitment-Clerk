import { HealthCheckService } from './health-check.service';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(() => {
    service = new HealthCheckService();
  });

  describe('registerHealthCheck', () => {
    it('should register a custom health check', () => {
      service.registerHealthCheck({
        name: 'custom-service',
        url: 'http://custom:3000/health',
      });

      expect(service.getServiceHealth('custom-service')).resolves.toBeDefined();
    });

    it('should register health check with custom healthCheck function', async () => {
      service.registerHealthCheck({
        name: 'mock-service',
        healthCheck: async () => ({ healthy: true, metadata: { foo: 'bar' } }),
      });

      const health = await service.checkServiceHealth('mock-service');
      expect(health.name).toBe('mock-service');
    });

    it('should throw error for non-existent service', () => {
      expect(service.checkServiceHealth('non-existent')).rejects.toThrow();
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health structure', async () => {
      const health = await service.getSystemHealth();

      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('version');
    });

    it('should calculate overall health based on services', async () => {
      const health = await service.getSystemHealth();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
    });
  });

  describe('getServiceHealth', () => {
    it('should return null for unregistered service', async () => {
      const result = await service.getServiceHealth('non-existent');

      expect(result).toBeNull();
    });
  });
});
