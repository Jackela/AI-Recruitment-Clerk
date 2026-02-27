import { RedisClient } from './redis.client';

// Mock ioredis - this creates a new mock instance for each test that imports the module
const mockFns = {
  on: jest.fn().mockReturnThis(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(3600),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(-1),
  mset: jest.fn().mockResolvedValue('OK'),
  mget: jest.fn().mockResolvedValue(['value1', null, 'value3']),
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue('fieldValue'),
  hgetall: jest.fn().mockResolvedValue({ field1: 'value1', field2: 'value2' }),
  hdel: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue(['key1', 'key2']),
  eval: jest.fn().mockResolvedValue('result'),
  status: 'ready' as string,
};

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockFns),
}));

import { Redis } from 'ioredis';

describe('RedisClient (in-memory mode)', () => {
  const prevEnv = { ...process.env } as Record<string, string | undefined>;

  beforeAll(() => {
    process.env.DISABLE_REDIS = 'true';
    delete process.env.USE_REDIS_CACHE;
    delete process.env.REDIS_URL;
    delete process.env.REDISHOST;
    delete process.env.REDIS_HOST;
  });

  afterAll(() => {
    process.env = prevEnv;
  });

  it('sets and gets simple values', async () => {
    const client = new RedisClient();
    await client.connect();
    await client.set('k1', 'v1');
    await expect(client.get('k1')).resolves.toBe('v1');
  });

  it('handles expiration (ttl/expire)', async () => {
    const client = new RedisClient();
    await client.set('k2', 'v2');
    await expect(client.ttl('k2')).resolves.toBe(-1);
    await client.expire('k2', 1);
    const ttl = await client.ttl('k2');
    expect(ttl === 1 || ttl === 0).toBe(true); // small timing window
  });

  it('incr/decr behave atomically (in-memory)', async () => {
    const client = new RedisClient();
    await client.set('num', '0');
    await expect(client.incr('num')).resolves.toBe(1);
    await expect(client.decr('num')).resolves.toBe(0);
  });

  it('mset/mget work for multiple keys', async () => {
    const client = new RedisClient();
    await client.mset({ a: '1', b: '2', c: '3' });
    await expect(client.mget(['a', 'b', 'c'])).resolves.toEqual(['1', '2', '3']);
  });

  it('hash operations hset/hget/hgetall/hdel work', async () => {
    const client = new RedisClient();
    const key = 'hash:1';
    await expect(client.hset(key, 'f1', 'x')).resolves.toBe(1);
    await expect(client.hset(key, 'f1', 'y')).resolves.toBe(0); // overwrite
    await expect(client.hget(key, 'f1')).resolves.toBe('y');
    await expect(client.hgetall(key)).resolves.toEqual({ f1: 'y' });
    await expect(client.hdel(key, 'f1')).resolves.toBe(1);
    await expect(client.hgetall(key)).resolves.toEqual({});
  });

  it('keys(pattern) returns matching keys', async () => {
    const client = new RedisClient();
    await client.mset({ 'p:1': 'a', 'p:2': 'b', 'q:1': 'c' });
    const keys = await client.keys('p:*');
    expect(keys.sort()).toEqual(['p:1', 'p:2']);
  });

  it('exists/del reflect presence', async () => {
    const client = new RedisClient();
    await client.set('todel', 'x');
    await expect(client.exists('todel')).resolves.toBe(true);
    await expect(client.del('todel')).resolves.toBe(1);
    await expect(client.exists('todel')).resolves.toBe(false);
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - Invalid Operations', () => {
    it('handles invalid key/value scenarios gracefully', async () => {
      const client = new RedisClient();
      await client.connect();

      await expect(client.get('nonexistent')).resolves.toBeNull();

      await client.set('', 'empty-key-value');
      await expect(client.get('')).resolves.toBe('empty-key-value');

      await client.set('null-key', null as any);
      await expect(client.get('null-key')).resolves.toBe('null');

      await client.set('undefined-key', undefined as any);
      await expect(client.get('undefined-key')).resolves.toBe('undefined');

      await expect(client.incr('new-counter')).resolves.toBe(1);
      await expect(client.get('new-counter')).resolves.toBe('1');

      await expect(client.decr('new-decrement')).resolves.toBe(-1);
      await expect(client.get('new-decrement')).resolves.toBe('-1');

      await expect(client.del('nonexistent')).resolves.toBe(0);
      await expect(client.hdel('nonexistent-hash', 'field')).resolves.toBe(0);
    });
  });

  describe('Boundary Tests - Expiration and TTL', () => {
    it('covers zero, large, negative, and missing expiration scenarios', async () => {
      const client = new RedisClient();
      await client.connect();

      await client.set('expire-zero', 'value');
      await client.expire('expire-zero', 0);
      await expect(client.ttl('expire-zero')).resolves.toBe(-2);

      await expect(client.ttl('nonexistent')).resolves.toBe(-2);

      await client.set('long-expire', 'value');
      await client.expire('long-expire', 86400 * 365); // 1 year
      const ttl = await client.ttl('long-expire');
      expect(ttl).toBeGreaterThan(86400 * 364);

      await client.set('negative-expire', 'value');
      await client.expire('negative-expire', -100);
      await expect(client.exists('negative-expire')).resolves.toBe(false);
    });
  });

  describe('Boundary Tests - Counter Operations', () => {
    it('supports high, negative, and concurrent counter flows', async () => {
      const client = new RedisClient();
      await client.connect();

      await client.set('max-counter', String(Number.MAX_SAFE_INTEGER - 1));
      await expect(client.incr('max-counter')).resolves.toBe(
        Number.MAX_SAFE_INTEGER,
      );

      await client.set('negative-counter', '5');
      for (let i = 0; i < 10; i++) {
        await client.decr('negative-counter');
      }
      await expect(client.get('negative-counter')).resolves.toBe('-5');

      await client.set('concurrent-counter', '0');
      const increments = Array.from({ length: 10 }, () =>
        client.incr('concurrent-counter'),
      );
      await Promise.all(increments);
      await expect(client.get('concurrent-counter')).resolves.toBe('10');
    });
  });

  describe('Boundary Tests - Hash Operations', () => {
    it('supports empty hashes, dense hashes, and missing fields', async () => {
      const client = new RedisClient();
      await client.connect();

      await expect(client.hgetall('empty-hash')).resolves.toEqual({});

      const largeHash: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        await client.hset('large-hash', `field-${i}`, `value-${i}`);
        largeHash[`field-${i}`] = `value-${i}`;
      }
      await expect(client.hgetall('large-hash')).resolves.toEqual(largeHash);

      await client.hset('test-hash', 'field1', 'value1');
      await expect(client.hget('test-hash', 'nonexistent')).resolves.toBeNull();
    });
  });

  describe('Boundary Tests - Pattern Matching', () => {
    it('matches none, wildcard, and scoped key patterns', async () => {
      const client = new RedisClient();
      await client.connect();

      await client.set('foo', 'bar');
      await expect(client.keys('nomatch:*')).resolves.toEqual([]);

      await client.mset({ 'a:1': '1', 'b:2': '2', 'c:3': '3' });
      const allKeys = await client.keys('*');
      expect(allKeys.length).toBeGreaterThanOrEqual(3);

      await client.mset({
        'prefix:123:suffix': 'a',
        'prefix:456:suffix': 'b',
        'prefix:789:other': 'c',
      });
      const scopedKeys = await client.keys('prefix:*:suffix');
      expect(scopedKeys.sort()).toEqual(['prefix:123:suffix', 'prefix:456:suffix']);
    });
  });

  describe('Boundary Tests - Batch Operations', () => {
    it('handles empty, single, mixed, and large batch flows', async () => {
      const client = new RedisClient();
      await client.connect();

      await client.mset({});
      await expect(client.mget([])).resolves.toEqual([]);

      await client.mset({ 'single-key': 'single-value' });
      await expect(client.mget(['single-key'])).resolves.toEqual(['single-value']);

      await client.set('exists', 'value');
      await expect(
        client.mget(['exists', 'nonexistent', 'also-nonexistent']),
      ).resolves.toEqual(['value', null, null]);

      const manyPairs: Record<string, string> = {};
      const keys: string[] = [];
      for (let i = 0; i < 50; i++) {
        const key = `batch-key-${i}`;
        manyPairs[key] = `batch-value-${i}`;
        keys.push(key);
      }

      await client.mset(manyPairs);
      const values = await client.mget(keys);
      expect(values).toHaveLength(50);
      expect(values.every((v) => v !== null)).toBe(true);
    });
  });

  describe('Edge Cases - Special Characters and Unicode', () => {
    it('supports special keys, unicode, emojis, and large payloads', async () => {
      const client = new RedisClient();
      await client.connect();

      await client.set('key:with:colons', 'value1');
      await client.set('key-with-dashes', 'value2');
      await client.set('key_with_underscores', 'value3');
      await client.set('key.with.dots', 'value4');

      await expect(client.get('key:with:colons')).resolves.toBe('value1');
      await expect(client.get('key-with-dashes')).resolves.toBe('value2');
      await expect(client.get('key_with_underscores')).resolves.toBe('value3');
      await expect(client.get('key.with.dots')).resolves.toBe('value4');

      await client.set('unicode-key', '你好世界');
      await expect(client.get('unicode-key')).resolves.toBe('你好世界');

      await client.set('emoji-key', '🚀🎉👍');
      await expect(client.get('emoji-key')).resolves.toBe('🚀🎉👍');

      const longKey = 'k'.repeat(1000);
      await client.set(longKey, 'long-key-value');
      await expect(client.get(longKey)).resolves.toBe('long-key-value');

      const longValue = 'v'.repeat(10000);
      await client.set('long-value-key', longValue);
      await expect(client.get('long-value-key')).resolves.toBe(longValue);
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent set/get operations', async () => {
      const client = new RedisClient();
      await client.connect();

      const operations = Array(20).fill(null).map((_, i) =>
        client.set(`concurrent-key-${i}`, `concurrent-value-${i}`)
      );

      await Promise.all(operations);

      const getOps = Array(20).fill(null).map((_, i) => client.get(`concurrent-key-${i}`));
      const results = await Promise.all(getOps);

      expect(results).toHaveLength(20);
      results.forEach((val, i) => {
        expect(val).toBe(`concurrent-value-${i}`);
      });
    });

    it('should handle concurrent hash operations', async () => {
      const client = new RedisClient();
      await client.connect();

      const hashOps = Array(15).fill(null).map((_, i) =>
        client.hset('concurrent-hash', `field-${i}`, `value-${i}`)
      );

      await Promise.all(hashOps);

      const hash = await client.hgetall('concurrent-hash');
      expect(Object.keys(hash)).toHaveLength(15);
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('verifies scalar and hash operation return values', async () => {
      const client = new RedisClient();
      await client.connect();

      const setResult = await client.set('type-test', 'value');
      expect(setResult).toBe('OK');

      const incrResult = await client.incr('counter-test');
      expect(typeof incrResult).toBe('number');
      expect(incrResult).toBe(1);

      const existsResult = await client.exists('type-test');
      expect(typeof existsResult).toBe('boolean');
      expect(existsResult).toBe(true);

      const delResult = await client.del('type-test');
      expect(typeof delResult).toBe('number');
      expect(delResult).toBe(1);

      const hsetNewResult = await client.hset('hash-test', 'field1', 'value1');
      expect(hsetNewResult).toBe(1);

      const hsetUpdateResult = await client.hset('hash-test', 'field1', 'value2');
      expect(hsetUpdateResult).toBe(0);

      const hgetResult = await client.hget('hash-test', 'field1');
      expect(typeof hgetResult).toBe('string');
      expect(hgetResult).toBe('value2');

      const hdelResult = await client.hdel('hash-test', 'field1');
      expect(hdelResult).toBe(1);
    });
  });
});

describe('RedisClient (Redis mode - constructor)', () => {
  const prevEnv = { ...process.env } as Record<string, string | undefined>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock functions
    Object.values(mockFns).forEach(fn => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as jest.Mock).mockClear();
      }
    });
    mockFns.on.mockReturnThis();
    mockFns.connect.mockResolvedValue(undefined);
    mockFns.disconnect.mockResolvedValue(undefined);
    mockFns.status = 'ready';
  });

  afterAll(() => {
    process.env = prevEnv;
  });

  describe('Constructor - Redis URL mode', () => {
    it('should create Redis client with URL when USE_REDIS_CACHE is true', () => {
      process.env.DISABLE_REDIS = undefined;
      process.env.USE_REDIS_CACHE = 'true';
      process.env.REDIS_URL = 'redis://localhost:6379';
      delete process.env.REDISHOST;

      new RedisClient();

      expect(Redis).toHaveBeenCalled();
      expect(mockFns.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockFns.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockFns.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockFns.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockFns.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });

    it('should add family=0 parameter for railway.internal URLs', () => {
      process.env.REDIS_URL = 'redis://user:pass@redis.railway.internal:6379';

      new RedisClient();

      expect(Redis).toHaveBeenCalledWith(
        expect.stringContaining('family=0'),
        expect.any(Object)
      );
    });

    it('should handle invalid URL gracefully', () => {
      process.env.REDIS_URL = 'not-a-valid-url';

      // Should not throw, falls back to original URL
      expect(() => new RedisClient()).not.toThrow();
    });
  });

  describe('Constructor - Redis Host mode', () => {
    it('should create Redis client with host/port when REDISHOST is set', () => {
      delete process.env.REDIS_URL;
      process.env.REDISHOST = 'redis.example.com';
      process.env.REDISPORT = '6380';
      process.env.REDIS_PASSWORD = 'secret';
      process.env.REDIS_DB = '1';

      new RedisClient();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret',
          db: 1,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })
      );
    });

    it('should use REDIS_HOST as fallback for REDISHOST', () => {
      delete process.env.REDIS_URL;
      delete process.env.REDISHOST;
      delete process.env.REDISPORT;  // This was set by the previous test
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_DB;
      process.env.REDIS_HOST = 'redis-fallback.example.com';
      process.env.REDIS_PORT = '6381';

      new RedisClient();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis-fallback.example.com',
          port: 6381,
        })
      );
    });

    it('should throw error when REDISHOST is set but REDISPORT is missing', () => {
      delete process.env.REDIS_URL;
      delete process.env.REDISPORT;
      delete process.env.REDIS_PORT;
      process.env.REDISHOST = 'redis.example.com';

      expect(() => new RedisClient()).toThrow(
        'Redis configuration incomplete: REDISHOST found but REDISPORT/REDIS_PORT is missing'
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis client on module destroy', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.DISABLE_REDIS = undefined;
      process.env.USE_REDIS_CACHE = 'true';

      const client = new RedisClient();

      await client.onModuleDestroy();

      expect(mockFns.disconnect).toHaveBeenCalled();
    });

    it('should not throw when redis is null', async () => {
      process.env.DISABLE_REDIS = 'true';

      const client = new RedisClient();

      // Should not throw
      await expect(client.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('getClient', () => {
    it('should return the Redis instance when not in in-memory mode', () => {
      process.env.DISABLE_REDIS = undefined;
      process.env.USE_REDIS_CACHE = 'true';
      process.env.REDIS_URL = 'redis://localhost:6379';

      const client = new RedisClient();
      const redisClient = client.getClient();

      expect(redisClient).toBeDefined();
    });

    it('should throw error when in in-memory mode', () => {
      process.env.DISABLE_REDIS = 'true';

      const client = new RedisClient();

      expect(() => client.getClient()).toThrow(
        'Redis client is not available in in-memory mode'
      );
    });
  });

  describe('isRedisConnected', () => {
    it('should return true when connected and status is ready', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.DISABLE_REDIS = undefined;
      process.env.USE_REDIS_CACHE = 'true';
      mockFns.status = 'ready';

      const client = new RedisClient();

      // Trigger the ready event
      const readyCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
      )?.[1] as (() => void) | undefined;
      readyCallback?.();

      expect(client.isRedisConnected()).toBe(true);
    });

    it('should return false when status is not ready', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockFns.status = 'wait';

      const client = new RedisClient();

      expect(client.isRedisConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should call redis.connect when not connected', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      mockFns.status = 'wait';

      const client = new RedisClient();

      // Reset isConnected by simulating disconnect
      const errorCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'error'
      )?.[1] as ((err: Error) => void) | undefined;
      errorCallback?.(new Error('Connection lost'));

      await client.connect();

      expect(mockFns.connect).toHaveBeenCalled();
    });

    it('should not call redis.connect when already connected', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const client = new RedisClient();

      // Trigger the ready event to set isConnected = true
      const readyCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
      )?.[1] as (() => void) | undefined;
      readyCallback?.();

      (mockFns.connect as jest.Mock).mockClear();

      await client.connect();

      expect(mockFns.connect).not.toHaveBeenCalled();
    });
  });

  describe('Event handlers', () => {
    it('should log on connect event', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      new RedisClient();

      const connectCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'connect'
      )?.[1] as (() => void) | undefined;
      connectCallback?.();

      expect(consoleSpy).toHaveBeenCalledWith('Redis connection established');
      consoleSpy.mockRestore();
    });

    it('should set isConnected on ready event', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const client = new RedisClient();

      const readyCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
      )?.[1] as (() => void) | undefined;
      readyCallback?.();

      expect(consoleSpy).toHaveBeenCalledWith('Redis client ready');
      expect(client.isRedisConnected()).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should log error and set isConnected to false on error event', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const client = new RedisClient();

      // First set connected
      const readyCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
      )?.[1] as (() => void) | undefined;
      readyCallback?.();

      const testError = new Error('Test error');
      const errorCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'error'
      )?.[1] as ((err: Error) => void) | undefined;
      errorCallback?.(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Redis client error:', testError);
      expect(client.isRedisConnected()).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should log and set isConnected to false on close event', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const client = new RedisClient();

      // First set connected
      const readyCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
      )?.[1] as (() => void) | undefined;
      readyCallback?.();

      const closeCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'close'
      )?.[1] as (() => void) | undefined;
      closeCallback?.();

      expect(consoleSpy).toHaveBeenCalledWith('Redis connection closed');
      expect(client.isRedisConnected()).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should log on reconnecting event', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const client = new RedisClient();

      const reconnectingCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'reconnecting'
      )?.[1] as (() => void) | undefined;
      reconnectingCallback?.();

      expect(consoleSpy).toHaveBeenCalledWith('Redis client reconnecting...');
      expect(client.isRedisConnected()).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('Redis operations', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.DISABLE_REDIS = undefined;
      process.env.USE_REDIS_CACHE = 'true';
    });

    describe('set', () => {
      it('should call redis.setex when TTL is provided', async () => {
        const client = new RedisClient();

        // Trigger ready event
        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.set('key1', 'value1', 3600);

        expect(mockFns.setex).toHaveBeenCalledWith('key1', 3600, 'value1');
        expect(result).toBe('OK');
      });

      it('should call redis.set when TTL is not provided', async () => {
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.set('key1', 'value1');

        expect(mockFns.set).toHaveBeenCalledWith('key1', 'value1');
        expect(result).toBe('OK');
      });
    });

    describe('get', () => {
      it('should call redis.get and return value', async () => {
        (mockFns.get as jest.Mock).mockResolvedValueOnce('retrieved-value');
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.get('key1');

        expect(mockFns.get).toHaveBeenCalledWith('key1');
        expect(result).toBe('retrieved-value');
      });

      it('should return null when redis.get returns null', async () => {
        (mockFns.get as jest.Mock).mockResolvedValueOnce(null);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.get('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('del', () => {
      it('should call redis.del and return count', async () => {
        (mockFns.del as jest.Mock).mockResolvedValueOnce(1);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.del('key1');

        expect(mockFns.del).toHaveBeenCalledWith('key1');
        expect(result).toBe(1);
      });

      it('should return 0 when redis.del returns 0', async () => {
        (mockFns.del as jest.Mock).mockResolvedValueOnce(0);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.del('nonexistent');

        expect(result).toBe(0);
      });
    });

    describe('exists', () => {
      it('should return true when key exists', async () => {
        (mockFns.exists as jest.Mock).mockResolvedValueOnce(1);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.exists('key1');

        expect(mockFns.exists).toHaveBeenCalledWith('key1');
        expect(result).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        (mockFns.exists as jest.Mock).mockResolvedValueOnce(0);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.exists('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('expire', () => {
      it('should return true when expire succeeds', async () => {
        (mockFns.expire as jest.Mock).mockResolvedValueOnce(1);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.expire('key1', 3600);

        expect(mockFns.expire).toHaveBeenCalledWith('key1', 3600);
        expect(result).toBe(true);
      });

      it('should return false when expire fails', async () => {
        (mockFns.expire as jest.Mock).mockResolvedValueOnce(0);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.expire('nonexistent', 3600);

        expect(result).toBe(false);
      });
    });

    describe('ttl', () => {
      it('should return TTL value', async () => {
        (mockFns.ttl as jest.Mock).mockResolvedValueOnce(3600);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.ttl('key1');

        expect(mockFns.ttl).toHaveBeenCalledWith('key1');
        expect(result).toBe(3600);
      });

      it('should return -2 when key does not exist', async () => {
        (mockFns.ttl as jest.Mock).mockResolvedValueOnce(-2);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.ttl('nonexistent');

        expect(result).toBe(-2);
      });
    });

    describe('incr', () => {
      it('should increment and return new value', async () => {
        (mockFns.incr as jest.Mock).mockResolvedValueOnce(5);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.incr('counter');

        expect(mockFns.incr).toHaveBeenCalledWith('counter');
        expect(result).toBe(5);
      });
    });

    describe('decr', () => {
      it('should decrement and return new value', async () => {
        (mockFns.decr as jest.Mock).mockResolvedValueOnce(3);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.decr('counter');

        expect(mockFns.decr).toHaveBeenCalledWith('counter');
        expect(result).toBe(3);
      });
    });

    describe('mset', () => {
      it('should call redis.mset with flattened key-values', async () => {
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        await client.mset({ key1: 'value1', key2: 'value2' });

        expect(mockFns.mset).toHaveBeenCalledWith('key1', 'value1', 'key2', 'value2');
      });
    });

    describe('mget', () => {
      it('should call redis.mget and return results', async () => {
        (mockFns.mget as jest.Mock).mockResolvedValueOnce(['value1', 'value2']);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.mget(['key1', 'key2']);

        expect(mockFns.mget).toHaveBeenCalledWith('key1', 'key2');
        expect(result).toEqual(['value1', 'value2']);
      });

      it('should return empty array when redis returns empty', async () => {
        (mockFns.mget as jest.Mock).mockResolvedValueOnce([]);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.mget(['key1']);

        expect(result).toEqual([]);
      });
    });

    describe('hset', () => {
      it('should call redis.hset and return 1 for new field', async () => {
        (mockFns.hset as jest.Mock).mockResolvedValueOnce(1);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hset('hash1', 'field1', 'value1');

        expect(mockFns.hset).toHaveBeenCalledWith('hash1', 'field1', 'value1');
        expect(result).toBe(1);
      });
    });

    describe('hget', () => {
      it('should call redis.hget and return value', async () => {
        (mockFns.hget as jest.Mock).mockResolvedValueOnce('fieldValue');
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hget('hash1', 'field1');

        expect(mockFns.hget).toHaveBeenCalledWith('hash1', 'field1');
        expect(result).toBe('fieldValue');
      });

      it('should return null when field does not exist', async () => {
        (mockFns.hget as jest.Mock).mockResolvedValueOnce(null);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hget('hash1', 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('hgetall', () => {
      it('should call redis.hgetall and return object', async () => {
        (mockFns.hgetall as jest.Mock).mockResolvedValueOnce({ field1: 'value1', field2: 'value2' });
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hgetall('hash1');

        expect(mockFns.hgetall).toHaveBeenCalledWith('hash1');
        expect(result).toEqual({ field1: 'value1', field2: 'value2' });
      });

      it('should return empty object when hash does not exist', async () => {
        (mockFns.hgetall as jest.Mock).mockResolvedValueOnce({});
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hgetall('nonexistent');

        expect(result).toEqual({});
      });
    });

    describe('hdel', () => {
      it('should call redis.hdel and return 1 when field exists', async () => {
        (mockFns.hdel as jest.Mock).mockResolvedValueOnce(1);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hdel('hash1', 'field1');

        expect(mockFns.hdel).toHaveBeenCalledWith('hash1', 'field1');
        expect(result).toBe(1);
      });

      it('should return 0 when field does not exist', async () => {
        (mockFns.hdel as jest.Mock).mockResolvedValueOnce(0);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.hdel('hash1', 'nonexistent');

        expect(result).toBe(0);
      });
    });

    describe('keys', () => {
      it('should call redis.keys and return matching keys', async () => {
        (mockFns.keys as jest.Mock).mockResolvedValueOnce(['key1', 'key2', 'key3']);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.keys('prefix:*');

        expect(mockFns.keys).toHaveBeenCalledWith('prefix:*');
        expect(result).toEqual(['key1', 'key2', 'key3']);
      });

      it('should return empty array when no keys match', async () => {
        (mockFns.keys as jest.Mock).mockResolvedValueOnce([]);
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.keys('nomatch:*');

        expect(result).toEqual([]);
      });
    });

    describe('eval', () => {
      it('should call redis.eval with script and return result', async () => {
        (mockFns.eval as jest.Mock).mockResolvedValueOnce('script-result');
        const client = new RedisClient();

        const readyCallback = mockFns.on.mock.calls.find(
          (call: unknown[]) => Array.isArray(call) && call[0] === 'ready'
        )?.[1] as (() => void) | undefined;
        readyCallback?.();

        const result = await client.eval('return redis.call("GET", KEYS[1])', ['key1'], ['arg1']);

        expect(mockFns.eval).toHaveBeenCalledWith(
          'return redis.call("GET", KEYS[1])',
          1,
          'key1',
          'arg1'
        );
        expect(result).toBe('script-result');
      });

      it('should return null in in-memory mode', async () => {
        process.env.DISABLE_REDIS = 'true';

        const client = new RedisClient();

        const result = await client.eval('script', [], []);

        expect(result).toBeNull();
      });
    });
  });

  describe('ensureConnection', () => {
    it('should call connect when not connected', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.DISABLE_REDIS = undefined;
      process.env.USE_REDIS_CACHE = 'true';

      const client = new RedisClient();

      // Ensure not connected by triggering error
      const errorCallback = mockFns.on.mock.calls.find(
        (call: unknown[]) => Array.isArray(call) && call[0] === 'error'
      )?.[1] as ((err: Error) => void) | undefined;
      errorCallback?.(new Error('Not connected'));

      await client.get('key');

      expect(mockFns.connect).toHaveBeenCalled();
    });
  });
});
