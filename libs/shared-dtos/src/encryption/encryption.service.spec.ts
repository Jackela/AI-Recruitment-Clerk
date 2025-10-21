import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const testData = 'This is sensitive test data that needs encryption!';
  const testEmail = 'john.doe@example.com';
  const testPersonalInfo = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-123-4567',
    address: '123 Main St, Anytown, USA',
  };

  beforeEach(() => {
    // Reset environment for each test
    process.env.ENCRYPTION_MASTER_KEY =
      'test-key-32-chars-long-for-secure-encryption';
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_MASTER_KEY;
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = EncryptionService.encrypt(testData);

      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      // Encrypted data should not contain original text
      expect(encrypted.encryptedData).not.toContain(testData);

      const decrypted = EncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should produce different encrypted results for the same input', () => {
      const encrypted1 = EncryptionService.encrypt(testData);
      const encrypted2 = EncryptionService.encrypt(testData);

      // Should be different due to random IV and salt
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);

      // But both should decrypt to the same original data
      expect(EncryptionService.decrypt(encrypted1)).toBe(testData);
      expect(EncryptionService.decrypt(encrypted2)).toBe(testData);
    });

    it('should handle empty strings', () => {
      expect(() => EncryptionService.encrypt('')).toThrow(
        'Cannot encrypt empty or null data',
      );
      expect(() => EncryptionService.encrypt(null as any)).toThrow(
        'Cannot encrypt empty or null data',
      );
    });

    it('should handle unicode characters', () => {
      const unicodeData = '🔐 Encrypted data with emojis! 中文 русский язык';
      const encrypted = EncryptionService.encrypt(unicodeData);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(unicodeData);
    });

    it('should handle large data', () => {
      const largeData = 'A'.repeat(10000); // 10KB of data
      const encrypted = EncryptionService.encrypt(largeData);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(largeData);
    });
  });

  describe('Field-level Encryption', () => {
    it('should encrypt specific fields in an object', () => {
      const userData = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'user',
        publicField: 'This should not be encrypted',
      };

      const encrypted = EncryptionService.encryptFields(userData, [
        'firstName',
        'lastName',
        'email',
      ]);

      expect(encrypted.id).toBe('user-123');
      expect(encrypted.role).toBe('user');
      expect(encrypted.publicField).toBe('This should not be encrypted');

      // Encrypted fields should be replaced with placeholder
      expect(encrypted.firstName).toBe('[ENCRYPTED]');
      expect(encrypted.lastName).toBe('[ENCRYPTED]');
      expect(encrypted.email).toBe('[ENCRYPTED]');

      // Should have encrypted data stored separately
      expect(encrypted._encrypted.firstName).toBeDefined();
      expect(encrypted._encrypted.lastName).toBeDefined();
      expect(encrypted._encrypted.email).toBeDefined();
    });

    it('should decrypt specific fields in an object', () => {
      const userData = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'user',
      };

      const encrypted = EncryptionService.encryptFields(userData, [
        'firstName',
        'lastName',
        'email',
      ]);
      const decrypted = EncryptionService.decryptFields(encrypted, [
        'firstName',
        'lastName',
        'email',
      ]);

      expect(decrypted.firstName).toBe('John');
      expect(decrypted.lastName).toBe('Doe');
      expect(decrypted.email).toBe('john.doe@example.com');
      expect(decrypted.id).toBe('user-123');
      expect(decrypted.role).toBe('user');
      expect((decrypted as any)._encrypted).toBeUndefined();
    });

    it('should handle complex object fields', () => {
      const complexData = {
        id: 'test-123',
        metadata: {
          nested: 'value',
          array: [1, 2, 3],
          boolean: true,
        },
        simpleField: 'simple',
      };

      const encrypted = EncryptionService.encryptFields(complexData, [
        'metadata',
      ]);
      const decrypted = EncryptionService.decryptFields(encrypted, [
        'metadata',
      ]);

      expect(decrypted.metadata).toEqual({
        nested: 'value',
        array: [1, 2, 3],
        boolean: true,
      });
    });
  });

  describe('PII Encryption', () => {
    it('should encrypt user PII correctly', () => {
      const user = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        role: 'user',
        organizationId: 'org-123',
      };

      const encrypted = EncryptionService.encryptUserPII(user);

      expect(encrypted.id).toBe('user-123');
      expect(encrypted.role).toBe('user');
      expect(encrypted.organizationId).toBe('org-123');

      expect(encrypted.firstName).toBe('[ENCRYPTED]');
      expect(encrypted.lastName).toBe('[ENCRYPTED]');
      expect(encrypted.email).toBe('[ENCRYPTED]');
      expect(encrypted.phone).toBe('[ENCRYPTED]');

      const decrypted = EncryptionService.decryptUserPII(encrypted);
      expect(decrypted.firstName).toBe('John');
      expect(decrypted.lastName).toBe('Doe');
      expect(decrypted.email).toBe('john.doe@example.com');
      expect(decrypted.phone).toBe('+1-555-123-4567');
    });

    it('should encrypt resume data correctly', () => {
      const resume = {
        id: 'resume-123',
        resumeText: 'Full resume content here...',
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        contactInfo: '+1-555-123-4567',
        originalFilename: 'john_doe_resume.pdf',
        status: 'processed',
        jobId: 'job-123',
      };

      const encrypted = EncryptionService.encryptResumeData(resume);

      expect(encrypted.id).toBe('resume-123');
      expect(encrypted.status).toBe('processed');
      expect(encrypted.jobId).toBe('job-123');

      expect(encrypted.resumeText).toBe('[ENCRYPTED]');
      expect(encrypted.personalInfo).toBe('[ENCRYPTED]');
      expect(encrypted.contactInfo).toBe('[ENCRYPTED]');
      expect(encrypted.originalFilename).toBe('[ENCRYPTED]');

      const decrypted = EncryptionService.decryptResumeData(encrypted);
      expect(decrypted.resumeText).toBe('Full resume content here...');
      expect(decrypted.personalInfo).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(decrypted.contactInfo).toBe('+1-555-123-4567');
      expect(decrypted.originalFilename).toBe('john_doe_resume.pdf');
    });
  });

  describe('Security Validation', () => {
    it('should validate encryption configuration', () => {
      const validation = EncryptionService.validateConfig();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect weak encryption keys', () => {
      process.env.ENCRYPTION_MASTER_KEY = 'short';

      const validation = EncryptionService.validateConfig();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Encryption key must be at least 32 characters long.',
      );
    });

    it('should detect default encryption key', () => {
      process.env.ENCRYPTION_MASTER_KEY =
        'default-key-change-in-production-please-use-32-bytes-key';

      const validation = EncryptionService.validateConfig();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Using default encryption key. Please set ENCRYPTION_MASTER_KEY environment variable.',
      );
    });

    it('should generate secure keys', () => {
      const key1 = EncryptionService.generateSecureKey();
      const key2 = EncryptionService.generateSecureKey();

      expect(key1).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(key2).toHaveLength(64);
      expect(key1).not.toBe(key2); // Should be different
      expect(/^[0-9a-f]+$/.test(key1)).toBe(true); // Should be valid hex
    });
  });

  describe('Error Handling', () => {
    it('should handle tampered encrypted data', () => {
      const encrypted = EncryptionService.encrypt(testData);

      // Tamper with the encrypted data
      const tamperedData = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -2) + '00',
      };

      expect(() => EncryptionService.decrypt(tamperedData)).toThrow(
        'Decryption failed',
      );
    });

    it('should handle invalid encrypted data format', () => {
      expect(() => EncryptionService.decrypt(null as any)).toThrow(
        'Cannot decrypt empty or invalid encrypted data',
      );
      expect(() => EncryptionService.decrypt({} as any)).toThrow(
        'Cannot decrypt empty or invalid encrypted data',
      );
    });

    it('should handle decryption failures gracefully in field operations', () => {
      const userData = {
        id: 'user-123',
        firstName: 'John',
        _encrypted: {
          firstName: {
            encryptedData: 'invalid',
            iv: 'invalid',
            tag: 'invalid',
            salt: 'invalid',
          },
        },
      };

      const decrypted = EncryptionService.decryptFields(userData, [
        'firstName',
      ]);
      expect(decrypted.firstName).toBe('[DECRYPTION_FAILED]');
    });
  });
});
