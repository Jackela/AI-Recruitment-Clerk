import {
  IncentiveTrigger,
  IncentiveTriggerData,
} from './incentive-trigger.value-object';
import { TriggerType } from '../aggregates/incentive.aggregate';

describe('IncentiveTrigger', () => {
  describe('fromQuestionnaire', () => {
    it('should create trigger for questionnaire', () => {
      const trigger = IncentiveTrigger.fromQuestionnaire('q-123', 85);

      expect(trigger.getTriggerType()).toBe(
        TriggerType.QUESTIONNAIRE_COMPLETION,
      );
      expect(trigger.getTriggerData().questionnaireId).toBe('q-123');
      expect(trigger.getTriggerData().qualityScore).toBe(85);
      expect(trigger.getQualifiedAt()).toBeInstanceOf(Date);
    });
  });

  describe('fromReferral', () => {
    it('should create trigger for referral', () => {
      const trigger = IncentiveTrigger.fromReferral('192.168.1.1');

      expect(trigger.getTriggerType()).toBe(TriggerType.REFERRAL);
      expect(trigger.getTriggerData().referredIP).toBe('192.168.1.1');
    });
  });

  describe('restore', () => {
    it('should restore from serialized data', () => {
      const data = {
        triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
        triggerData: { questionnaireId: 'q-456', qualityScore: 90 },
        qualifiedAt: '2024-01-15T10:00:00Z',
      };

      const trigger = IncentiveTrigger.restore(data);
      expect(trigger.getTriggerType()).toBe(
        TriggerType.QUESTIONNAIRE_COMPLETION,
      );
      expect(trigger.getQualifiedAt()).toBeInstanceOf(Date);
    });

    it('should handle Date object in qualifiedAt', () => {
      const data = {
        triggerType: TriggerType.REFERRAL,
        triggerData: { referredIP: '10.0.0.1' },
        qualifiedAt: new Date('2024-01-15T10:00:00Z'),
      };

      const trigger = IncentiveTrigger.restore(data);
      expect(trigger.getQualifiedAt()).toBeInstanceOf(Date);
    });
  });

  describe('getTriggerType', () => {
    it('should return trigger type', () => {
      const trigger = IncentiveTrigger.fromQuestionnaire('q-123', 75);
      expect(trigger.getTriggerType()).toBe(
        TriggerType.QUESTIONNAIRE_COMPLETION,
      );
    });
  });

  describe('isValid', () => {
    it('should return true for valid questionnaire trigger', () => {
      const trigger = IncentiveTrigger.fromQuestionnaire('q-123', 85);
      expect(trigger.isValid()).toBe(true);
    });

    it('should return true for valid referral trigger', () => {
      const trigger = IncentiveTrigger.fromReferral('192.168.1.1');
      expect(trigger.isValid()).toBe(true);
    });

    it('should return false for trigger with invalid type', () => {
      const trigger = new IncentiveTrigger({
        triggerType: 'INVALID' as TriggerType,
        triggerData: {},
        qualifiedAt: new Date(),
      });
      expect(trigger.isValid()).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    it('should return empty for valid questionnaire trigger', () => {
      const trigger = IncentiveTrigger.fromQuestionnaire('q-123', 85);
      expect(trigger.getValidationErrors()).toHaveLength(0);
    });

    it('should return empty for valid referral trigger', () => {
      const trigger = IncentiveTrigger.fromReferral('192.168.1.1');
      expect(trigger.getValidationErrors()).toHaveLength(0);
    });

    it('should return error for invalid trigger type', () => {
      const trigger = new IncentiveTrigger({
        triggerType: 'INVALID' as TriggerType,
        triggerData: {},
        qualifiedAt: new Date(),
      });
      expect(trigger.getValidationErrors()).toContain('Invalid trigger type');
    });

    it('should return error for missing questionnaire id', () => {
      const trigger = new IncentiveTrigger({
        triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
        triggerData: { qualityScore: 85 },
        qualifiedAt: new Date(),
      });
      expect(trigger.getValidationErrors()).toContain(
        'Questionnaire ID is required',
      );
    });

    it('should return error for invalid quality score range', () => {
      const trigger = new IncentiveTrigger({
        triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
        triggerData: { questionnaireId: 'q-123', qualityScore: 150 },
        qualifiedAt: new Date(),
      });
      expect(trigger.getValidationErrors()).toContain(
        'Valid quality score (0-100) is required',
      );
    });

    it('should return error for missing referred IP in referral', () => {
      const trigger = new IncentiveTrigger({
        triggerType: TriggerType.REFERRAL,
        triggerData: {},
        qualifiedAt: new Date(),
      });
      expect(trigger.getValidationErrors()).toContain(
        'Referred IP is required',
      );
    });

    it('should return multiple errors when applicable', () => {
      const trigger = new IncentiveTrigger({
        triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
        triggerData: {},
        qualifiedAt: new Date(),
      });
      const errors = trigger.getValidationErrors();
      expect(errors.length).toBeGreaterThan(1);
    });
  });
});
