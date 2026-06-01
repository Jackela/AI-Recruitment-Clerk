import type { FileValidationOptions } from './input-validator';
import { InputValidator } from './input-validator';

describe('InputValidator', () => {
  describe('validateResumeFile', () => {
    it('should validate a valid PDF resume', () => {
      const file = {
        buffer: Buffer.from('resume content'),
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file without buffer', () => {
      const file = {
        buffer: null as any,
        originalname: 'resume.pdf',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is required');
    });

    it('should reject file that is too large', () => {
      const file = {
        buffer: Buffer.from('large content'),
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 20 * 1024 * 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('exceeds maximum'))).toBe(
        true,
      );
    });

    it('should reject unsupported MIME type', () => {
      const file = {
        buffer: Buffer.from('content'),
        originalname: 'file.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('not allowed'))).toBe(true);
    });

    it('should reject unsupported extension', () => {
      const file = {
        buffer: Buffer.from('content'),
        originalname: 'file.exe',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('extension'))).toBe(true);
    });

    it('should sanitize filename on valid file', () => {
      const file = {
        buffer: Buffer.from('safe content'),
        originalname: 'my resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBeDefined();
    });

    it('should detect malicious content in file', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      const file = {
        buffer: Buffer.from(maliciousContent),
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: maliciousContent.length,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('malicious'))).toBe(true);
    });

    it('should accept DOCX format', () => {
      const file = {
        buffer: Buffer.from('docx content'),
        originalname: 'resume.docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024,
      };

      const result = InputValidator.validateResumeFile(file);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('should validate with custom options', () => {
      const file = {
        buffer: Buffer.from('content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 500,
      };
      const options: FileValidationOptions = {
        maxSize: 1000,
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };

      const result = InputValidator.validateFile(file, options);

      expect(result.isValid).toBe(true);
    });

    it('should return errors for file too large', () => {
      const file = {
        buffer: Buffer.from('content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 2000,
      };
      const options: FileValidationOptions = {
        maxSize: 1000,
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };

      const result = InputValidator.validateFile(file, options);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should include metadata in result', () => {
      const file = {
        buffer: Buffer.from('content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 500,
      };
      const options: FileValidationOptions = {
        maxSize: 1000,
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };

      const result = InputValidator.validateFile(file, options);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.size).toBe(500);
      expect(result.metadata?.mimetype).toBe('application/pdf');
      expect(result.metadata?.extension).toBe('.pdf');
    });
  });

  describe('validateText', () => {
    it('should validate normal text', () => {
      const result = InputValidator.validateText('Hello World');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null text', () => {
      const result = InputValidator.validateText(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text is required');
    });

    it('should enforce minimum length', () => {
      const result = InputValidator.validateText('Hi', { minLength: 10 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text must be at least 10 characters long');
    });

    it('should enforce maximum length', () => {
      const longText = 'a'.repeat(100);
      const result = InputValidator.validateText(longText, { maxLength: 50 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text must not exceed 50 characters');
    });

    it('should validate pattern', () => {
      const result = InputValidator.validateText('abc123', {
        pattern: /^\w+$/,
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject text not matching pattern', () => {
      const result = InputValidator.validateText('abc-123', {
        pattern: /^\w+$/,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text does not match required pattern');
    });

    it('should trim text by default', () => {
      const result = InputValidator.validateText('  hello  ');

      expect(result.sanitizedValue).toBe('hello');
    });

    it('should sanitize HTML by default', () => {
      const result = InputValidator.validateText('<script>alert(1)</script>');

      expect(result.sanitizedValue).not.toContain('<script>');
      expect(result.sanitizedValue).toContain('&lt;script&gt;');
    });

    it('should allow HTML when specified', () => {
      const result = InputValidator.validateText('<b>Hello</b>', {
        allowHtml: true,
      });

      expect(result.sanitizedValue).toContain('<b>');
    });

    it('should remove special characters when not allowed', () => {
      const result = InputValidator.validateText('hello(world)', {
        allowSpecialChars: false,
      });

      expect(result.sanitizedValue).not.toContain('(');
      expect(result.sanitizedValue).not.toContain(')');
    });

    it('should detect malicious patterns', () => {
      const result = InputValidator.validateText('javascript:alert(1)');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text contains potentially malicious content');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = InputValidator.validateEmail('test@example.com');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('test@example.com');
    });

    it('should reject empty email', () => {
      const result = InputValidator.validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should normalize to lowercase', () => {
      const result = InputValidator.validateEmail('Test@EXAMPLE.COM');

      expect(result.sanitizedValue).toBe('test@example.com');
    });

    it('should reject invalid format', () => {
      const result = InputValidator.validateEmail('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject email without @', () => {
      const result = InputValidator.validateEmail('testexample.com');

      expect(result.isValid).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = InputValidator.validateEmail('test@');

      expect(result.isValid).toBe(false);
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = InputValidator.validateEmail(longEmail);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is too long');
    });

    it('should reject emails with consecutive dots', () => {
      const result = InputValidator.validateEmail('test..test@example.com');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email contains invalid patterns');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL', () => {
      const result = InputValidator.validateUrl('https://example.com');

      expect(result.isValid).toBe(true);
    });

    it('should reject empty URL', () => {
      const result = InputValidator.validateUrl('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });

    it('should allow http and https by default', () => {
      const httpsResult = InputValidator.validateUrl('https://example.com');
      const httpResult = InputValidator.validateUrl('http://example.com');

      expect(httpsResult.isValid).toBe(true);
      expect(httpResult.isValid).toBe(true);
    });

    it('should reject other protocols', () => {
      const result = InputValidator.validateUrl('ftp://example.com');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Protocol');
    });

    it('should allow custom protocols', () => {
      const result = InputValidator.validateUrl('custom://example.com', {
        allowedProtocols: ['custom:'],
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject localhost', () => {
      const result = InputValidator.validateUrl('http://localhost:3000');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Private/local URLs are not allowed');
    });

    it('should reject private IPs', () => {
      const result = InputValidator.validateUrl('http://192.168.1.1');

      expect(result.isValid).toBe(false);
    });

    it('should reject 10.x.x.x addresses', () => {
      const result = InputValidator.validateUrl('http://10.0.0.1');

      expect(result.isValid).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const result = InputValidator.validateUrl('not-a-url');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });
  });

  describe('validateJsonObject', () => {
    it('should validate correct object', () => {
      const obj = { name: 'John', age: 30 };
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      };

      const result = InputValidator.validateJsonObject(obj, schema);

      expect(result.isValid).toBe(true);
    });

    it('should reject non-object', () => {
      const result = InputValidator.validateJsonObject('not an object', {});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Object is required');
    });

    it('should reject null', () => {
      const result = InputValidator.validateJsonObject(null, {});

      expect(result.isValid).toBe(false);
    });

    it('should report missing required fields', () => {
      const obj = { name: 'John' };
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      };

      const result = InputValidator.validateJsonObject(obj, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Required field 'age' is missing");
    });

    it('should validate field types', () => {
      const obj = { name: 'John', age: 'thirty' };
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      };

      const result = InputValidator.validateJsonObject(obj, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be of type'))).toBe(
        true,
      );
    });

    it('should enforce maxLength for strings', () => {
      const obj = { name: 'VeryLongName' };
      const schema = {
        name: { type: 'string', required: true, maxLength: 5 },
      };

      const result = InputValidator.validateJsonObject(obj, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('maximum length'))).toBe(
        true,
      );
    });

    it('should allow any type when specified', () => {
      const obj = { field: 'any value' };
      const schema = {
        field: { type: 'any', required: true },
      };

      const result = InputValidator.validateJsonObject(obj, schema);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateApiRequest', () => {
    it('should validate normal request', () => {
      const request = { userId: '123', action: 'create' };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(true);
    });

    it('should reject SQL injection patterns', () => {
      const request = { query: "SELECT * FROM users WHERE id='1' OR '1'='1'" };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Request contains potential SQL injection patterns',
      );
    });

    it('should reject UNION SQL patterns', () => {
      const request = {
        query: 'SELECT id FROM users UNION SELECT password FROM admin',
      };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
    });

    it('should reject DROP TABLE patterns', () => {
      const request = { query: 'DROP TABLE users' };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
    });

    it('should reject XSS script patterns', () => {
      const request = { input: '<script>alert("xss")</script>' };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Request contains potential XSS patterns',
      );
    });

    it('should reject javascript: protocol', () => {
      const request = { url: 'javascript:alert(1)' };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
    });

    it('should reject iframe injection', () => {
      const request = { html: '<iframe src="http://evil.com"></iframe>' };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
    });

    it('should reject large payload', () => {
      const largePayload = { data: 'x'.repeat(1024 * 1024 + 1) };
      const result = InputValidator.validateApiRequest(largePayload);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Request payload is too large');
    });

    it('should handle nested objects with SQL injection', () => {
      const request = { nested: { query: "'; DROP TABLE users; --" } };
      const result = InputValidator.validateApiRequest(request);

      expect(result.isValid).toBe(false);
    });
  });

  describe('private helper methods', () => {
    it('should validate filenames correctly', () => {
      const result = (InputValidator as any).validateFilename('valid_file.pdf');

      expect(result.isValid).toBe(true);
    });

    it('should reject empty filename', () => {
      const result = (InputValidator as any).validateFilename('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename is required');
    });

    it('should reject filename that is too long', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = (InputValidator as any).validateFilename(longName);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename is too long');
    });

    it('should reject filename with dangerous characters', () => {
      const result = (InputValidator as any).validateFilename('file<test>.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename contains invalid characters');
    });

    it('should reject Windows reserved names', () => {
      const result = (InputValidator as any).validateFilename('CON.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename uses a reserved name');
    });

    it('should sanitize filename correctly', () => {
      const sanitized = (InputValidator as any).sanitizeFilename(
        'file<>test.pdf',
      );

      expect(sanitized).toBe('file__test.pdf');
    });

    it('should remove leading dots', () => {
      const sanitized = (InputValidator as any).sanitizeFilename(
        '...hidden.pdf',
      );

      expect(sanitized).not.toMatch(/^\.+/);
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const sanitized = (InputValidator as any).sanitizeFilename(longName);

      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('should detect PE executable signature', () => {
      const peBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      const result = (InputValidator as any).scanForMaliciousContent(peBuffer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Executable files are not allowed');
    });

    it('should detect ELF executable signature', () => {
      const elfBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
      const result = (InputValidator as any).scanForMaliciousContent(elfBuffer);

      expect(result.isValid).toBe(false);
    });

    it('should format bytes correctly', () => {
      expect((InputValidator as any).formatBytes(0)).toBe('0 B');
      expect((InputValidator as any).formatBytes(1024)).toBe('1.00 KB');
      expect((InputValidator as any).formatBytes(1024 * 1024)).toBe('1.00 MB');
    });
  });
});
