import { IncentiveReward } from './incentive-reward.value-object';
import { Currency, RewardType } from '../aggregates/incentive.aggregate';

describe('IncentiveReward', () => {
  describe('calculateForQuestionnaire', () => {
    it('should calculate high quality reward for score >= 90', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(95);

      expect(reward.props.amount).toBe(8);
      expect(reward.props.currency).toBe(Currency.CNY);
      expect(reward.props.rewardType).toBe(RewardType.QUESTIONNAIRE_COMPLETION);
      expect(reward.props.calculationMethod).toContain('High quality bonus');
    });

    it('should calculate standard reward for score >= 70', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(75);

      expect(reward.props.amount).toBe(5);
      expect(reward.props.calculationMethod).toContain(
        'Standard quality bonus',
      );
    });

    it('should calculate basic reward for score >= 50', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(55);

      expect(reward.props.amount).toBe(3);
      expect(reward.props.calculationMethod).toContain(
        'Basic completion bonus',
      );
    });

    it('should return zero reward for score < 50', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(30);

      expect(reward.props.amount).toBe(0);
      expect(reward.props.calculationMethod).toContain('No reward');
    });

    it('should handle boundary at 90', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(90);
      expect(reward.props.amount).toBe(8);
    });

    it('should handle boundary at 70', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(70);
      expect(reward.props.amount).toBe(5);
    });

    it('should handle boundary at 50', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(50);
      expect(reward.props.amount).toBe(3);
    });
  });

  describe('createReferralReward', () => {
    it('should create fixed referral reward', () => {
      const reward = IncentiveReward.createReferralReward();

      expect(reward.props.amount).toBe(3);
      expect(reward.props.currency).toBe(Currency.CNY);
      expect(reward.props.rewardType).toBe(RewardType.REFERRAL);
      expect(reward.props.calculationMethod).toContain('Fixed referral reward');
    });
  });

  describe('restore', () => {
    it('should restore from data', () => {
      const data = {
        amount: 5,
        currency: Currency.CNY,
        rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
        calculationMethod: 'Test method',
      };

      const reward = IncentiveReward.restore(data);
      expect(reward.props.amount).toBe(5);
      expect(reward.props.calculationMethod).toBe('Test method');
    });
  });

  describe('getAmount', () => {
    it('should return reward amount', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(95);
      expect(reward.getAmount()).toBe(8);
    });
  });

  describe('getCurrency', () => {
    it('should return currency', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(75);
      expect(reward.getCurrency()).toBe(Currency.CNY);
    });
  });

  describe('isValid', () => {
    it('should return true for valid reward', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(75);
      expect(reward.isValid()).toBe(true);
    });

    it('should return false for invalid reward', () => {
      const reward = new IncentiveReward({
        amount: 150,
        currency: Currency.CNY,
        rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
        calculationMethod: 'Invalid',
      });
      expect(reward.isValid()).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should return empty array for valid reward', () => {
      const reward = IncentiveReward.calculateForQuestionnaire(75);
      expect(reward.getValidationErrors()).toHaveLength(0);
    });

    it('should return error for negative amount', () => {
      const reward = new IncentiveReward({
        amount: -1,
        currency: Currency.CNY,
        rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
        calculationMethod: 'Invalid',
      });
      expect(reward.getValidationErrors()).toContain(
        'Reward amount cannot be negative',
      );
    });

    it('should return error for amount exceeding 100', () => {
      const reward = new IncentiveReward({
        amount: 150,
        currency: Currency.CNY,
        rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
        calculationMethod: 'Invalid',
      });
      expect(reward.getValidationErrors()).toContain(
        'Reward amount cannot exceed 100 CNY',
      );
    });

    it('should return error for invalid currency', () => {
      const reward = new IncentiveReward({
        amount: 5,
        currency: 'INVALID' as Currency,
        rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
        calculationMethod: 'Invalid',
      });
      expect(reward.getValidationErrors()).toContain('Invalid currency');
    });
  });
});
