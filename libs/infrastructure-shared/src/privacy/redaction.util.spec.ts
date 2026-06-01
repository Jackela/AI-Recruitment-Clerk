import { redactText, redactObject } from './redaction.util';

describe('redaction util', () => {
  describe('redactText', () => {
    it('should return input unchanged if empty', () => {
      expect(redactText('')).toBe('');
      expect(redactText(null as unknown as string)).toBeNull();
      expect(redactText(undefined as unknown as string)).toBeUndefined();
    });

    it('should redact email addresses', () => {
      const input = 'Contact us at support@example.com for help';
      const result = redactText(input);
      expect(result).toContain('[REDACTED:EMAIL]');
      expect(result).not.toContain('support@example.com');
    });

    it('should redact multiple email addresses', () => {
      const input = 'Emails: user1@test.com and user2@domain.org';
      const result = redactText(input);
      expect(result.match(/\[REDACTED:EMAIL\]/g)).toHaveLength(2);
    });

    it('should redact phone numbers', () => {
      const input = 'Call us at 123-456-7890';
      const result = redactText(input);
      expect(result).toContain('[REDACTED:PHONE]');
      expect(result).not.toContain('123-456-7890');
    });

    it('should redact international phone numbers', () => {
      const input = 'International: +1 234 567 8901';
      const result = redactText(input);
      expect(result).toContain('[REDACTED:PHONE]');
    });

    it('should redact phone with parentheses format', () => {
      const input = 'Phone: (123) 456-7890';
      const result = redactText(input);
      expect(result).toContain('[REDACTED:PHONE]');
    });

    it('should redact both email and phone in same text', () => {
      const input = 'Email: user@example.com, Phone: 123-456-7890';
      const result = redactText(input);
      expect(result).toContain('[REDACTED:EMAIL]');
      expect(result).toContain('[REDACTED:PHONE]');
    });

    it('should handle text without PII', () => {
      const input = 'This is just a normal message';
      const result = redactText(input);
      expect(result).toBe(input);
    });

    it('should handle partial email matches', () => {
      const input = 'Not an email: @example.com';
      const result = redactText(input);
      expect(result).toBe(input);
    });

    it('should handle phone with country code', () => {
      const input = 'Call +86 138 1234 5678 for support';
      const result = redactText(input);
      expect(result).toContain('[REDACTED:PHONE]');
    });
  });

  describe('redactObject', () => {
    it('should redact strings in object', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
      };
      const result = redactObject(obj);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('[REDACTED:EMAIL]');
      expect(result.phone).toBe('[REDACTED:PHONE]');
    });

    it('should redact nested objects', () => {
      const obj = {
        user: {
          email: 'user@test.com',
          contact: {
            phone: '987-654-3210',
          },
        },
      };
      const result = redactObject(obj);

      expect(result.user.email).toBe('[REDACTED:EMAIL]');
      expect(result.user.contact.phone).toBe('[REDACTED:PHONE]');
    });

    it('should handle arrays', () => {
      const obj = {
        contacts: [{ email: 'user1@test.com' }, { email: 'user2@test.com' }],
      };
      const result = redactObject(obj);

      expect(result.contacts[0].email).toBe('[REDACTED:EMAIL]');
      expect(result.contacts[1].email).toBe('[REDACTED:EMAIL]');
    });

    it('should handle null values', () => {
      const obj = {
        email: null,
        phone: '123-456-7890',
      };
      const result = redactObject(obj);

      expect(result.email).toBeNull();
      expect(result.phone).toBe('[REDACTED:PHONE]');
    });

    it('should handle circular references gracefully', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj;

      const result = redactObject(obj);
      expect(result).toEqual(obj);
    });

    it('should return original object on parse error', () => {
      const obj = {
        toJSON: () => {
          throw new Error('JSON error');
        },
      };
      const result = redactObject(obj);
      expect(result).toBe(obj);
    });

    it('should not modify original object', () => {
      const obj = {
        email: 'test@example.com',
      };
      const originalEmail = obj.email;
      redactObject(obj);

      expect(obj.email).toBe(originalEmail);
    });

    it('should handle empty object', () => {
      const obj = {};
      const result = redactObject(obj);
      expect(result).toEqual({});
    });

    it('should handle primitive types in object', () => {
      const obj = {
        string: 'test@example.com',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
      };
      const result = redactObject(obj);

      expect(result.string).toBe('[REDACTED:EMAIL]');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.array).toEqual([1, 2, 3]);
    });
  });
});
