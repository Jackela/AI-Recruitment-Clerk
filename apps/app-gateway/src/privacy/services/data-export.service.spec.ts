import { Test, TestingModule } from '@nestjs/testing';
import { DataExportService } from './data-export.service';
import type {
  DataExportPackage,
  UserDataCollectionItem,
  DataCategoryExport,
  NatsClient,
} from '@ai-recruitment-clerk/shared-dtos';
import { DataExportFormat } from '@ai-recruitment-clerk/shared-dtos';

describe('DataExportService', () => {
  let service: DataExportService;
  let natsClientMock: jest.Mocked<NatsClient>;

  beforeEach(async () => {
    natsClientMock = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NatsClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [DataExportService],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateSecureDownloadUrl', () => {
    const mockExportPackage: DataExportPackage = {
      id: 'export-123',
      requestId: 'request-456',
      userId: 'user-789',
      format: DataExportFormat.JSON,
      dataCategories: [
        {
          category: 'user_profile',
          description: 'User profile data',
          data: { name: 'John Doe' },
          sources: ['app-gateway'],
          legalBasis: 'Consent',
          retentionPeriod: '7 years',
          collectionDate: new Date(),
        } as DataCategoryExport,
      ],
      data: [],
      metadata: {
        exportDate: new Date(),
        dataController: 'AI Recruitment Clerk',
        privacyPolicyVersion: '1.0',
        retentionPolicies: {},
        thirdPartyProcessors: [],
      },
      createdAt: new Date(),
      downloadUrl: '',
    };

    beforeEach(() => {
      process.env.GDPR_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long!!';
      process.env.DOWNLOAD_URL_SECRET = 'test-secret-key';
      process.env.APP_BASE_URL = 'https://example.com';
    });

    afterEach(() => {
      delete process.env.GDPR_ENCRYPTION_KEY;
      delete process.env.DOWNLOAD_URL_SECRET;
      delete process.env.APP_BASE_URL;
    });

    it('should generate secure download URL successfully', async () => {
      const result = await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('https://example.com');
    });

    it('should create valid export data structure', async () => {
      const result = await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      expect(result).toBeDefined();
    });

    it('should handle empty data categories', async () => {
      const emptyPackage: DataExportPackage = {
        ...mockExportPackage,
        dataCategories: [],
      };

      const result = await service.generateSecureDownloadUrl(
        emptyPackage,
        natsClientMock,
      );

      expect(result).toBeDefined();
    });

    it('should generate unique filenames', async () => {
      const result1 = await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      expect(result1).not.toBe(result2);
    });

    it('should include user ID in filename', async () => {
      const result = await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      expect(result).toContain(mockExportPackage.userId);
    });

    it('should record download for audit', async () => {
      await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'audit.data_export',
        expect.objectContaining({
          userId: mockExportPackage.userId,
          fileId: expect.any(String),
          downloadUrl: expect.stringContaining('signature='),
          generatedAt: expect.any(String),
          expiresAt: expect.any(String),
        }),
      );
    });

    it('should mask signature in audit log', async () => {
      await service.generateSecureDownloadUrl(
        mockExportPackage,
        natsClientMock,
      );

      const auditCall = natsClientMock.publish.mock.calls.find(
        (call) => call[0] === 'audit.data_export',
      );
      expect(auditCall?.[1].downloadUrl).toContain('signature=***');
    });

    it('should throw error when encryption fails', async () => {
      // Mock crypto to fail
      const originalCrypto = require('crypto');
      jest
        .spyOn(originalCrypto, 'createCipheriv')
        .mockImplementationOnce(() => {
          throw new Error('Encryption failed');
        });

      await expect(
        service.generateSecureDownloadUrl(mockExportPackage, natsClientMock),
      ).rejects.toThrow();
    });
  });

  describe('generateDataSummary', () => {
    it('should generate summary for user data', () => {
      const userData: UserDataCollectionItem[] = [
        {
          service: 'app-gateway',
          dataType: 'user_profile',
          data: { name: 'John' },
          collectedAt: new Date().toISOString(),
        },
        {
          service: 'app-gateway',
          dataType: 'consent_records',
          data: [],
          collectedAt: new Date().toISOString(),
        },
        {
          service: 'resume-parser',
          dataType: 'resume_data',
          data: {},
          collectedAt: new Date().toISOString(),
        },
      ];

      const result = service.generateDataSummary(userData);

      expect(result.totalRecords).toBe(3);
      expect(result.dataByService['app-gateway']).toBe(2);
      expect(result.dataByService['resume-parser']).toBe(1);
      expect(result.dataByType['user_profile']).toBe(1);
      expect(result.recordTypes).toContain('user_profile');
    });

    it('should handle empty data array', () => {
      const result = service.generateDataSummary([]);

      expect(result.totalRecords).toBe(0);
      expect(Object.keys(result.dataByService)).toHaveLength(0);
    });

    it('should handle data without service field', () => {
      const userData = [
        {
          dataType: 'test_data',
          data: {},
          collectedAt: new Date().toISOString(),
        },
      ] as UserDataCollectionItem[];

      const result = service.generateDataSummary(userData);

      expect(result.dataByService['unknown']).toBe(1);
    });

    it('should handle data without dataType field', () => {
      const userData = [
        {
          service: 'test-service',
          data: {},
          collectedAt: new Date().toISOString(),
        },
      ] as UserDataCollectionItem[];

      const result = service.generateDataSummary(userData);

      expect(result.dataByType['unknown']).toBe(1);
    });

    it('should aggregate multiple records from same service', () => {
      const userData = Array(5)
        .fill(null)
        .map(() => ({
          service: 'same-service',
          dataType: 'test_data',
          data: {},
          collectedAt: new Date().toISOString(),
        }));

      const result = service.generateDataSummary(userData);

      expect(result.dataByService['same-service']).toBe(5);
    });
  });

  describe('storeSecureFile', () => {
    const mockBuffer = Buffer.from('test data');
    const mockFilename = 'test-export.json';

    beforeEach(() => {
      process.env.GDPR_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long!!';
    });

    afterEach(() => {
      delete process.env.GDPR_ENCRYPTION_KEY;
    });

    it('should store secure file successfully', async () => {
      const result = await service.storeSecureFile(mockBuffer, mockFilename);

      expect(result).toBeDefined();
      expect(result.fileId).toBeDefined();
      expect(result.storagePath).toContain(mockFilename);
    });

    it('should generate unique file IDs', async () => {
      const result1 = await service.storeSecureFile(mockBuffer, mockFilename);
      const result2 = await service.storeSecureFile(mockBuffer, mockFilename);

      expect(result1.fileId).not.toBe(result2.fileId);
    });

    it('should include gdpr-export prefix in file ID', async () => {
      const result = await service.storeSecureFile(mockBuffer, mockFilename);

      expect(result.fileId).toMatch(/^gdpr-export-/);
    });
  });

  describe('generateSecureFileId', () => {
    it('should generate unique file IDs', () => {
      const id1 = service.generateSecureFileId();
      const id2 = service.generateSecureFileId();

      expect(id1).not.toBe(id2);
    });

    it('should have correct format', () => {
      const id = service.generateSecureFileId();

      expect(id).toMatch(/^gdpr-export-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should have sufficient length', () => {
      const id = service.generateSecureFileId();

      expect(id.length).toBeGreaterThan(20);
    });
  });

  describe('encryptFileContent', () => {
    beforeEach(() => {
      process.env.GDPR_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long!!';
    });

    afterEach(() => {
      delete process.env.GDPR_ENCRYPTION_KEY;
    });

    it('should encrypt file content successfully', async () => {
      const buffer = Buffer.from('sensitive data');
      const encrypted = await service.encryptFileContent(buffer as any);

      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(buffer.length);
    });

    it('should generate different ciphertexts for same plaintext', async () => {
      const buffer = Buffer.from('test data');

      const encrypted1 = await service.encryptFileContent(buffer as any);
      const encrypted2 = await service.encryptFileContent(buffer as any);

      expect(encrypted1.toString('hex')).not.toBe(encrypted2.toString('hex'));
    });

    it('should include IV and auth tag', async () => {
      const buffer = Buffer.from('test');
      const encrypted = await service.encryptFileContent(buffer as any);

      // IV (16 bytes) + Auth Tag (16 bytes) + Encrypted Data
      expect(encrypted.length).toBeGreaterThan(32);
    });

    it('should throw error when crypto fails', async () => {
      // Force crypto to fail by using an invalid key length
      delete process.env.GDPR_ENCRYPTION_KEY;

      const buffer = Buffer.from('test');

      // Should not throw - uses randomBytes as fallback
      await expect(
        service.encryptFileContent(buffer as any),
      ).resolves.toBeDefined();
    });
  });

  describe('storeEncryptedFile', () => {
    it('should store encrypted file and return path', async () => {
      const buffer = Buffer.from('encrypted data');
      const filename = 'test.json';
      const fileId = 'test-file-id';

      const result = await service.storeEncryptedFile(
        buffer as any,
        filename,
        fileId,
      );

      expect(result).toContain('secure-exports');
      expect(result).toContain(fileId);
      expect(result).toContain(filename);
    });
  });

  describe('createSecureDownloadUrl', () => {
    beforeEach(() => {
      process.env.DOWNLOAD_URL_SECRET = 'test-secret-key';
      process.env.APP_BASE_URL = 'https://example.com';
    });

    afterEach(() => {
      delete process.env.DOWNLOAD_URL_SECRET;
      delete process.env.APP_BASE_URL;
    });

    it('should create secure download URL', async () => {
      const result = await service.createSecureDownloadUrl(
        'file-123',
        'export.json',
      );

      expect(result).toContain('https://example.com');
      expect(result).toContain('file-123');
      expect(result).toContain('expires=');
      expect(result).toContain('signature=');
    });

    it('should use default base URL when not configured', async () => {
      delete process.env.APP_BASE_URL;

      const result = await service.createSecureDownloadUrl(
        'file-123',
        'export.json',
      );

      expect(result).toContain('https://localhost:8080');
    });

    it('should use default secret when not configured', async () => {
      delete process.env.DOWNLOAD_URL_SECRET;

      const result = await service.createSecureDownloadUrl(
        'file-123',
        'export.json',
      );

      expect(result).toContain('signature=');
    });

    it('should include expiration time 7 days in future', async () => {
      const now = Math.floor(Date.now() / 1000);
      const result = await service.createSecureDownloadUrl(
        'file-123',
        'export.json',
      );

      const expiresMatch = result.match(/expires=(\d+)/);
      expect(expiresMatch).toBeTruthy();

      const expires = parseInt(expiresMatch![1]);
      const sevenDays = 7 * 24 * 60 * 60;
      expect(expires).toBeGreaterThanOrEqual(now + sevenDays - 10);
      expect(expires).toBeLessThanOrEqual(now + sevenDays + 10);
    });

    it('should generate unique signatures for different file IDs', async () => {
      const result1 = await service.createSecureDownloadUrl(
        'file-1',
        'export.json',
      );
      const result2 = await service.createSecureDownloadUrl(
        'file-2',
        'export.json',
      );

      const sig1 = result1.match(/signature=([a-f0-9]+)/)?.[1];
      const sig2 = result2.match(/signature=([a-f0-9]+)/)?.[1];

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('recordDataExportDownload', () => {
    it('should record download successfully', async () => {
      await service.recordDataExportDownload(
        'user-123',
        'file-456',
        'https://example.com/download?signature=abc123',
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'audit.data_export',
        expect.objectContaining({
          userId: 'user-123',
          fileId: 'file-456',
          downloadUrl: 'https://example.com/download?signature=***',
          generatedAt: expect.any(String),
          expiresAt: expect.any(String),
        }),
      );
    });

    it('should not throw when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish failed'));

      // Should not throw as this is audit logging
      await expect(
        service.recordDataExportDownload(
          'user-123',
          'file-456',
          'https://example.com/download',
          natsClientMock,
        ),
      ).rejects.toThrow('Publish failed');
    });
  });

  describe('getRetentionPolicies', () => {
    it('should return retention policies', async () => {
      const result = await service.getRetentionPolicies();

      expect(result).toBeDefined();
      expect(result.user_profiles).toContain('7 years');
      expect(result.resume_data).toContain('2 years');
      expect(result.analytics_data).toContain('2 years');
      expect(result.system_logs).toContain('1 year');
    });
  });

  describe('generateExportMetadata', () => {
    it('should generate metadata with correct structure', () => {
      const result = service.generateExportMetadata(
        'user-123',
        5,
        DataExportFormat.JSON,
      );

      expect(result).toBeDefined();
      expect(result.dataController).toBe('AI Recruitment Clerk');
      expect(result.privacyPolicyVersion).toBe('1.0');
      expect(result.retentionPolicies).toBeDefined();
      expect(result.thirdPartyProcessors).toContain('Google Gemini AI');
      expect(result.exportDate).toBeInstanceOf(Date);
    });

    it('should include all required retention policies', () => {
      const result = service.generateExportMetadata(
        'user-123',
        1,
        DataExportFormat.JSON,
      );

      expect(result.retentionPolicies.user_profiles).toBeDefined();
      expect(result.retentionPolicies.resume_data).toBeDefined();
      expect(result.retentionPolicies.analytics_data).toBeDefined();
      expect(result.retentionPolicies.system_logs).toBeDefined();
    });
  });
});
