import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type {
  PresenceInfo,
  UserActivity,
  DeviceInfo} from './presence.service';
import {
  PresenceService
} from './presence.service';
import type { CacheService } from '../cache/cache.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let cacheServiceMock: jest.Mocked<CacheService>;

  beforeEach(async () => {
    cacheServiceMock = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: CacheService,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('updateUserStatus', () => {
    const userId = 'user-123';

    it('should update user status to online', async () => {
      await service.updateUserStatus(userId, 'online', 'session-456');

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('online');
    });

    it('should update user status to away', async () => {
      await service.updateUserStatus(userId, 'away', 'session-456');

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('away');
    });

    it('should update user status to offline', async () => {
      await service.updateUserStatus(userId, 'offline', 'session-456');

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('offline');
    });

    it('should create session mapping', async () => {
      const sessionId = 'session-456';
      await service.updateUserStatus(userId, 'online', sessionId);

      const userBySession = await service.getUserBySession(sessionId);
      expect(userBySession).toBe(userId);
    });

    it('should track user sessions', async () => {
      await service.updateUserStatus(userId, 'online', 'session-1');
      await service.updateUserStatus(userId, 'online', 'session-2');

      const sessions = await service.getUserSessions(userId);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
    });

    it('should cache presence info', async () => {
      await service.updateUserStatus(userId, 'online', 'session-456');

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `presence:${userId}`,
        expect.any(Object),
        { ttl: 3600 },
      );
    });

    it('should preserve existing metadata', async () => {
      await service.updateUserStatus(userId, 'online', 'session-456', {
        theme: 'dark',
      });
      await service.updateUserStatus(userId, 'online', 'session-456', {
        language: 'en',
      });

      const presence = await service.getUserPresence(userId);
      expect(presence?.metadata).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should handle missing sessionId', async () => {
      await service.updateUserStatus(userId, 'online');

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('online');
    });
  });

  describe('trackUserSession', () => {
    const userId = 'user-123';
    const sessionId = 'session-456';
    const device: DeviceInfo = {
      type: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
    };
    const location = 'New York, USA';

    it('should track user session with device info', async () => {
      await service.trackUserSession(userId, sessionId, device, location);

      const presence = await service.getUserPresence(userId);
      expect(presence?.device).toEqual(device);
      expect(presence?.location).toBe(location);
    });

    it('should set status to online', async () => {
      await service.trackUserSession(userId, sessionId);

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('online');
    });

    it('should create session mapping', async () => {
      await service.trackUserSession(userId, sessionId);

      const userBySession = await service.getUserBySession(sessionId);
      expect(userBySession).toBe(userId);
    });

    it('should track multiple sessions', async () => {
      await service.trackUserSession(userId, 'session-1');
      await service.trackUserSession(userId, 'session-2');

      const sessions = await service.getUserSessions(userId);
      expect(sessions).toHaveLength(2);
    });
  });

  describe('getUsersInSession', () => {
    it('should return online users', async () => {
      await service.updateUserStatus('user-1', 'online', 'session-1');
      await service.updateUserStatus('user-2', 'online', 'session-2');
      await service.updateUserStatus('user-3', 'offline', 'session-3');

      const users = await service.getUsersInSession('any-session');

      expect(users).toHaveLength(2);
      expect(users.every((u) => u.status === 'online')).toBe(true);
    });

    it('should return empty array when no users', async () => {
      const users = await service.getUsersInSession('any-session');
      expect(users).toEqual([]);
    });
  });

  describe('getUserPresence', () => {
    const userId = 'user-123';

    it('should return user presence from memory', async () => {
      await service.updateUserStatus(userId, 'online', 'session-456');

      const presence = await service.getUserPresence(userId);

      expect(presence).toBeDefined();
      expect(presence?.userId).toBe(userId);
    });

    it('should load from cache when not in memory', async () => {
      const cachedPresence: PresenceInfo = {
        userId,
        status: 'online',
        lastSeen: new Date(),
        _sessionId: 'session-789',
      };

      cacheServiceMock.get.mockResolvedValue(cachedPresence);

      const presence = await service.getUserPresence(userId);

      expect(presence).toEqual(cachedPresence);
    });

    it('should return null when user not found', async () => {
      const presence = await service.getUserPresence('non-existent');
      expect(presence).toBeNull();
    });
  });

  describe('getOnlineUsers', () => {
    it('should return only online users', async () => {
      await service.updateUserStatus('user-1', 'online', 'session-1');
      await service.updateUserStatus('user-2', 'away', 'session-2');
      await service.updateUserStatus('user-3', 'offline', 'session-3');
      await service.updateUserStatus('user-4', 'online', 'session-4');

      const onlineUsers = await service.getOnlineUsers();

      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers.every((u) => u.status === 'online')).toBe(true);
    });
  });

  describe('trackActivity', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.updateUserStatus(userId, 'away', 'session-456');
    });

    it('should track user activity', async () => {
      const activity: UserActivity = {
        userId,
        action: 'viewed_report',
        timestamp: new Date(),
      };

      await service.trackActivity(activity);

      expect(cacheServiceMock.set).toHaveBeenCalled();
    });

    it('should update last seen timestamp', async () => {
      const before = Date.now();

      const activity: UserActivity = {
        userId,
        action: 'clicked_button',
        timestamp: new Date(),
      };

      await service.trackActivity(activity);

      const presence = await service.getUserPresence(userId);
      expect(presence?.lastSeen.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('should change status from away to online', async () => {
      const activity: UserActivity = {
        userId,
        action: 'typed_message',
        timestamp: new Date(),
      };

      await service.trackActivity(activity);

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('online');
    });

    it('should handle non-existent user', async () => {
      const activity: UserActivity = {
        userId: 'non-existent',
        action: 'test_action',
        timestamp: new Date(),
      };

      await expect(service.trackActivity(activity)).resolves.not.toThrow();
    });
  });

  describe('setUserAway', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.updateUserStatus(userId, 'online', 'session-456');
    });

    it('should set user status to away', async () => {
      await service.setUserAway(userId);

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('away');
    });

    it('should not change status if already offline', async () => {
      await service.updateUserStatus(userId, 'offline', 'session-456');
      await service.setUserAway(userId);

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('offline');
    });

    it('should handle non-existent user', async () => {
      await expect(service.setUserAway('non-existent')).resolves.not.toThrow();
    });
  });

  describe('setUserOffline', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.updateUserStatus(userId, 'online', 'session-1');
    });

    it('should set user status to offline', async () => {
      await service.setUserOffline(userId);

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('offline');
    });

    it('should remove session mapping', async () => {
      await service.setUserOffline(userId, 'session-1');

      const userBySession = await service.getUserBySession('session-1');
      expect(userBySession).toBeNull();
    });

    it('should remove session from user sessions', async () => {
      await service.trackUserSession(userId, 'session-1');
      await service.trackUserSession(userId, 'session-2');

      await service.setUserOffline(userId, 'session-1');

      const sessions = await service.getUserSessions(userId);
      expect(sessions).not.toContain('session-1');
      expect(sessions).toContain('session-2');
    });

    it('should mark fully offline when last session removed', async () => {
      await service.trackUserSession(userId, 'session-1');
      await service.setUserOffline(userId, 'session-1');

      const presence = await service.getUserPresence(userId);
      expect(presence?.status).toBe('offline');
    });

    it('should handle non-existent user', async () => {
      await expect(
        service.setUserOffline('non-existent'),
      ).resolves.not.toThrow();
    });
  });

  describe('getUserCountByStatus', () => {
    it('should return correct counts', async () => {
      await service.updateUserStatus('user-1', 'online', 'session-1');
      await service.updateUserStatus('user-2', 'online', 'session-2');
      await service.updateUserStatus('user-3', 'away', 'session-3');
      await service.updateUserStatus('user-4', 'offline', 'session-4');

      const counts = await service.getUserCountByStatus();

      expect(counts.online).toBe(2);
      expect(counts.away).toBe(1);
      expect(counts.offline).toBe(1);
    });

    it('should return zero counts when no users', async () => {
      const counts = await service.getUserCountByStatus();

      expect(counts.online).toBe(0);
      expect(counts.away).toBe(0);
      expect(counts.offline).toBe(0);
    });
  });

  describe('isUserOnline', () => {
    const userId = 'user-123';

    it('should return true for online user', async () => {
      await service.updateUserStatus(userId, 'online', 'session-456');

      const isOnline = await service.isUserOnline(userId);
      expect(isOnline).toBe(true);
    });

    it('should return false for away user', async () => {
      await service.updateUserStatus(userId, 'away', 'session-456');

      const isOnline = await service.isUserOnline(userId);
      expect(isOnline).toBe(false);
    });

    it('should return false for offline user', async () => {
      await service.updateUserStatus(userId, 'offline', 'session-456');

      const isOnline = await service.isUserOnline(userId);
      expect(isOnline).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const isOnline = await service.isUserOnline('non-existent');
      expect(isOnline).toBe(false);
    });
  });

  describe('getUserSessions', () => {
    const userId = 'user-123';

    it('should return user sessions', async () => {
      await service.trackUserSession(userId, 'session-1');
      await service.trackUserSession(userId, 'session-2');

      const sessions = await service.getUserSessions(userId);

      expect(sessions).toHaveLength(2);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
    });

    it('should return empty array for user with no sessions', async () => {
      const sessions = await service.getUserSessions(userId);
      expect(sessions).toEqual([]);
    });
  });

  describe('getUserBySession', () => {
    it('should return user by session', async () => {
      await service.trackUserSession('user-123', 'session-456');

      const userId = await service.getUserBySession('session-456');
      expect(userId).toBe('user-123');
    });

    it('should return null for non-existent session', async () => {
      const userId = await service.getUserBySession('non-existent');
      expect(userId).toBeNull();
    });
  });

  describe('updateUserLocation', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.updateUserStatus(userId, 'online', 'session-456');
    });

    it('should update user location', async () => {
      await service.updateUserLocation(userId, 'San Francisco, CA');

      const presence = await service.getUserPresence(userId);
      expect(presence?.location).toBe('San Francisco, CA');
    });

    it('should update last seen timestamp', async () => {
      const before = Date.now();

      await service.updateUserLocation(userId, 'New York, NY');

      const presence = await service.getUserPresence(userId);
      expect(presence?.lastSeen.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('should handle non-existent user', async () => {
      await expect(
        service.updateUserLocation('non-existent', 'Location'),
      ).resolves.not.toThrow();
    });
  });

  describe('getPresenceStats', () => {
    it('should return presence statistics', async () => {
      await service.updateUserStatus('user-1', 'online', 'session-1');
      await service.updateUserStatus('user-2', 'online', 'session-2');
      await service.updateUserStatus('user-3', 'away', 'session-3');
      await service.updateUserStatus('user-4', 'offline', 'session-4');

      const stats = await service.getPresenceStats();

      expect(stats.totalUsers).toBe(4);
      expect(stats.onlineUsers).toBe(2);
      expect(stats.awayUsers).toBe(1);
      expect(stats.offlineUsers).toBe(1);
      expect(stats.activeSessions).toBe(4);
    });

    it('should return zero stats when no users', async () => {
      const stats = await service.getPresenceStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.onlineUsers).toBe(0);
      expect(stats.awayUsers).toBe(0);
      expect(stats.offlineUsers).toBe(0);
      expect(stats.activeSessions).toBe(0);
    });
  });
});
