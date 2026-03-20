import { IncentiveSummary } from './incentive-summary.value-object';
import {
  Currency,
  TriggerType,
  IncentiveStatus,
} from '../aggregates/incentive.aggregate';

describe('IncentiveSummary', () => {
  const createSummary = (overrides = {}) => {
    return new IncentiveSummary({
      id: 'incentive-123',
      recipientIP: '192.168.1.1',
      rewardAmount: 5,
      rewardCurrency: Currency.CNY,
      triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
      status: IncentiveStatus.APPROVED,
      createdAt: new Date('2024-01-01'),
      processedAt: new Date('2024-01-02'),
      paidAt: undefined,
      canBePaid: true,
      daysSinceCreation: 5,
      ...overrides,
    });
  };

  describe('constructor', () => {
    it('should create summary with all properties', () => {
      const createdAt = new Date();
      const processedAt = new Date();
      const summary = new IncentiveSummary({
        id: 'inc-1',
        recipientIP: '10.0.0.1',
        rewardAmount: 10,
        rewardCurrency: Currency.CNY,
        triggerType: TriggerType.REFERRAL,
        status: IncentiveStatus.PENDING,
        createdAt,
        processedAt,
        paidAt: undefined,
        canBePaid: false,
        daysSinceCreation: 3,
      });

      expect(summary.props.id).toBe('inc-1');
      expect(summary.props.recipientIP).toBe('10.0.0.1');
      expect(summary.props.rewardAmount).toBe(10);
      expect(summary.props.status).toBe(IncentiveStatus.PENDING);
    });
  });

  describe('id getter', () => {
    it('should return id', () => {
      const summary = createSummary({ id: 'custom-id' });
      expect(summary.id).toBe('custom-id');
    });
  });

  describe('recipientIP getter', () => {
    it('should return recipient IP', () => {
      const summary = createSummary({ recipientIP: '172.16.0.1' });
      expect(summary.recipientIP).toBe('172.16.0.1');
    });
  });

  describe('rewardAmount getter', () => {
    it('should return reward amount', () => {
      const summary = createSummary({ rewardAmount: 15 });
      expect(summary.rewardAmount).toBe(15);
    });
  });

  describe('status getter', () => {
    it('should return status', () => {
      const summary = createSummary({ status: IncentiveStatus.PAID });
      expect(summary.status).toBe(IncentiveStatus.PAID);
    });
  });

  describe('canBePaid getter', () => {
    it('should return canBePaid status', () => {
      const summary = createSummary({ canBePaid: true });
      expect(summary.canBePaid).toBe(true);
    });

    it('should return false when cannot be paid', () => {
      const summary = createSummary({ canBePaid: false });
      expect(summary.canBePaid).toBe(false);
    });
  });

  describe('daysSinceCreation getter', () => {
    it('should return days since creation', () => {
      const summary = createSummary({ daysSinceCreation: 10 });
      expect(summary.daysSinceCreation).toBe(10);
    });
  });
});
