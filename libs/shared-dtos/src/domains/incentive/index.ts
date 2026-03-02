/**
 * Incentive domain module barrel export.
 * Re-exports all incentive types for backward compatibility with incentive.dto.ts.
 */

// Enums
export {
  IncentiveStatus,
  VerificationStatus,
  Currency,
  RewardType,
  TriggerType,
  PaymentMethod,
} from './incentive-enums';

// Interfaces (type-only exports)
export type {
  ContactInfoData,
  IncentiveRewardData,
  IncentiveTriggerData,
  IncentiveRecipientData,
  IncentiveTriggerRestoreData,
  IncentiveData,
} from './incentive-interfaces';

// Value Objects
export {
  IncentiveId,
  IncentiveRecipient,
  ContactInfo,
  IncentiveReward,
  IncentiveTrigger,
} from './incentive-value-objects';

// Result Classes
export {
  IncentiveValidationResult,
  PaymentResult,
  IncentiveSummary,
} from './incentive-results';

// Domain Events
export {
  IncentiveCreatedEvent,
  IncentiveValidatedEvent,
  IncentiveValidationFailedEvent,
  IncentiveApprovedEvent,
  IncentiveRejectedEvent,
  IncentivePaidEvent,
  PaymentFailedEvent,
} from './incentive-events';

// Aggregate Root
export { Incentive } from './incentive-aggregate';
