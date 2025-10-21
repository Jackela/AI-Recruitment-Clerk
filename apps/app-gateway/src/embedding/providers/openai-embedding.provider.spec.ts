import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { OpenAIEmbeddingProvider } from './openai-embedding.provider';

describe('OpenAIEmbeddingProvider', () => {
  let provider: OpenAIEmbeddingProvider;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const buildProvider = () => {
    provider = new OpenAIEmbeddingProvider(httpService, configService);
  };

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    const configMap = new Map<string, string | number>([
      ['OPENAI_API_KEY', 'test-key'],
      ['OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'],
      ['OPENAI_EMBEDDING_API_URL', 'https://api.openai.com/v1/embeddings'],
      ['OPENAI_EMBEDDING_TIMEOUT_MS', 1000],
      ['OPENAI_EMBEDDING_MAX_RETRIES', 3],
      ['OPENAI_EMBEDDING_RETRY_DELAY_MS', 0],
    ]);

    configService = {
      get: jest.fn((key: string) => configMap.get(key)),
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
    configService.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') {
        return undefined as any;
      }
      return undefined as any;
    });

    buildProvider();

    await expect(provider.createEmbedding('no key')).rejects.toThrow(
      'Embedding provider misconfiguration',
    );
  });
});
