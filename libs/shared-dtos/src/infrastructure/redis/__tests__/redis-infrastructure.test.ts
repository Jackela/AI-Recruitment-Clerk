// Mock Redis implementations for testing business logic
class MockRedisClient {
  private storage = new Map<string, string>();
  private ttls = new Map<string, number>();

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.storage.set(key, value);
    if (ttl) {
      this.ttls.set(key, Date.now() + ttl * 1000);
    }
  }

  async get(key: string): Promise<string | null> {
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.storage.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.storage.get(key) || null;
  }

  async del(key: string): Promise<number> {
    const deleted = this.storage.delete(key);
    this.ttls.delete(key);
    return deleted ? 1 : 0;
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.storage.get(key) || '0', 10);
    const newValue = current + 1;
    this.storage.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (this.storage.has(key)) {
      this.ttls.set(key, Date.now() + seconds * 1000);
      return true;
    }
    return false;
  }

  async ttl(key: string): Promise<number> {
    const ttl = this.ttls.get(key);
    if (!ttl) return -1;
    const remaining = Math.ceil((ttl - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  getClient() {
    return {
      pipeline: () => ({
        get: () => this,
        incrby: () => this,
        expire: () => this,
        exec: async () => [
          [null, '5'],
          [null, '3'],
        ],
      }),
    };
  }

  async connect() {}
  isRedisConnected() {
    return true;
  }
}

describe('Redis Infrastructure', () => {
  let mockRedis: MockRedisClient;

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

      expect(redisClient.getClient().set).toHaveBeenCalledTimes(2); // session + IP mapping
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
