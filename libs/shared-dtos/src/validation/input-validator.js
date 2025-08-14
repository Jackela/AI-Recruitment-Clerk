"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidator = void 0;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
class InputValidator {
    /**
     * Validates uploaded resume files
     */
    static validateResumeFile(file) {
        const options = {
            maxSize: this.DEFAULT_MAX_FILE_SIZE,
            allowedMimeTypes: this.RESUME_MIME_TYPES,
            allowedExtensions: this.RESUME_EXTENSIONS,
            scanForMalware: true
        };
        return this.validateFile(file, options);
    }
    /**
     * Comprehensive file validation
     */
    static validateFile(file, options) {
        const errors = [];
        if (!file) {
            return {
                isValid: false,
                errors: ['File is required']
            };
        }
        // Validate file size
        if (file.size > options.maxSize) {
            errors.push(`File size ${this.formatBytes(file.size)} exceeds maximum allowed size ${this.formatBytes(options.maxSize)}`);
        }
        // Validate MIME type
        if (options.allowedMimeTypes.length > 0 && !options.allowedMimeTypes.includes(file.mimetype)) {
            errors.push(`File type '${file.mimetype}' is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`);
        }
        // Validate file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (options.allowedExtensions.length > 0 && !options.allowedExtensions.includes(ext)) {
            errors.push(`File extension '${ext}' is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`);
        }
        // Validate filename
        const filenameValidation = this.validateFilename(file.originalname);
        if (!filenameValidation.isValid) {
            errors.push(...filenameValidation.errors);
        }
        // Basic malware scanning (content-based)
        if (options.scanForMalware) {
            const malwareResult = this.scanForMaliciousContent(file.buffer || file.data);
            if (!malwareResult.isValid) {
                errors.push(...malwareResult.errors);
            }
        }
        const isValid = errors.length === 0;
        return {
            isValid,
            errors,
            sanitizedValue: isValid ? {
                ...file,
                originalname: this.sanitizeFilename(file.originalname),
                hash: this.generateFileHash(file.buffer || file.data)
            } : undefined,
            metadata: {
                size: file.size,
                mimetype: file.mimetype,
                extension: ext,
                originalSize: file.size
            }
        };
    }
    /**
     * Validates and sanitizes text input
     */
    static validateText(text, options = {}) {
        const errors = [];
        let sanitizedText = text;
        if (!text && text !== '') {
            return {
                isValid: false,
                errors: ['Text is required']
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
                sanitizedLength: sanitizedText.length
            }
        };
    }
    /**
     * Validates email address
     */
    static validateEmail(email) {
        const errors = [];
        if (!email) {
            return {
                isValid: false,
                errors: ['Email is required']
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
            sanitizedValue: normalizedEmail
        };
    }
    /**
     * Validates URL
     */
    static validateUrl(url, options = {}) {
        const errors = [];
        const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
        if (!url) {
            return {
                isValid: false,
                errors: ['URL is required']
            };
        }
        try {
            const parsedUrl = new URL(url);
            if (!allowedProtocols.includes(parsedUrl.protocol)) {
                errors.push(`Protocol '${parsedUrl.protocol}' is not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`);
            }
            // Check for suspicious patterns
            if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname.startsWith('192.168.') || parsedUrl.hostname.startsWith('10.')) {
                errors.push('Private/local URLs are not allowed');
            }
        }
        catch (error) {
            errors.push('Invalid URL format');
        }
        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue: url.trim()
        };
    }
    /**
     * Validates JSON object structure
     */
    static validateJsonObject(obj, schema) {
        const errors = [];
        if (!obj || typeof obj !== 'object') {
            return {
                isValid: false,
                errors: ['Object is required']
            };
        }
        // Check required fields
        for (const [key, rules] of Object.entries(schema)) {
            if (rules.required && !(key in obj)) {
                errors.push(`Required field '${key}' is missing`);
                continue;
            }
            if (key in obj) {
                const value = obj[key];
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type && rules.type !== 'any') {
                    errors.push(`Field '${key}' must be of type ${rules.type}, got ${actualType}`);
                }
                if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                    errors.push(`Field '${key}' exceeds maximum length of ${rules.maxLength}`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    // Private helper methods
    static validateFilename(filename) {
        const errors = [];
        if (!filename || filename.trim().length === 0) {
            errors.push('Filename is required');
            return { isValid: false, errors };
        }
        // Check filename length
        if (filename.length > 255) {
            errors.push('Filename is too long');
        }
        // Check for dangerous characters
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
            errors
        };
    }
    static sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\.\./g, '.')
            .replace(/^\.+/, '')
            .substring(0, 255);
    }
    static scanForMaliciousContent(buffer) {
        const errors = [];
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
            [0x4D, 0x5A], // PE executable
            [0x7F, 0x45, 0x4C, 0x46], // ELF executable
            [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O executable
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
            errors
        };
    }
    static generateFileHash(buffer) {
        return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
    }
    static formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
    /**
     * Comprehensive security validation for API requests
     */
    static validateApiRequest(request) {
        const errors = [];
        // Enhanced SQL injection patterns
        const sqlInjectionPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
            /(\'\s*OR\s*\')/gi,
            /(\'; )/g,
            /(\-\-)/g,
            /(\bunion\b)/gi,
            /(\bdrop\b)/gi,
            /(\/\*|\*\/)/g
        ];
        // Enhanced XSS patterns
        const xssPatterns = [
            /<script[\s\S]*?<\/script>/gi,
            /<iframe[\s\S]*?<\/iframe>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /on\w+\s*=/gi,
            /<\s*script/gi,
            /<\s*iframe/gi
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
        if (requestString.length > 1024 * 1024) { // 1MB limit
            errors.push('Request payload is too large');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.InputValidator = InputValidator;
// File validation constants
InputValidator.DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
InputValidator.RESUME_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];
InputValidator.RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
// Malicious file patterns
InputValidator.MALICIOUS_PATTERNS = [
    /\x00/g, // null bytes
    /<script/gi, // script tags
    /javascript:/gi, // javascript protocol
    /vbscript:/gi, // vbscript protocol
    /on\w+\s*=/gi, // event handlers
    /eval\s*\(/gi, // eval function
    /exec\s*\(/gi, // exec function
];
