import { FileProcessingService } from './file-processing.service';
import { ResumeParserException } from '@ai-recruitment-clerk/infrastructure-shared';

describe('FileProcessingService', () => {
  let service: FileProcessingService;

  beforeEach(() => {
    service = new FileProcessingService();
  });

  describe('validateFileBuffer', () => {
    it('should validate a valid PDF buffer', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nsample content');
      const result = service.validateFileBuffer(pdfBuffer, 'test.pdf');

      expect(result.buffer).toEqual(pdfBuffer);
      expect(result.hash).toBeTruthy();
      expect(result.size).toBe(pdfBuffer.length);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should validate a DOCX buffer', () => {
      const docxBuffer = Buffer.from('PK\x03\x04sample docx content');
      const result = service.validateFileBuffer(docxBuffer, 'test.docx');

      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('should throw on buffer exceeding max size', () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      expect(() =>
        service.validateFileBuffer(largeBuffer, 'large.pdf'),
      ).toThrow(ResumeParserException);
    });

    it('should generate consistent hash for same buffer', () => {
      const buffer = Buffer.from('%PDF-1.4\nsample content');
      const result1 = service.validateFileBuffer(buffer, 'test.pdf');
      const result2 = service.validateFileBuffer(buffer, 'test.pdf');

      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('isPdfFile', () => {
    it('should return true for PDF buffer', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4');
      expect(service.isPdfFile(pdfBuffer)).toBe(true);
    });

    it('should return false for non-PDF buffer', () => {
      const docBuffer = Buffer.from('PK\x03\x04');
      expect(service.isPdfFile(docBuffer)).toBe(false);
    });
  });

  describe('detectMimeType', () => {
    it('should detect PDF MIME type', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4');
      expect(service.detectMimeType(pdfBuffer)).toBe('application/pdf');
    });

    it('should detect DOCX MIME type', () => {
      const docxBuffer = Buffer.from('PK\x03\x04');
      expect(service.detectMimeType(docxBuffer)).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('should detect DOC MIME type', () => {
      const docBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
      expect(service.detectMimeType(docBuffer)).toBe('application/msword');
    });

    it('should return octet-stream for unknown type', () => {
      const unknownBuffer = Buffer.from('unknown content');
      expect(service.detectMimeType(unknownBuffer)).toBe(
        'application/octet-stream',
      );
    });
  });

  describe('generateFileHash', () => {
    it('should generate SHA-256 hash', () => {
      const buffer = Buffer.from('test content');
      const hash = service.generateFileHash(buffer);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different hashes for different content', () => {
      const buffer1 = Buffer.from('content 1');
      const buffer2 = Buffer.from('content 2');

      expect(service.generateFileHash(buffer1)).not.toBe(
        service.generateFileHash(buffer2),
      );
    });
  });

  describe('isAllowedMimeType', () => {
    it('should return true for allowed MIME types', () => {
      expect(service.isAllowedMimeType('application/pdf')).toBe(true);
      expect(service.isAllowedMimeType('application/msword')).toBe(true);
    });

    it('should return false for disallowed MIME types', () => {
      expect(service.isAllowedMimeType('image/png')).toBe(false);
      expect(service.isAllowedMimeType('text/plain')).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();

      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toContain('application/pdf');
    });
  });

  describe('custom configuration', () => {
    it('should accept custom max file size', () => {
      const customService = new FileProcessingService({
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      const config = customService.getConfig();
      expect(config.maxFileSize).toBe(5 * 1024 * 1024);
    });

    it('should accept custom allowed MIME types', () => {
      const customService = new FileProcessingService({
        allowedMimeTypes: ['application/pdf'],
      });

      expect(customService.isAllowedMimeType('application/pdf')).toBe(true);
      expect(customService.isAllowedMimeType('application/msword')).toBe(
        false,
      );
    });
  });
});
