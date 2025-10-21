import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from './redis-connection.service';
import { VectorStoreService } from './vector-store.service';

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let redisConnectionService: jest.Mocked<RedisConnectionService>;
  let configService: jest.Mocked<ConfigService>;
  let redisClient: any;

  beforeEach(() => {
    redisClient = {
      ft: {
        info: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue(undefined),
      },
      hSet: jest.fn().mockResolvedValue(undefined),
      sendCommand: jest.fn(),
    };

    redisConnectionService = {
      getRedisClient: jest.fn().mockReturnValue(redisClient),
    } as unknown as jest.Mocked<RedisConnectionService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    service = new VectorStoreService(redisConnectionService, configService);
  });

  it('creates index when missing', async () => {
    redisClient.ft.info.mockRejectedValueOnce(
      new Error('Unknown index name'),
    );

    await service.createIndex();

    expect(redisClient.ft.create).toHaveBeenCalled();
  });

  it('adds vector entries with prefix', async () => {
    await service.addVector('cache-key', [0.1, 0.2]);

    expect(redisClient.hSet).toHaveBeenCalledWith(
      expect.stringContaining('cache-key'),
      expect.objectContaining({
        cacheKey: 'cache-key',
      }),
    );
  });

  it('returns similarity results from search payload', async () => {
    redisClient.sendCommand.mockResolvedValue([
      1,
      'semantic:cache:abc',
      ['cacheKey', 'semantic:job:123', 'vector_score', '0.05'],
    ]);

    const results = await service.findSimilar([0.1, 0.2], 0.9, 5);

    expect(results).toEqual([
      { cacheKey: 'semantic:job:123', similarity: 0.95 },
    ]);
  });
});
