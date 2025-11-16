import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { OpenAIEmbeddingProvider } from './openai-embedding.provider';

describe('OpenAIEmbeddingProvider', () => {
  let provider: OpenAIEmbeddingProvider;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let configValues: Map<string, string | number>;

  const buildProvider = () => {
    provider = new OpenAIEmbeddingProvider(httpService, configService);
  };

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    configValues = new Map<string, string | number>([
      ['OPENAI_API_KEY', 'test-key'],
      ['OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'],
      ['OPENAI_EMBEDDING_API_URL', 'https://api.openai.com/v1/embeddings'],
      ['OPENAI_EMBEDDING_TIMEOUT_MS', 1000],
      ['OPENAI_EMBEDDING_MAX_RETRIES', 3],
      ['OPENAI_EMBEDDING_RETRY_DELAY_MS', 0],
    ]);

    configService = {
      get: jest.fn((key: string) => configValues.get(key)),
    } as unknown as jest.Mocked<ConfigService>;

    buildProvider();
  });

  it('should request embeddings and return vector data', async () => {
    const embedding = [0.1, 0.2, 0.3];
    const response = {
      data: { data: [{ embedding }] },
    } as AxiosResponse;

    httpService.post.mockReturnValue(of(response));

    await expect(provider.createEmbedding('hello world')).resolves.toEqual(
      embedding,
    );

    expect(httpService.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      {
        input: 'hello world',
        model: 'text-embedding-3-small',
      },
      {
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
      },
    );
  });

  it('should retry failed requests before throwing', async () => {
    const axiosError = new AxiosError('boom');
    const successResponse = {
      data: { data: [{ embedding: [1, 2, 3] }] },
    } as AxiosResponse;

    httpService.post
      .mockReturnValueOnce(throwError(() => axiosError))
      .mockReturnValueOnce(of(successResponse));

    await expect(provider.createEmbedding('retry me')).resolves.toEqual([
      1, 2, 3,
    ]);

    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it('should throw when API key is missing', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'OPENAI_API_KEY' ? undefined : configValues.get(key),
    );

    buildProvider();

    await expect(provider.createEmbedding('no key')).rejects.toThrow(
      'Embedding provider misconfiguration',
    );
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Boundary Tests - Retry Mechanism', () => {
    it('should succeed on exactly maximum retries (3)', async () => {
      const axiosError = new AxiosError('Temporary failure');
      const successResponse = {
        data: { data: [{ embedding: [1, 2, 3] }] },
      } as AxiosResponse;

      httpService.post
        .mockReturnValueOnce(throwError(() => axiosError))
        .mockReturnValueOnce(throwError(() => axiosError))
        .mockReturnValueOnce(of(successResponse));

      await expect(provider.createEmbedding('retry-3x')).resolves.toEqual([1, 2, 3]);

      expect(httpService.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after exceeding maximum retries', async () => {
      const axiosError = new AxiosError('Persistent failure');

      httpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(provider.createEmbedding('exceed-retries')).rejects.toThrow();

      expect(httpService.post).toHaveBeenCalledTimes(3);
    });

    it('should succeed on first attempt (no retries needed)', async () => {
      const response = {
        data: { data: [{ embedding: [0.5, 0.6, 0.7] }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      await expect(provider.createEmbedding('instant-success')).resolves.toEqual([0.5, 0.6, 0.7]);

      expect(httpService.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Negative Tests - API Errors', () => {
    it('should handle 429 rate limiting error', async () => {
      const rateLimitError = new AxiosError('Rate limit exceeded', '429');
      rateLimitError.response = createResponseWithStatus(429);

      httpService.post.mockReturnValue(throwError(() => rateLimitError));

      await expect(provider.createEmbedding('rate-limited')).rejects.toThrow();
    });

    it('should handle 401 unauthorized error', async () => {
      const authError = new AxiosError('Unauthorized', '401');
      authError.response = createResponseWithStatus(401);

      httpService.post.mockReturnValue(throwError(() => authError));

      await expect(provider.createEmbedding('unauthorized')).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      const serverError = new AxiosError('Internal server error', '500');
      serverError.response = createResponseWithStatus(500);

      httpService.post.mockReturnValue(throwError(() => serverError));

      await expect(provider.createEmbedding('server-error')).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      const timeoutError = new AxiosError('Timeout');
      timeoutError.code = 'ECONNABORTED';

      httpService.post.mockReturnValue(throwError(() => timeoutError));

      await expect(provider.createEmbedding('timeout')).rejects.toThrow();
    });

    it('should handle malformed API response', async () => {
      const malformedResponse = {
        data: { invalid: 'structure' },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(malformedResponse));

      await expect(provider.createEmbedding('malformed')).rejects.toThrow();
    });
  });

  describe('Negative Tests - Invalid Inputs', () => {
    it('should handle empty text input', async () => {
      const response = {
        data: { data: [{ embedding: [] }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      await expect(provider.createEmbedding('')).resolves.toEqual([]);
    });

    it('should handle extremely long text (>8000 tokens)', async () => {
      const longText = 'word '.repeat(10000);
      const response = {
        data: { data: [{ embedding: [0.1, 0.2] }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      await expect(provider.createEmbedding(longText)).resolves.toBeDefined();
    });

    it('should handle special characters and unicode', async () => {
      const specialText = '你好世界 🌍 <script>alert("xss")</script>';
      const response = {
        data: { data: [{ embedding: [0.3, 0.4, 0.5] }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      await expect(provider.createEmbedding(specialText)).resolves.toEqual([0.3, 0.4, 0.5]);
    });
  });

  describe('Edge Cases - Concurrent Requests', () => {
    it('should handle multiple concurrent embedding requests', async () => {
      const response1 = { data: { data: [{ embedding: [1, 2] }] } } as AxiosResponse;
      const response2 = { data: { data: [{ embedding: [3, 4] }] } } as AxiosResponse;
      const response3 = { data: { data: [{ embedding: [5, 6] }] } } as AxiosResponse;

      httpService.post
        .mockReturnValueOnce(of(response1))
        .mockReturnValueOnce(of(response2))
        .mockReturnValueOnce(of(response3));

      const promises = [
        provider.createEmbedding('text1'),
        provider.createEmbedding('text2'),
        provider.createEmbedding('text3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([[1, 2], [3, 4], [5, 6]]);
      expect(httpService.post).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid sequential requests', async () => {
      const response = {
        data: { data: [{ embedding: [0.1, 0.2] }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      for (let i = 0; i < 10; i++) {
        await provider.createEmbedding(`request-${i}`);
      }

      expect(httpService.post).toHaveBeenCalledTimes(10);
    });
  });

  describe('Edge Cases - Configuration Validation', () => {
    it('should handle missing embedding model configuration', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_EMBEDDING_MODEL') {
          return undefined;
        }
        return GLOBAL_CONFIG_MAP.get(key);
      });

      buildProvider();

      await expect(provider.createEmbedding('no-model')).rejects.toThrow();
    });

    it('should handle missing API URL configuration', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_EMBEDDING_API_URL') {
          return undefined;
        }
        const partialConfig = new Map<string, string | number>([
          ['OPENAI_API_KEY', 'test-key'],
          ['OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'],
        ]);
        return partialConfig.get(key);
      });

      buildProvider();

      await expect(provider.createEmbedding('no-url')).rejects.toThrow();
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return embedding vector with correct dimensions', async () => {
      const embedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
      const response = {
        data: { data: [{ embedding }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      const result = await provider.createEmbedding('dimension-test');

      expect(result).toHaveLength(1536);
      expect(result).toEqual(expect.arrayContaining([expect.any(Number)]));
      expect(result[0]).toBeCloseTo(0, 3);
    });

    it('should send correct request headers', async () => {
      const response = {
        data: { data: [{ embedding: [1, 2, 3] }] },
      } as AxiosResponse;

      httpService.post.mockReturnValue(of(response));

      await provider.createEmbedding('header-test');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer .+/),
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });
});

const GLOBAL_CONFIG_MAP = new Map<string, string | number>([
  ['OPENAI_API_KEY', 'test-key'],
  ['OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'],
  ['OPENAI_EMBEDDING_API_URL', 'https://api.openai.com/v1/embeddings'],
  ['OPENAI_EMBEDDING_TIMEOUT_MS', 1000],
  ['OPENAI_EMBEDDING_MAX_RETRIES', 3],
  ['OPENAI_EMBEDDING_RETRY_DELAY_MS', 0],
]);

const createResponseWithStatus = (status: number): AxiosResponse => ({
  data: {},
  status,
  statusText: '',
  headers: {},
  config: {
    headers: {},
  } as InternalAxiosRequestConfig,
});
