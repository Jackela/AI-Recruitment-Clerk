import * as crypto from 'crypto';

/**
 * Defines the shape of the encryption config.
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

/**
 * Defines the shape of the encrypted data.
 */
export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Provides encryption functionality.
 */
export class EncryptionService {
  private static readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    tagLength: 16, // 128 bits
    saltLength: 32, // 256 bits
  };

  private static getMasterKey(): string {
    return (
      process.env['ENCRYPTION_MASTER_KEY'] ||
      'default-key-change-in-production-please-use-32-bytes-key'
    );
  }

  /**
   * Derives an encryption key from the master key and salt using PBKDF2
   */
  private static deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.getMasterKey(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      salt as any, // Type assertion for Node.js 20 compatibility
      100000, // iterations
      this.config.keyLength,
      'sha256',
    );
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param plaintext - The data to encrypt
   * @returns Encrypted data with IV, tag, and salt
   */
  public static encrypt(plaintext: string): EncryptedData {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty or null data');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);

    // Derive key from master key and salt
    const key = this.deriveKey(salt);

    // Create cipher with Node.js 20 compatible approach
    const cipher = crypto.createCipheriv(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.config.algorithm as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      key as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      iv as any,
    ) as crypto.CipherGCM;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cipher.setAAD(Buffer.from('ai-recruitment-clerk') as any); // Additional authenticated data

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  /**
   * Decrypts data encrypted with AES-256-GCM
   * @param encryptedData - The encrypted data object
   * @returns Decrypted plaintext
   */
  public static decrypt(encryptedData: EncryptedData): string {
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
      const decipher = crypto.createDecipheriv(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.config.algorithm as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        key as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iv as any,
      ) as crypto.DecipherGCM;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decipher.setAAD(Buffer.from('ai-recruitment-clerk') as any); // Same AAD as encryption
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decipher.setAuthTag(tag as any);

      // Decrypt the data
      let decrypted = decipher.update(
        encryptedData.encryptedData,
        'hex',
        'utf8',
      );
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Encrypts multiple fields in an object
   * @param data - Object with fields to encrypt
   * @param fieldsToEncrypt - Array of field names to encrypt
   * @returns Object with specified fields encrypted
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[],
  ): T & { _encrypted: { [K in keyof T]?: EncryptedData } } {
    const result = {
      ...data,
      _encrypted: {} as { [K in keyof T]?: EncryptedData },
    };

    fieldsToEncrypt.forEach((field) => {
      if (data[field] != null) {
        const fieldValue =
          typeof data[field] === 'string'
            ? data[field]
            : JSON.stringify(data[field]);

        result._encrypted[field] = this.encrypt(fieldValue);
        // Replace original field with placeholder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[field] = '[ENCRYPTED]';
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
  public static decryptFields<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string, any> & {
      _encrypted?: Record<string, EncryptedData>;
    },
  >(data: T, fieldsToDecrypt: (keyof T)[]): Omit<T, '_encrypted'> {
    const result = { ...data };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (result as any)._encrypted;

    if (data._encrypted) {
      fieldsToDecrypt.forEach((field) => {
        const encryptedField = data._encrypted?.[field as string];
        if (encryptedField) {
          try {
            const decryptedValue = this.decrypt(encryptedField);
            // Try to parse as JSON, fallback to string
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (result as any)[field] = JSON.parse(decryptedValue);
            } catch {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (result as any)[field] = decryptedValue;
            }
          } catch (error) {
            console.error(
              `Failed to decrypt field ${String(field)}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (result as any)[field] = '[DECRYPTION_FAILED]';
          }
        }
      });
    }

    return result as Omit<T, '_encrypted'>;
  }

  /**
   * Encrypts PII (Personally Identifiable Information) in a user object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static encryptUserPII(user: any): any {
    const piiFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    return this.encryptFields(
      user,
      piiFields.filter((field) => user[field] != null),
    );
  }

  /**
   * Decrypts PII in a user object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static decryptUserPII(encryptedUser: any): any {
    const piiFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    return this.decryptFields(encryptedUser, piiFields);
  }

  /**
   * Encrypts resume content and sensitive data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static encryptResumeData(resume: any): any {
    const sensitiveFields = [
      'resumeText',
      'personalInfo',
      'contactInfo',
      'originalFilename',
    ];
    return this.encryptFields(
      resume,
      sensitiveFields.filter((field) => resume[field] != null),
    );
  }

  /**
   * Decrypts resume content and sensitive data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static decryptResumeData(encryptedResume: any): any {
    const sensitiveFields = [
      'resumeText',
      'personalInfo',
      'contactInfo',
      'originalFilename',
    ];
    return this.decryptFields(encryptedResume, sensitiveFields);
  }

  /**
   * Generates a secure random encryption key for production use
   */
  public static generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validates encryption configuration
   */
  public static validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const masterKey = this.getMasterKey();

    if (
      masterKey === 'default-key-change-in-production-please-use-32-bytes-key'
    ) {
      errors.push(
        'Using default encryption key. Please set ENCRYPTION_MASTER_KEY environment variable.',
      );
    }

    if (masterKey.length < 32) {
      errors.push('Encryption key must be at least 32 characters long.');
    }

    if (!crypto.constants || !crypto.constants.SSL_OP_NO_TLSv1) {
      errors.push('Node.js crypto module not properly configured.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
