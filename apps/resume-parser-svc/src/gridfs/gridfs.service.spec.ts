import { Logger } from '@nestjs/common';
import { GridFsService } from './gridfs.service';
import type { ResumeParserConfigService } from '../config';
import { Readable } from 'stream';

const mockConfig = {
  isTest: true,
  nodeName: 'unknown',
  gridfsBucketName: 'resumes',
} as unknown as ResumeParserConfigService;

describe('GridFsService (isolated)', () => {
  let service: GridFsService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    service = new GridFsService({} as any, mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadFile', () => {
    it('throws when bucket is not initialized', async () => {
      (service as any).gridFSBucket = null;
      await expect(service.downloadFile('gridfs://bucket/507f1f77bcf86cd799439011')).rejects.toThrow(
        'GridFS bucket not initialized. Service may not be connected.',
      );
    });

    it('throws for invalid gridfs url', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };
      await expect(service.downloadFile('invalid-url')).rejects.toThrow(
        'Invalid GridFS URL or file ID: invalid-url',
      );
    });

    it('throws when file is not found', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };
      await expect(
        service.downloadFile('gridfs://bucket/507f1f77bcf86cd799439011'),
      ).rejects.toThrow('File not found');
    });

    it('throws for empty gridfs url', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };
      await expect(service.downloadFile('')).rejects.toThrow(
        'GridFS URL must be a non-empty string',
      );
    });

    it('throws for non-string gridfs url', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };
      await expect(service.downloadFile(null as unknown as string)).rejects.toThrow();
    });

    it('throws for invalid file ID format', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };
      await expect(service.downloadFile('gridfs://bucket/invalid-id')).rejects.toThrow(
        'Invalid GridFS URL or file ID',
      );
    });

    it('downloads file from in-memory store', async () => {
      const testBuffer = Buffer.from('test content');
      const testFileId = '507f1f77bcf86cd799439011';

      // Add file to in-memory store
      (service as any).inMemoryStore.set(testFileId, {
        buffer: testBuffer,
        info: { filename: 'test.pdf', length: testBuffer.length },
      });

      const result = await service.downloadFile(`gridfs://bucket/${testFileId}`);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('test content');
    });

    it('downloads file from GridFS bucket', async () => {
      const testBuffer = Buffer.from('gridfs content');
      const testFileId = '507f1f77bcf86cd799439011';

      // Create a readable stream that emits the test buffer
      const mockStream = new Readable({
        read() {
          this.push(testBuffer);
          this.push(null);
        },
      });

      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{ _id: testFileId, filename: 'test.pdf' }]),
        }),
        openDownloadStream: jest.fn().mockReturnValue(mockStream),
      };

      const result = await service.downloadFile(`gridfs://bucket/${testFileId}`);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('gridfs content');
    });

    it('handles stream errors during download', async () => {
      const testFileId = '507f1f77bcf86cd799439011';

      // Create a readable stream that emits an error
      const mockStream = new Readable({
        read() {
          this.emit('error', new Error('Stream error'));
        },
      });

      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{ _id: testFileId, filename: 'test.pdf' }]),
        }),
        openDownloadStream: jest.fn().mockReturnValue(mockStream),
      };

      await expect(service.downloadFile(`gridfs://bucket/${testFileId}`)).rejects.toThrow(
        'Stream error',
      );
    });
  });

  describe('uploadFile', () => {
    it('uploads file to in-memory store in test mode', async () => {
      const testBuffer = Buffer.from('test content');
      const result = await service.uploadFile(testBuffer, 'test.pdf');

      expect(result).toMatch(/gridfs:\/\/resume-files\/[a-f0-9]+/);
    });
  });

  describe('fileExists', () => {
    it('returns true when file exists in in-memory store', async () => {
      const testFileId = '507f1f77bcf86cd799439011';
      (service as any).inMemoryStore.set(testFileId, {
        buffer: Buffer.from('test'),
        info: { filename: 'test.pdf', length: 4 },
      });

      const result = await service.fileExists(`gridfs://bucket/${testFileId}`);
      expect(result).toBe(true);
    });

    it('returns false when bucket not initialized and file not in memory', async () => {
      (service as any).gridFSBucket = null;
      const result = await service.fileExists('gridfs://bucket/507f1f77bcf86cd799439012');
      expect(result).toBe(false);
    });

    it('returns true when file exists in GridFS', async () => {
      const testFileId = '507f1f77bcf86cd799439011';
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{ _id: testFileId }]),
        }),
      };

      const result = await service.fileExists(`gridfs://bucket/${testFileId}`);
      expect(result).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };

      const result = await service.fileExists('gridfs://bucket/507f1f77bcf86cd799439011');
      expect(result).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('returns file info from in-memory store', async () => {
      const testFileId = '507f1f77bcf86cd799439011';
      const testInfo = { filename: 'test.pdf', length: 100, uploadDate: new Date() };
      (service as any).inMemoryStore.set(testFileId, {
        buffer: Buffer.from('test'),
        info: testInfo,
      });

      const result = await service.getFileInfo(`gridfs://bucket/${testFileId}`);
      expect(result.filename).toBe('test.pdf');
    });

    it('throws when bucket not initialized and file not in memory', async () => {
      (service as any).gridFSBucket = null;
      await expect(service.getFileInfo('gridfs://bucket/507f1f77bcf86cd799439012')).rejects.toThrow(
        'File not found',
      );
    });

    it('returns file info from GridFS', async () => {
      const testFileId = '507f1f77bcf86cd799439011';
      const mockFileInfo = {
        _id: testFileId,
        filename: 'test.pdf',
        length: 100,
        uploadDate: new Date(),
        contentType: 'application/pdf',
      };

      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([mockFileInfo]),
        }),
      };

      const result = await service.getFileInfo(`gridfs://bucket/${testFileId}`);
      expect(result.filename).toBe('test.pdf');
    });

    it('throws when file not found', async () => {
      (service as any).gridFSBucket = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      };

      await expect(service.getFileInfo('gridfs://bucket/507f1f77bcf86cd799439011')).rejects.toThrow(
        'File not found in GridFS',
      );
    });
  });

  describe('deleteFile', () => {
    it('deletes file from in-memory store', async () => {
      const testFileId = '507f1f77bcf86cd799439011';
      (service as any).inMemoryStore.set(testFileId, {
        buffer: Buffer.from('test'),
        info: { filename: 'test.pdf', length: 4 },
      });

      await service.deleteFile(`gridfs://bucket/${testFileId}`);
      expect((service as any).inMemoryStore.has(testFileId)).toBe(false);
    });

    it('handles delete when bucket not initialized', async () => {
      (service as any).gridFSBucket = null;
      // Should not throw
      await service.deleteFile('gridfs://bucket/507f1f77bcf86cd799439011');
    });

    it('deletes file from GridFS', async () => {
      const testFileId = '507f1f77bcf86cd799439011';
      (service as any).gridFSBucket = {
        delete: jest.fn().mockResolvedValue(undefined),
      };

      await service.deleteFile(`gridfs://bucket/${testFileId}`);
      expect((service as any).gridFSBucket.delete).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('returns healthy status when connected', async () => {
      (service as any).gridFSBucket = {};
      (service as any).connection = { readyState: 1 };

      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
    });

    it('returns unhealthy status when bucket not initialized', async () => {
      (service as any).gridFSBucket = null;
      (service as any).connection = { readyState: 0 };

      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
    });
  });

  describe('connect', () => {
    it('skips connection in test mode', async () => {
      await service.connect();
      // Should not throw, logs test mode connection
    });

    it('throws when database not available in non-test mode', async () => {
      const nonTestConfig = {
        isTest: false,
        nodeName: 'unknown',
        gridfsBucketName: 'resumes',
      } as unknown as ResumeParserConfigService;

      const nonTestService = new GridFsService({} as any, nonTestConfig);
      (nonTestService as any).connection = { db: null };

      await expect(nonTestService.connect()).rejects.toThrow('GridFS connection failed');
    });
  });

  describe('disconnect', () => {
    it('logs disconnect message', async () => {
      await service.disconnect();
      expect(Logger.prototype.log).toHaveBeenCalledWith('GridFS service disconnected');
    });
  });
});
