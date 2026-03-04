import { UsageCacheService } from './usage-cache.service';
import type { RedisClient } from './redis.client';

/**
 * Creates a mock RedisClient for testing.
 */
function createMockRedisClient(): jest.Mocked<RedisClient> {
  return {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    incr: jest.fn(),
    incrBy: jest.fn(),
    decr: jest.fn(),
    decrBy: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    lpush: jest.fn(),
    rpush: jest.fn(),
    lpop: jest.fn(),
    rpop: jest.fn(),
    llen: jest.fn(),
    lrange: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    ping: jest.fn(),
    flushdb: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    duplicate: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    connect: jest.fn(),
    disconnect: jest.fn(),
    mget: jest.fn(),
    getClient: jest.fn(),
  } as unknown as jest.Mocked<RedisClient>;
}

/**
 * Creates a mock pipeline for Redis batch operations.
 */
function createMockPipeline(): {
  incrby: jest.Mock;
  expire: jest.Mock;
  get: jest.Mock;
  ttl: jest.Mock;
  exec: jest.Mock;
  _setResults: (results: Array<[Error | null, unknown]>) => void;
} {
  const results: Array<[Error | null, unknown]> = [];

  const incrby = jest.fn();
  const expire = jest.fn();
  const get = jest.fn();
  const ttl = jest.fn();
  const exec = jest.fn(() => Promise.resolve(results));

  // Chain methods return the pipeline object
  const chainReturn = {};

  incrby.mockReturnValue(chainReturn);
  expire.mockReturnValue(chainReturn);
  get.mockReturnValue(chainReturn);
  ttl.mockReturnValue(chainReturn);

  return {
    incrby,
    expire,
    get,
    ttl,
    exec,
    _setResults: (newResults: Array<[Error | null, unknown]>) => {
      results.length = 0;
      results.push(...newResults);
    },
  };
}

describe('UsageCacheService', () => {
  let service: UsageCacheService;
  let mockRedis: jest.Mocked<RedisClient>;
  let mockPipeline: ReturnType<typeof createMockPipeline>;

  beforeEach(() => {
    mockRedis = createMockRedisClient();
    mockPipeline = createMockPipeline();
    mockRedis.getClient.mockReturnValue({
      pipeline: () => mockPipeline,
    } as unknown as ReturnType<RedisClient['getClient']>);
    service = new UsageCacheService(mockRedis);
    jest.clearAllMocks();
  });

  describe('getDailyUsage', () => {
    it('should return 0 when no usage exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getDailyUsage('192.168.1.1');

      expect(result).toBe(0);
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it('should return usage count when exists', async () => {
      mockRedis.get.mockResolvedValue('5');

      const result = await service.getDailyUsage('192.168.1.1');

      expect(result).toBe(5);
    });

    it('should handle invalid number gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid');

      const result = await service.getDailyUsage('192.168.1.1');

      expect(Number.isNaN(result)).toBe(true); // parseInt returns NaN for invalid
    });
  });

  describe('incrementDailyUsage', () => {
    it('should increment usage and set expiry on first use', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);

      const result = await service.incrementDailyUsage('192.168.1.1');

      expect(result).toBe(1);
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should increment usage without setting expiry on subsequent use', async () => {
      mockRedis.incr.mockResolvedValue(5);

      const result = await service.incrementDailyUsage('192.168.1.1');

      expect(result).toBe(5);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe('resetDailyUsage', () => {
    it('should delete usage key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.resetDailyUsage('192.168.1.1');

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getBonusQuota', () => {
    it('should return 0 when no bonus exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getBonusQuota('192.168.1.1', 'questionnaire');

      expect(result).toBe(0);
    });

    it('should return questionnaire bonus when exists', async () => {
      mockRedis.get.mockResolvedValue('10');

      const result = await service.getBonusQuota('192.168.1.1', 'questionnaire');

      expect(result).toBe(10);
    });

    it('should return payment bonus when exists', async () => {
      mockRedis.get.mockResolvedValue('5');

      const result = await service.getBonusQuota('192.168.1.1', 'payment');

      expect(result).toBe(5);
    });
  });

  describe('addBonusQuota', () => {
    it('should add bonus quota with pipeline', async () => {
      mockPipeline._setResults([[null, 15]]);

      const result = await service.addBonusQuota('192.168.1.1', 'questionnaire', 5);

      expect(result).toBe(15);
      expect(mockPipeline.incrby).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
    });

    it('should return 0 when pipeline result is null', async () => {
      mockPipeline._setResults([]);

      const result = await service.addBonusQuota('192.168.1.1', 'payment', 3);

      expect(result).toBe(0);
    });
  });

  describe('getTotalQuota', () => {
    it('should return base quota when no bonuses exist', async () => {
      mockPipeline._setResults([
        [null, null],
        [null, null],
      ]);

      const result = await service.getTotalQuota('192.168.1.1', 5);

      expect(result).toEqual({
        base: 5,
        questionnaire: 0,
        payment: 0,
        total: 5,
      });
    });

    it('should include bonuses in total quota', async () => {
      mockPipeline._setResults([
        [null, '10'],
        [null, '5'],
      ]);

      const result = await service.getTotalQuota('192.168.1.1', 5);

      expect(result).toEqual({
        base: 5,
        questionnaire: 10,
        payment: 5,
        total: 20,
      });
    });

    it('should use default base quota of 5', async () => {
      mockPipeline._setResults([
        [null, null],
        [null, null],
      ]);

      const result = await service.getTotalQuota('192.168.1.1');

      expect(result.base).toBe(5);
    });
  });

  describe('getUsageStatus', () => {
    it('should return complete usage status with TTL', async () => {
      mockPipeline._setResults([
        [null, '3'],
        [null, '2'],
        [null, '1'],
        [null, 3600],
      ]);

      const result = await service.getUsageStatus('192.168.1.1', 5);

      expect(result).toEqual({
        used: 3,
        quota: {
          base: 5,
          questionnaire: 2,
          payment: 1,
          total: 8,
        },
        remaining: 5,
        canUse: true,
        resetTime: expect.any(Date),
      });
    });

    it('should handle no usage with negative TTL', async () => {
      mockPipeline._setResults([
        [null, null],
        [null, null],
        [null, null],
        [null, -1],
      ]);

      const result = await service.getUsageStatus('192.168.1.1', 5);

      expect(result.used).toBe(0);
      expect(result.remaining).toBe(5);
      expect(result.canUse).toBe(true);
    });

    it('should return canUse false when quota exhausted', async () => {
      mockPipeline._setResults([
        [null, '10'],
        [null, null],
        [null, null],
        [null, 3600],
      ]);

      const result = await service.getUsageStatus('192.168.1.1', 5);

      expect(result.used).toBe(10);
      expect(result.remaining).toBe(0);
      expect(result.canUse).toBe(false);
    });
  });

  describe('canUse', () => {
    it('should return true when quota available', async () => {
      mockPipeline._setResults([
        [null, '2'],
        [null, null],
        [null, null],
        [null, 3600],
      ]);

      const result = await service.canUse('192.168.1.1', 5);

      expect(result).toBe(true);
    });

    it('should return false when quota exhausted', async () => {
      mockPipeline._setResults([
        [null, '10'],
        [null, null],
        [null, null],
        [null, 3600],
      ]);

      const result = await service.canUse('192.168.1.1', 5);

      expect(result).toBe(false);
    });
  });

  describe('cleanExpiredUsage', () => {
    it('should return 0 when no keys exist', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.cleanExpiredUsage();

      expect(result).toBe(0);
    });

    it('should clean keys with TTL -2 (expired)', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['usage:daily:2024-01-01:192.168.1.1'])
        .mockResolvedValueOnce([]);
      mockRedis.ttl.mockResolvedValue(-2);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.cleanExpiredUsage();

      expect(result).toBe(1);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should not clean keys with valid TTL', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['usage:daily:2024-01-01:192.168.1.1'])
        .mockResolvedValueOnce([]);
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await service.cleanExpiredUsage();

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should clean both daily and bonus patterns', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['usage:daily:2024-01-01:192.168.1.1'])
        .mockResolvedValueOnce(['usage:bonus:questionnaire:2024-01-01:192.168.1.1']);
      mockRedis.ttl.mockResolvedValue(-2);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.cleanExpiredUsage();

      expect(result).toBe(2);
    });
  });

  describe('getSystemUsageStats', () => {
    it('should return zeros when no active IPs', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getSystemUsageStats();

      expect(result).toEqual({
        totalActiveIPs: 0,
        totalUsageToday: 0,
        averageUsagePerIP: 0,
      });
    });

    it('should calculate stats for active IPs', async () => {
      mockRedis.keys.mockResolvedValue([
        'usage:daily:2024-01-01:192.168.1.1',
        'usage:daily:2024-01-01:192.168.1.2',
      ]);
      mockRedis.mget.mockResolvedValue(['5', '10']);

      const result = await service.getSystemUsageStats();

      expect(result.totalActiveIPs).toBe(2);
      expect(result.totalUsageToday).toBe(15);
      expect(result.averageUsagePerIP).toBe(7.5);
    });

    it('should handle null values in mget', async () => {
      mockRedis.keys.mockResolvedValue([
        'usage:daily:2024-01-01:192.168.1.1',
        'usage:daily:2024-01-01:192.168.1.2',
      ]);
      mockRedis.mget.mockResolvedValue(['5', null]);

      const result = await service.getSystemUsageStats();

      expect(result.totalUsageToday).toBe(5);
    });
  });

  describe('Private Methods', () => {
    describe('getDailyUsageKey', () => {
      it('should generate correct key format', () => {
        // Access private method via reflection
        const key = (service as unknown as { getDailyUsageKey(ip: string): string }).getDailyUsageKey('192.168.1.1');
        const today = new Date().toISOString().split('T')[0];

        expect(key).toBe(`usage:daily:${today}:192.168.1.1`);
      });
    });

    describe('getBonusKey', () => {
      it('should generate correct key format for questionnaire', () => {
        const key = (service as unknown as { getBonusKey(ip: string, type: 'questionnaire' | 'payment'): string }).getBonusKey('192.168.1.1', 'questionnaire');
        const today = new Date().toISOString().split('T')[0];

        expect(key).toBe(`usage:bonus:questionnaire:${today}:192.168.1.1`);
      });

      it('should generate correct key format for payment', () => {
        const key = (service as unknown as { getBonusKey(ip: string, type: 'questionnaire' | 'payment'): string }).getBonusKey('192.168.1.1', 'payment');
        const today = new Date().toISOString().split('T')[0];

        expect(key).toBe(`usage:bonus:payment:${today}:192.168.1.1`);
      });
    });

    describe('getSecondsUntilMidnight', () => {
      it('should return positive number', () => {
        const seconds = (service as unknown as { getSecondsUntilMidnight(): number }).getSecondsUntilMidnight();

        expect(seconds).toBeGreaterThan(0);
        expect(seconds).toBeLessThanOrEqual(86400); // Max 24 hours in seconds
      });
    });

    describe('getNextMidnight', () => {
      it('should return a future date', () => {
        const midnight = (service as unknown as { getNextMidnight(): Date }).getNextMidnight();
        const now = new Date();

        expect(midnight.getTime()).toBeGreaterThan(now.getTime());
      });
    });
  });
});
