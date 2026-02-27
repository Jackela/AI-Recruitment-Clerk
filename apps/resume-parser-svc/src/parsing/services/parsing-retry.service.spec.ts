import { Logger } from '@nestjs/common';
import { ParsingRetryService } from './parsing-retry.service';
import type { ParsingEventService } from './parsing-event.service';
import type { RetryOriginalData } from '../../types/parsing.types';

describe('ParsingRetryService', () => {
  let service: ParsingRetryService;
  let mockEventService: jest.Mocked<ParsingEventService>;

  beforeEach(() => {
    mockEventService = {
      publishFailureEvent: jest.fn().mockResolvedValue(undefined),
      publishProcessingError: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ParsingEventService>;

    service = new ParsingRetryService(mockEventService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Mock setTimeout to execute immediately in tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('getRetryCount', () => {
    it('should return 0 for unknown resume', () => {
      expect(service.getRetryCount('unknown-resume')).toBe(0);
    });

    it('should return correct count after increment', () => {
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-1');
      expect(service.getRetryCount('resume-1')).toBe(2);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment from 0 to 1', () => {
      service.incrementRetryCount('resume-1');
      expect(service.getRetryCount('resume-1')).toBe(1);
    });

    it('should increment multiple times', () => {
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-1');
      expect(service.getRetryCount('resume-1')).toBe(3);
    });

    it('should track different resumes separately', () => {
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-2');
      service.incrementRetryCount('resume-1');

      expect(service.getRetryCount('resume-1')).toBe(2);
      expect(service.getRetryCount('resume-2')).toBe(1);
    });
  });

  describe('clearRetryCount', () => {
    it('should clear retry count', () => {
      service.incrementRetryCount('resume-1');
      service.clearRetryCount('resume-1');
      expect(service.getRetryCount('resume-1')).toBe(0);
    });

    it('should work for non-existent resume', () => {
      service.clearRetryCount('non-existent');
      expect(service.getRetryCount('non-existent')).toBe(0);
    });
  });

  describe('getRetryQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(service.getRetryQueueSize()).toBe(0);
    });

    it('should return correct count', () => {
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-2');
      service.incrementRetryCount('resume-3');
      expect(service.getRetryQueueSize()).toBe(3);
    });
  });

  describe('getRetryEntries', () => {
    it('should return empty array for no entries', () => {
      expect(service.getRetryEntries()).toEqual([]);
    });

    it('should return all entries', () => {
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-2');

      const entries = service.getRetryEntries();
      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual(['resume-1', 2]);
      expect(entries).toContainEqual(['resume-2', 1]);
    });
  });

  describe('shouldRetryProcessing', () => {
    it('should return true for timeout errors', () => {
      expect(service.shouldRetryProcessing(new Error('Connection timeout'))).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(service.shouldRetryProcessing(new Error('Network failure'))).toBe(true);
    });

    it('should return true for connection errors', () => {
      expect(service.shouldRetryProcessing(new Error('Connection lost'))).toBe(true);
    });

    it('should return true for rate limit errors', () => {
      expect(service.shouldRetryProcessing(new Error('Rate limit exceeded'))).toBe(true);
    });

    it('should return true for temporary errors', () => {
      expect(service.shouldRetryProcessing(new Error('Temporary failure'))).toBe(true);
    });

    it('should return true for gridfs errors', () => {
      expect(service.shouldRetryProcessing(new Error('GridFS download failed'))).toBe(true);
    });

    it('should return true for download errors', () => {
      expect(service.shouldRetryProcessing(new Error('Download failed'))).toBe(true);
    });

    it('should return false for validation errors', () => {
      expect(service.shouldRetryProcessing(new Error('Invalid file format'))).toBe(false);
    });

    it('should return false for validation failed errors', () => {
      expect(service.shouldRetryProcessing(new Error('Validation failed for input'))).toBe(false);
    });

    it('should return false for corrupted errors', () => {
      expect(service.shouldRetryProcessing(new Error('File is corrupted'))).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(service.shouldRetryProcessing(new Error('TIMEOUT occurred'))).toBe(true);
      expect(service.shouldRetryProcessing(new Error('INVALID data'))).toBe(false);
    });

    it('should return false for unknown non-retryable errors', () => {
      expect(service.shouldRetryProcessing(new Error('Unknown error'))).toBe(false);
    });
  });

  describe('registerProcessingFile', () => {
    it('should register file for processing', () => {
      service.registerProcessingFile('key-1', 'hash-123');
      expect(service.isProcessing('key-1')).toBe(true);
    });

    it('should track multiple files', () => {
      service.registerProcessingFile('key-1', 'hash-1');
      service.registerProcessingFile('key-2', 'hash-2');

      expect(service.isProcessing('key-1')).toBe(true);
      expect(service.isProcessing('key-2')).toBe(true);
    });
  });

  describe('unregisterProcessingFile', () => {
    it('should unregister file', () => {
      service.registerProcessingFile('key-1', 'hash-123');
      service.unregisterProcessingFile('key-1');
      expect(service.isProcessing('key-1')).toBe(false);
    });

    it('should work for non-existent key', () => {
      service.unregisterProcessingFile('non-existent');
      expect(service.isProcessing('non-existent')).toBe(false);
    });
  });

  describe('isProcessing', () => {
    it('should return false for non-processing file', () => {
      expect(service.isProcessing('unknown-key')).toBe(false);
    });

    it('should return true for registered file', () => {
      service.registerProcessingFile('key-1', 'hash-123');
      expect(service.isProcessing('key-1')).toBe(true);
    });
  });

  describe('getActiveProcessingCount', () => {
    it('should return 0 for no active processing', () => {
      expect(service.getActiveProcessingCount()).toBe(0);
    });

    it('should return correct count', () => {
      service.registerProcessingFile('key-1', 'hash-1');
      service.registerProcessingFile('key-2', 'hash-2');
      expect(service.getActiveProcessingCount()).toBe(2);
    });
  });

  describe('getProcessingFileEntries', () => {
    it('should return empty array for no entries', () => {
      expect(service.getProcessingFileEntries()).toEqual([]);
    });

    it('should return entries with age and attempts', () => {
      service.registerProcessingFile('key-1', 'hash-1');

      const entries = service.getProcessingFileEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].key).toBe('key-1');
      expect(entries[0].age).toBeGreaterThanOrEqual(0);
      expect(entries[0].attempts).toBe(0);
    });
  });

  describe('cleanupExpiredProcessing', () => {
    it('should clean up expired entries', () => {
      service.registerProcessingFile('key-1', 'hash-1');

      // Advance time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      const cleanedCount = service.cleanupExpiredProcessing(4 * 60 * 1000);
      expect(cleanedCount).toBe(1);
      expect(service.isProcessing('key-1')).toBe(false);
    });

    it('should not clean up non-expired entries', () => {
      service.registerProcessingFile('key-1', 'hash-1');

      // Advance time by 1 minute
      jest.advanceTimersByTime(1 * 60 * 1000);

      const cleanedCount = service.cleanupExpiredProcessing(5 * 60 * 1000);
      expect(cleanedCount).toBe(0);
      expect(service.isProcessing('key-1')).toBe(true);
    });

    it('should return 0 when nothing to clean', () => {
      const cleanedCount = service.cleanupExpiredProcessing(60000);
      expect(cleanedCount).toBe(0);
    });

    it('should warn about cleaned up entries', () => {
      service.registerProcessingFile('key-1', 'hash-1');
      jest.advanceTimersByTime(5 * 60 * 1000);

      service.cleanupExpiredProcessing(4 * 60 * 1000);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up expired processing record'),
      );
    });
  });

  describe('handleProcessingError', () => {
    const createRetryData = (): RetryOriginalData => ({
      fileBuffer: Buffer.from('test content'),
      fileName: 'test.pdf',
    });

    it('should log error details', async () => {
      const error = new Error('Test error');

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        jest.fn(),
      );

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not retry when error is not retryable', async () => {
      const error = new Error('Invalid file format');
      const retryCallback = jest.fn();

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        retryCallback,
      );

      expect(retryCallback).not.toHaveBeenCalled();
      expect(mockEventService.publishFailureEvent).toHaveBeenCalled();
    });

    it('should not retry when original data is missing', async () => {
      const error = new Error('Timeout error');
      const retryCallback = jest.fn();

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        undefined,
        retryCallback,
      );

      expect(retryCallback).not.toHaveBeenCalled();
      expect(mockEventService.publishFailureEvent).toHaveBeenCalled();
    });

    it('should not retry when max retries reached', async () => {
      const error = new Error('Timeout error');
      const retryCallback = jest.fn();

      // Set retry count to max
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-1');
      service.incrementRetryCount('resume-1');

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        retryCallback,
      );

      expect(retryCallback).not.toHaveBeenCalled();
      expect(mockEventService.publishFailureEvent).toHaveBeenCalled();
    });

    it('should schedule retry for retryable error', async () => {
      const error = new Error('Timeout error');
      const retryCallback = jest.fn().mockResolvedValue(undefined);

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        retryCallback,
      );

      // Should not call immediately
      expect(retryCallback).not.toHaveBeenCalled();

      // Fast-forward timers
      await jest.runAllTimersAsync();

      expect(retryCallback).toHaveBeenCalled();
    });

    it('should increment retry count on retry', async () => {
      const error = new Error('Timeout error');
      const retryCallback = jest.fn().mockResolvedValue(undefined);

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        retryCallback,
      );

      await jest.runAllTimersAsync();

      expect(service.getRetryCount('resume-1')).toBe(1);
    });

    it('should publish processing error event', async () => {
      const error = new Error('Test error');

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        jest.fn(),
      );

      expect(mockEventService.publishProcessingError).toHaveBeenCalledWith(
        'job-1',
        'resume-1',
        error,
        0,
      );
    });

    it('should publish failure event when max retries reached', async () => {
      const error = new Error('Invalid file format');

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        jest.fn(),
      );

      expect(mockEventService.publishFailureEvent).toHaveBeenCalledWith(
        'job-1',
        'resume-1',
        'unknown',
        error,
        0,
      );
    });

    it('should handle retry callback errors', async () => {
      const error = new Error('Timeout error');
      const retryCallback = jest.fn().mockRejectedValue(new Error('Retry failed'));

      await service.handleProcessingError(
        error,
        'job-1',
        'resume-1',
        createRetryData(),
        retryCallback,
      );

      await jest.runAllTimersAsync();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Retry 1 failed'),
        expect.any(Error),
      );
    });

    it('should not throw on handling errors', async () => {
      mockEventService.publishProcessingError.mockRejectedValue(new Error('Publish failed'));

      const result = await service.handleProcessingError(
        new Error('Test error'),
        'job-1',
        'resume-1',
        createRetryData(),
        jest.fn(),
      );

      expect(result).toBeUndefined();
    });
  });
});
