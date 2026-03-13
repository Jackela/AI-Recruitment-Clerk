import {
  FormatDetectionService,
  FileFormat,
  EncodingInfo,
  FormatValidationResult,
} from './format-detection';
import {
  ResumeParserException,
  ResumeParserErrorCode,
} from '@ai-recruitment-clerk/shared-dtos';

describe('FormatDetectionService', () => {
  let service: FormatDetectionService;

  beforeEach(() => {
    service = new FormatDetectionService();
  });

  describe('detectFileType', () => {
    it('should detect PDF by magic number', () => {
      const pdfBuffer = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
      ]);

      const format = service.detectFileType(pdfBuffer, 'document.pdf');

      expect(format.mimeType).toBe('application/pdf');
      expect(format.extension).toBe('pdf');
      expect(format.isSupported).toBe(true);
      expect(format.confidence).toBeGreaterThan(0.9);
    });

    it('should detect DOCX by magic number', () => {
      const docxBuffer = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00,
      ]);

      const format = service.detectFileType(docxBuffer, 'document.docx');

      expect(format.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(format.extension).toBe('docx');
      expect(format.isSupported).toBe(true);
    });

    it('should detect DOC by magic number', () => {
      const docBuffer = Buffer.from([
        0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
      ]);

      const format = service.detectFileType(docBuffer, 'document.doc');

      expect(format.mimeType).toBe('application/msword');
      expect(format.extension).toBe('doc');
      expect(format.isSupported).toBe(true);
    });

    it('should detect HTML by content', () => {
      const htmlContent = '<!DOCTYPE html><html><body>Hello</body></html>';
      const buffer = Buffer.from(htmlContent);

      const format = service.detectFileType(buffer, 'page.html');

      expect(format.mimeType).toBe('text/html');
      expect(format.extension).toBe('html');
      expect(format.isSupported).toBe(true);
    });

    it('should detect plain text', () => {
      const textContent = 'This is a plain text resume';
      const buffer = Buffer.from(textContent);

      const format = service.detectFileType(buffer, 'resume.txt');

      expect(format.mimeType).toBe('text/plain');
      expect(format.extension).toBe('txt');
      expect(format.isSupported).toBe(true);
    });

    it('should detect file type by extension when magic number not found', () => {
      const unknownBuffer = Buffer.from('Some content');

      const format = service.detectFileType(unknownBuffer, 'document.pdf');

      expect(format.mimeType).toBe('application/pdf');
      expect(format.confidence).toBeLessThan(1.0);
    });

    it('should return unknown for unsupported formats', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

      const format = service.detectFileType(pngBuffer, 'image.png');

      expect(format.isSupported).toBe(false);
      expect(format.extension).toBe('unknown');
    });

    it('should handle buffer without filename', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);

      const format = service.detectFileType(pdfBuffer);

      expect(format.mimeType).toBe('application/pdf');
    });
  });

  describe('detectEncoding', () => {
    it('should detect UTF-8 BOM', () => {
      const buffer = Buffer.from([
        0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f,
      ]);

      const encoding = service.detectEncoding(buffer);

      expect(encoding.encoding).toBe('utf-8');
      expect(encoding.confidence).toBe(1.0);
      expect(encoding.isValid).toBe(true);
    });

    it('should detect UTF-16 BE BOM', () => {
      const buffer = Buffer.from([0xfe, 0xff, 0x00, 0x48]);

      const encoding = service.detectEncoding(buffer);

      expect(encoding.encoding).toBe('utf-16be');
      expect(encoding.confidence).toBe(1.0);
    });

    it('should detect UTF-16 LE BOM', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x48, 0x00]);

      const encoding = service.detectEncoding(buffer);

      expect(encoding.encoding).toBe('utf-16le');
      expect(encoding.confidence).toBe(1.0);
    });

    it('should detect valid UTF-8 without BOM', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');

      const encoding = service.detectEncoding(buffer);

      expect(encoding.encoding).toBe('utf-8');
      expect(encoding.confidence).toBe(0.9);
      expect(encoding.isValid).toBe(true);
    });

    it('should fallback to ASCII for non-UTF-8', () => {
      const buffer = Buffer.from([0x80, 0x81, 0x82, 0x83]);

      const encoding = service.detectEncoding(buffer);

      expect(encoding.encoding).toBe('ascii');
      expect(encoding.confidence).toBeLessThan(1.0);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from([]);

      const encoding = service.detectEncoding(buffer);

      expect(encoding.isValid).toBe(false);
      expect(encoding.confidence).toBe(0);
    });
  });

  describe('validateFormat', () => {
    it('should validate supported format', () => {
      const pdfBuffer = Buffer.concat([
        Buffer.from([0x25, 0x50, 0x44, 0x46]),
        Buffer.from('%PDF-1.4\n%%EOF'),
      ]);

      const result = service.validateFormat(
        pdfBuffer,
        'resume.pdf',
        'application/pdf',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.format).not.toBeNull();
    });

    it('should return error for unsupported format', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

      const result = service.validateFormat(
        pngBuffer,
        'image.png',
        'image/png',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported');
    });

    it('should return error for empty buffer', () => {
      const buffer = Buffer.from([]);

      const result = service.validateFormat(buffer, 'empty.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File buffer is empty');
    });

    it('should return error for file size exceeding limit', () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      largeBuffer[0] = 0x25;
      largeBuffer[1] = 0x50;
      largeBuffer[2] = 0x44;
      largeBuffer[3] = 0x46;

      const result = service.validateFormat(largeBuffer, 'large.pdf');

      expect(result.errors).toContain('File size exceeds 10MB limit');
    });

    it('should detect PDF corruption', () => {
      const corruptedPdf = Buffer.from('Not a PDF file');

      const result = service.validateFormat(corruptedPdf, 'corrupted.pdf');

      expect(result.errors).toContain('Invalid PDF header');
    });

    it('should warn about truncated PDF', () => {
      const truncatedPdf = Buffer.from([0x25, 0x50, 0x44, 0x46]);

      const result = service.validateFormat(truncatedPdf, 'truncated.pdf');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('truncated'))).toBe(true);
    });

    it('should warn about MIME type mismatch', () => {
      const htmlBuffer = Buffer.from('<!DOCTYPE html><html></html>');

      const result = service.validateFormat(
        htmlBuffer,
        'page.html',
        'application/pdf',
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('MIME'))).toBe(true);
    });

    it('should include format and encoding in result', () => {
      const pdfBuffer = Buffer.concat([
        Buffer.from([0x25, 0x50, 0x44, 0x46]),
        Buffer.from('%PDF-1.4\n%%EOF'),
      ]);

      const result = service.validateFormat(pdfBuffer, 'resume.pdf');

      expect(result.format).not.toBeNull();
      expect(result.encoding).not.toBeNull();
      expect(result.format?.mimeType).toBe('application/pdf');
    });
  });

  describe('isSupportedFormat', () => {
    it('should return true for supported MIME types', () => {
      expect(service.isSupportedFormat('application/pdf')).toBe(true);
      expect(service.isSupportedFormat('text/html')).toBe(true);
      expect(service.isSupportedFormat('text/plain')).toBe(true);
    });

    it('should return false for unsupported MIME types', () => {
      expect(service.isSupportedFormat('image/png')).toBe(false);
      expect(service.isSupportedFormat('application/zip')).toBe(false);
      expect(service.isSupportedFormat('video/mp4')).toBe(false);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = service.getSupportedFormats();

      expect(formats.length).toBeGreaterThan(0);
      expect(formats.some((f) => f.mimeType === 'application/pdf')).toBe(true);
      expect(formats.some((f) => f.mimeType === 'text/html')).toBe(true);
    });

    it('should mark all returned formats as supported', () => {
      const formats = service.getSupportedFormats();

      for (const format of formats) {
        expect(format.isSupported).toBe(true);
      }
    });
  });

  describe('assertSupportedFormat', () => {
    it('should not throw for supported format', () => {
      expect(() => {
        service.assertSupportedFormat('application/pdf');
      }).not.toThrow();
    });

    it('should throw ResumeParserException for unsupported format', () => {
      expect(() => {
        service.assertSupportedFormat('image/jpeg');
      }).toThrow(ResumeParserException);
    });

    it('should throw with UNSUPPORTED_FORMAT code', () => {
      try {
        service.assertSupportedFormat('video/mp4');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResumeParserException);
        if (error instanceof ResumeParserException) {
          expect(error.enhancedDetails.code).toBe(
            ResumeParserErrorCode.UNSUPPORTED_FORMAT,
          );
        }
      }
    });
  });

  describe('format edge cases', () => {
    it('should handle RTF format detection', () => {
      const rtfBuffer = Buffer.from([0x7b, 0x5c, 0x72, 0x74, 0x66]);

      const format = service.detectFileType(rtfBuffer, 'document.rtf');

      expect(format.mimeType).toBe('text/rtf');
    });

    it('should handle markdown files', () => {
      const mdContent = '# Resume\n\n## Experience';
      const buffer = Buffer.from(mdContent);

      const format = service.detectFileType(buffer, 'resume.md');

      expect(format.mimeType).toBe('text/markdown');
    });

    it('should handle XHTML format', () => {
      const xhtmlContent =
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"></html>';
      const buffer = Buffer.from(xhtmlContent);

      const format = service.detectFileType(buffer, 'resume.xhtml');

      expect(format.mimeType).toBe('text/html');
    });
  });
});
