import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return health status with all required fields', () => {
      const result = controller.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'jd-extractor-svc');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('checks');
    });

    it('should return a valid ISO timestamp', () => {
      const result = controller.getHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return positive uptime value', () => {
      const result = controller.getHealth();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should include health checks for critical services', () => {
      const result = controller.getHealth();

      expect(result.checks).toBeDefined();
      expect(result.checks).toHaveProperty('nats');
      expect(result.checks).toHaveProperty('llm');
    });

    it('should return healthy status for all checks by default', () => {
      const result = controller.getHealth();

      expect(result.checks.nats).toBe('healthy');
      expect(result.checks.llm).toBe('healthy');
    });

    it('should return correct service name', () => {
      const result = controller.getHealth();

      expect(result.service).toBe('jd-extractor-svc');
    });

    it('should return correct version', () => {
      const result = controller.getHealth();

      expect(result.version).toBe('1.0.0');
    });

    it('should track increasing uptime across multiple calls', async () => {
      const firstResult = controller.getHealth();

      // Wait a small amount of time
      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondResult = controller.getHealth();

      expect(secondResult.uptime).toBeGreaterThanOrEqual(firstResult.uptime);
    });

    it('should return different timestamps for different calls', async () => {
      const firstResult = controller.getHealth();

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondResult = controller.getHealth();

      expect(secondResult.timestamp).not.toBe(firstResult.timestamp);
    });

    it('should have consistent response structure', () => {
      const result = controller.getHealth();

      // Verify structure is consistent and serializable
      expect(() => JSON.stringify(result)).not.toThrow();

      const parsed = JSON.parse(JSON.stringify(result));
      expect(parsed).toEqual(result);
    });

    it('should not include database check when not configured', () => {
      const result = controller.getHealth();

      // Database check should either be undefined or not present
      expect(result.checks.database).toBeUndefined();
    });

    it('should return response matching HealthResponse interface', () => {
      const result = controller.getHealth();

      // Type guard check for HealthResponse interface
      expect(typeof result.status).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.service).toBe('string');
      expect(typeof result.version).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.checks).toBe('object');
    });
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of HealthController', () => {
      expect(controller).toBeInstanceOf(HealthController);
    });

    it('should have getHealth method', () => {
      expect(controller.getHealth).toBeDefined();
      expect(typeof controller.getHealth).toBe('function');
    });
  });

  describe('Response Performance', () => {
    it('should respond within acceptable time limits', () => {
      const startTime = Date.now();

      controller.getHealth();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Health check should be very fast (< 10ms)
      expect(responseTime).toBeLessThan(10);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => Promise.resolve(controller.getHealth()));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.status).toBe('ok');
      });
    });
  });
});
