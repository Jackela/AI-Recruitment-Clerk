/**
 * Input Validator Tests
 */
import { InputValidator } from './input-validator';

describe('InputValidator', () => {
  describe('validate', () => {
    it('should return input unchanged', () => {
      const input = { key: 'value', number: 123 };
      const result = InputValidator.validate(input);
      expect(result).toEqual(input);
    });

    it('should handle empty object', () => {
      const input = {};
      const result = InputValidator.validate(input);
      expect(result).toEqual({});
    });

    it('should handle nested objects', () => {
      const input = { user: { name: 'John', age: 30 } };
      const result = InputValidator.validate(input);
      expect(result).toEqual(input);
    });

    it('should handle arrays', () => {
      const input = { items: [1, 2, 3] };
      const result = InputValidator.validate(input);
      expect(result).toEqual(input);
    });

    it('should handle null values', () => {
      const input = { value: null };
      const result = InputValidator.validate(input);
      expect(result).toEqual(input);
    });
  });

  describe('validateResumeFile', () => {
    it('should validate valid PDF file', () => {
      const file = {
        buffer: Buffer.from('PDF content'),
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate valid Word document', () => {
      const file = {
        buffer: Buffer.from('DOC content'),
        originalname: 'resume.docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate valid plain text file', () => {
      const file = {
        buffer: Buffer.from('Text content'),
        originalname: 'resume.txt',
        mimetype: 'text/plain',
        size: 100,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
      const file = {
        buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'File size exceeds maximum of 10485760 bytes',
      );
    });

    it('should reject file with invalid mime type', () => {
      const file = {
        buffer: Buffer.from('Image content'),
        originalname: 'image.png',
        mimetype: 'image/png',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid mime type: image/png');
    });

    it('should reject file without name', () => {
      const file = {
        buffer: Buffer.from('Content'),
        originalname: '',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File name is required');
    });

    it('should reject file with empty buffer', () => {
      const file = {
        buffer: Buffer.alloc(0),
        originalname: 'empty.pdf',
        mimetype: 'application/pdf',
        size: 0,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File buffer is empty');
    });

    it('should collect multiple validation errors', () => {
      const file = {
        buffer: Buffer.alloc(0),
        originalname: '',
        mimetype: 'image/png',
        size: 11 * 1024 * 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain(
        'File size exceeds maximum of 10485760 bytes',
      );
      expect(result.errors).toContain('Invalid mime type: image/png');
      expect(result.errors).toContain('File name is required');
      expect(result.errors).toContain('File buffer is empty');
    });

    it('should handle missing mimetype', () => {
      const file = {
        buffer: Buffer.from('Content'),
        originalname: 'resume.pdf',
        mimetype: undefined,
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      // Should be valid when mimetype is missing (only validates if provided)
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle null buffer', () => {
      const file = {
        buffer: null as unknown as Buffer,
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File buffer is empty');
    });

    it('should accept file at exact size limit', () => {
      const file = {
        buffer: Buffer.alloc(10 * 1024 * 1024), // Exactly 10MB
        originalname: 'exact-size.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should accept old Word format', () => {
      const file = {
        buffer: Buffer.from('DOC content'),
        originalname: 'resume.doc',
        mimetype: 'application/msword',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
    });
  });
});
