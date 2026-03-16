import { WithCircuitBreaker, CircuitBreakerConfig } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WithCircuitBreaker decorator', () => {
    it('should execute method successfully', async () => {
      class TestClass {
        @WithCircuitBreaker()
        async successMethod(): Promise<string> {
          return 'success';
        }
      }

      const instance = new TestClass();
      const result = await instance.successMethod();

      expect(result).toBe('success');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should catch and log errors', async () => {
      const error = new Error('Test error');

      class TestClass {
        @WithCircuitBreaker()
        async errorMethod(): Promise<void> {
          throw error;
        }
      }

      const instance = new TestClass();

      await expect(instance.errorMethod()).rejects.toThrow('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should work with property key parameter', async () => {
      class TestClass {
        @WithCircuitBreaker('customKey')
        async method(): Promise<string> {
          return 'result';
        }
      }

      const instance = new TestClass();
      const result = await instance.method();

      expect(result).toBe('result');
    });

    it('should work with config parameter', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeoutMs: 1000,
        monitorWindow: 10,
      };

      class TestClass {
        @WithCircuitBreaker('testKey', config)
        async method(): Promise<string> {
          return 'result';
        }
      }

      const instance = new TestClass();
      const result = await instance.method();

      expect(result).toBe('result');
    });

    it('should preserve method context', async () => {
      class TestClass {
        private value = 'test';

        @WithCircuitBreaker()
        async method(): Promise<string> {
          return this.value;
        }
      }

      const instance = new TestClass();
      const result = await instance.method();

      expect(result).toBe('test');
    });

    it('should pass method arguments', async () => {
      class TestClass {
        @WithCircuitBreaker()
        async method(arg1: string, arg2: number): Promise<string> {
          return `${arg1}-${arg2}`;
        }
      }

      const instance = new TestClass();
      const result = await instance.method('hello', 42);

      expect(result).toBe('hello-42');
    });

    it('should handle multiple method calls', async () => {
      let callCount = 0;

      class TestClass {
        @WithCircuitBreaker()
        async increment(): Promise<number> {
          callCount++;
          return callCount;
        }
      }

      const instance = new TestClass();

      expect(await instance.increment()).toBe(1);
      expect(await instance.increment()).toBe(2);
      expect(await instance.increment()).toBe(3);
      expect(callCount).toBe(3);
    });

    it('should handle errors in multiple calls', async () => {
      let shouldFail = false;

      class TestClass {
        @WithCircuitBreaker()
        async conditionalMethod(): Promise<string> {
          if (shouldFail) {
            throw new Error('Conditional error');
          }
          return 'success';
        }
      }

      const instance = new TestClass();

      expect(await instance.conditionalMethod()).toBe('success');

      shouldFail = true;
      await expect(instance.conditionalMethod()).rejects.toThrow(
        'Conditional error',
      );
    });

    it('should handle sync methods returning promises', async () => {
      class TestClass {
        @WithCircuitBreaker()
        method(): Promise<string> {
          return Promise.resolve('sync promise');
        }
      }

      const instance = new TestClass();
      const result = await instance.method();

      expect(result).toBe('sync promise');
    });

    it('should log error with method name', async () => {
      class TestClass {
        @WithCircuitBreaker()
        async myMethodName(): Promise<void> {
          throw new Error('Specific error');
        }
      }

      const instance = new TestClass();

      try {
        await instance.myMethodName();
      } catch {
        // expected
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('myMethodName');
    });

    it('should preserve error object', async () => {
      const customError = new TypeError('Custom type error');

      class TestClass {
        @WithCircuitBreaker()
        async method(): Promise<void> {
          throw customError;
        }
      }

      const instance = new TestClass();

      await expect(instance.method()).rejects.toBe(customError);
    });
  });
});
