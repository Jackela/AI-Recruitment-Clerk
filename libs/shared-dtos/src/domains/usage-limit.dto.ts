/**
 * Usage Limit Domain Module
 *
 * This module provides IP-based usage limiting with quota management.
 * Split into focused components:
 * - usage-limit-core.dto: Main UsageLimit entity with business logic
 * - usage-limit-types.dto: Value objects and type definitions
 * - usage-limit-events.dto: Domain events
 * - usage-limit-results.dto: Result classes
 */

// Core UsageLimit entity
export { UsageLimit } from './usage-limit-core.dto';

// Value objects and types
export { UsageLimitId, IPAddress, UsageLimitPolicy, QuotaAllocation, UsageTracking, UsageRecord, BonusType } from './usage-limit-types';
export type { UsageLimitData } from './usage-limit-types';

// Domain events
export {
  UsageLimitCreatedEvent,
  UsageLimitExceededEvent,
  UsageRecordedEvent as UsageLimitUsageRecordedEvent,
  BonusQuotaAddedEvent,
  DailyUsageResetEvent,
} from './usage-limit-events.dto';

// Result classes
export {
  UsageLimitCheckResult,
  UsageRecordResult,
  UsageStatistics,
} from './usage-limit-results.dto';
