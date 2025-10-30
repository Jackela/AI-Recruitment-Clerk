import { RedisClient } from './redis.client';

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
