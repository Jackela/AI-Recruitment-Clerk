import { IncentiveId } from './incentive-id.value-object';

describe('IncentiveId', () => {
  describe('generate', () => {
    it('should generate unique incentive ids', () => {
      const id1 = IncentiveId.generate();
      const id2 = IncentiveId.generate();
      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate id with incentive_ prefix', () => {
      const id = IncentiveId.generate();
      expect(id.getValue()).toMatch(/^incentive_/);
    });
  });

  describe('getValue', () => {
    it('should return the string value', () => {
      const id = IncentiveId.generate();
      expect(typeof id.getValue()).toBe('string');
    });
  });
});
