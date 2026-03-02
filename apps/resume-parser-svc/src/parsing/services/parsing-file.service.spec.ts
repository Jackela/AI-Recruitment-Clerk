import { Logger } from '@nestjs/common';
import { ParsingFileService } from './parsing-file.service';
import type { GridFsService } from '../../gridfs/gridfs.service';
import type { FileProcessingService, ResumeEncryptionService } from '../../processing';
import type { ResumeParserConfigService } from '../../config';

// Mock pdf-parse-fork
jest.mock('pdf-parse-fork', () =>
  jest.fn().mockResolvedValue({ text: 'Extracted PDF text content' }),
);

describe('ParsingFileService', () => {
  let service: ParsingFileService;
  let mockGridFsService: jest.Mocked<GridFsService>;
  let mockFileProcessingService: jest.Mocked<FileProcessingService>;
  let mockResumeEncryptionService: jest.Mocked<ResumeEncryptionService>;

  beforeEach(() => {
    mockGridFsService = {
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
    } as unknown as jest.Mocked<GridFsService>;

    mockFileProcessingService = {
      downloadAndValidateFileWithService: jest.fn().mockImplementation(
        async (downloadFn: (url: string) => Promise<Buffer>, url: string, filename: string) => ({
          buffer: await downloadFn(url),
          filename,
          mimeType: 'application/pdf',
          size: 1024,
        }),
      ),
    } as unknown as jest.Mocked<FileProcessingService>;

    const mockConfig = {
      isTest: true,
      nodeName: 'test-node',
    } as unknown as ResumeParserConfigService;

    mockResumeEncryptionService = {
      validateOrganizationAccess: jest.fn(),
      encryptSensitiveData: jest.fn().mockReturnValue({
        contactInfo: { name: 'encrypted', email: 'encrypted', phone: 'encrypted' },
        skills: [],
        workExperience: [],
        education: [],
        _secured: true,
      }),
    } as unknown as jest.Mocked<ResumeEncryptionService>;

    service = new ParsingFileService(
      mockGridFsService,
      mockFileProcessingService,
      mockResumeEncryptionService,
    );

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadAndValidateFile', () => {
    it('should download and validate file from GridFS', async () => {
      const buffer = await service.downloadAndValidateFile(
        'gridfs://bucket/file-id',
        'resume.pdf',
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockFileProcessingService.downloadAndValidateFileWithService).toHaveBeenCalled();
    });

    it('should pass metadata to download function', async () => {
      const metadata = { contentType: 'application/pdf', size: 1024 };

      await service.downloadAndValidateFile(
        'gridfs://bucket/file-id',
        'resume.pdf',
        metadata,
      );

      expect(mockFileProcessingService.downloadAndValidateFileWithService).toHaveBeenCalledWith(
        expect.any(Function),
        'gridfs://bucket/file-id',
        'resume.pdf',
        metadata,
      );
    });
  });

  describe('validateOrganizationAccess', () => {
    it('should validate organization access', () => {
      service.validateOrganizationAccess('org-123', 'job-456');

      expect(mockResumeEncryptionService.validateOrganizationAccess).toHaveBeenCalledWith(
        'org-123',
        'job-456',
      );
    });
  });

  describe('encryptSensitiveData', () => {
    it('should encrypt resume DTO', () => {
      const resumeDto = {
        contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        skills: ['TypeScript'],
        workExperience: [],
        education: [],
      };

      const result = service.encryptSensitiveData(resumeDto, 'org-123');

      expect(mockResumeEncryptionService.encryptSensitiveData).toHaveBeenCalled();
      expect(result).toHaveProperty('_secured', true);
    });
  });

  describe('extractTextFromMaybeTextFile', () => {
    it('should extract text from PDF buffer', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');

      const text = await service.extractTextFromMaybeTextFile(pdfBuffer);

      expect(text).toBe('Extracted PDF text content');
    });

    it('should decode UTF-8 for non-PDF buffer', async () => {
      const textBuffer = Buffer.from('Plain text resume content');

      const text = await service.extractTextFromMaybeTextFile(textBuffer);

      expect(text).toBe('Plain text resume content');
    });

    it('should return empty string on extraction error', async () => {
      // Create a buffer that starts with %PDF but will fail parsing
      const invalidBuffer = Buffer.from('%PDF-invalid');

      // The mock will return the text anyway, so let's test the error path differently
      // by making the mock throw
      const pdfParse = require('pdf-parse-fork');
      pdfParse.mockRejectedValueOnce(new Error('PDF parsing failed'));

      const result = await service.extractTextFromMaybeTextFile(invalidBuffer);

      expect(result).toBe('');
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('isPdf', () => {
    it('should return true for PDF buffer', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 content');

      expect(service.isPdf(pdfBuffer)).toBe(true);
    });

    it('should return false for non-PDF buffer', () => {
      const textBuffer = Buffer.from('Plain text content');

      expect(service.isPdf(textBuffer)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const emptyBuffer = Buffer.from('');

      expect(service.isPdf(emptyBuffer)).toBe(false);
    });

    it('should return false for short buffer', () => {
      const shortBuffer = Buffer.from('%PD');

      expect(service.isPdf(shortBuffer)).toBe(false);
    });
  });

  describe('createFileHash', () => {
    it('should create SHA-256 hash', () => {
      const buffer = Buffer.from('test content');

      const hash = service.createFileHash(buffer);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create consistent hash for same content', () => {
      const buffer1 = Buffer.from('test content');
      const buffer2 = Buffer.from('test content');

      const hash1 = service.createFileHash(buffer1);
      const hash2 = service.createFileHash(buffer2);

      expect(hash1).toBe(hash2);
    });

    it('should create different hash for different content', () => {
      const buffer1 = Buffer.from('test content 1');
      const buffer2 = Buffer.from('test content 2');

      const hash1 = service.createFileHash(buffer1);
      const hash2 = service.createFileHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return max file size (10MB)', () => {
      expect(service.getMaxFileSize()).toBe(10 * 1024 * 1024);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return array of allowed MIME types', () => {
      const mimeTypes = service.getAllowedMimeTypes();

      expect(mimeTypes).toContain('application/pdf');
      expect(mimeTypes).toContain('application/msword');
    });

    it('should return a copy of the array', () => {
      const mimeTypes1 = service.getAllowedMimeTypes();
      const mimeTypes2 = service.getAllowedMimeTypes();

      expect(mimeTypes1).not.toBe(mimeTypes2);
      expect(mimeTypes1).toEqual(mimeTypes2);
    });
  });

  describe('validateFileInput', () => {
    it('should pass for valid input', () => {
      const buffer = Buffer.from('test content');

      expect(() => service.validateFileInput(buffer, 'resume.pdf', 'user-1')).not.toThrow();
    });

    it('should throw for empty buffer', () => {
      const emptyBuffer = Buffer.from('');

      expect(() => service.validateFileInput(emptyBuffer, 'resume.pdf', 'user-1')).toThrow(
        'File buffer must be valid and non-empty',
      );
    });

    it('should throw for null buffer', () => {
      expect(() =>
        service.validateFileInput(null as unknown as Buffer, 'resume.pdf', 'user-1'),
      ).toThrow('File buffer must be valid and non-empty');
    });

    it('should throw for empty filename', () => {
      const buffer = Buffer.from('test content');

      expect(() => service.validateFileInput(buffer, '', 'user-1')).toThrow(
        'File name must be non-empty string',
      );
    });

    it('should throw for whitespace-only filename', () => {
      const buffer = Buffer.from('test content');

      expect(() => service.validateFileInput(buffer, '   ', 'user-1')).toThrow(
        'File name must be non-empty string',
      );
    });

    it('should throw for empty userId', () => {
      const buffer = Buffer.from('test content');

      expect(() => service.validateFileInput(buffer, 'resume.pdf', '')).toThrow(
        'User ID must be non-empty string',
      );
    });

    it('should throw for file exceeding max size', () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      expect(() => service.validateFileInput(largeBuffer, 'resume.pdf', 'user-1')).toThrow(
        'File size exceeds maximum allowed',
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload file when gridFsService has uploadFile method', async () => {
      const mockUploadFile = jest.fn().mockResolvedValue('gridfs://bucket/uploaded-id');
      (mockGridFsService as unknown as Record<string, unknown>).uploadFile = mockUploadFile;

      const buffer = Buffer.from('test content');
      const url = await service.uploadFile(buffer, 'resume.pdf');

      expect(url).toBe('gridfs://bucket/uploaded-id');
      expect(mockUploadFile).toHaveBeenCalledWith(buffer, 'resume.pdf');
    });

    it('should return undefined when gridFsService does not have uploadFile method', async () => {
      // Remove uploadFile method
      delete (mockGridFsService as unknown as Record<string, unknown>).uploadFile;

      const buffer = Buffer.from('test content');
      const url = await service.uploadFile(buffer, 'resume.pdf');

      expect(url).toBeUndefined();
    });

    it('should return undefined and log warning on upload failure', async () => {
      const mockUploadFile = jest.fn().mockRejectedValue(new Error('Upload failed'));
      (mockGridFsService as unknown as Record<string, unknown>).uploadFile = mockUploadFile;

      const buffer = Buffer.from('test content');
      const url = await service.uploadFile(buffer, 'resume.pdf');

      expect(url).toBeUndefined();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload file'),
      );
    });
  });
});
