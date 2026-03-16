import { IncentiveRules } from './incentive.rules';
import {
  Incentive,
  IncentiveStatus,
  PaymentMethod,
  TriggerType,
} from '../aggregates/incentive.aggregate';
import { ContactInfo } from '../value-objects/contact-info.value-object';

describe('IncentiveRules', () => {
  const createMockIncentive = (overrides = {}): Incentive => {
    const contactInfo = ContactInfo.create({
      wechat: 'test_user',
      phone: '13800138000',
    });

    const incentive = Incentive.createQuestionnaireIncentive(
      '192.168.1.1',
      'questionnaire-123',
      85,
      contactInfo,
    );

    return incentive;
  };

  describe('constants', () => {
    it('should have correct business rule constants', () => {
      expect(IncentiveRules.MAX_DAILY_INCENTIVES).toBe(3);
      expect(IncentiveRules.MIN_QUALITY_SCORE).toBe(50);
      expect(IncentiveRules.HIGH_QUALITY_THRESHOLD).toBe(70);
      expect(IncentiveRules.EXCELLENT_QUALITY_THRESHOLD).toBe(90);
    });

    it('should have correct payment constants', () => {
      expect(IncentiveRules.MIN_PAYMENT_AMOUNT).toBe(0.01);
      expect(IncentiveRules.MAX_PAYMENT_AMOUNT).toBe(100);
      expect(IncentiveRules.PAYMENT_EXPIRY_DAYS).toBe(30);
    });
  });

  describe('canCreateIncentive', () => {
    it('should allow creation with valid data', () => {
      const result = IncentiveRules.canCreateIncentive(
        '192.168.1.1',
        TriggerType.QUESTIONNAIRE_COMPLETION,
        { questionnaireId: 'q-123', qualityScore: 75 },
        0,
      );

      expect(result.isEligible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid IP address', () => {
      const result = IncentiveRules.canCreateIncentive(
        'invalid-ip',
        TriggerType.QUESTIONNAIRE_COMPLETION,
        { questionnaireId: 'q-123', qualityScore: 75 },
        0,
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Invalid IP address format');
    });

    it('should reject when daily limit exceeded', () => {
      const result = IncentiveRules.canCreateIncentive(
        '192.168.1.1',
        TriggerType.QUESTIONNAIRE_COMPLETION,
        { questionnaireId: 'q-123', qualityScore: 75 },
        3,
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Daily incentive limit exceeded (max 3)');
    });

    it('should reject low quality questionnaire submissions', () => {
      const result = IncentiveRules.canCreateIncentive(
        '192.168.1.1',
        TriggerType.QUESTIONNAIRE_COMPLETION,
        { questionnaireId: 'q-123', qualityScore: 30 },
        0,
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Quality score must be at least 50');
    });

    it('should reject referral with same IP', () => {
      const result = IncentiveRules.canCreateIncentive(
        '192.168.1.1',
        TriggerType.REFERRAL,
        { referredIP: '192.168.1.1' },
        0,
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Cannot refer yourself');
    });

    it('should reject referral with invalid referred IP', () => {
      const result = IncentiveRules.canCreateIncentive(
        '192.168.1.1',
        TriggerType.REFERRAL,
        { referredIP: 'invalid-ip' },
        0,
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Valid referred IP address is required');
    });
  });

  describe('canPayIncentive', () => {
    it('should allow payment for approved incentive', () => {
      const incentive = createMockIncentive();
      const result = IncentiveRules.canPayIncentive(incentive);

      expect(result.isEligible).toBe(true);
    });

    it('should reject payment for non-approved incentive', () => {
      const contactInfo = ContactInfo.create({ wechat: 'test' });
      const incentive = Incentive.createReferralIncentive(
        '192.168.1.1',
        '192.168.1.2',
        contactInfo,
      );

      const result = IncentiveRules.canPayIncentive(incentive);

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain(
        'Incentive must be approved before payment',
      );
    });

    it('should reject payment with too small amount', () => {
      const contactInfo = ContactInfo.create({ wechat: 'test' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'q-123',
        85,
        contactInfo,
      );

      jest.spyOn(incentive, 'getRewardAmount').mockReturnValue(0.001);
      const result = IncentiveRules.canPayIncentive(incentive);

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Payment amount too small (min 0.01)');
    });

    it('should reject expired incentives', () => {
      const contactInfo = ContactInfo.create({ wechat: 'test' });
      const incentive = Incentive.createQuestionnaireIncentive(
        '192.168.1.1',
        'q-123',
        85,
        contactInfo,
      );

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      jest.spyOn(incentive, 'getCreatedAt').mockReturnValue(oldDate);

      const result = IncentiveRules.canPayIncentive(incentive);

      expect(result.isEligible).toBe(false);
      expect(result.errors.some((e) => e.includes('expired'))).toBe(true);
    });
  });

  describe('validatePaymentMethodCompatibility', () => {
    it('should validate WeChat Pay with wechat contact', () => {
      const contactInfo = ContactInfo.create({ wechat: 'test_user' });
      const result = IncentiveRules.validatePaymentMethodCompatibility(
        PaymentMethod.WECHAT_PAY,
        contactInfo,
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject WeChat Pay without wechat contact', () => {
      const contactInfo = ContactInfo.create({ phone: '13800138000' });
      const result = IncentiveRules.validatePaymentMethodCompatibility(
        PaymentMethod.WECHAT_PAY,
        contactInfo,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('WeChat ID is required for WeChat Pay');
    });

    it('should validate Alipay with phone number', () => {
      const contactInfo = ContactInfo.create({ phone: '13800138000' });
      const result = IncentiveRules.validatePaymentMethodCompatibility(
        PaymentMethod.ALIPAY,
        contactInfo,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate manual payment without specific contact info', () => {
      const contactInfo = ContactInfo.create({});
      const result = IncentiveRules.validatePaymentMethodCompatibility(
        PaymentMethod.MANUAL,
        contactInfo,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateBatchPayment', () => {
    it('should validate batch with valid incentives', () => {
      const incentives = [createMockIncentive(), createMockIncentive()];
      const result = IncentiveRules.validateBatchPayment(incentives);

      expect(result.isValid).toBe(true);
    });

    it('should reject empty batch', () => {
      const result = IncentiveRules.validateBatchPayment([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'No incentives provided for batch payment',
      );
    });

    it('should reject batch exceeding limit', () => {
      const incentives = Array(101)
        .fill(null)
        .map(() => createMockIncentive());
      const result = IncentiveRules.validateBatchPayment(incentives);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Batch payment limited to 100 incentives at once',
      );
    });

    it('should reject batch with duplicate IDs', () => {
      const incentive = createMockIncentive();
      const result = IncentiveRules.validateBatchPayment([
        incentive,
        incentive,
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });
  });

  describe('calculateProcessingPriority', () => {
    it('should calculate priority based on reward amount', () => {
      const incentive = createMockIncentive();
      const priority = IncentiveRules.calculateProcessingPriority(incentive);

      expect(priority.score).toBeGreaterThan(0);
      expect(priority.factors.length).toBeGreaterThan(0);
    });

    it('should give higher priority to high reward amounts', () => {
      jest.spyOn(Incentive.prototype, 'getRewardAmount').mockReturnValue(10);
      const incentive = createMockIncentive();

      const priority = IncentiveRules.calculateProcessingPriority(incentive);

      expect(priority.score).toBeGreaterThanOrEqual(30);
      expect(priority.factors).toContain('High reward amount');
    });
  });

  describe('assessIncentiveRisk', () => {
    it('should assess low risk for normal usage', () => {
      const result = IncentiveRules.assessIncentiveRisk(
        '192.168.1.1',
        1,
        [1, 1],
      );

      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBeLessThan(30);
    });

    it('should assess high risk for max daily usage', () => {
      const result = IncentiveRules.assessIncentiveRisk(
        '192.168.1.1',
        3,
        [3, 3, 3],
      );

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.riskFactors).toContain('Max daily limit reached');
    });

    it('should assess high risk for invalid IP', () => {
      const result = IncentiveRules.assessIncentiveRisk('invalid-ip', 0, []);

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskFactors).toContain('Invalid IP address');
    });
  });

  describe('isValidIPAddress', () => {
    it('should return true for valid IPv4 addresses', () => {
      expect(IncentiveRules.isValidIPAddress('192.168.1.1')).toBe(true);
      expect(IncentiveRules.isValidIPAddress('10.0.0.1')).toBe(true);
      expect(IncentiveRules.isValidIPAddress('255.255.255.255')).toBe(true);
    });

    it('should return false for invalid IP addresses', () => {
      expect(IncentiveRules.isValidIPAddress('invalid')).toBe(false);
      expect(IncentiveRules.isValidIPAddress('192.168.1')).toBe(false);
      expect(IncentiveRules.isValidIPAddress('256.0.0.1')).toBe(false);
    });

    it('should return false for empty or null values', () => {
      expect(IncentiveRules.isValidIPAddress('')).toBe(false);
      expect(IncentiveRules.isValidIPAddress(null as unknown as string)).toBe(
        false,
      );
    });
  });

  describe('analyzeUsageHistory', () => {
    it('should analyze empty incentive list', () => {
      const result = IncentiveRules.analyzeUsageHistory([]);

      expect(result.totalIncentives).toBe(0);
      expect(result.conversionRate).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const incentives = [createMockIncentive(), createMockIncentive()];
      const result = IncentiveRules.analyzeUsageHistory(incentives);

      expect(result.totalIncentives).toBe(2);
      expect(result.totalAmount).toBeGreaterThan(0);
    });
  });
});
