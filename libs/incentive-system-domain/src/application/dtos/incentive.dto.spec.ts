import {
  Currency,
  PaymentMethod,
  IncentiveStatus,
} from '../../domain/aggregates/incentive.aggregate';
import {
  IncentiveCreationResult,
  IncentiveValidationResult,
  IncentiveApprovalResult,
  IncentiveRejectionResult,
  PaymentProcessingResult,
  BatchPaymentResult,
  IncentiveStatsResult,
  PendingIncentivesResult,
} from './incentive.dto';
import { TriggerType } from '../../domain/aggregates/incentive.aggregate';
import { IncentiveSummary } from '../../domain/value-objects/incentive-summary.value-object';

describe('IncentiveCreationResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const mockSummary = {
        id: 'inc-1',
        recipientIP: '192.168.1.1',
        rewardAmount: 5,
        rewardCurrency: Currency.CNY,
        triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
        status: IncentiveStatus.APPROVED,
        createdAt: new Date(),
        canBePaid: true,
        daysSinceCreation: 1,
      } as IncentiveSummary;

      const result = IncentiveCreationResult.success(mockSummary);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockSummary);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Error 1', 'Error 2'];
      const result = IncentiveCreationResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('IncentiveValidationResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const data = {
        incentiveId: 'inc-1',
        isValid: true,
        errors: [] as string[],
        status: IncentiveStatus.APPROVED,
      };

      const result = IncentiveValidationResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Invalid data'];
      const result = IncentiveValidationResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('IncentiveApprovalResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const data = {
        incentiveId: 'inc-1',
        status: IncentiveStatus.APPROVED,
        rewardAmount: 5,
      };

      const result = IncentiveApprovalResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Already paid'];
      const result = IncentiveApprovalResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('IncentiveRejectionResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const data = {
        incentiveId: 'inc-1',
        status: IncentiveStatus.REJECTED,
        rejectionReason: 'Fraud detected',
      };

      const result = IncentiveRejectionResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Cannot reject paid incentive'];
      const result = IncentiveRejectionResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('PaymentProcessingResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const data = {
        incentiveId: 'inc-1',
        transactionId: 'txn-123',
        amount: 5,
        currency: Currency.CNY,
        paymentMethod: PaymentMethod.WECHAT_PAY,
        status: IncentiveStatus.PAID,
      };

      const result = PaymentProcessingResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Gateway timeout'];
      const result = PaymentProcessingResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('BatchPaymentResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const data = {
        totalIncentives: 10,
        successCount: 8,
        failureCount: 2,
        totalPaidAmount: 40,
        results: [
          {
            incentiveId: 'inc-1',
            success: true,
            transactionId: 'txn-1',
            amount: 5,
          },
          { incentiveId: 'inc-2', success: false, error: 'Insufficient funds' },
        ],
      };

      const result = BatchPaymentResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Batch limit exceeded'];
      const result = BatchPaymentResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('IncentiveStatsResult', () => {
  describe('success', () => {
    it('should create success result with individual stats', () => {
      const data = {
        individual: {
          ip: '192.168.1.1',
          totalIncentives: 5,
          totalAmount: 25,
          paidAmount: 15,
          pendingAmount: 10,
          statusBreakdown: { pending: 1, approved: 1, paid: 2, rejected: 1 },
          averageReward: 5,
        },
      };

      const result = IncentiveStatsResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data?.individual).toEqual(data.individual);
    });

    it('should create success result with system stats', () => {
      const data = {
        system: {
          totalIncentives: 100,
          uniqueRecipients: 50,
          totalAmount: 500,
          paidAmount: 300,
          pendingAmount: 200,
          statusBreakdown: {
            pending: 20,
            approved: 30,
            paid: 40,
            rejected: 10,
          },
          averageRewardPerIncentive: 5,
          averageRewardPerIP: 10,
          conversionRate: 40,
        },
      };

      const result = IncentiveStatsResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data?.system).toEqual(data.system);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Invalid IP format'];
      const result = IncentiveStatsResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});

describe('PendingIncentivesResult', () => {
  describe('success', () => {
    it('should create success result', () => {
      const mockSummary = {
        id: 'inc-1',
        recipientIP: '192.168.1.1',
        rewardAmount: 5,
        rewardCurrency: Currency.CNY,
        triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
        status: IncentiveStatus.APPROVED,
        createdAt: new Date(),
        canBePaid: true,
        daysSinceCreation: 1,
      } as IncentiveSummary;

      const priority = {
        score: 50,
        factors: ['High reward amount'] as string[],
      };

      const data = [{ incentive: mockSummary, priority }];
      const result = PendingIncentivesResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('failed', () => {
    it('should create failed result', () => {
      const errors = ['Database error'];
      const result = PendingIncentivesResult.failed(errors);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });
});
