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
});

