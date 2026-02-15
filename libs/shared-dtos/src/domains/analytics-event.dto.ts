import type { DomainEvent } from '../base/domain-event';
import type { EventType, MetricUnit } from './analytics.dto';

/**
 * Represents the analytics event created event event.
 */
export class AnalyticsEventCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Created Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param userId - The user id.
   * @param eventType - The event type.
   * @param timestamp - The timestamp.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly userId: string | undefined,
    public readonly eventType: EventType,
    public readonly timestamp: string,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the system performance event created event event.
 */
export class SystemPerformanceEventCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the System Performance Event Created Event.
   * @param eventId - The event id.
   * @param operation - The operation.
   * @param duration - The duration.
   * @param success - The success.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly operation: string,
    public readonly duration: number,
    public readonly success: boolean,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the business metric event created event event.
 */
export class BusinessMetricEventCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Business Metric Event Created Event.
   * @param eventId - The event id.
   * @param metricName - The metric name.
   * @param metricValue - The metric value.
   * @param metricUnit - The metric unit.
   * @param dimensions - The dimensions.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly metricName: string,
    public readonly metricValue: number,
    public readonly metricUnit: MetricUnit,
    public readonly dimensions: Record<string, string>,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event validated event event.
 */
export class AnalyticsEventValidatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Validated Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param eventType - The event type.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly eventType: EventType,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event validation failed event event.
 */
export class AnalyticsEventValidationFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Validation Failed Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param errors - The errors.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly errors: string[],
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event processed event event.
 */
export class AnalyticsEventProcessedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Processed Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param eventType - The event type.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly eventType: EventType,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event anonymized event event.
 */
export class AnalyticsEventAnonymizedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Anonymized Event.
   * @param eventId - The event id.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: Date,
  ) {}
}

/**
 * Represents the analytics event expired event event.
 */
export class AnalyticsEventExpiredEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Analytics Event Expired Event.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly occurredAt: Date,
  ) {}
}
