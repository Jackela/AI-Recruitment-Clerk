import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationService,
  NotificationData,
  NotificationPreferences,
  BroadcastMessage,
  NotificationTemplate,
} from './notification.service';
import type { CacheService } from '../cache/cache.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let cacheServiceMock: jest.Mocked<CacheService>;

  beforeEach(async () => {
    cacheServiceMock = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: CacheService,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('sendNotification', () => {
    const mockNotification: NotificationData = {
      id: 'notif-123',
      userId: 'user-456',
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test message',
      createdAt: new Date(),
      priority: 'normal',
    };

    it('should send notification successfully', async () => {
      await service.sendNotification(mockNotification);

      // Notification should be stored
      expect(cacheServiceMock.set).toHaveBeenCalled();
    });

    it('should filter notifications based on user preferences', async () => {
      // Set preferences to disable info notifications
      await service.updateUserPreferences('user-456', {
        types: {
          info: false,
          success: true,
          warning: true,
          error: true,
          system: true,
        },
      });

      await service.sendNotification(mockNotification);

      // Should not store notification for disabled type
      const storedNotifications = (service as any).userNotifications.get(
        'user-456',
      );
      expect(storedNotifications).toBeUndefined();
    });

    it('should allow urgent notifications during quiet hours', async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = currentHour.toString().padStart(2, '0') + ':00';
      const quietEnd =
        ((currentHour + 1) % 24).toString().padStart(2, '0') + ':00';

      await service.updateUserPreferences('user-456', {
        quietHours: {
          enabled: true,
          startTime: quietStart,
          endTime: quietEnd,
        },
      });

      const urgentNotification: NotificationData = {
        ...mockNotification,
        priority: 'urgent',
      };

      await service.sendNotification(urgentNotification);

      const storedNotifications = (service as any).userNotifications.get(
        'user-456',
      );
      expect(storedNotifications).toBeDefined();
      expect(storedNotifications.length).toBe(1);
    });

    it('should filter non-urgent notifications during quiet hours', async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = currentHour.toString().padStart(2, '0') + ':00';
      const quietEnd =
        ((currentHour + 1) % 24).toString().padStart(2, '0') + ':00';

      await service.updateUserPreferences('user-456', {
        quietHours: {
          enabled: true,
          startTime: quietStart,
          endTime: quietEnd,
        },
      });

      const normalNotification: NotificationData = {
        ...mockNotification,
        priority: 'normal',
      };

      await service.sendNotification(normalNotification);

      // Should not store notification during quiet hours
      const storedNotifications = (service as any).userNotifications.get(
        'user-456',
      );
      expect(storedNotifications).toBeUndefined();
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send multiple notifications', async () => {
      const notifications: NotificationData[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          createdAt: new Date(),
          priority: 'normal',
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          type: 'success',
          title: 'Notification 2',
          message: 'Message 2',
          createdAt: new Date(),
          priority: 'normal',
        },
      ];

      await service.sendBulkNotifications(notifications);

      expect(cacheServiceMock.set).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      await service.sendBulkNotifications([]);

      expect(cacheServiceMock.set).not.toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
      cacheServiceMock.set.mockRejectedValueOnce(new Error('Cache error'));

      const notifications: NotificationData[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          createdAt: new Date(),
          priority: 'normal',
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          type: 'success',
          title: 'Notification 2',
          message: 'Message 2',
          createdAt: new Date(),
          priority: 'normal',
        },
      ];

      // Should not throw due to Promise.allSettled
      await expect(
        service.sendBulkNotifications(notifications),
      ).resolves.not.toThrow();
    });
  });

  describe('broadcastToRoom', () => {
    const mockMessage: BroadcastMessage = {
      id: 'broadcast-123',
      type: 'announcement',
      title: 'System Announcement',
      message: 'System will be down for maintenance',
      priority: 'high',
      createdAt: new Date(),
    };

    it('should broadcast message to room', async () => {
      await service.broadcastToRoom('room-456', mockMessage);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `broadcast:${mockMessage.id}`,
        expect.objectContaining({ roomId: 'room-456' }),
        { ttl: 3600 },
      );
    });

    it('should store broadcast message', async () => {
      await service.broadcastToRoom('room-456', mockMessage);

      const storedBroadcasts = (service as any).broadcastMessages;
      expect(storedBroadcasts.has(mockMessage.id)).toBe(true);
    });
  });

  describe('systemBroadcast', () => {
    const mockMessage: BroadcastMessage = {
      id: 'broadcast-789',
      type: 'system',
      title: 'System Update',
      message: 'New features available',
      priority: 'normal',
      createdAt: new Date(),
    };

    it('should send system broadcast', async () => {
      await service.systemBroadcast(mockMessage);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `system_broadcast:${mockMessage.id}`,
        expect.any(Object),
        { ttl: 7200 },
      );
    });

    it('should override message type to system', async () => {
      const nonSystemMessage: BroadcastMessage = {
        ...mockMessage,
        type: 'update',
      };

      await service.systemBroadcast(nonSystemMessage);

      const storedBroadcasts = (service as any).broadcastMessages;
      const stored = storedBroadcasts.get(nonSystemMessage.id);
      expect(stored.type).toBe('system');
    });
  });

  describe('getUserNotifications', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      // Add some notifications
      const notifications: NotificationData[] = [
        {
          id: 'notif-1',
          userId,
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          createdAt: new Date(Date.now() - 1000),
          priority: 'normal',
        },
        {
          id: 'notif-2',
          userId,
          type: 'success',
          title: 'Notification 2',
          message: 'Message 2',
          createdAt: new Date(),
          priority: 'normal',
        },
        {
          id: 'notif-3',
          userId,
          type: 'warning',
          title: 'Notification 3',
          message: 'Message 3',
          createdAt: new Date(Date.now() - 2000),
          readAt: new Date(),
          priority: 'high',
        },
      ];

      for (const notification of notifications) {
        await service.sendNotification(notification);
      }
    });

    it('should get all user notifications', async () => {
      const result = await service.getUserNotifications(userId);

      expect(result).toHaveLength(3);
    });

    it('should get only unread notifications', async () => {
      const result = await service.getUserNotifications(userId, true);

      expect(result).toHaveLength(2);
      expect(result.every((n) => !n.readAt)).toBe(true);
    });

    it('should limit results', async () => {
      const result = await service.getUserNotifications(userId, false, 2);

      expect(result).toHaveLength(2);
    });

    it('should sort by creation date (newest first)', async () => {
      const result = await service.getUserNotifications(userId);

      expect(result[0].id).toBe('notif-2'); // Most recent
      expect(result[2].id).toBe('notif-3'); // Oldest
    });

    it('should load from cache when memory empty', async () => {
      const cachedNotifications: NotificationData[] = [
        {
          id: 'cached-1',
          userId,
          type: 'info',
          title: 'Cached Notification',
          message: 'Cached message',
          createdAt: new Date(),
          priority: 'normal',
        },
      ];

      cacheServiceMock.get.mockResolvedValue(cachedNotifications);

      // Clear memory cache
      (service as any).userNotifications.clear();

      const result = await service.getUserNotifications(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cached-1');
    });
  });

  describe('markAsRead', () => {
    const userId = 'user-123';
    const notificationId = 'notif-1';

    beforeEach(async () => {
      await service.sendNotification({
        id: notificationId,
        userId,
        type: 'info',
        title: 'Test',
        message: 'Test message',
        createdAt: new Date(),
        priority: 'normal',
      });
    });

    it('should mark notification as read', async () => {
      await service.markAsRead(userId, notificationId);

      const notifications = await service.getUserNotifications(userId, true);
      expect(notifications).toHaveLength(0);
    });

    it('should not modify already read notification', async () => {
      await service.markAsRead(userId, notificationId);
      const firstReadAt = (service as any).userNotifications.get(userId)[0]
        .readAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.markAsRead(userId, notificationId);
      const secondReadAt = (service as any).userNotifications.get(userId)[0]
        .readAt;

      expect(firstReadAt).toEqual(secondReadAt);
    });

    it('should handle non-existent notification', async () => {
      await expect(
        service.markAsRead(userId, 'non-existent'),
      ).resolves.not.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.sendNotification({
        id: 'notif-1',
        userId,
        type: 'info',
        title: 'Test 1',
        message: 'Message 1',
        createdAt: new Date(),
        priority: 'normal',
      });
      await service.sendNotification({
        id: 'notif-2',
        userId,
        type: 'success',
        title: 'Test 2',
        message: 'Message 2',
        createdAt: new Date(),
        priority: 'normal',
      });
    });

    it('should mark all notifications as read', async () => {
      await service.markAllAsRead(userId);

      const unreadCount = await service.getUnreadCount(userId);
      expect(unreadCount).toBe(0);
    });

    it('should handle user with no notifications', async () => {
      await expect(
        service.markAllAsRead('unknown-user'),
      ).resolves.not.toThrow();
    });
  });

  describe('deleteNotification', () => {
    const userId = 'user-123';
    const notificationId = 'notif-1';

    beforeEach(async () => {
      await service.sendNotification({
        id: notificationId,
        userId,
        type: 'info',
        title: 'Test',
        message: 'Test message',
        createdAt: new Date(),
        priority: 'normal',
      });
    });

    it('should delete notification', async () => {
      await service.deleteNotification(userId, notificationId);

      const notifications = await service.getUserNotifications(userId);
      expect(notifications).toHaveLength(0);
    });

    it('should handle non-existent notification', async () => {
      await expect(
        service.deleteNotification(userId, 'non-existent'),
      ).resolves.not.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    const userId = 'user-123';

    beforeEach(async () => {
      await service.sendNotification({
        id: 'notif-1',
        userId,
        type: 'info',
        title: 'Test 1',
        message: 'Message 1',
        createdAt: new Date(),
        priority: 'normal',
      });
      await service.sendNotification({
        id: 'notif-2',
        userId,
        type: 'success',
        title: 'Test 2',
        message: 'Message 2',
        createdAt: new Date(),
        priority: 'normal',
      });
      await service.markAsRead(userId, 'notif-1');
    });

    it('should return correct unread count', async () => {
      const count = await service.getUnreadCount(userId);

      expect(count).toBe(1);
    });
  });

  describe('User Preferences', () => {
    const userId = 'user-123';

    it('should get default preferences for new user', async () => {
      const prefs = await service.getUserPreferences(userId);

      expect(prefs.userId).toBe(userId);
      expect(prefs.emailNotifications).toBe(true);
      expect(prefs.pushNotifications).toBe(true);
      expect(prefs.inAppNotifications).toBe(true);
      expect(prefs.types.info).toBe(true);
      expect(prefs.quietHours?.enabled).toBe(false);
    });

    it('should update user preferences', async () => {
      await service.updateUserPreferences(userId, {
        emailNotifications: false,
      });

      const prefs = await service.getUserPreferences(userId);
      expect(prefs.emailNotifications).toBe(false);
    });

    it('should merge partial updates', async () => {
      await service.updateUserPreferences(userId, {
        emailNotifications: false,
      });

      const prefs = await service.getUserPreferences(userId);
      expect(prefs.emailNotifications).toBe(false);
      expect(prefs.pushNotifications).toBe(true); // Unchanged
    });

    it('should persist preferences to cache', async () => {
      await service.updateUserPreferences(userId, {
        emailNotifications: false,
      });

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `notification_prefs:${userId}`,
        expect.any(Object),
        { ttl: 86400 },
      );
    });

    it('should load preferences from cache', async () => {
      const cachedPrefs: NotificationPreferences = {
        userId,
        emailNotifications: false,
        pushNotifications: false,
        inAppNotifications: false,
        types: {
          info: false,
          success: false,
          warning: false,
          error: false,
          system: false,
        },
      };

      cacheServiceMock.get.mockResolvedValue(cachedPrefs);

      const prefs = await service.getUserPreferences(userId);

      expect(prefs.emailNotifications).toBe(false);
    });
  });

  describe('createFromTemplate', () => {
    const userId = 'user-123';

    it('should create notification from template', async () => {
      const notification = await service.createFromTemplate(
        'analysis_complete',
        userId,
        { candidateName: 'John Doe', analysisId: 'analysis-123' },
      );

      expect(notification.title).toContain('Analysis Complete');
      expect(notification.message).toContain('John Doe');
      expect(notification.actionUrl).toContain('analysis-123');
    });

    it('should use default template for unknown type', async () => {
      const notification = await service.createFromTemplate(
        'unknown_template',
        userId,
        {},
      );

      expect(notification.title).toBe('Notification');
    });
  });

  describe('cleanupExpiredData', () => {
    it('should clean up expired broadcasts', async () => {
      const expiredBroadcast: BroadcastMessage = {
        id: 'expired-broadcast',
        type: 'announcement',
        title: 'Expired',
        message: 'This is expired',
        priority: 'normal',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
      };

      await service.systemBroadcast(expiredBroadcast);

      await service.cleanupExpiredData();

      const activeBroadcasts = await service.getActiveBroadcasts();
      expect(
        activeBroadcasts.find((b) => b.id === 'expired-broadcast'),
      ).toBeUndefined();
    });

    it('should clean up old notifications', async () => {
      const oldNotification: NotificationData = {
        id: 'old-notif',
        userId: 'user-123',
        type: 'info',
        title: 'Old',
        message: 'Old message',
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        priority: 'normal',
      };

      await service.sendNotification(oldNotification);

      await service.cleanupExpiredData();

      const notifications = await service.getUserNotifications('user-123');
      expect(notifications.find((n) => n.id === 'old-notif')).toBeUndefined();
    });

    it('should preserve persistent notifications', async () => {
      const persistentNotification: NotificationData = {
        id: 'persistent-notif',
        userId: 'user-123',
        type: 'info',
        title: 'Persistent',
        message: 'Persistent message',
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        priority: 'normal',
        persistent: true,
      };

      await service.sendNotification(persistentNotification);

      await service.cleanupExpiredData();

      const notifications = await service.getUserNotifications('user-123');
      expect(
        notifications.find((n) => n.id === 'persistent-notif'),
      ).toBeDefined();
    });
  });
});
