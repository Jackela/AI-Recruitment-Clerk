import { RetryUtility } from './retry';

describe('RetryUtility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('retry', () => {
    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await RetryUtility.retry(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await RetryUtility.retry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(RetryUtility.retry(operation, 3, 10)).rejects.toThrow(
        'always fails',
      );
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use default maxAttempts of 3', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await RetryUtility.retry(operation);
      } catch {
        // expected
      }

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use default delay of 1000', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const retryPromise = RetryUtility.retry(operation, 2);

      await Promise.resolve();
      jest.advanceTimersByTime(1000);

      await retryPromise;
    });

    it('should increase delay with each retry', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const retryPromise = RetryUtility.retry(operation, 3, 100);

      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(200);
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(3);

      await retryPromise;
    });

    it('should throw generic error when no error is captured', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw undefined;
      });

      await expect(RetryUtility.retry(operation, 1, 10)).rejects.toThrow(
        'Operation failed after maximum attempts',
      );
    });
  });

  describe('withExponentialBackoff', () => {
    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await RetryUtility.withExponentialBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry with exponential backoff', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const retryPromise = RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
      });

      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(200);
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(3);

      await retryPromise;
    });

    it('should respect maxDelayMs', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      const retryPromise = RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 5,
        baseDelayMs: 1000,
        maxDelayMs: 3000,
        backoffMultiplier: 2,
      });

      await Promise.resolve();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      jest.advanceTimersByTime(3000);

      await expect(retryPromise).rejects.toThrow();
    });

    it('should apply jitter', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const retryPromise = RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 100,
        jitterMs: 50,
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      await retryPromise;
    });

    it('should use default options', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await RetryUtility.withExponentialBackoff(operation);
      } catch {
        // expected
      }

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(
        RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 2,
          baseDelayMs: 10,
        }),
      ).rejects.toThrow('always fails');
    });

    it('should throw generic error when no error is captured', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw undefined;
      });

      await expect(
        RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 1,
          baseDelayMs: 10,
        }),
      ).rejects.toThrow('Operation failed after maximum attempts');
    });

    it('should calculate backoff correctly', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      jest
        .spyOn(global, 'setTimeout')
        .mockImplementation(
          (
            callback: () => void,
            delay?: number,
          ): ReturnType<typeof setTimeout> => {
            if (delay) delays.push(delay);
            return originalSetTimeout(callback, 0);
          },
        );

      const operation = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 4,
          baseDelayMs: 100,
          backoffMultiplier: 2,
          maxDelayMs: 10000,
          jitterMs: 0,
        });
      } catch {
        // expected
      }

      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);

    });
  });
});
