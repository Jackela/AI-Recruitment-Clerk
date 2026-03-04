import { SessionCacheService } from './session-cache.service';
import type { RedisClient } from './redis.client';
import {
  UserSession,
  SessionStatus,
  type SessionData,
} from '../../domains/user-management.dto';

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
  } as unknown as jest.Mocked<RedisClient>;
}

/**
 * Creates a test UserSession.
 */
function createTestSession(ip = '192.168.1.1'): UserSession {
  return UserSession.create(ip);
}

describe('SessionCacheService', () => {
  let service: SessionCacheService;
  let mockRedis: jest.Mocked<RedisClient>;

  beforeEach(() => {
    mockRedis = createMockRedisClient();
    service = new SessionCacheService(mockRedis);
    jest.clearAllMocks();
  });

  describe('cacheSession', () => {
    it('should cache session data and IP mapping', async () => {
      const session = createTestSession('10.0.0.1');
      mockRedis.set.mockResolvedValue('OK');

      await service.cacheSession(session);

      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      // Verify the calls were made with the right key patterns
      const calls = mockRedis.set.mock.calls;
      const sessionKeyCall = calls.find((call) =>
        (call[0] as string).startsWith('session:'),
      );
      const ipKeyCall = calls.find((call) =>
        (call[0] as string).startsWith('ip_session:'),
      );
      expect(sessionKeyCall).toBeDefined();
      expect(ipKeyCall).toBeDefined();
    });
  });

  describe('getSessionById', () => {
    it('should return null when session not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSessionById('nonexistent');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('session:nonexistent');
    });

    it('should return session when found', async () => {
      const sessionData: SessionData = {
        id: 'session-456',
        ip: '192.168.0.1',
        status: SessionStatus.ACTIVE,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        quota: { daily: 10, used: 5, questionnaireBonuses: 0, paymentBonuses: 0 },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await service.getSessionById('session-456');

      expect(result).not.toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('session:session-456');
    });

    it('should return null when JSON parsing fails', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await service.getSessionById('session-789');

      expect(result).toBeNull();
    });
  });

  describe('getSessionByIP', () => {
    it('should return null when IP has no session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSessionByIP('10.0.0.2');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('ip_session:10.0.0.2');
    });

    it('should return session when IP has session', async () => {
      mockRedis.get.mockResolvedValueOnce('session-ip-123');
      const sessionData: SessionData = {
        id: 'session-ip-123',
        ip: '10.0.0.3',
        status: SessionStatus.ACTIVE,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        quota: { daily: 10, used: 2, questionnaireBonuses: 0, paymentBonuses: 0 },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      const result = await service.getSessionByIP('10.0.0.3');

      expect(result).not.toBeNull();
    });
  });

  describe('removeSession', () => {
    it('should delete session and IP mapping', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.removeSession('session-del', '10.0.0.4');

      expect(mockRedis.del).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('session:session-del');
      expect(mockRedis.del).toHaveBeenCalledWith('ip_session:10.0.0.4');
    });
  });

  describe('sessionExists', () => {
    it('should return true when session exists', async () => {
      mockRedis.exists.mockResolvedValue(true);

      const result = await service.sessionExists('existing-session');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('session:existing-session');
    });

    it('should return false when session does not exist', async () => {
      mockRedis.exists.mockResolvedValue(false);

      const result = await service.sessionExists('nonexistent-session');

      expect(result).toBe(false);
    });
  });

  describe('getIPSessionStats', () => {
    it('should return no active session when IP has no session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getIPSessionStats('10.0.0.5');

      expect(result).toEqual({ hasActiveSession: false });
    });

    it('should return session stats when IP has active session', async () => {
      mockRedis.get.mockResolvedValue('stats-session');
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await service.getIPSessionStats('10.0.0.6');

      expect(result).toEqual({
        hasActiveSession: true,
        sessionId: 'stats-session',
        remainingTTL: 3600,
      });
    });

    it('should not include remainingTTL when ttl is negative', async () => {
      mockRedis.get.mockResolvedValue('ttl-session');
      mockRedis.ttl.mockResolvedValue(-1);

      const result = await service.getIPSessionStats('10.0.0.7');

      expect(result.hasActiveSession).toBe(true);
      expect(result.remainingTTL).toBeUndefined();
    });
  });

  describe('cleanExpiredSessions', () => {
    it('should return 0 when no sessions exist', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.cleanExpiredSessions();

      expect(result).toBe(0);
      expect(mockRedis.keys).toHaveBeenCalledWith('session:*');
    });

    it('should clean sessions with TTL -1 (no expiry)', async () => {
      mockRedis.keys.mockResolvedValue(['session:old1', 'session:old2']);
      mockRedis.ttl.mockResolvedValueOnce(-1);
      mockRedis.ttl.mockResolvedValueOnce(100);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.cleanExpiredSessions();

      expect(result).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('session:old1');
      expect(mockRedis.del).not.toHaveBeenCalledWith('session:old2');
    });

    it('should clean sessions with TTL -2 (expired)', async () => {
      mockRedis.keys.mockResolvedValue(['session:expired']);
      mockRedis.ttl.mockResolvedValue(-2);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.cleanExpiredSessions();

      expect(result).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('session:expired');
    });

    it('should not clean sessions with valid TTL', async () => {
      mockRedis.keys.mockResolvedValue(['session:valid']);
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await service.cleanExpiredSessions();

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return 0 when no sessions exist', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getActiveSessionCount();

      expect(result).toBe(0);
    });

    it('should return count of active sessions', async () => {
      mockRedis.keys.mockResolvedValue(['session:1', 'session:2', 'session:3']);

      const result = await service.getActiveSessionCount();

      expect(result).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith('session:*');
    });
  });

  describe('extendSessionTTL', () => {
    it('should extend TTL for both session and IP keys', async () => {
      mockRedis.expire.mockResolvedValue(true);

      await service.extendSessionTTL('extend-session', '10.0.0.8', 7200);

      expect(mockRedis.expire).toHaveBeenCalledTimes(2);
      expect(mockRedis.expire).toHaveBeenCalledWith('session:extend-session', 7200);
      expect(mockRedis.expire).toHaveBeenCalledWith('ip_session:10.0.0.8', 7200);
    });

    it('should use default TTL when not specified', async () => {
      mockRedis.expire.mockResolvedValue(true);

      await service.extendSessionTTL('default-ttl', '10.0.0.9');

      // Default TTL is 24 * 60 * 60 = 86400 seconds
      expect(mockRedis.expire).toHaveBeenCalledWith('session:default-ttl', 86400);
      expect(mockRedis.expire).toHaveBeenCalledWith('ip_session:10.0.0.9', 86400);
    });
  });
});
