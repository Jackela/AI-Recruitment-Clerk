import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

// Notification interfaces
export interface NotificationData {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  persistent?: boolean;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  types: {
    info: boolean;
    success: boolean;
    warning: boolean;
    error: boolean;
    system: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
}

export interface BroadcastMessage {
  id: string;
  roomId?: string;
  type: 'announcement' | 'update' | 'alert' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  targetUsers?: string[];
  excludeUsers?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private userNotifications = new Map<string, NotificationData[]>();
  private userPreferences = new Map<string, NotificationPreferences>();
  private broadcastMessages = new Map<string, BroadcastMessage>();

  constructor(private readonly cacheService: CacheService) {
    this.setupDefaultPreferences();
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(notification: NotificationData): Promise<void> {
    this.logger.debug(`Sending notification to user ${notification.userId}: ${notification.title}`);

    // Check user preferences
    const prefs = await this.getUserPreferences(notification.userId);
    if (!this.shouldSendNotification(notification, prefs)) {
      this.logger.debug(`Notification filtered by user preferences: ${notification.id}`);
      return;
    }

    // Store notification
    await this.storeNotification(notification);

    // In a real implementation, you would emit WebSocket events here
    this.logger.log(`Notification ${notification.id} sent to user ${notification.userId}`);
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
    this.logger.log(`Sending ${notifications.length} bulk notifications`);

    const sendPromises = notifications.map(notification => 
      this.sendNotification(notification)
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Broadcast message to room or all users
   */
  async broadcastToRoom(roomId: string, message: BroadcastMessage): Promise<void> {
    this.logger.log(`Broadcasting message to room ${roomId}: ${message.title}`);

    message.roomId = roomId;
    this.broadcastMessages.set(message.id, message);

    // Cache broadcast message
    await this.cacheService.set(`broadcast:${message.id}`, message, { ttl: 3600 }); // 1 hour TTL

    // In a real implementation, emit to all users in the room
    this.logger.debug(`Broadcast message ${message.id} stored for room ${roomId}`);
  }

  /**
   * Send system-wide broadcast
   */
  async systemBroadcast(message: BroadcastMessage): Promise<void> {
    this.logger.log(`System broadcast: ${message.title}`);

    message.type = 'system';
    this.broadcastMessages.set(message.id, message);

    // Cache system broadcast
    await this.cacheService.set(`system_broadcast:${message.id}`, message, { ttl: 7200 }); // 2 hours TTL

    // In a real implementation, emit to all connected users
    this.logger.debug(`System broadcast ${message.id} sent`);
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string, 
    unreadOnly = false,
    limit = 50
  ): Promise<NotificationData[]> {
    let notifications = this.userNotifications.get(userId) || [];

    // Try to load from cache if not in memory
    if (notifications.length === 0) {
      try {
        const cached = await this.cacheService.get(`notifications:${userId}`);
        if (cached && Array.isArray(cached)) {
          notifications = cached as NotificationData[];
          this.userNotifications.set(userId, notifications);
        }
      } catch (error) {
        this.logger.error(`Failed to load notifications for ${userId}:`, error);
      }
    }

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.readAt);
    }

    // Sort by creation date (newest first) and limit
    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notifications = this.userNotifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);

    if (notification && !notification.readAt) {
      notification.readAt = new Date();
      await this.cacheUserNotifications(userId, notifications);
      this.logger.debug(`Notification ${notificationId} marked as read for user ${userId}`);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = this.userNotifications.get(userId) || [];
    const now = new Date();
    let updatedCount = 0;

    for (const notification of notifications) {
      if (!notification.readAt) {
        notification.readAt = now;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await this.cacheUserNotifications(userId, notifications);
      this.logger.log(`Marked ${updatedCount} notifications as read for user ${userId}`);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notifications = this.userNotifications.get(userId) || [];
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);

    if (updatedNotifications.length !== notifications.length) {
      this.userNotifications.set(userId, updatedNotifications);
      await this.cacheUserNotifications(userId, updatedNotifications);
      this.logger.debug(`Notification ${notificationId} deleted for user ${userId}`);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.getUserNotifications(userId);
    return notifications.filter(n => !n.readAt).length;
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = this.userPreferences.get(userId);

    if (!prefs) {
      // Try to load from cache
      try {
        const cached = await this.cacheService.get(`notification_prefs:${userId}`);
        if (cached) {
          prefs = cached as NotificationPreferences;
          this.userPreferences.set(userId, prefs);
        }
      } catch (error) {
        this.logger.error(`Failed to load preferences for ${userId}:`, error);
      }

      // Use default preferences if not found
      if (!prefs) {
        prefs = this.getDefaultPreferences(userId);
        this.userPreferences.set(userId, prefs);
      }
    }

    return prefs;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const currentPrefs = await this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences, userId };

    this.userPreferences.set(userId, updatedPrefs);
    await this.cacheService.set(`notification_prefs:${userId}`, updatedPrefs, { ttl: 86400 }); // 24 hours TTL

    this.logger.log(`Updated notification preferences for user ${userId}`);
  }

  /**
   * Get active broadcast messages
   */
  async getActiveBroadcasts(roomId?: string): Promise<BroadcastMessage[]> {
    const now = new Date();
    const activeBroadcasts: BroadcastMessage[] = [];

    for (const broadcast of this.broadcastMessages.values()) {
      // Check if broadcast is still active
      if (broadcast.expiresAt && broadcast.expiresAt < now) {
        continue;
      }

      // Filter by room if specified
      if (roomId && broadcast.roomId !== roomId) {
        continue;
      }

      activeBroadcasts.push(broadcast);
    }

    return activeBroadcasts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(
    templateType: string,
    userId: string,
    templateData: Record<string, any>
  ): Promise<NotificationData> {
    const template = this.getNotificationTemplate(templateType);
    const notification: NotificationData = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: template.type,
      title: this.interpolateTemplate(template.title, templateData),
      message: this.interpolateTemplate(template.message, templateData),
      data: templateData,
      createdAt: new Date(),
      priority: template.priority,
      persistent: template.persistent,
      actionUrl: template.actionUrl ? this.interpolateTemplate(template.actionUrl, templateData) : undefined,
      actionText: template.actionText,
      expiresAt: template.expiresIn ? new Date(Date.now() + template.expiresIn * 1000) : undefined
    };

    await this.sendNotification(notification);
    return notification;
  }

  /**
   * Store notification for user
   */
  private async storeNotification(notification: NotificationData): Promise<void> {
    const userNotifications = this.userNotifications.get(notification.userId) || [];
    userNotifications.push(notification);

    // Keep only last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(0, userNotifications.length - 100);
    }

    this.userNotifications.set(notification.userId, userNotifications);
    await this.cacheUserNotifications(notification.userId, userNotifications);
  }

  /**
   * Cache user notifications
   */
  private async cacheUserNotifications(userId: string, notifications: NotificationData[]): Promise<void> {
    try {
      await this.cacheService.set(`notifications:${userId}`, notifications, { ttl: 86400 }); // 24 hours TTL
    } catch (error) {
      this.logger.error('Failed to cache user notifications:', error);
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(notification: NotificationData, prefs: NotificationPreferences): boolean {
    // Check if notification type is enabled
    if (!prefs.types[notification.type]) {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime >= prefs.quietHours.startTime && currentTime <= prefs.quietHours.endTime) {
        // Only allow urgent notifications during quiet hours
        return notification.priority === 'urgent';
      }
    }

    return true;
  }

  /**
   * Get default preferences for user
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      emailNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      types: {
        info: true,
        success: true,
        warning: true,
        error: true,
        system: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      }
    };
  }

  /**
   * Setup default preferences
   */
  private setupDefaultPreferences(): void {
    // Initialize with some default system preferences
    this.logger.debug('Setting up default notification preferences');
  }

  /**
   * Get notification template
   */
  private getNotificationTemplate(templateType: string): any {
    const templates: Record<string, any> = {
      'analysis_complete': {
        type: 'success',
        title: 'Analysis Complete',
        message: 'Your resume analysis for {{candidateName}} has been completed.',
        priority: 'normal',
        persistent: false,
        actionUrl: '/analysis/{{analysisId}}',
        actionText: 'View Results',
        expiresIn: 3600 // 1 hour
      },
      'system_maintenance': {
        type: 'warning',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will begin at {{startTime}}.',
        priority: 'high',
        persistent: true,
        expiresIn: 7200 // 2 hours
      }
    };

    return templates[templateType] || {
      type: 'info',
      title: 'Notification',
      message: 'You have a new notification.',
      priority: 'normal',
      persistent: false
    };
  }

  /**
   * Interpolate template with data
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Cleanup expired notifications and broadcasts
   */
  async cleanupExpiredData(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    // Cleanup expired broadcasts
    for (const [id, broadcast] of this.broadcastMessages.entries()) {
      if (broadcast.expiresAt && broadcast.expiresAt < now) {
        this.broadcastMessages.delete(id);
        await this.cacheService.del(`broadcast:${id}`);
        cleanedCount++;
      }
    }

    // Cleanup old notifications (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [userId, notifications] of this.userNotifications.entries()) {
      const filteredNotifications = notifications.filter(n => 
        n.createdAt > thirtyDaysAgo || n.persistent
      );
      
      if (filteredNotifications.length !== notifications.length) {
        this.userNotifications.set(userId, filteredNotifications);
        await this.cacheUserNotifications(userId, filteredNotifications);
        cleanedCount += notifications.length - filteredNotifications.length;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired notifications and broadcasts`);
    }
  }
}