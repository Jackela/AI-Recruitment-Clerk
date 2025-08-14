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
exports.EncryptionService = void 0;
const crypto = __importStar(require("crypto"));
class EncryptionService {
    /**
     * Derives an encryption key from the master key and salt using PBKDF2
     */
    static deriveKey(salt) {
        return crypto.pbkdf2Sync(this.masterKey, salt, // Type assertion for Node.js 20 compatibility
        100000, // iterations
        this.config.keyLength, 'sha256');
    }
    /**
     * Encrypts sensitive data using AES-256-GCM
     * @param plaintext - The data to encrypt
     * @returns Encrypted data with IV, tag, and salt
     */
    static encrypt(plaintext) {
        if (!plaintext) {
            throw new Error('Cannot encrypt empty or null data');
        }
        // Generate random salt and IV
        const salt = crypto.randomBytes(this.config.saltLength);
        const iv = crypto.randomBytes(this.config.ivLength);
        // Derive key from master key and salt
        const key = this.deriveKey(salt);
        // Create cipher with Node.js 20 compatible approach
        const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);
        cipher.setAAD(Buffer.from('ai-recruitment-clerk')); // Additional authenticated data
        // Encrypt the data
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Get the authentication tag
        const tag = cipher.getAuthTag();
        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            salt: salt.toString('hex')
        };
    }
    /**
     * Decrypts data encrypted with AES-256-GCM
     * @param encryptedData - The encrypted data object
     * @returns Decrypted plaintext
     */
    static decrypt(encryptedData) {
        if (!encryptedData || !encryptedData.encryptedData) {
            throw new Error('Cannot decrypt empty or invalid encrypted data');
        }
        try {
            // Convert hex strings back to buffers
            const salt = Buffer.from(encryptedData.salt, 'hex');
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const tag = Buffer.from(encryptedData.tag, 'hex');
            // Derive the same key used for encryption
            const key = this.deriveKey(salt);
            // Create decipher with Node.js 20 compatible approach
            const decipher = crypto.createDecipheriv(this.config.algorithm, key, iv);
            decipher.setAAD(Buffer.from('ai-recruitment-clerk')); // Same AAD as encryption
            decipher.setAuthTag(tag);
            // Decrypt the data
            let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    /**
     * Encrypts multiple fields in an object
     * @param data - Object with fields to encrypt
     * @param fieldsToEncrypt - Array of field names to encrypt
     * @returns Object with specified fields encrypted
     */
    static encryptFields(data, fieldsToEncrypt) {
        const result = { ...data, _encrypted: {} };
        fieldsToEncrypt.forEach(field => {
            if (data[field] != null) {
                const fieldValue = typeof data[field] === 'string'
                    ? data[field]
                    : JSON.stringify(data[field]);
                result._encrypted[field] = this.encrypt(fieldValue);
                // Replace original field with placeholder
                result[field] = '[ENCRYPTED]';
            }
        });
        return result;
    }
    /**
     * Decrypts multiple fields in an object
     * @param data - Object with encrypted fields
     * @param fieldsToDecrypt - Array of field names to decrypt
     * @returns Object with specified fields decrypted
     */
    static decryptFields(data, fieldsToDecrypt) {
        const result = { ...data };
        delete result._encrypted;
        if (data._encrypted) {
            fieldsToDecrypt.forEach(field => {
                const encryptedField = data._encrypted[field];
                if (encryptedField) {
                    try {
                        const decryptedValue = this.decrypt(encryptedField);
                        // Try to parse as JSON, fallback to string
                        try {
                            result[field] = JSON.parse(decryptedValue);
                        }
                        catch {
                            result[field] = decryptedValue;
                        }
                    }
                    catch (error) {
                        console.error(`Failed to decrypt field ${String(field)}:`, error.message);
                        result[field] = '[DECRYPTION_FAILED]';
                    }
                }
            });
        }
        return result;
    }
    /**
     * Encrypts PII (Personally Identifiable Information) in a user object
     */
    static encryptUserPII(user) {
        const piiFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
        return this.encryptFields(user, piiFields.filter(field => user[field] != null));
    }
    /**
     * Decrypts PII in a user object
     */
    static decryptUserPII(encryptedUser) {
        const piiFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
        return this.decryptFields(encryptedUser, piiFields);
    }
    /**
     * Encrypts resume content and sensitive data
     */
    static encryptResumeData(resume) {
        const sensitiveFields = ['resumeText', 'personalInfo', 'contactInfo', 'originalFilename'];
        return this.encryptFields(resume, sensitiveFields.filter(field => resume[field] != null));
    }
    /**
     * Decrypts resume content and sensitive data
     */
    static decryptResumeData(encryptedResume) {
        const sensitiveFields = ['resumeText', 'personalInfo', 'contactInfo', 'originalFilename'];
        return this.decryptFields(encryptedResume, sensitiveFields);
    }
    /**
     * Generates a secure random encryption key for production use
     */
    static generateSecureKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Validates encryption configuration
     */
    static validateConfig() {
        const errors = [];
        if (this.masterKey === 'default-key-change-in-production-please-use-32-bytes-key') {
            errors.push('Using default encryption key. Please set ENCRYPTION_MASTER_KEY environment variable.');
        }
        if (this.masterKey.length < 32) {
            errors.push('Encryption key must be at least 32 characters long.');
        }
        if (!crypto.constants || !crypto.constants.SSL_OP_NO_TLSv1) {
            errors.push('Node.js crypto module not properly configured.');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.config = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    tagLength: 16, // 128 bits
    saltLength: 32 // 256 bits
};
EncryptionService.masterKey = process.env.ENCRYPTION_MASTER_KEY || 'default-key-change-in-production-please-use-32-bytes-key';
