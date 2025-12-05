import { Injectable, Logger } from '@nestjs/common';
import { EventType, EventStatus } from '@ai-recruitment-clerk/shared-dtos';

/**
 * Fallback domain service for event tracking.
 * In production, this would be replaced with actual domain service.
 */
class AnalyticsDomainService {
  async createUserInteractionEvent(
    _sessionId: string,
    _userId: string,
    eventType: EventType,
    _eventData: any,
    _context?: any,
  ): Promise<any> {
    return {
      success: true,
      data: {
        id: `event_${Date.now()}`,
        eventType,
        status: 'PROCESSED',
        props: { timestamp: new Date() },
      },
    };
  }

  async processBatchEvents(_eventIds: string[]): Promise<any> {
    return { success: true, processedCount: _eventIds.length };
  }
}

/**
 * Service for event tracking operations.
 * Extracted from AnalyticsIntegrationService to follow SRP.
 */
@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);
  private readonly domainService: AnalyticsDomainService;

  constructor() {
    this.domainService = new AnalyticsDomainService();
  }

  /**
   * Track user interaction event.
   */
  async trackUserInteraction(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: any,
    context?: any,
  ) {
    try {
      const result = await this.domainService.createUserInteractionEvent(
        sessionId,
        userId,
        eventType,
        eventData,
        context,
      );

      if (!result.success) {
        this.logger.warn('Failed to create user interaction event', {
          sessionId,
          userId,
          eventType,
          errors: result.errors,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error tracking user interaction', error);
      throw error;
    }
  }

  /**
   * Generic event tracking method for controller interface.
   */
  async trackEvent(eventData: {
    category: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: any;
    userId: string;
    organizationId: string;
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  }) {
    try {
      const sessionId = eventData.sessionId || `session_${Date.now()}`;

      const result = await this.domainService.createUserInteractionEvent(
        sessionId,
        eventData.userId,
        EventType.USER_INTERACTION,
        {
          category: eventData.category,
          action: eventData.action,
          label: eventData.label,
          value: eventData.value,
          metadata: eventData.metadata,
          organizationId: eventData.organizationId,
          userAgent: eventData.userAgent,
          ipAddress: eventData.ipAddress,
        },
        {
          timestamp: eventData.timestamp,
          userAgent: eventData.userAgent,
          ipAddress: eventData.ipAddress,
        },
      );

      if (result.success && result.data) {
        return {
          eventId: result.data.id,
          timestamp: (result.data as any).props.timestamp,
          eventType: result.data.eventType,
          processed:
            String((result.data as any).status || '')
              .toLowerCase()
              .trim() === EventStatus.PROCESSED,
        };
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to create event');
      }
    } catch (error) {
      this.logger.error('Error tracking event', error);
      throw error;
    }
  }

  /**
   * Process batch events.
   */
  async processBatchEvents(eventIds: string[]) {
    try {
      return await this.domainService.processBatchEvents(eventIds);
    } catch (error) {
      this.logger.error('Error processing batch events', error);
      throw error;
    }
  }
}
