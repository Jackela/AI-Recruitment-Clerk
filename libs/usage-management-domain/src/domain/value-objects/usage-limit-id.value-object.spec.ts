import { UsageLimitId } from './usage-limit-id.value-object';

describe('UsageLimitId', () => {
  describe('generate', () => {
    it('should generate a unique usage limit id', () => {
      const id1 = UsageLimitId.generate();
      const id2 = UsageLimitId.generate();

      expect(id1.getValue()).toBeDefined();
      expect(id2.getValue()).toBeDefined();
      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should start with usage_ prefix', () => {
      const id = UsageLimitId.generate();
      expect(id.getValue()).toMatch(/^usage_/);
    });
  });

  describe('getValue', () => {
    it('should return the string value', () => {
      const id = UsageLimitId.generate();
      expect(typeof id.getValue()).toBe('string');
    });
  });
});
