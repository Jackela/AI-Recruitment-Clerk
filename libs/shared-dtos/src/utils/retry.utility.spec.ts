import {
  RetryUtility,
  CircuitBreaker,
  Retry,
  WithCircuitBreaker,
  type CircuitBreakerOptions,
} from './retry.utility';

describe('RetryUtility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withExponentialBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(
          Object.assign(new Error('Attempt 1 failed'), { status: 503 }),
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('Attempt 2 failed'), { status: 503 }),
        )
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 3,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after all attempts exhausted', async () => {
      const error = Object.assign(new Error('Persistent failure'), {
        status: 503,
      });
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 2,
          baseDelayMs: 10,
          jitterMs: 0,
        }),
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect maxDelayMs', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(
          Object.assign(new Error('Attempt 1'), { status: 503 }),
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('Attempt 2'), { status: 503 }),
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('Attempt 3'), { status: 503 }),
        )
        .mockResolvedValue('success');

      const startTime = Date.now();
      await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 4,
        baseDelayMs: 100,
        maxDelayMs: 150,
        jitterMs: 0,
        backoffMultiplier: 2,
      });
      const duration = Date.now() - startTime;

      // Should use maxDelayMs instead of exponential delay
      expect(duration).toBeLessThan(600);
    });

    it('should use custom retryIf function', async () => {
      const retriableError = new Error('Retriable');
      const nonRetriableError = new Error('Non-retriable');

      const operation = jest
        .fn()
        .mockRejectedValueOnce(retriableError)
        .mockRejectedValueOnce(nonRetriableError);

      await expect(
        RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 3,
          baseDelayMs: 10,
          jitterMs: 0,
          retryIf: (error) => (error as Error).message !== 'Non-retriable',
        }),
      ).rejects.toThrow('Non-retriable');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should add jitter to delay', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(
          Object.assign(new Error('Attempt 1'), { status: 503 }),
        )
        .mockResolvedValue('success');

      const startTime = Date.now();
      await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 50,
      });
      const duration = Date.now() - startTime;

      // Should have delay plus jitter
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should use default options', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation);

      expect(result).toBe('success');
    });

    it('should handle non-Error rejections', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce('string error')
        .mockResolvedValue('success');

      // String errors are not retriable by default
      await expect(
        RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 2,
          baseDelayMs: 10,
          jitterMs: 0,
        }),
      ).rejects.toBe('string error');
    });

    it('should detect retriable network errors', async () => {
      const error = Object.assign(new Error('Connection refused'), {
        code: 'ECONNREFUSED',
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should detect retriable HTTP errors', async () => {
      const error = Object.assign(new Error('Service unavailable'), {
        status: 503,
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should detect retriable database errors', async () => {
      const error = new Error('Database connection timeout');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should not retry validation errors', async () => {
      const error = new Error('Validation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        RetryUtility.withExponentialBackoff(operation, {
          maxAttempts: 3,
          baseDelayMs: 10,
          jitterMs: 0,
        }),
      ).rejects.toThrow('Validation failed');

      // Should not retry validation errors
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout HTTP errors', async () => {
      const error = Object.assign(new Error('Request timeout'), {
        status: 408,
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should handle rate limit HTTP errors', async () => {
      const error = Object.assign(new Error('Too many requests'), {
        status: 429,
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should handle GoogleGenerativeAI errors', async () => {
      const error = Object.assign(new Error('Gemini API error'), {
        name: 'GoogleGenerativeAIError',
        status: 500,
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should handle ETIMEDOUT errors', async () => {
      const error = Object.assign(new Error('Connection timed out'), {
        code: 'ETIMEDOUT',
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should handle ENOTFOUND errors', async () => {
      const error = new Error('getaddrinfo ENOTFOUND example.com');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should handle 502 Bad Gateway errors', async () => {
      const error = Object.assign(new Error('Bad Gateway'), { status: 502 });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });

    it('should handle 504 Gateway Timeout errors', async () => {
      const error = Object.assign(new Error('Gateway Timeout'), {
        status: 504,
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryUtility.withExponentialBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        jitterMs: 0,
      });

      expect(result).toBe('success');
    });
  });
});

describe('CircuitBreaker', () => {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 3,
    recoveryTimeout: 1000,
    monitoringPeriod: 5000,
  };

  beforeEach(() => {
    // Reset circuit breaker instances
    (CircuitBreaker as any).instances.clear();
  });

  describe('getInstance', () => {
    it('should create new instance', () => {
      const cb = CircuitBreaker.getInstance('test-cb', defaultOptions);

      expect(cb).toBeInstanceOf(CircuitBreaker);
    });

    it('should return same instance for same name', () => {
      const cb1 = CircuitBreaker.getInstance('same-cb', defaultOptions);
      const cb2 = CircuitBreaker.getInstance('same-cb', defaultOptions);

      expect(cb1).toBe(cb2);
    });

    it('should return different instances for different names', () => {
      const cb1 = CircuitBreaker.getInstance('cb-1', defaultOptions);
      const cb2 = CircuitBreaker.getInstance('cb-2', defaultOptions);

      expect(cb1).not.toBe(cb2);
    });
  });

  describe('execute', () => {
    it('should execute operation successfully', async () => {
      const cb = CircuitBreaker.getInstance('execute-test', defaultOptions);
      const operation = jest.fn().mockResolvedValue('success');

      const result = await cb.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should open circuit after threshold failures', async () => {
      const cb = CircuitBreaker.getInstance('open-test', defaultOptions);
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(operation);
        } catch (_e) {
          // Expected
        }
      }

      expect(cb.getState()).toBe('OPEN');

      // Next call should fail immediately
      await expect(cb.execute(operation)).rejects.toThrow(
        'Circuit breaker open-test is OPEN',
      );
    });

    it('should transition to half-open after recovery timeout', async () => {
      const cb = CircuitBreaker.getInstance('half-open-test', {
        ...defaultOptions,
        recoveryTimeout: 100,
      });
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(operation);
        } catch (_e) {
          // Expected
        }
      }

      expect(cb.getState()).toBe('OPEN');

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next call should attempt in HALF_OPEN state
      try {
        await cb.execute(operation);
      } catch (_e) {
        // Expected to fail
      }

      // Circuit should be open again after another failure
      expect(cb.getState()).toBe('OPEN');
    });

    it('should close circuit after successful half-open call', async () => {
      const cb = CircuitBreaker.getInstance('close-test', {
        ...defaultOptions,
        recoveryTimeout: 50,
      });

      // Open the circuit
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failingOperation);
        } catch (_e) {
          // Expected
        }
      }

      expect(cb.getState()).toBe('OPEN');

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Successful operation should close circuit
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await cb.execute(successOperation);

      expect(result).toBe('success');
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailures()).toBe(0);
    });

    it('should track failure count', async () => {
      const cb = CircuitBreaker.getInstance(
        'failure-count-test',
        defaultOptions,
      );
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      expect(cb.getFailures()).toBe(0);

      try {
        await cb.execute(operation);
      } catch (_e) {
        // Expected
      }

      expect(cb.getFailures()).toBe(1);

      try {
        await cb.execute(operation);
      } catch (_e) {
        // Expected
      }

      expect(cb.getFailures()).toBe(2);
    });

    it('should reset failures on success', async () => {
      const cb = CircuitBreaker.getInstance('reset-test', defaultOptions);
      const failingOperation = jest
        .fn()
        .mockRejectedValue(new Error('Failure'));
      const successOperation = jest.fn().mockResolvedValue('success');

      // One failure
      try {
        await cb.execute(failingOperation);
      } catch (_e) {
        // Expected
      }

      expect(cb.getFailures()).toBe(1);

      // Success should reset
      await cb.execute(successOperation);

      expect(cb.getFailures()).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return initial state as CLOSED', () => {
      const cb = CircuitBreaker.getInstance('state-test', defaultOptions);

      expect(cb.getState()).toBe('CLOSED');
    });
  });
});

describe('Retry decorator', () => {
  it('should apply retry logic to method', async () => {
    class TestClass {
      attemptCount = 0;

      @Retry({ maxAttempts: 3, baseDelayMs: 10, jitterMs: 0 })
      public async retryableMethod() {
        this.attemptCount++;
        if (this.attemptCount < 3) {
          const error = Object.assign(new Error('Not yet'), { status: 503 });
          throw error;
        }
        return 'success';
      }
    }

    const instance = new TestClass();
    const result = await instance.retryableMethod();

    expect(result).toBe('success');
    expect(instance.attemptCount).toBe(3);
  });

  it('should eventually fail after max attempts', async () => {
    class TestClass {
      @Retry({ maxAttempts: 2, baseDelayMs: 10, jitterMs: 0 })
      public async alwaysFailingMethod() {
        const error = Object.assign(new Error('Always fails'), { status: 503 });
        throw error;
      }
    }

    const instance = new TestClass();

    await expect(instance.alwaysFailingMethod()).rejects.toThrow(
      'Always fails',
    );
  });

  it('should use default options', async () => {
    class TestClass {
      @Retry()
      public async methodWithDefaults() {
        return 'success';
      }
    }

    const instance = new TestClass();
    const result = await instance.methodWithDefaults();

    expect(result).toBe('success');
  });
});

describe('WithCircuitBreaker decorator', () => {
  it('should apply circuit breaker to method', async () => {
    class TestClass {
      @WithCircuitBreaker('test-operation', {
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000,
      })
      public async protectedMethod() {
        return 'success';
      }
    }

    const instance = new TestClass();
    const result = await instance.protectedMethod();

    expect(result).toBe('success');
  });

  it('should use default options', async () => {
    class TestClass {
      @WithCircuitBreaker('test-operation')
      public async methodWithDefaults() {
        return 'success';
      }
    }

    const instance = new TestClass();
    const result = await instance.methodWithDefaults();

    expect(result).toBe('success');
  });
});
