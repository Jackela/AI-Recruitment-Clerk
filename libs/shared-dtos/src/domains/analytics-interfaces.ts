import type { AnalyticsEvent } from './analytics.dto';
import type { ConsentStatus, UserSession } from './analytics.dto';

/**
 * Defines the analytics repository interface for data persistence operations.
 */
export interface IAnalyticsRepository {
  /**
   * Save an analytics event to the repository.
   * @param event - The event to save.
   */
  save(event: AnalyticsEvent): Promise<void>;

  /**
   * Find an event by its ID.
   * @param id - The event ID.
   * @returns The event if found, null otherwise.
   */
  findById(id: string): Promise<AnalyticsEvent | null>;

  /**
   * Find multiple events by their IDs.
   * @param ids - The event IDs.
   * @returns Array of events found.
   */
  findByIds(ids: string[]): Promise<AnalyticsEvent[]>;

  /**
   * Find events by session ID.
   * @param sessionId - The session ID.
   * @param timeRange - Optional time range filter.
   * @returns Array of events for the session.
   */
  findBySession(
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<AnalyticsEvent[]>;

  /**
   * Find events within a date range.
   * @param startDate - Start of the date range.
   * @param endDate - End of the date range.
   * @returns Array of events within the range.
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<AnalyticsEvent[]>;

  /**
   * Count events in a session.
   * @param sessionId - The session ID.
   * @returns The count of events.
   */
  countSessionEvents(sessionId: string): Promise<number>;

  /**
   * Delete events older than specified days.
   * @param olderThanDays - Number of days before which to delete.
   * @returns The count of deleted events.
   */
  deleteExpired(olderThanDays: number): Promise<number>;

  /**
   * Anonymize old events.
   * @param olderThanDays - Number of days before which to anonymize.
   * @returns The count of anonymized events.
   */
  anonymizeOldEvents(olderThanDays: number): Promise<number>;
}

/**
 * Defines the domain event bus interface for publishing events.
 */
export interface IDomainEventBus {
  /**
   * Publish a domain event.
   * @param event - The event to publish.
   */
  publish(event: {
    eventType: string;
    data: Record<string, unknown>;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

/**
 * Defines the audit logger interface for logging various event types.
 */
export interface IAuditLogger {
  /**
   * Log a business event.
   * @param eventType - The event type.
   * @param data - The event data.
   */
  logBusinessEvent(eventType: string, data: Record<string, unknown>): Promise<void>;

  /**
   * Log a security event.
   * @param eventType - The event type.
   * @param data - The event data.
   */
  logSecurityEvent(eventType: string, data: Record<string, unknown>): Promise<void>;

  /**
   * Log an error event.
   * @param eventType - The event type.
   * @param data - The event data.
   */
  logError(eventType: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * Defines the privacy service interface for user data privacy operations.
 */
export interface IPrivacyService {
  /**
   * Get the consent status for a user.
   * @param userId - The user ID.
   * @returns The consent status.
   */
  getUserConsentStatus(userId: string): Promise<ConsentStatus>;

  /**
   * Anonymize user data.
   * @param userId - The user ID.
   */
  anonymizeUserData(userId: string): Promise<void>;

  /**
   * Delete user data.
   * @param userId - The user ID.
   */
  deleteUserData(userId: string): Promise<void>;
}

/**
 * Defines the session tracker interface for session management.
 */
export interface ISessionTracker {
  /**
   * Update session activity timestamp.
   * @param sessionId - The session ID.
   * @param userId - The user ID.
   */
  updateSessionActivity(sessionId: string, userId: string): Promise<void>;

  /**
   * Get a session by its ID.
   * @param sessionId - The session ID.
   * @returns The session if found, null otherwise.
   */
  getSession(sessionId: string): Promise<UserSession | null>;

  /**
   * End a session.
   * @param sessionId - The session ID.
   */
  endSession(sessionId: string): Promise<void>;
}
