/**
 * Incentive system domain events.
 * Defines all domain events for the incentive aggregate.
 */

import type { DomainEvent } from '../../base/domain-event';
import type { Currency, TriggerType, PaymentMethod } from './incentive-enums';

// ============================================================================
// IncentiveCreatedEvent
// ============================================================================

/**
 * Represents the incentive created event event.
 */
export class IncentiveCreatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Created Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param rewardAmount - The reward amount.
   * @param currency - The currency.
   * @param triggerType - The trigger type.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly currency: Currency,
    public readonly triggerType: TriggerType,
    public readonly occurredAt: Date,
  ) {}
}

// ============================================================================
// IncentiveValidatedEvent
// ============================================================================

/**
 * Represents the incentive validated event event.
 */
export class IncentiveValidatedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Validated Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param rewardAmount - The reward amount.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly occurredAt: Date,
  ) {}
}

// ============================================================================
// IncentiveValidationFailedEvent
// ============================================================================

/**
 * Represents the incentive validation failed event event.
 */
export class IncentiveValidationFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Validation Failed Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param errors - The errors.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly errors: string[],
    public readonly occurredAt: Date,
  ) {}
}

// ============================================================================
// IncentiveApprovedEvent
// ============================================================================

/**
 * Represents the incentive approved event event.
 */
export class IncentiveApprovedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Approved Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param rewardAmount - The reward amount.
   * @param reason - The reason.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly reason: string,
    public readonly occurredAt: Date,
  ) {}
}

// ============================================================================
// IncentiveRejectedEvent
// ============================================================================

/**
 * Represents the incentive rejected event event.
 */
export class IncentiveRejectedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Rejected Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param reason - The reason.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly reason: string,
    public readonly occurredAt: Date,
  ) {}
}

// ============================================================================
// IncentivePaidEvent
// ============================================================================

/**
 * Represents the incentive paid event event.
 */
export class IncentivePaidEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Incentive Paid Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param amount - The amount.
   * @param currency - The currency.
   * @param paymentMethod - The payment method.
   * @param transactionId - The transaction id.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly amount: number,
    public readonly currency: Currency,
    public readonly paymentMethod: PaymentMethod,
    public readonly transactionId: string,
    public readonly occurredAt: Date,
  ) {}
}

// ============================================================================
// PaymentFailedEvent
// ============================================================================

/**
 * Represents the payment failed event event.
 */
export class PaymentFailedEvent implements DomainEvent {
  /**
   * Initializes a new instance of the Payment Failed Event.
   * @param incentiveId - The incentive id.
   * @param recipientIP - The recipient ip.
   * @param error - The error.
   * @param occurredAt - The occurred at.
   */
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly error: string,
    public readonly occurredAt: Date,
  ) {}
}
