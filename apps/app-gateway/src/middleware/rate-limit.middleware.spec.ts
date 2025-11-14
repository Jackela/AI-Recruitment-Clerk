import { RateLimitMiddleware } from './rate-limit.middleware';
import { HttpException } from '@nestjs/common';

jest.mock('@ai-recruitment-clerk/configuration', () => {
  const actual = jest.requireActual('@ai-recruitment-clerk/configuration');
  return {
    ...actual,
    getConfig: jest.fn(() => ({
      cache: {
        redis: {
          enabled: false,
          disabled: true,
          url: undefined,
          host: undefined,
          port: undefined,
          password: undefined,
        },
      },
    })),
  };
});

const { getConfig } = jest.requireMock('@ai-recruitment-clerk/configuration');

const createReqRes = () => {
  const req: any = {
    method: 'POST',
    path: '/api/guest/demo',
    headers: {},
    ip: '1.1.1.1',
    connection: { remoteAddress: '1.1.1.1' },
    socket: { remoteAddress: '1.1.1.1' },
  };
  const res: any = {
    setHeader: jest.fn(),
  };
  return { req, res };
};

describe('RateLimitMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to in-memory when Redis is disabled in config', () => {
    const middleware = new RateLimitMiddleware();
    expect((middleware as any).redis).toBeNull();
  });

  it('allows requests when usage is below limit', async () => {
    (getConfig as jest.Mock).mockReturnValueOnce({
      cache: {
        redis: {
          enabled: true,
          disabled: false,
          url: undefined,
          host: undefined,
        },
      },
    });

    const middleware = new RateLimitMiddleware();
    (middleware as any).redis = {
      get: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ count: 1, questionnaires: 0, payments: 0, lastReset: new Date().toISOString().split('T')[0] }),
        ),
      setex: jest.fn(),
    };
    const next = jest.fn();
    const { req, res } = createReqRes();

    await middleware.use(req, res, next);

    expect((middleware as any).redis.setex).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('rejects requests when limit exceeded', async () => {
    (getConfig as jest.Mock).mockReturnValueOnce({
      cache: {
        redis: {
          enabled: true,
          disabled: false,
          url: undefined,
          host: undefined,
        },
      },
    });
    const middleware = new RateLimitMiddleware();
    const today = new Date().toISOString().split('T')[0];
    (middleware as any).redis = {
      get: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ count: 5, questionnaires: 0, payments: 0, lastReset: today }),
        ),
      setex: jest.fn(),
    };

    const { req, res } = createReqRes();

    await expect(
      middleware.use(req, res, jest.fn()),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
