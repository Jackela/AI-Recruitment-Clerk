import { OptionalInfo } from './optional-info.value-object.js';

describe('OptionalInfo', () => {
  describe('constructor', () => {
    it('should create optional info with no properties', () => {
      const optionalInfo = new OptionalInfo({});

      expect(optionalInfo).toBeInstanceOf(OptionalInfo);
      expect(optionalInfo.additionalFeedback).toBeUndefined();
      expect(optionalInfo.contactPreference).toBeUndefined();
    });

    it('should create optional info with only additional feedback', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback: 'Great product!',
      });

      expect(optionalInfo.additionalFeedback).toBe('Great product!');
      expect(optionalInfo.contactPreference).toBeUndefined();
    });

    it('should create optional info with only contact preference', () => {
      const optionalInfo = new OptionalInfo({
        contactPreference: 'email',
      });

      expect(optionalInfo.additionalFeedback).toBeUndefined();
      expect(optionalInfo.contactPreference).toBe('email');
    });

    it('should create optional info with both properties', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback: 'Love the interface!',
        contactPreference: 'phone',
      });

      expect(optionalInfo.additionalFeedback).toBe('Love the interface!');
      expect(optionalInfo.contactPreference).toBe('phone');
    });

    it('should handle different contact preferences', () => {
      const preferences = ['email', 'phone', 'sms', 'no_contact', 'wechat'];

      preferences.forEach((preference) => {
        const optionalInfo = new OptionalInfo({
          contactPreference: preference,
        });
        expect(optionalInfo.contactPreference).toBe(preference);
      });
    });
  });

  describe('getters', () => {
    it('should get additional feedback', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback: 'Very helpful for our hiring process',
      });

      expect(optionalInfo.additionalFeedback).toBe(
        'Very helpful for our hiring process',
      );
    });

    it('should get contact preference', () => {
      const optionalInfo = new OptionalInfo({
        contactPreference: 'email',
      });

      expect(optionalInfo.contactPreference).toBe('email');
    });

    it('should return undefined when properties not set', () => {
      const optionalInfo = new OptionalInfo({});

      expect(optionalInfo.additionalFeedback).toBeUndefined();
      expect(optionalInfo.contactPreference).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback: '',
        contactPreference: '',
      });

      expect(optionalInfo.additionalFeedback).toBe('');
      expect(optionalInfo.contactPreference).toBe('');
    });

    it('should handle long feedback text', () => {
      const longFeedback = 'A'.repeat(5000);
      const optionalInfo = new OptionalInfo({
        additionalFeedback: longFeedback,
      });

      expect(optionalInfo.additionalFeedback).toBe(longFeedback);
    });

    it('should handle multiline feedback', () => {
      const multilineFeedback = `Line 1
Line 2
Line 3

Line 5`;
      const optionalInfo = new OptionalInfo({
        additionalFeedback: multilineFeedback,
      });

      expect(optionalInfo.additionalFeedback).toBe(multilineFeedback);
    });

    it('should handle unicode characters', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback: '🎉 非常好用的产品！强烈推荐 🚀',
        contactPreference: '📧 邮件',
      });

      expect(optionalInfo.additionalFeedback).toBe(
        '🎉 非常好用的产品！强烈推荐 🚀',
      );
      expect(optionalInfo.contactPreference).toBe('📧 邮件');
    });

    it('should handle special characters', () => {
      const optionalInfo = new OptionalInfo({
        additionalFeedback:
          'Special chars: !@#$%^&*()_+-=[]{}|;\':",./\u003c\u003e?',
        contactPreference: 'email+tag@example.com',
      });

      expect(optionalInfo.additionalFeedback).toContain('!@#$%^&*');
      expect(optionalInfo.contactPreference).toBe('email+tag@example.com');
    });
  });
});
