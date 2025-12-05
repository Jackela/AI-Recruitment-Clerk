import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity?: Date;
  isActive: boolean;
}

interface ISessionTracker {
  trackSession(sessionId: string): Promise<void>;
  updateSessionActivity(sessionId: string, userId: string): Promise<void>;
  getSession(sessionId: string): Promise<UserSession | null>;
  endSession(sessionId: string): Promise<void>;
}

/**
 * Fallback domain service for session analytics.
 */
class SessionDomainService {
  async getSessionAnalytics(_sessionId: string, _timeRange?: any): Promise<any> {
    return { success: true, analytics: {} };
  }
}

/**
 * Service for session analytics operations.
 * Extracted from AnalyticsIntegrationService to follow SRP.
 */
@Injectable()
export class SessionAnalyticsService {
  private readonly logger = new Logger(SessionAnalyticsService.name);
  private readonly domainService: SessionDomainService;
  private readonly sessionTracker: ISessionTracker;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.domainService = new SessionDomainService();
    this.sessionTracker = this.createSessionTracker();
  }

  /**
   * Get session analytics with caching.
   */
  async getSessionAnalytics(
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date },
  ) {
    try {
      const cacheKey = `session_analytics:${sessionId}:${timeRange ? `${timeRange.startDate.getTime()}-${timeRange.endDate.getTime()}` : 'all'}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await this.domainService.getSessionAnalytics(
        sessionId,
        timeRange,
      );

      if (result.success) {
        await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000);
      }

      return result;
    } catch (error) {
      this.logger.error('Error getting session analytics', error);
      throw error;
    }
  }

  /**
   * Track a new session.
   */
  async trackSession(sessionId: string): Promise<void> {
    return this.sessionTracker.trackSession(sessionId);
  }

  /**
   * Update session activity.
   */
  async updateSessionActivity(sessionId: string, userId: string): Promise<void> {
    return this.sessionTracker.updateSessionActivity(sessionId, userId);
  }

  /**
   * Get session data.
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.sessionTracker.getSession(sessionId);
  }

  /**
   * End a session.
   */
  async endSession(sessionId: string): Promise<void> {
    return this.sessionTracker.endSession(sessionId);
  }

  /**
   * Create session tracker implementation.
   */
  private createSessionTracker(): ISessionTracker {
    return {
      trackSession: async (sessionId: string): Promise<void> => {
        const cacheKey = `session:${sessionId}`;
        await this.cacheManager.set(
          cacheKey,
          {
            sessionId,
            startTime: new Date(),
            isActive: true,
          },
          30 * 60 * 1000,
        );
      },
      updateSessionActivity: async (sessionId: string, userId: string) => {
        const cacheKey = `session:${sessionId}`;
        await this.cacheManager.set(
          cacheKey,
          {
            sessionId,
            userId,
            lastActivity: new Date(),
          },
          30 * 60 * 1000,
        );
      },
      getSession: async (sessionId: string): Promise<UserSession | null> => {
        const cacheKey = `session:${sessionId}`;
        const sessionData = (await this.cacheManager.get(cacheKey)) as any;

        if (!sessionData) {
          return null;
        }

        return {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          startTime: sessionData.startTime,
          lastActivity: sessionData.lastActivity,
          isActive: true,
        };
      },
      endSession: async (sessionId: string) => {
        const cacheKey = `session:${sessionId}`;
        await this.cacheManager.del(cacheKey);
      },
    };
  }
}
