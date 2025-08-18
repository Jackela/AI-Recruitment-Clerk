import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

// Presence interfaces
export interface PresenceInfo {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  sessionId: string;
  location?: string;
  device?: DeviceInfo;
  metadata?: Record<string, any>;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  userAgent?: string;
}

export interface UserActivity {
  userId: string;
  action: string;
  timestamp: Date;
  location?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private userPresence = new Map<string, PresenceInfo>();
  private sessionToUser = new Map<string, string>();
  private userSessions = new Map<string, Set<string>>();

  constructor(private readonly cacheService: CacheService) {
    // Setup periodic cleanup
    this.setupPeriodicCleanup();
  }

  /**
   * Update user online status
   */
  async updateUserStatus(
    userId: string, 
    status: 'online' | 'away' | 'offline',
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.logger.debug(`Updating status for user ${userId}: ${status}`);

    const currentPresence = this.userPresence.get(userId);
    const now = new Date();

    const presence: PresenceInfo = {
      userId,
      status,
      lastSeen: now,
      sessionId: sessionId || currentPresence?.sessionId || `session_${Date.now()}`,
      location: currentPresence?.location,
      device: currentPresence?.device,
      metadata: { ...currentPresence?.metadata, ...metadata }
    };

    this.userPresence.set(userId, presence);

    // Track session mapping
    if (sessionId) {
      this.sessionToUser.set(sessionId, userId);
      
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(sessionId);
    }

    // Cache presence info
    await this.cachePresenceInfo(presence);

    this.logger.log(`User ${userId} status updated to ${status}`);
  }

  /**
   * Track user session
   */
  async trackUserSession(
    userId: string, 
    sessionId: string, 
    device?: DeviceInfo,
    location?: string
  ): Promise<void> {
    this.logger.debug(`Tracking session ${sessionId} for user ${userId}`);

    const currentPresence = this.userPresence.get(userId);
    const now = new Date();

    const presence: PresenceInfo = {
      userId,
      status: 'online',
      lastSeen: now,
      sessionId,
      location,
      device,
      metadata: currentPresence?.metadata || {}
    };

    this.userPresence.set(userId, presence);
    this.sessionToUser.set(sessionId, userId);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    await this.cachePresenceInfo(presence);
  }

  /**
   * Get users in a specific session/room
   */
  async getUsersInSession(sessionId: string): Promise<PresenceInfo[]> {
    // For room-based presence, we'd need to track room memberships
    // For now, return all online users as a simplified implementation
    const onlineUsers: PresenceInfo[] = [];
    
    for (const presence of this.userPresence.values()) {
      if (presence.status === 'online') {
        onlineUsers.push(presence);
      }
    }

    return onlineUsers;
  }

  /**
   * Get user presence information
   */
  async getUserPresence(userId: string): Promise<PresenceInfo | null> {
    const presence = this.userPresence.get(userId);
    if (presence) {
      return presence;
    }

    // Try to load from cache
    try {
      const cached = await this.cacheService.get(`presence:${userId}`);
      if (cached) {
        const presenceInfo = cached as PresenceInfo;
        this.userPresence.set(userId, presenceInfo);
        return presenceInfo;
      }
    } catch (error) {
      this.logger.error(`Failed to load presence for ${userId}:`, error);
    }

    return null;
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<PresenceInfo[]> {
    const onlineUsers: PresenceInfo[] = [];
    
    for (const presence of this.userPresence.values()) {
      if (presence.status === 'online') {
        onlineUsers.push(presence);
      }
    }

    return onlineUsers;
  }

  /**
   * Track user activity
   */
  async trackActivity(activity: UserActivity): Promise<void> {
    this.logger.debug(`Tracking activity for user ${activity.userId}: ${activity.action}`);

    const presence = this.userPresence.get(activity.userId);
    if (presence) {
      presence.lastSeen = activity.timestamp;
      presence.location = activity.location || presence.location;
      
      // Update status to online if user is active
      if (presence.status === 'away') {
        presence.status = 'online';
      }

      await this.cachePresenceInfo(presence);
    }

    // Cache recent activity
    const activityKey = `activity:${activity.userId}:${Date.now()}`;
    await this.cacheService.set(activityKey, activity, { ttl: 3600 }); // 1 hour TTL
  }

  /**
   * Set user as away
   */
  async setUserAway(userId: string): Promise<void> {
    const presence = this.userPresence.get(userId);
    if (presence && presence.status === 'online') {
      presence.status = 'away';
      presence.lastSeen = new Date();
      await this.cachePresenceInfo(presence);
      this.logger.debug(`User ${userId} set to away`);
    }
  }

  /**
   * Set user as offline and cleanup session
   */
  async setUserOffline(userId: string, sessionId?: string): Promise<void> {
    this.logger.debug(`Setting user ${userId} offline${sessionId ? ` (session: ${sessionId})` : ''}`);

    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
      await this.cachePresenceInfo(presence);
    }

    // Cleanup session mapping
    if (sessionId) {
      this.sessionToUser.delete(sessionId);
      const userSessionsSet = this.userSessions.get(userId);
      if (userSessionsSet) {
        userSessionsSet.delete(sessionId);
        if (userSessionsSet.size === 0) {
          this.userSessions.delete(userId);
          // If no more sessions, mark as offline
          if (presence) {
            presence.status = 'offline';
            await this.cachePresenceInfo(presence);
          }
        }
      }
    }
  }

  /**
   * Get user count by status
   */
  async getUserCountByStatus(): Promise<Record<string, number>> {
    const counts = { online: 0, away: 0, offline: 0 };
    
    for (const presence of this.userPresence.values()) {
      counts[presence.status]++;
    }

    return counts;
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const presence = await this.getUserPresence(userId);
    return presence?.status === 'online' || false;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const sessions = this.userSessions.get(userId);
    return sessions ? Array.from(sessions) : [];
  }

  /**
   * Get user by session ID
   */
  async getUserBySession(sessionId: string): Promise<string | null> {
    return this.sessionToUser.get(sessionId) || null;
  }

  /**
   * Update user location
   */
  async updateUserLocation(userId: string, location: string): Promise<void> {
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.location = location;
      presence.lastSeen = new Date();
      await this.cachePresenceInfo(presence);
    }
  }

  /**
   * Cache presence information
   */
  private async cachePresenceInfo(presence: PresenceInfo): Promise<void> {
    try {
      const cacheKey = `presence:${presence.userId}`;
      await this.cacheService.set(cacheKey, presence, { ttl: 3600 }); // 1 hour TTL
    } catch (error) {
      this.logger.error('Failed to cache presence info:', error);
    }
  }

  /**
   * Setup periodic cleanup of stale presence data
   */
  private setupPeriodicCleanup(): void {
    // Cleanup every 5 minutes
    setInterval(() => {
      this.cleanupStalePresence();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup stale presence data
   */
  private async cleanupStalePresence(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    const usersToCleanup: string[] = [];

    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.lastSeen < staleThreshold && presence.status !== 'offline') {
        presence.status = 'offline';
        usersToCleanup.push(userId);
      }
    }

    for (const userId of usersToCleanup) {
      await this.setUserOffline(userId);
    }

    if (usersToCleanup.length > 0) {
      this.logger.log(`Cleaned up ${usersToCleanup.length} stale presence records`);
    }
  }

  /**
   * Get presence statistics
   */
  async getPresenceStats(): Promise<{
    totalUsers: number;
    onlineUsers: number;
    awayUsers: number;
    offlineUsers: number;
    activeSessions: number;
  }> {
    const counts = await this.getUserCountByStatus();
    const activeSessions = this.sessionToUser.size;

    return {
      totalUsers: this.userPresence.size,
      onlineUsers: counts.online,
      awayUsers: counts.away,
      offlineUsers: counts.offline,
      activeSessions
    };
  }
}