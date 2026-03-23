import {
  NatsClient,
  MongoModel,
  UserDataCollectionItem,
  DataSummary,
  ExportData,
  SecureFileInfo,
  ErasureEligibilityResult,
  ConsentCascadeNotification,
  AuditLogEntry,
} from './privacy-types';

describe('PrivacyTypes', () => {
  describe('NatsClient interface', () => {
    it('should define publish and request methods', () => {
      const client: NatsClient = {
        publish: jest.fn().mockResolvedValue(undefined),
        request: jest.fn().mockResolvedValue({}),
      };

      expect(typeof client.publish).toBe('function');
      expect(typeof client.request).toBe('function');
    });

    it('should handle publish with subject and data', async () => {
      const client: NatsClient = {
        publish: jest.fn().mockResolvedValue(undefined),
        request: jest.fn().mockResolvedValue({}),
      };

      await client.publish('subject.name', { key: 'value' });

      expect(client.publish).toHaveBeenCalledWith('subject.name', {
        key: 'value',
      });
    });

    it('should handle request with timeout', async () => {
      const client: NatsClient = {
        publish: jest.fn().mockResolvedValue(undefined),
        request: jest.fn().mockResolvedValue({ result: 'data' }),
      };

      const result = await client.request(
        'subject.name',
        { query: 'data' },
        5000,
      );

      expect(client.request).toHaveBeenCalledWith(
        'subject.name',
        { query: 'data' },
        5000,
      );
      expect(result).toEqual({ result: 'data' });
    });
  });

  describe('MongoModel interface', () => {
    it('should define find with lean method', () => {
      const model: MongoModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      };

      expect(typeof model.find).toBe('function');
    });

    it('should support deleteOne', async () => {
      const model: MongoModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        deleteOne: jest
          .fn()
          .mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
      };

      const result = await model.deleteOne!({ _id: '123' });

      expect(result.acknowledged).toBe(true);
      expect(result.deletedCount).toBe(1);
    });
  });

  describe('UserDataCollectionItem interface', () => {
    it('should accept valid collection item', () => {
      const item: UserDataCollectionItem = {
        service: 'resume-parser',
        dataType: 'resume_content',
        data: { name: 'John Doe' },
        collectedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(item.service).toBe('resume-parser');
      expect(item.dataType).toBe('resume_content');
    });
  });

  describe('DataSummary interface', () => {
    it('should accept valid data summary', () => {
      const summary: DataSummary = {
        totalRecords: 100,
        dataByService: { 'service-a': 50, 'service-b': 50 },
        dataByType: { resume: 70, job_pref: 30 },
        recordTypes: ['resume', 'profile', 'preferences'],
      };

      expect(summary.totalRecords).toBe(100);
      expect(summary.dataByService['service-a']).toBe(50);
    });
  });

  describe('ExportData interface', () => {
    it('should accept valid export data', () => {
      const exportData: ExportData = {
        metadata: {
          exportedAt: '2024-01-01T00:00:00.000Z',
          dataSubject: 'user-123',
          totalRecords: 50,
          exportFormat: 'json',
          gdprCompliant: true,
          packageId: 'export-abc',
        },
        data: [],
        summary: {
          totalRecords: 50,
          dataByService: {},
          dataByType: {},
          recordTypes: [],
        },
      };

      expect(exportData.metadata.gdprCompliant).toBe(true);
      expect(exportData.metadata.packageId).toBe('export-abc');
    });
  });

  describe('SecureFileInfo interface', () => {
    it('should accept valid secure file info', () => {
      const fileInfo: SecureFileInfo = {
        fileId: 'file-123',
        storagePath: '/secure/storage/path',
      };

      expect(fileInfo.fileId).toBe('file-123');
      expect(fileInfo.storagePath).toBe('/secure/storage/path');
    });
  });

  describe('ErasureEligibilityResult interface', () => {
    it('should accept eligible result', () => {
      const result: ErasureEligibilityResult = {
        eligible: true,
      };

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should accept ineligible result with reason', () => {
      const result: ErasureEligibilityResult = {
        eligible: false,
        reason: 'Legal hold on data',
      };

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Legal hold on data');
    });
  });

  describe('ConsentCascadeNotification interface', () => {
    it('should accept valid notification', () => {
      const notification: ConsentCascadeNotification = {
        userId: 'user-123',
        purpose: 'marketing',
        action: 'withdraw',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      expect(notification.userId).toBe('user-123');
      expect(notification.action).toBe('withdraw');
    });
  });

  describe('AuditLogEntry interface', () => {
    it('should accept valid audit log entry', () => {
      const entry: AuditLogEntry = {
        userId: 'user-123',
        purpose: 'resume_processing',
        action: 'consent_granted',
        timestamp: '2024-01-01T00:00:00.000Z',
        details: 'User consented to resume processing',
      };

      expect(entry.userId).toBe('user-123');
      expect(entry.details).toBe('User consented to resume processing');
    });
  });
});
