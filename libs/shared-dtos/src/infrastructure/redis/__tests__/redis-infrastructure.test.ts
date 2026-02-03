import type { RedisClient } from '../redis.client';
import { SessionCacheService } from '../session-cache.service';
import { UsageCacheService } from '../usage-cache.service';
import { UserSession } from '../../../domains/user-management.dto';

type RedisClientMocks = {
  redisClient: jest.Mocked<RedisClient>;
  internals: {
    set: jest.Mock;
    setex: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
    incr: jest.Mock;
    incrby: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
    hset: jest.Mock;
    hget: jest.Mock;
    pipeline: jest.Mock;
    connect: jest.Mock;
  };
  pipeline: {
    get: jest.Mock;
    incrby: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
    exec: jest.Mock;
  };
};

function createRedisClientMock(): RedisClientMocks {
  const pipeline = {
    get: jest.fn().mockReturnThis(),
    incrby: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    ttl: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  const internals = {
    set: jest.fn().mockResolvedValue(undefined),
    setex: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    incrby: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(3600),
    hset: jest.fn().mockResolvedValue('OK'),
    hget: jest.fn().mockResolvedValue(null),
    pipeline: jest.fn().mockReturnValue(pipeline),
    connect: jest.fn().mockResolvedValue(undefined),
  };

  const redisClient = {
    set: jest.fn(async (key: string, value: string, ttl?: number) => {
      if (ttl) {
        await internals.setex(key, ttl, value);
      } else {
        await internals.set(key, value);
      }
    }),
    get: jest.fn(async (key: string) => internals.get(key)),
    del: jest.fn((key: string) => internals.del(key)),
    exists: jest.fn((key: string) =>
      Promise.resolve(Boolean(internals.exists(key))),
    ),
    incr: jest.fn((key: string) => internals.incr(key)),
    expire: jest.fn((key: string, ttl: number) => internals.expire(key, ttl)),
    ttl: jest.fn((key: string) => internals.ttl(key)),
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
    hset: jest.fn((key: string, field: string, value: string) =>
      internals.hset(key, field, value),
    ),
    hget: jest.fn((key: string, field: string) =>
      internals.hget(key, field),
    ),
    getClient: jest.fn(() => internals as any),
    connect: jest.fn(async () => {
      await internals.connect();
    }),
    isRedisConnected: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<RedisClient>;

  return { redisClient, internals, pipeline };
}

describe('Redis Infrastructure', () => {
  let redisClient: jest.Mocked<RedisClient>;
  let sessionCache: SessionCacheService;
  let usageCache: UsageCacheService;

  beforeEach(() => {
    const mocks = createRedisClientMock();
    redisClient = mocks.redisClient;
    sessionCache = new SessionCacheService(redisClient);
    usageCache = new UsageCacheService(redisClient);
  });

  describe('RedisClient', () => {
    it('should be defined', () => {
      expect(redisClient).toBeDefined();
    });

    it('should connect to Redis', async () => {
      await redisClient.connect();
      expect(redisClient.getClient().connect).toHaveBeenCalled();
    });

    it('should check connection status', () => {
      const isConnected = redisClient.isRedisConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should set and get values', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet.mockResolvedValueOnce('test-value');

      await redisClient.set('test-key', 'test-value');
      const value = await redisClient.get('test-key');

      expect(redisClient.getClient().set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
      );
      expect(value).toBe('test-value');
    });

    it('should set values with TTL', async () => {
      await redisClient.set('test-key', 'test-value', 3600);
      expect(redisClient.getClient().setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        'test-value',
      );
    });

    it('should delete keys', async () => {
      const result = await redisClient.del('test-key');
      expect(redisClient.getClient().del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(1);
    });

    it('should check key existence', async () => {
      const mockExists = redisClient.getClient().exists as jest.Mock;
      mockExists.mockResolvedValueOnce(1);

      const exists = await redisClient.exists('test-key');
      expect(exists).toBe(true);
    });

    it('should handle atomic increment', async () => {
      const result = await redisClient.incr('counter');
      expect(redisClient.getClient().incr).toHaveBeenCalledWith('counter');
      expect(result).toBe(1);
    });

    it('should handle hash operations', async () => {
      const mockHget = redisClient.getClient().hget as jest.Mock;
      mockHget.mockResolvedValueOnce('hash-value');

      await redisClient.hset('hash-key', 'field', 'hash-value');
      const value = await redisClient.hget('hash-key', 'field');

      expect(redisClient.getClient().hset).toHaveBeenCalledWith(
        'hash-key',
        'field',
        'hash-value',
      );
      expect(value).toBe('hash-value');
    });
  });

  describe('SessionCacheService', () => {
    let testSession: UserSession;

    beforeEach(() => {
      testSession = UserSession.create('192.168.1.1');
    });

    it('should cache session data', async () => {
      await sessionCache.cacheSession(testSession);

      expect(redisClient.getClient().setex).toHaveBeenCalledTimes(2); // session data + IP mapping
    });

    it('should retrieve session by ID', async () => {
      const sessionData = {
        id: testSession.getId().getValue(),
        ip: '192.168.1.1',
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        quota: {
          daily: 5,
          used: 0,
          questionnaireBonuses: 0,
          paymentBonuses: 0,
        },
      };

      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet.mockResolvedValueOnce(JSON.stringify(sessionData));

      const retrieved = await sessionCache.getSessionById(
        testSession.getId().getValue(),
      );

      expect(retrieved).toBeDefined();
      expect(retrieved?.getId().getValue()).toBe(
        testSession.getId().getValue(),
      );
    });

    it('should retrieve session by IP', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet
        .mockResolvedValueOnce(testSession.getId().getValue()) // IP -> session ID
        .mockResolvedValueOnce(
          JSON.stringify({
            // session data
            id: testSession.getId().getValue(),
            ip: '192.168.1.1',
            status: 'active',
            createdAt: new Date(),
            lastActiveAt: new Date(),
            quota: {
              daily: 5,
              used: 0,
              questionnaireBonuses: 0,
              paymentBonuses: 0,
            },
          }),
        );

      const retrieved = await sessionCache.getSessionByIP('192.168.1.1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.getIP().getValue()).toBe('192.168.1.1');
    });

    it('should return null for non-existent session', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet.mockResolvedValueOnce(null);

      const retrieved = await sessionCache.getSessionById('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should remove session cache', async () => {
      await sessionCache.removeSession(
        testSession.getId().getValue(),
        '192.168.1.1',
      );

      expect(redisClient.getClient().del).toHaveBeenCalledTimes(2); // session + IP mapping
    });

    it('should check session existence', async () => {
      const mockExists = redisClient.getClient().exists as jest.Mock;
      mockExists.mockResolvedValueOnce(1);

      const exists = await sessionCache.sessionExists(
        testSession.getId().getValue(),
      );

      expect(exists).toBe(true);
    });

    it('should get IP session stats', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      const mockTtl = redisClient.getClient().ttl as jest.Mock;

      mockGet.mockResolvedValueOnce('session-id');
      mockTtl.mockResolvedValueOnce(3600);

      const stats = await sessionCache.getIPSessionStats('192.168.1.1');

      expect(stats.hasActiveSession).toBe(true);
      expect(stats.sessionId).toBe('session-id');
      expect(stats.remainingTTL).toBe(3600);
    });
  });

  describe('UsageCacheService', () => {
    const testIP = '192.168.1.100';

    it('should get daily usage count', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet.mockResolvedValueOnce('3');

      const usage = await usageCache.getDailyUsage(testIP);

      expect(usage).toBe(3);
    });

    it('should return 0 for new IP', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet.mockResolvedValueOnce(null);

      const usage = await usageCache.getDailyUsage(testIP);

      expect(usage).toBe(0);
    });

    it('should increment daily usage', async () => {
      const mockIncr = redisClient.getClient().incr as jest.Mock;
      mockIncr.mockResolvedValueOnce(1);

      const newUsage = await usageCache.incrementDailyUsage(testIP);

      expect(newUsage).toBe(1);
      expect(redisClient.getClient().incr).toHaveBeenCalled();
    });

    it('should set TTL on first usage', async () => {
      const mockIncr = redisClient.getClient().incr as jest.Mock;
      mockIncr.mockResolvedValueOnce(1); // First usage

      await usageCache.incrementDailyUsage(testIP);

      expect(redisClient.getClient().expire).toHaveBeenCalled();
    });

    it('should get bonus quota', async () => {
      const mockGet = redisClient.getClient().get as jest.Mock;
      mockGet.mockResolvedValueOnce('5');

      const bonus = await usageCache.getBonusQuota(testIP, 'questionnaire');

      expect(bonus).toBe(5);
    });

    it('should add bonus quota', async () => {
      const mockPipeline = {
        incrby: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],
          [null, 1],
        ]),
      };

      const mockPipelineFactory = redisClient.getClient().pipeline as jest.Mock;
      mockPipelineFactory.mockReturnValue(mockPipeline);

      const newTotal = await usageCache.addBonusQuota(
        testIP,
        'questionnaire',
        5,
      );

      expect(newTotal).toBe(5);
      expect(mockPipeline.incrby).toHaveBeenCalledWith(
        expect.stringContaining('questionnaire'),
        5,
      );
    });

    it('should get total quota correctly', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '5'], // questionnaire bonus
          [null, '3'], // payment bonus
        ]),
      };

      const mockPipelineFactory = redisClient.getClient().pipeline as jest.Mock;
      mockPipelineFactory.mockReturnValue(mockPipeline);

      const quota = await usageCache.getTotalQuota(testIP, 5);

      expect(quota.base).toBe(5);
      expect(quota.questionnaire).toBe(5);
      expect(quota.payment).toBe(3);
      expect(quota.total).toBe(13);
    });

    it('should get usage status', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '2'], // used
          [null, '5'], // questionnaire bonus
          [null, '3'], // payment bonus
          [null, 3600], // ttl
        ]),
      };

      const mockPipelineFactory = redisClient.getClient().pipeline as jest.Mock;
      mockPipelineFactory.mockReturnValue(mockPipeline);

      const status = await usageCache.getUsageStatus(testIP, 5);

      expect(status.used).toBe(2);
      expect(status.quota.total).toBe(13); // 5 + 5 + 3
      expect(status.remaining).toBe(11); // 13 - 2
      expect(status.canUse).toBe(true);
    });

    it('should handle quota exhausted case', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '5'], // used (equals base quota)
          [null, null], // no questionnaire bonus
          [null, null], // no payment bonus
          [null, 3600],
        ]),
      };

      const mockPipelineFactory = redisClient.getClient().pipeline as jest.Mock;
      mockPipelineFactory.mockReturnValue(mockPipeline);

      const status = await usageCache.getUsageStatus(testIP, 5);

      expect(status.used).toBe(5);
      expect(status.remaining).toBe(0);
      expect(status.canUse).toBe(false);
    });

    it('should check if IP can use service', async () => {
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '2'], // used
          [null, null], // no questionnaire bonus
          [null, null], // no payment bonus
          [null, 3600],
        ]),
      };

      const mockPipelineFactory = redisClient.getClient().pipeline as jest.Mock;
      mockPipelineFactory.mockReturnValue(mockPipeline);

      const canUse = await usageCache.canUse(testIP, 5);

      expect(canUse).toBe(true);
    });
  });
});
