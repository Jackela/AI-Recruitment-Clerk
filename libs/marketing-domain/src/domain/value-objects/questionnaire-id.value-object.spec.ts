import { QuestionnaireId } from './questionnaire-id.value-object.js';

describe('QuestionnaireId', () => {
  describe('generate', () => {
    it('should generate a valid questionnaire id', () => {
      const id = QuestionnaireId.generate();
      expect(id).toBeInstanceOf(QuestionnaireId);
    });

    it('should generate id with quest_ prefix', () => {
      const id = QuestionnaireId.generate();
      const value = id.getValue();
      expect(value.startsWith('quest_')).toBe(true);
    });

    it('should generate unique ids', () => {
      const id1 = QuestionnaireId.generate();
      const id2 = QuestionnaireId.generate();
      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate id with timestamp and random parts', () => {
      const id = QuestionnaireId.generate();
      const value = id.getValue();
      const parts = value.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('quest');
      expect(parts[1].length).toBeGreaterThan(0); // timestamp
      expect(parts[2].length).toBe(9); // random
    });
  });

  describe('getValue', () => {
    it('should return the value', () => {
      const id = QuestionnaireId.generate();
      const value = id.getValue();
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  describe('constructor', () => {
    it('should create with custom value', () => {
      const id = new QuestionnaireId({ value: 'custom_id_123' });
      expect(id.getValue()).toBe('custom_id_123');
    });
  });
});
