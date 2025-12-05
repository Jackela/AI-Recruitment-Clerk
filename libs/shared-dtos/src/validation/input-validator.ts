// import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as path from 'path';
import type { FileValidationOptions, ValidationResult } from './types';

// Re-export types for backwards compatibility
export type { FileValidationOptions, ValidationResult } from './types';

/**
 * Represents the input validator.
 */
export class InputValidator {
  // File validation constants
  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly RESUME_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  private static readonly RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

  // Malicious file patterns
  private static readonly MALICIOUS_PATTERNS = [
    // eslint-disable-next-line no-control-regex
    /\x00/g, // null bytes
    /<script/gi, // script tags
    /javascript:/gi, // javascript protocol
    /vbscript:/gi, // vbscript protocol
    /on\w+\s*=/gi, // event handlers
    /eval\s*\(/gi, // eval function
    /exec\s*\(/gi, // exec function
  ];

  /**
   * Validates uploaded resume files
   */
  static validateResumeFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size: number;
  }): ValidationResult {
    const options: FileValidationOptions = {
      maxSize: this.DEFAULT_MAX_FILE_SIZE,
      allowedMimeTypes: this.RESUME_MIME_TYPES,
      allowedExtensions: this.RESUME_EXTENSIONS,
      scanForMalware: true,
    };

    return this.validateFile(file, options);
  }

  /**
   * Comprehensive file validation
   */
  static validateFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype?: string;
      size: number;
    },
    options: FileValidationOptions,
  ): ValidationResult {
    const errors: string[] = [];

    if (!file) {
      return {
        isValid: false,
        errors: ['File is required'],
      };
    }

    // Validate file size
    if (file.size > options.maxSize) {
      errors.push(
        `File size ${this.formatBytes(file.size)} exceeds maximum allowed size ${this.formatBytes(options.maxSize)}`,
      );
    }

    // Validate MIME type
    if (
      options.allowedMimeTypes.length > 0 &&
      file.mimetype &&
      !options.allowedMimeTypes.includes(file.mimetype)
    ) {
      errors.push(
        `File type '${file.mimetype}' is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      options.allowedExtensions.length > 0 &&
      !options.allowedExtensions.includes(ext)
    ) {
      errors.push(
        `File extension '${ext}' is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`,
      );
    }

    // Validate filename
    const filenameValidation = this.validateFilename(file.originalname);
    if (!filenameValidation.isValid) {
      errors.push(...filenameValidation.errors);
    }

    // Basic malware scanning (content-based)
    if (options.scanForMalware) {
      const malwareResult = this.scanForMaliciousContent(file.buffer);
      if (!malwareResult.isValid) {
        errors.push(...malwareResult.errors);
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      sanitizedValue: isValid
        ? {
            ...file,
            originalname: this.sanitizeFilename(file.originalname),
            hash: this.generateFileHash(file.buffer),
          }
        : undefined,
      metadata: {
        size: file.size,
        mimetype: file.mimetype,
        extension: ext,
        originalSize: file.size,
      },
    };
  }

  /**
   * Validates and sanitizes text input
   */
  static validateText(
    text: string,
    options: {
      maxLength?: number;
      minLength?: number;
      allowHtml?: boolean;
      allowSpecialChars?: boolean;
      pattern?: RegExp;
      trim?: boolean;
    } = {},
  ): ValidationResult {
    const errors: string[] = [];
    let sanitizedText = text;

    if (!text && text !== '') {
      return {
        isValid: false,
        errors: ['Text is required'],
      };
    }

    // Trim if specified
    if (options.trim !== false) {
      sanitizedText = sanitizedText.trim();
    }

    // Length validation
    if (options.minLength && sanitizedText.length < options.minLength) {
      errors.push(`Text must be at least ${options.minLength} characters long`);
    }

    if (options.maxLength && sanitizedText.length > options.maxLength) {
      errors.push(`Text must not exceed ${options.maxLength} characters`);
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(sanitizedText)) {
      errors.push('Text does not match required pattern');
    }

    // HTML validation
    if (!options.allowHtml) {
      const htmlPattern = /<[^>]*>/g;
      if (htmlPattern.test(sanitizedText)) {
        errors.push('HTML tags are not allowed');
        // Remove HTML tags
        sanitizedText = sanitizedText.replace(htmlPattern, '');
      }
    }

    // Special characters validation
    if (!options.allowSpecialChars) {
      const specialCharsPattern = /[<>"\';(){}[\]]/g;
      if (specialCharsPattern.test(sanitizedText)) {
        errors.push('Special characters are not allowed');
        // Remove special characters
        sanitizedText = sanitizedText.replace(specialCharsPattern, '');
      }
    }

    // Check for malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(sanitizedText)) {
        errors.push('Text contains potentially malicious content');
        sanitizedText = sanitizedText.replace(pattern, '');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitizedText,
      metadata: {
        originalLength: text.length,
        sanitizedLength: sanitizedText.length,
      },
    };
  }

  /**
   * Validates email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      return {
        isValid: false,
        errors: ['Email is required'],
      };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailPattern.test(normalizedEmail)) {
      errors.push('Invalid email format');
    }

    if (normalizedEmail.length > 254) {
      errors.push('Email is too long');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\./g, // consecutive dots
      /^\./, // starts with dot
      /\.$/, // ends with dot
      /@.*@/, // multiple @ signs
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(normalizedEmail)) {
        errors.push('Email contains invalid patterns');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: normalizedEmail,
    };
  }

  /**
   * Validates URL
   */
  static validateUrl(
    url: string,
    options: { allowedProtocols?: string[] } = {},
  ): ValidationResult {
    const errors: string[] = [];
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];

    if (!url) {
      return {
        isValid: false,
        errors: ['URL is required'],
      };
    }

    try {
      const parsedUrl = new URL(url);

      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        errors.push(
          `Protocol '${parsedUrl.protocol}' is not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`,
        );
      }

      // Check for suspicious patterns
      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname.startsWith('192.168.') ||
        parsedUrl.hostname.startsWith('10.')
      ) {
        errors.push('Private/local URLs are not allowed');
      }
    } catch (_error) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: url.trim(),
    };
  }

  /**
   * Validates JSON object structure
   */
  static validateJsonObject(
    obj: unknown,
    schema: Record<
      string,
      { type: string; required?: boolean; maxLength?: number }
    >,
  ): ValidationResult {
    const errors: string[] = [];

    if (!obj || typeof obj !== 'object') {
      return {
        isValid: false,
        errors: ['Object is required'],
      };
    }

    // Check required fields
    for (const [key, rules] of Object.entries(schema)) {
      if (rules.required && !(key in obj)) {
        errors.push(`Required field '${key}' is missing`);
        continue;
      }

      if (key in obj) {
        const value = (obj as Record<string, unknown>)[key];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== rules.type && rules.type !== 'any') {
          errors.push(
            `Field '${key}' must be of type ${rules.type}, got ${actualType}`,
          );
        }

        if (
          rules.maxLength &&
          typeof value === 'string' &&
          value.length > rules.maxLength
        ) {
          errors.push(
            `Field '${key}' exceeds maximum length of ${rules.maxLength}`,
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private helper methods
  private static validateFilename(filename: string): ValidationResult {
    const errors: string[] = [];

    if (!filename || filename.trim().length === 0) {
      errors.push('Filename is required');
      return { isValid: false, errors };
    }

    // Check filename length
    if (filename.length > 255) {
      errors.push('Filename is too long');
    }

    // Check for dangerous characters
    // eslint-disable-next-line no-control-regex
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g;
    if (dangerousChars.test(filename)) {
      errors.push('Filename contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..+)?$/i;
    if (reservedNames.test(filename)) {
      errors.push('Filename uses a reserved name');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static sanitizeFilename(filename: string): string {
    return (
      filename
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\.\./g, '.')
        .replace(/^\.+/, '')
        .substring(0, 255)
    );
  }

  private static scanForMaliciousContent(buffer: Buffer): ValidationResult {
    const errors: string[] = [];

    if (!buffer) {
      return { isValid: true, errors: [] };
    }

    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

    // Check for malicious patterns in file content
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        errors.push('File contains potentially malicious content');
        break;
      }
    }

    // Check for executable file signatures
    const executableSignatures = [
      [0x4d, 0x5a], // PE executable
      [0x7f, 0x45, 0x4c, 0x46], // ELF executable
      [0xca, 0xfe, 0xba, 0xbe], // Mach-O executable
    ];

    for (const signature of executableSignatures) {
      if (buffer.length >= signature.length) {
        let matches = true;
        for (let i = 0; i < signature.length; i++) {
          if (buffer[i] !== signature[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          errors.push('Executable files are not allowed');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(Uint8Array.from(buffer)).digest('hex');
  }

  private static formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Comprehensive security validation for API requests
   */
  static validateApiRequest(request: any): ValidationResult {
    const errors: string[] = [];

    // Enhanced SQL injection patterns
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /('\s*OR\s*')/gi,
      /('; )/g,
      /(--)/g,
      /(\bunion\b)/gi,
      /(\bdrop\b)/gi,
      /(\/\*|\*\/)/g,
    ];

    // Enhanced XSS patterns
    const xssPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<\s*script/gi,
      /<\s*iframe/gi,
    ];

    const requestString = JSON.stringify(request).toLowerCase();

    // Check for SQL injection
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(requestString)) {
        errors.push('Request contains potential SQL injection patterns');
        break;
      }
    }

    // Check for XSS
    for (const pattern of xssPatterns) {
      if (pattern.test(requestString)) {
        errors.push('Request contains potential XSS patterns');
        break;
      }
    }

    // Check request size
    if (requestString.length > 1024 * 1024) {
      // 1MB limit
      errors.push('Request payload is too large');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
