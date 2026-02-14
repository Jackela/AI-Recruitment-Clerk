/**
 * Analytics Results and Data Interfaces
 * Extracted from analytics.dto.ts for file size reduction
 */
import type {
  UserSessionData,
  EventDataStructure,
  EventTimestampData,
  EventContextData,
  EventStatus,
} from './analytics-value-objects.dto';

// Interface for persistence/restore
/**
 * Defines the shape of the analytics event data.
 */
export interface AnalyticsEventData {
  id: string;
  session: UserSessionData;
  eventData: EventDataStructure;
  timestamp: EventTimestampData;
  context: EventContextData;
  status: EventStatus;
  createdAt: string;
  processedAt?: string;
  retentionExpiry?: string;
}

// Result types for analytics operations
/**
 * Represents the result of an event creation operation.
 */
export interface EventCreationResult {
  success: boolean;
  eventId?: string;
  errors?: string[];
}

/**
 * Represents the result of a batch processing operation.
 */
export interface BatchProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
}

/**
 * Represents the result of an analytics query.
 */
export interface AnalyticsQueryResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Represents the result of an anonymization operation.
 */
export interface AnonymizationResult {
  success: boolean;
  eventsAnonymized: number;
  errors?: string[];
}

/**
 * Represents the result of a data retention cleanup operation.
 */
export interface RetentionCleanupResult {
  success: boolean;
  eventsDeleted: number;
  eventsAnonymized: number;
  errors?: string[];
}
