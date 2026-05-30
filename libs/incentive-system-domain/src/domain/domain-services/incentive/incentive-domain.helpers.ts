import type {
  Incentive,
  PaymentMethod,
} from '../../aggregates/incentive.aggregate.js';
import {
  Currency,
  IncentiveStatus,
} from '../../aggregates/incentive.aggregate.js';
import { ContactInfo } from '../../value-objects/index.js';
import type {
  IDomainEventBus,
  IPIncentiveStatistics,
} from '../../../application/dtos/incentive.dto.js';

export class IncentiveDomainHelpers {
  public static async publishEvents(
    incentive: Incentive,
    eventBus: IDomainEventBus,
  ): Promise<void> {
    const events = incentive.getUncommittedEvents();
    for (const event of events) {
      await eventBus.publish(event);
    }
    incentive.markEventsAsCommitted();
  }

  public static buildRecipientInfo(contactInfo: ContactInfo): {
    name: string;
    email: string | undefined;
    phone: string | undefined;
    address: undefined;
    accountNumber: string | undefined;
    bankCode: undefined;
    metadata: { wechat: string | undefined; alipay: string | undefined };
  } {
    return {
      name: contactInfo.email ?? contactInfo.phone ?? 'Incentive Recipient',
      email: contactInfo.email,
      phone: contactInfo.phone,
      address: undefined,
      accountNumber: contactInfo.alipay ?? contactInfo.wechat,
      bankCode: undefined,
      metadata: {
        wechat: contactInfo.wechat,
        alipay: contactInfo.alipay,
      },
    };
  }

  public static extractContactInfoFromIncentive(
    _incentive: Incentive,
  ): ContactInfo {
    return new ContactInfo({
      email: 'test@example.com',
      wechat: 'test_wechat',
      alipay: 'test_alipay',
    });
  }

  public static createPaymentRequest(
    incentive: Incentive,
    paymentMethod: PaymentMethod,
    contactInfo: ContactInfo,
  ): {
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    recipientInfo: ReturnType<typeof IncentiveDomainHelpers.buildRecipientInfo>;
    reference: string;
  } {
    return {
      amount: incentive.getRewardAmount(),
      currency: Currency.CNY,
      paymentMethod,
      recipientInfo: this.buildRecipientInfo(contactInfo),
      reference: incentive.getId().getValue(),
    };
  }

  public static isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  public static calculateIPStatistics(
    ip: string,
    incentives: Incentive[],
  ): IPIncentiveStatistics {
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    const statusCount = {
      pending_validation: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
    };

    for (const incentive of incentives) {
      const amount = incentive.getRewardAmount();
      totalAmount += amount;

      switch (incentive.getStatus()) {
        case IncentiveStatus.PENDING_VALIDATION:
          statusCount.pending_validation++;
          pendingAmount += amount;
          break;
        case IncentiveStatus.APPROVED:
          statusCount.approved++;
          pendingAmount += amount;
          break;
        case IncentiveStatus.PAID:
          statusCount.paid++;
          paidAmount += amount;
          break;
        case IncentiveStatus.REJECTED:
          statusCount.rejected++;
          break;
      }
    }

    return {
      ip,
      totalIncentives: incentives.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      statusBreakdown: statusCount,
      averageReward:
        incentives.length > 0 ? totalAmount / incentives.length : 0,
      lastIncentiveDate:
        incentives.length > 0
          ? Math.max(...incentives.map((i) => i.getCreatedAt().getTime()))
          : undefined,
    };
  }
}
