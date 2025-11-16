import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from './redis-connection.service';

const connectMock = jest.fn();
const pingMock = jest.fn();
const quitMock = jest.fn();
const onMock = jest.fn().mockReturnThis();

jest.mock('redis', () => ({
  createClient: () => ({
    connect: connectMock,
    ping: pingMock,
    quit: quitMock,
    on: onMock,
  }),
}));

describe('RedisConnectionService', () => {
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          REDIS_URL: 'redis://user:pass@localhost:6379',
          USE_REDIS_CACHE: 'true',
          DISABLE_REDIS: 'false',
          REDIS_CONNECTION_TIMEOUT: '500',
        };
        return map[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;
  });

  it('skips connection when redis disabled', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'DISABLE_REDIS') return 'true';
      return '';
    });
    const service = new RedisConnectionService(configService);

    await service['initializeConnection']();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it('connects to redis when configured', async () => {
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue('PONG');
    const service = new RedisConnectionService(configService);

    await service['initializeConnection']();

    const status = service.getConnectionStatus();
    expect(status.connected).toBe(true);
    expect(onMock).toHaveBeenCalled();
  });

  it('masks redis url when logging', () => {
    const service = new RedisConnectionService(configService);
    const masked = service['maskRedisUrl']('redis://user:pass@host:6379');

    expect(masked).toBe('redis://***:***@host:6379');
  });

  it('reports availability when connected and false otherwise', async () => {
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue('PONG');
    const service = new RedisConnectionService(configService);
    await service['initializeConnection']();

    expect(await service.isRedisAvailable()).toBe(true);

    (service as any).connectionState = 'disconnected';
    expect(await service.isRedisAvailable()).toBe(false);
  });
});
