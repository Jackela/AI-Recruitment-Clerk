import {
  Incentive,
  IncentiveStatus,
  PaymentMethod,
} from '../domain/aggregates/incentive.aggregate';
import { ContactInfo } from '../domain/value-objects/contact-info.value-object';

describe('Incentive Aggregate', () => {
  const mockContactInfo = ContactInfo.create({
    wechat: 'test_user',
    phone: '13800138000',
  });

  describe('createQuestionnaireIncentive', () => {
    it('should create incentive for questionnaire completion', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(incentive).toBeDefined();
      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);
      expect(incentive.getRecipientIP()).toBe('192.168.1.1');
      expect(incentive.getRewardAmount()).toBeGreaterThan(0);
    });

    it('should emit IncentiveCreatedEvent', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      const events = incentive.getUncommittedEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].eventName).toBe('incentive.created');
    });

    it('should auto-approve high quality submissions', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);
    });

    it('should not auto-approve low quality submissions', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        60,
        mockContactInfo,
      );

      expect(incentive.getStatus()).toBe(IncentiveStatus.PENDING_VALIDATION);
    });
  });

  describe('createReferralIncentive', () => {
    it('should create incentive for referral', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      expect(incentive).toBeDefined();
      expect(incentive.getStatus()).toBe(IncentiveStatus.PENDING_VALIDATION);
      expect(incentive.getRecipientIP()).toBe('192.168.1.1');
    });

    it('should emit IncentiveCreatedEvent for referral', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      const events = incentive.getUncommittedEvents();
      const createdEvent = events.find(
        (e) => e.eventName === 'incentive.created',
      );
      expect(createdEvent).toBeDefined();
    });
  });

  describe('validateEligibility', () => {
    it('should validate eligible incentive', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      const result = incentive.validateEligibility();
      expect(result.isValid()).toBe(true);
    });

    it('should emit IncentiveValidatedEvent for valid incentive', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );
      incentive.markEventsAsCommitted();

      incentive.validateEligibility();
      const events = incentive.getUncommittedEvents();
      const validatedEvent = events.find(
        (e) => e.eventName === 'incentive.validated',
      );
      expect(validatedEvent).toBeDefined();
    });
  });

  describe('approveForProcessing', () => {
    it('should approve pending incentive', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      incentive.approveForProcessing('Manual approval');
      expect(incentive.getStatus()).toBe(IncentiveStatus.APPROVED);
    });

    it('should emit IncentiveApprovedEvent', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      incentive.approveForProcessing('Manual approval');
      const events = incentive.getUncommittedEvents();
      const approvedEvent = events.find(
        (e) => e.eventName === 'incentive.approved',
      );
      expect(approvedEvent).toBeDefined();
    });

    it('should throw error when approving non-pending incentive', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(() => {
        incentive.approveForProcessing('Should fail');
      }).toThrow('Cannot approve incentive in approved status');
    });
  });

  describe('reject', () => {
    it('should reject pending incentive', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      incentive.reject('Fraud detected');
      expect(incentive.getStatus()).toBe(IncentiveStatus.REJECTED);
    });

    it('should emit IncentiveRejectedEvent', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      incentive.reject('Fraud detected');
      const events = incentive.getUncommittedEvents();
      const rejectedEvent = events.find(
        (e) => e.eventName === 'incentive.rejected',
      );
      expect(rejectedEvent).toBeDefined();
    });

    it('should throw error when rejecting paid incentive', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      incentive.executePayment(PaymentMethod.WECHAT_PAY, 'txn-123');

      expect(() => {
        incentive.reject('Should fail');
      }).toThrow('Cannot reject already paid incentive');
    });
  });

  describe('executePayment', () => {
    it('should execute payment for approved incentive', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      const result = incentive.executePayment(
        PaymentMethod.WECHAT_PAY,
        'txn-123456',
      );

      expect(result.isSuccess()).toBe(true);
      expect(incentive.getStatus()).toBe(IncentiveStatus.PAID);
    });

    it('should emit IncentivePaidEvent on successful payment', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      incentive.executePayment(PaymentMethod.WECHAT_PAY, 'txn-123456');
      const events = incentive.getUncommittedEvents();
      const paidEvent = events.find((e) => e.eventName === 'incentive.paid');
      expect(paidEvent).toBeDefined();
    });

    it('should fail payment for non-approved incentive', () => {
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        mockContactInfo,
      );

      const result = incentive.executePayment(
        PaymentMethod.WECHAT_PAY,
        'txn-123456',
      );

      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toContain('Cannot pay incentive');
    });
  });

  describe('getIncentiveSummary', () => {
    it('should return incentive summary', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      const summary = incentive.getIncentiveSummary();
      expect(summary).toBeDefined();
      expect(summary.getRecipientIP()).toBe('192.168.1.1');
      expect(summary.getRewardAmount()).toBeGreaterThan(0);
    });
  });

  describe('event management', () => {
    it('should mark events as committed', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      expect(incentive.getUncommittedEvents().length).toBeGreaterThan(0);
      incentive.markEventsAsCommitted();
      expect(incentive.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('should restore incentive from data', () => {
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'questionnaire-123',
        85,
        mockContactInfo,
      );

      const data = {
        id: incentive.getId().getValue(),
        recipient: {
          ip: '192.168.1.1',
          contactInfo: {
            wechat: 'test_user',
            phone: '13800138000',
          },
        },
        reward: {
          amount: 10,
          currency: 'CNY',
          type: 'questionnaire_completion',
        },
        trigger: {
          type: 'questionnaire_completion',
          questionnaireId: 'questionnaire-123',
          qualityScore: 85,
        },
        status: IncentiveStatus.PAID,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };

      const restored = Incentive.restore(data);
      expect(restored.getId().getValue()).toBe(data.id);
      expect(restored.getStatus()).toBe(IncentiveStatus.PAID);
    });
  });
});
