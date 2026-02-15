/**
 * Analytics Retention Utility
 * Extracted from analytics.dto.ts for file size reduction
 */
import { EventType } from './analytics-value-objects.dto';

/**
 * Calculate retention expiry date based on event type and creation date.
 * @param eventType - The type of event
 * @param createdAt - The creation date
 * @returns The retention expiry date
 */
export function calculateRetentionExpiry(
  eventType: EventType,
  createdAt: Date,
): Date {
  const retentionDays = getRetentionPeriodDays(eventType);
  const expiry = new Date(createdAt);
  expiry.setDate(expiry.getDate() + retentionDays);
  return expiry;
}

/**
 * Get retention period in days based on event type.
 * @param eventType - The type of event
 * @returns Number of days to retain the event
 */
export function getRetentionPeriodDays(eventType: EventType): number {
  switch (eventType) {
    case EventType.USER_INTERACTION:
      return 730; // 2 years
    case EventType.SYSTEM_PERFORMANCE:
      return 90; // 3 months
    case EventType.BUSINESS_METRIC:
      return 1095; // 3 years
    case EventType.ERROR_EVENT:
      return 365; // 1 year
    default:
      return 365; // Default 1 year
  }
}

/**
 * Check if retention period has been exceeded.
 * @param retentionExpiry - The retention expiry date
 * @returns True if the retention period has been exceeded
 */
export function isRetentionPeriodExceeded(retentionExpiry?: Date): boolean {
  if (!retentionExpiry) {
    return false;
  }
  return new Date() > retentionExpiry;
}
