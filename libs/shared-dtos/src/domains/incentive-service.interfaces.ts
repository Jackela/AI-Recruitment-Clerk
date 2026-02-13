import type {
  Incentive,
  IncentiveStatus,
} from './incentive.dto';
import type {
  PaymentGatewayRequest,
  PaymentGatewayResponse,
} from './incentive-results.types';

/**
 * Repository interface for incentive data access.
 * Provides CRUD operations for incentives.
 */
export interface IIncentiveRepository {
  save(incentive: Incentive): Promise<void>;
  findById(id: string): Promise<Incentive | null>;
  findByIds(ids: string[]): Promise<Incentive[]>;
  findByIP(
    ip: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<Incentive[]>;
  findAll(timeRange?: { startDate: Date; endDate: Date }): Promise<Incentive[]>;
  findPendingIncentives(
    status?: IncentiveStatus,
    limit?: number,
  ): Promise<Incentive[]>;
  findReferralIncentive(
    referrerIP: string,
    referredIP: string,
  ): Promise<Incentive | null>;
  countTodayIncentives(ip: string): Promise<number>;
  deleteExpired(olderThanDays: number): Promise<number>;
}

/**
 * Domain event bus interface for publishing events.
 */
export interface IDomainEventBus {
   
  publish(event: unknown): Promise<void>;
}

/**
 * Audit logger interface for logging business events.
 */
export interface IAuditLogger {
   
  logBusinessEvent(eventType: string, data: unknown): Promise<void>;
   
  logSecurityEvent(eventType: string, data: unknown): Promise<void>;
   
  logError(eventType: string, data: unknown): Promise<void>;
}

/**
 * Payment gateway interface for processing payments.
 */
export interface IPaymentGateway {
  processPayment(
    request: PaymentGatewayRequest,
  ): Promise<PaymentGatewayResponse>;
}
