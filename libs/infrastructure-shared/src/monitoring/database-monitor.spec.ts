import { DatabasePerformanceMonitor } from './database-monitor';

describe('DatabasePerformanceMonitor', () => {
  let monitor: DatabasePerformanceMonitor;

  beforeEach(() => {
    monitor = new DatabasePerformanceMonitor();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('executeWithMonitoring', () => {
    it('should execute function and return result', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const result = await monitor.executeWithMonitoring(fn, 'testOp');

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should log warning when execution exceeds expected time', async () => {
      const fn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'result';
      });

      await monitor.executeWithMonitoring(fn, 'slowOp', 50);

      expect(console.warn).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('slowOp took'),
      );
    });

    it('should not log warning when execution is within expected time', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      await monitor.executeWithMonitoring(fn, 'fastOp', 1000);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log error and rethrow on failure', async () => {
      const error = new Error('DB error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        monitor.executeWithMonitoring(fn, 'failingOp'),
      ).rejects.toThrow('DB error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should include duration in error log', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));

      try {
        await monitor.executeWithMonitoring(fn, 'failingOp');
      } catch {
        // expected
      }

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('failingOp failed after'),
        expect.any(Error),
      );
    });

    it('should work without operation name', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const result = await monitor.executeWithMonitoring(fn);

      expect(result).toBe('result');
    });

    it('should work without expected time', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const result = await monitor.executeWithMonitoring(fn, 'testOp');

      expect(result).toBe('result');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should measure execution time accurately', async () => {
      const delay = 50;
      const fn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return 'result';
      });

      const startTime = Date.now();
      await monitor.executeWithMonitoring(fn, 'timedOp', 10);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
    });

    it('should handle sync functions', async () => {
      const fn = jest.fn().mockReturnValue('sync result');
      const result = await monitor.executeWithMonitoring(fn, 'syncOp');

      expect(result).toBe('sync result');
    });
  });

  describe('getRealTimeStats', () => {
    it('should return stats object', () => {
      const stats = monitor.getRealTimeStats();

      expect(stats).toHaveProperty('queriesPerSecond');
      expect(stats).toHaveProperty('averageQueryTime');
      expect(stats).toHaveProperty('connectionCount');
      expect(stats).toHaveProperty('memoryUsage');
    });

    it('should return numeric values', () => {
      const stats = monitor.getRealTimeStats();

      expect(typeof stats.queriesPerSecond).toBe('number');
      expect(typeof stats.averageQueryTime).toBe('number');
      expect(typeof stats.connectionCount).toBe('number');
      expect(typeof stats.memoryUsage).toBe('string');
    });

    it('should return mock values', () => {
      const stats = monitor.getRealTimeStats();

      expect(stats.queriesPerSecond).toBe(50);
      expect(stats.averageQueryTime).toBe(120);
      expect(stats.connectionCount).toBe(5);
      expect(stats.memoryUsage).toBe('64MB');
    });
  });

  describe('getPerformanceReport', () => {
    it('should return report object', () => {
      const report = monitor.getPerformanceReport();

      expect(report).toHaveProperty('totalQueries');
      expect(report).toHaveProperty('averageResponseTime');
      expect(report).toHaveProperty('slowQueries');
      expect(report).toHaveProperty('errorRate');
      expect(report).toHaveProperty('peakQueryTime');
      expect(report).toHaveProperty('uptime');
    });

    it('should return correct types', () => {
      const report = monitor.getPerformanceReport();

      expect(typeof report.totalQueries).toBe('number');
      expect(typeof report.averageResponseTime).toBe('number');
      expect(typeof report.slowQueries).toBe('number');
      expect(typeof report.errorRate).toBe('number');
      expect(typeof report.peakQueryTime).toBe('number');
      expect(typeof report.uptime).toBe('string');
    });

    it('should return mock report values', () => {
      const report = monitor.getPerformanceReport();

      expect(report.totalQueries).toBe(1234);
      expect(report.averageResponseTime).toBe(145);
      expect(report.slowQueries).toBe(23);
      expect(report.errorRate).toBe(0.02);
      expect(report.peakQueryTime).toBe(2500);
      expect(report.uptime).toBe('24h 15m');
    });

    it('should return consistent values across calls', () => {
      const report1 = monitor.getPerformanceReport();
      const report2 = monitor.getPerformanceReport();

      expect(report1).toEqual(report2);
    });
  });

  describe('integration', () => {
    it('should use same monitor instance for multiple operations', async () => {
      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');

      await monitor.executeWithMonitoring(fn1, 'op1');
      await monitor.executeWithMonitoring(fn2, 'op2');

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should get stats after operations', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      await monitor.executeWithMonitoring(fn, 'testOp');

      const stats = monitor.getRealTimeStats();
      expect(stats).toBeDefined();
    });
  });
});
