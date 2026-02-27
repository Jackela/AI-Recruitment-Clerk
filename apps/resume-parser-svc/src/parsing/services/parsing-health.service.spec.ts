import { Logger } from '@nestjs/common';
import { ParsingHealthService } from './parsing-health.service';
import type { ResumeParserNatsService } from '../../services/resume-parser-nats.service';
import { ParsingRetryService } from './parsing-retry.service';
import type { ParsingEventService } from './parsing-event.service';

describe('ParsingHealthService', () => {
  let service: ParsingHealthService;
  let mockNatsService: jest.Mocked<ResumeParserNatsService>;
  let mockRetryService: ParsingRetryService;

  beforeEach(() => {
    mockNatsService = {
      getHealthStatus: jest.fn().mockResolvedValue({
        healthy: true,
        connected: true,
        jetstreamAvailable: true,
        subscriptionCount: 1,
        lastOperationTime: new Date(),
      }),
    } as unknown as jest.Mocked<ResumeParserNatsService>;

    const mockEventService = {
      publishFailureEvent: jest.fn(),
      publishProcessingError: jest.fn(),
    } as unknown as jest.Mocked<ParsingEventService>;

    mockRetryService = new ParsingRetryService(mockEventService);

    service = new ParsingHealthService(mockNatsService, mockRetryService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy when NATS is connected', async () => {
      mockNatsService.getHealthStatus.mockResolvedValue({
        healthy: true,
        connected: true,
        jetstreamAvailable: true,
        subscriptionCount: 1,
        lastOperationTime: new Date(),
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details.natsConnected).toBe(true);
    });

    it('should return degraded when NATS is not connected', async () => {
      mockNatsService.getHealthStatus.mockResolvedValue({
        healthy: false,
        connected: false,
        jetstreamAvailable: false,
        subscriptionCount: 0,
        lastOperationTime: new Date(),
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.details.natsConnected).toBe(false);
    });

    it('should return unhealthy on exception', async () => {
      mockNatsService.getHealthStatus.mockRejectedValue(new Error('Connection failed'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toBe('Connection failed');
    });

    it('should include retry queue size', async () => {
      mockRetryService.incrementRetryCount('resume-1');
      mockRetryService.incrementRetryCount('resume-2');

      const result = await service.healthCheck();

      expect(result.details.retryQueueSize).toBe(2);
    });

    it('should include active processing count', async () => {
      mockRetryService.registerProcessingFile('key-1', 'hash-1');
      mockRetryService.registerProcessingFile('key-2', 'hash-2');

      const result = await service.healthCheck();

      expect(result.details.activeProcessingCount).toBe(2);
    });

    it('should include security status', async () => {
      const result = await service.healthCheck();

      expect(result.details.securityStatus).toEqual({
        encryptionEnabled: true,
        maxFileSize: 10 * 1024 * 1024,
        allowedTypes: expect.arrayContaining(['application/pdf']),
      });
    });

    it('should include memory usage', async () => {
      const result = await service.healthCheck();

      expect(result.details.memoryUsage).toBeDefined();
      expect(result.details.memoryUsage).toHaveProperty('rss');
      expect(result.details.memoryUsage).toHaveProperty('heapTotal');
      expect(result.details.memoryUsage).toHaveProperty('heapUsed');
    });

    it('should include uptime', async () => {
      const result = await service.healthCheck();

      expect(result.details.uptime).toBeDefined();
      expect(result.details.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include active retries list', async () => {
      mockRetryService.incrementRetryCount('resume-1');
      mockRetryService.incrementRetryCount('resume-1');

      const result = await service.healthCheck();

      expect(result.details.activeRetries).toContainEqual(['resume-1', 2]);
    });

    it('should include processing file entries', async () => {
      mockRetryService.registerProcessingFile('key-1', 'hash-1');

      const result = await service.healthCheck();

      expect(result.details.processingFiles).toHaveLength(1);
      expect(result.details.processingFiles[0].key).toBe('key-1');
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return active processing files count', () => {
      mockRetryService.registerProcessingFile('key-1', 'hash-1');
      mockRetryService.registerProcessingFile('key-2', 'hash-2');

      const metrics = service.getSecurityMetrics();

      expect(metrics.activeProcessingFiles).toBe(2);
    });

    it('should return 0 for total processed today (placeholder)', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics.totalProcessedToday).toBe(0);
    });

    it('should return 0 for encryption failures (placeholder)', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics.encryptionFailures).toBe(0);
    });

    it('should return 0 for validation failures (placeholder)', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics.validationFailures).toBe(0);
    });
  });

  describe('getProcessingStats', () => {
    it('should return active jobs count', () => {
      mockRetryService.registerProcessingFile('key-1', 'hash-1');

      const stats = service.getProcessingStats();

      expect(stats.activeJobs).toBe(1);
    });

    it('should return total capacity', () => {
      const stats = service.getProcessingStats();

      expect(stats.totalCapacity).toBe(10);
    });

    it('should return isHealthy true when under capacity', () => {
      // Register 5 files (under capacity of 10)
      for (let i = 0; i < 5; i++) {
        mockRetryService.registerProcessingFile(`key-${i}`, `hash-${i}`);
      }

      const stats = service.getProcessingStats();

      expect(stats.isHealthy).toBe(true);
    });

    it('should return isHealthy false when at capacity', () => {
      // Register 11 files (over capacity of 10)
      for (let i = 0; i < 11; i++) {
        mockRetryService.registerProcessingFile(`key-${i}`, `hash-${i}`);
      }

      const stats = service.getProcessingStats();

      expect(stats.isHealthy).toBe(false);
    });

    it('should return isHealthy true for zero active jobs', () => {
      const stats = service.getProcessingStats();

      expect(stats.activeJobs).toBe(0);
      expect(stats.isHealthy).toBe(true);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return max file size (10MB)', () => {
      expect(service.getMaxFileSize()).toBe(10 * 1024 * 1024);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return array of allowed MIME types', () => {
      const mimeTypes = service.getAllowedMimeTypes();

      expect(mimeTypes).toContain('application/pdf');
      expect(mimeTypes).toContain('application/msword');
      expect(mimeTypes).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('should return a copy of the array (not reference)', () => {
      const mimeTypes1 = service.getAllowedMimeTypes();
      const mimeTypes2 = service.getAllowedMimeTypes();

      expect(mimeTypes1).not.toBe(mimeTypes2);
      expect(mimeTypes1).toEqual(mimeTypes2);
    });
  });
});
