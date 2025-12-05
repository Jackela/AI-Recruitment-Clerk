/**
 * Response Transform Interceptor Tests
 * AI Recruitment Clerk - Testing for standardized response wrapping
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { ResponseTransformInterceptor } from './response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor;

  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getHandler: () => ({ name: 'testMethod' }),
      getClass: () => ({ name: 'TestController' }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (result: unknown): CallHandler => {
    return {
      handle: () => of(result),
    };
  };

  beforeEach(() => {
    interceptor = new ResponseTransformInterceptor();
  });

  describe('response wrapping', () => {
    it('should wrap plain object responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ name: 'John', age: 30 });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: { name: 'John', age: 30 },
      });
    });

    it('should wrap array responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const handler = createMockCallHandler(data);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
    });

    it('should wrap string responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler('Hello, World!');

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: 'Hello, World!',
      });
    });

    it('should wrap number responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(42);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: 42,
      });
    });

    it('should wrap boolean responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(true);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: true,
      });
    });

    it('should wrap null responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(null);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: null,
      });
    });

    it('should wrap undefined responses in standardized format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler(undefined);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: undefined,
      });
    });
  });

  describe('passthrough for already standardized responses', () => {
    it('should pass through responses that already have success and data properties', async () => {
      const context = createMockExecutionContext();
      const standardizedData = {
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Operation completed',
      };
      const handler = createMockCallHandler(standardizedData);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual(standardizedData);
    });

    it('should pass through success=false responses', async () => {
      const context = createMockExecutionContext();
      const errorResponse = {
        success: false,
        data: null,
        error: 'Something went wrong',
      };
      const handler = createMockCallHandler(errorResponse);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual(errorResponse);
    });

    it('should pass through responses with additional properties', async () => {
      const context = createMockExecutionContext();
      const responseWithMeta = {
        success: true,
        data: [{ id: 1 }],
        meta: { total: 100, page: 1 },
        timestamp: '2024-01-15T10:00:00Z',
      };
      const handler = createMockCallHandler(responseWithMeta);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual(responseWithMeta);
    });
  });

  describe('edge cases', () => {
    it('should wrap objects with only success property (no data)', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ success: true, other: 'value' });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      // Since it doesn't have 'data' property, it should be wrapped
      expect(result).toEqual({
        success: true,
        data: { success: true, other: 'value' },
      });
    });

    it('should wrap objects with only data property (no success)', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: { id: 1 } });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      // Since it doesn't have 'success' property, it should be wrapped
      expect(result).toEqual({
        success: true,
        data: { data: { id: 1 } },
      });
    });

    it('should pass through empty object with success and data', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ success: true, data: {} });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ success: true, data: {} });
    });

    it('should pass through when data is null in standardized response', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ success: true, data: null });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ success: true, data: null });
    });

    it('should pass through when data is an array in standardized response', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({
        success: true,
        data: [1, 2, 3],
      });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });

    it('should wrap empty objects', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({});

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: {},
      });
    });

    it('should wrap nested objects', async () => {
      const context = createMockExecutionContext();
      const nestedData = {
        level1: {
          level2: {
            level3: { value: 'deep' },
          },
        },
      };
      const handler = createMockCallHandler(nestedData);

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({
        success: true,
        data: nestedData,
      });
    });
  });

  describe('E2E contract validation', () => {
    it('should produce responses matching E2E contract format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ id: 123, status: 'active' });

      const result$ = interceptor.intercept(context, handler);
      const result = await firstValueFrom(result$);

      // Validate the contract structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
    });

    it('should maintain consistent response structure for different data types', async () => {
      const context = createMockExecutionContext();
      const testCases = [
        { input: 'string', expected: { success: true, data: 'string' } },
        { input: 123, expected: { success: true, data: 123 } },
        { input: true, expected: { success: true, data: true } },
        { input: [1, 2, 3], expected: { success: true, data: [1, 2, 3] } },
        { input: { key: 'value' }, expected: { success: true, data: { key: 'value' } } },
      ];

      for (const testCase of testCases) {
        const handler = createMockCallHandler(testCase.input);
        const result$ = interceptor.intercept(context, handler);
        const result = await firstValueFrom(result$);

        expect(result).toEqual(testCase.expected);
      }
    });
  });

  describe('observable behavior', () => {
    it('should return an Observable', () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ test: true });

      const result = interceptor.intercept(context, handler);

      expect(result.subscribe).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should only emit once per request', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ single: 'emission' });

      const result$ = interceptor.intercept(context, handler);

      let emissionCount = 0;
      await new Promise<void>((resolve) => {
        result$.subscribe({
          next: () => emissionCount++,
          complete: () => resolve(),
        });
      });

      expect(emissionCount).toBe(1);
    });
  });
});
