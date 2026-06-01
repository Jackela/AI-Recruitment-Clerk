import { QuotaAllocation } from './quota-allocation.value-object';
import { BonusType } from '../../application/dtos/usage-limit.dto';

describe('QuotaAllocation', () => {
  describe('createDefault', () => {
    it('should create default allocation with zero bonus', () => {
      const allocation = QuotaAllocation.createDefault(100);
      expect(allocation.props.baseQuota).toBe(100);
      expect(allocation.props.bonusQuota).toBe(0);
      expect(allocation.props.bonusBreakdown.size).toBe(0);
    });
  });

  describe('restore', () => {
    it('should restore from data', () => {
      const data = {
        baseQuota: 50,
        bonusQuota: 10,
        bonusBreakdown: [[BonusType.QUESTIONNAIRE, 5]] as [BonusType, number][],
      };

      const allocation = QuotaAllocation.restore(data);
      expect(allocation.props.baseQuota).toBe(50);
      expect(allocation.props.bonusQuota).toBe(10);
      expect(allocation.props.bonusBreakdown.size).toBe(1);
    });

    it('should handle empty bonus breakdown', () => {
      const data = {
        baseQuota: 50,
        bonusQuota: 0,
        bonusBreakdown: [],
      };

      const allocation = QuotaAllocation.restore(data);
      expect(allocation.props.bonusBreakdown.size).toBe(0);
    });
  });

  describe('addBonus', () => {
    it('should add bonus to allocation', () => {
      const allocation = QuotaAllocation.createDefault(100);
      const updated = allocation.addBonus(BonusType.QUESTIONNAIRE, 5);

      expect(updated.props.bonusQuota).toBe(5);
      expect(updated.props.bonusBreakdown.get(BonusType.QUESTIONNAIRE)).toBe(5);
    });

    it('should accumulate bonus for same type', () => {
      const allocation = QuotaAllocation.createDefault(100).addBonus(
        BonusType.QUESTIONNAIRE,
        5,
      );
      const updated = allocation.addBonus(BonusType.QUESTIONNAIRE, 3);

      expect(updated.props.bonusQuota).toBe(8);
      expect(updated.props.bonusBreakdown.get(BonusType.QUESTIONNAIRE)).toBe(8);
    });

    it('should add different bonus types separately', () => {
      const allocation = QuotaAllocation.createDefault(100)
        .addBonus(BonusType.QUESTIONNAIRE, 5)
        .addBonus(BonusType.REFERRAL, 3);

      expect(allocation.props.bonusQuota).toBe(8);
      expect(allocation.props.bonusBreakdown.get(BonusType.QUESTIONNAIRE)).toBe(
        5,
      );
      expect(allocation.props.bonusBreakdown.get(BonusType.REFERRAL)).toBe(3);
    });
  });

  describe('getAvailableQuota', () => {
    it('should return sum of base and bonus quota', () => {
      const allocation = QuotaAllocation.createDefault(100).addBonus(
        BonusType.QUESTIONNAIRE,
        20,
      );

      expect(allocation.getAvailableQuota()).toBe(120);
    });

    it('should return base quota when no bonus', () => {
      const allocation = QuotaAllocation.createDefault(50);
      expect(allocation.getAvailableQuota()).toBe(50);
    });
  });

  describe('getBonusQuota', () => {
    it('should return bonus quota', () => {
      const allocation = QuotaAllocation.createDefault(100).addBonus(
        BonusType.PAYMENT,
        15,
      );

      expect(allocation.getBonusQuota()).toBe(15);
    });
  });

  describe('getBonusBreakdown', () => {
    it('should return copy of bonus breakdown', () => {
      const allocation = QuotaAllocation.createDefault(100).addBonus(
        BonusType.QUESTIONNAIRE,
        5,
      );

      const breakdown1 = allocation.getBonusBreakdown();
      const breakdown2 = allocation.getBonusBreakdown();

      expect(breakdown1).toEqual(breakdown2);
      expect(breakdown1).not.toBe(breakdown2);
    });
  });
});
