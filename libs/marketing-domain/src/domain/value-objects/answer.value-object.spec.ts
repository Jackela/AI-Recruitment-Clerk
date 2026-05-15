import { Answer } from './answer.value-object.js';

describe('Answer', () => {
  describe('constructor', () => {
    it('should create answer with question id and value', () => {
      const answer = new Answer({
        questionId: 'role',
        value: 'hr',
      });

      expect(answer).toBeInstanceOf(Answer);
    });

    it('should create answer with different question types', () => {
      const answers = [
        { questionId: 'role', value: 'manager' },
        { questionId: 'industry', value: 'Technology' },
        { questionId: 'satisfaction', value: '5' },
        { questionId: 'feedback', value: 'Great product!' },
      ];

      answers.forEach((data) => {
        const answer = new Answer(data);
        const props = (answer as any).props;
        expect(props.questionId).toBe(data.questionId);
        expect(props.value).toBe(data.value);
      });
    });

    it('should handle empty values', () => {
      const answer = new Answer({
        questionId: 'feedback',
        value: '',
      });

      const props = (answer as any).props;
      expect(props.value).toBe('');
    });

    it('should handle long values', () => {
      const longValue = 'A'.repeat(1000);
      const answer = new Answer({
        questionId: 'detailed_feedback',
        value: longValue,
      });

      const props = (answer as any).props;
      expect(props.value).toBe(longValue);
    });
  });

  describe('props access', () => {
    it('should store question id correctly', () => {
      const answer = new Answer({
        questionId: 'test_question',
        value: 'test_value',
      });

      expect((answer as any).props.questionId).toBe('test_question');
    });

    it('should store value correctly', () => {
      const answer = new Answer({
        questionId: 'test_question',
        value: 'test_value',
      });

      expect((answer as any).props.value).toBe('test_value');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in value', () => {
      const specialValue =
        'Value with special chars: !@#$%^&*()_+-=[]{}|;\':",./\u003c\u003e?';
      const answer = new Answer({
        questionId: 'special',
        value: specialValue,
      });

      expect((answer as any).props.value).toBe(specialValue);
    });

    it('should handle unicode characters', () => {
      const answer = new Answer({
        questionId: '📋 question',
        value: '🎉 答案内容 🚀',
      });

      expect((answer as any).props.questionId).toBe('📋 question');
      expect((answer as any).props.value).toBe('🎉 答案内容 🚀');
    });

    it('should handle numeric values as strings', () => {
      const answer = new Answer({
        questionId: 'rating',
        value: '4.5',
      });

      expect((answer as any).props.value).toBe('4.5');
    });

    it('should handle multiline values', () => {
      const multilineValue = `Line 1
Line 2
Line 3`;
      const answer = new Answer({
        questionId: 'textarea',
        value: multilineValue,
      });

      expect((answer as any).props.value).toBe(multilineValue);
    });
  });
});
