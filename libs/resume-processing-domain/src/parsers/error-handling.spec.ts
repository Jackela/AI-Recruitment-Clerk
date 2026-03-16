import {
  PdfResumeParser,
  DocxResumeParser,
  HtmlResumeParser,
  PlainTextResumeParser,
  ResumeParserFactory,
} from '../parsers/resume-parser';
import { FormatDetectionService } from '../detection/format-detection';
import {
  ResumeParserException,
  ResumeParserErrorCode,
} from '@ai-recruitment-clerk/shared-dtos';

describe('Error Handling for Corrupted Files', () => {
  let pdfParser: PdfResumeParser;
  let docxParser: DocxResumeParser;
  let htmlParser: HtmlResumeParser;
  let textParser: PlainTextResumeParser;
  let formatService: FormatDetectionService;

  beforeEach(() => {
    pdfParser = new PdfResumeParser();
    docxParser = new DocxResumeParser();
    htmlParser = new HtmlResumeParser();
    textParser = new PlainTextResumeParser();
    formatService = new FormatDetectionService();
  });

  describe('PDF Corruption Handling', () => {
    it('should handle completely empty PDF file', async () => {
      const emptyBuffer = Buffer.from([]);

      const result = await pdfParser.parse(emptyBuffer, 'empty.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle PDF with invalid header', async () => {
      const invalidHeader = Buffer.from('This is not a PDF file');

      const result = await pdfParser.parse(invalidHeader, 'invalid.pdf');

      expect(result.success).toBe(false);
    });

    it('should handle PDF with truncated content', async () => {
      const truncatedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n');

      const result = await pdfParser.parse(truncatedPdf, 'truncated.pdf');

      expect(result.success).toBe(false);
    });

    it('should handle PDF with corrupted binary content', async () => {
      const corruptedPdf = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(100, 0xff),
      ]);

      const result = await pdfParser.parse(corruptedPdf, 'corrupted.pdf');

      expect(result.success).toBe(false);
    });

    it('should handle PDF with null bytes only', async () => {
      const nullPdf = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(50, 0x00),
      ]);

      const result = await pdfParser.parse(nullPdf, 'nullbytes.pdf');

      expect(result.success).toBe(false);
    });

    it('should provide parsing time even on failure', async () => {
      const corruptedPdf = Buffer.from('Not a PDF');

      const result = await pdfParser.parse(corruptedPdf, 'failed.pdf');

      expect(result.success).toBe(false);
      expect(result.parsingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DOCX Corruption Handling', () => {
    it('should handle empty DOCX file', async () => {
      const emptyBuffer = Buffer.from([]);

      const result = await docxParser.parse(emptyBuffer, 'empty.docx');

      expect(result.success).toBe(false);
    });

    it('should handle DOCX with invalid ZIP structure', async () => {
      const invalidDocx = Buffer.from('PK\x03\x04Invalid content here');

      const result = await docxParser.parse(invalidDocx, 'invalid.docx');

      expect(result.success).toBe(false);
    });

    it('should handle DOCX with missing document.xml', async () => {
      const minimalZip = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
      ]);

      const result = await docxParser.parse(minimalZip, 'incomplete.docx');

      expect(result.success).toBe(false);
    });

    it('should handle DOCX with corrupted XML', async () => {
      const corruptedXml = `<?xml version="1.0"?>
<invalid><unclosed>`;
      const buffer = Buffer.from(corruptedXml);

      const result = await docxParser.parse(buffer, 'corrupted.docx');

      expect(result.success).toBe(false);
    });

    it('should handle very small DOCX files', async () => {
      const tinyBuffer = Buffer.from([0x50, 0x4b]);

      const result = await docxParser.parse(tinyBuffer, 'tiny.docx');

      expect(result.success).toBe(false);
    });
  });

  describe('HTML Corruption Handling', () => {
    it('should handle empty HTML file', async () => {
      const emptyBuffer = Buffer.from([]);

      const result = await htmlParser.parse(emptyBuffer, 'empty.html');

      expect(result.success).toBe(false);
    });

    it('should handle HTML without any tags', async () => {
      const noTags = Buffer.from('Just plain text without HTML');

      const result = await htmlParser.parse(noTags, 'notags.html');

      expect(result.success).toBe(false);
    });

    it('should handle malformed HTML', async () => {
      const malformed = Buffer.from('<html><body><unclosed');

      const result = await htmlParser.parse(malformed, 'malformed.html');

      expect(result.success).toBe(true);
    });

    it('should handle HTML with script injection attempts', async () => {
      const maliciousHtml = Buffer.from(`<!DOCTYPE html>
<html>
<script>alert('xss')</script>
<body>Name</body>
</html>`);

      const result = await htmlParser.parse(maliciousHtml, 'malicious.html');

      expect(result.success).toBe(true);
    });

    it('should handle HTML with extremely long content', async () => {
      const longContent =
        '<html><body>' + 'A'.repeat(100000) + '</body></html>';
      const buffer = Buffer.from(longContent);

      const result = await htmlParser.parse(buffer, 'long.html');

      expect(result.success).toBe(true);
    });
  });

  describe('Plain Text Corruption Handling', () => {
    it('should handle empty text file', async () => {
      const emptyBuffer = Buffer.from([]);

      const result = await textParser.parse(emptyBuffer, 'empty.txt');

      expect(result.success).toBe(false);
    });

    it('should handle text file with only whitespace', async () => {
      const whitespaceOnly = Buffer.from('   \n\t\n   ');

      const result = await textParser.parse(whitespaceOnly, 'whitespace.txt');

      expect(result.success).toBe(false);
    });

    it('should handle text with null bytes', async () => {
      const withNulls = Buffer.from('Hello\x00World\x00Test');

      const result = await textParser.parse(withNulls, 'nulls.txt');

      expect(result.success).toBe(false);
    });

    it('should handle binary data in text file', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);

      const result = await textParser.parse(binaryContent, 'binary.txt');

      expect(result.success).toBe(false);
    });
  });

  describe('Format Detection Error Handling', () => {
    it('should handle empty buffer in format detection', () => {
      const emptyBuffer = Buffer.from([]);

      const format = formatService.detectFileType(emptyBuffer);

      expect(format.confidence).toBeLessThan(0.5);
    });

    it('should handle null bytes in format detection', () => {
      const nullBuffer = Buffer.alloc(100, 0x00);

      const format = formatService.detectFileType(nullBuffer, 'file.unknown');

      expect(format.extension).toBe('unknown');
    });

    it('should provide warnings for suspicious files', () => {
      const suspiciousPdf = Buffer.from('%PDF-1.4\n');

      const result = formatService.validateFormat(
        suspiciousPdf,
        'suspicious.pdf',
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Error Handling', () => {
    it('should throw exception for null mime type', () => {
      expect(() => {
        ResumeParserFactory.getParser('');
      }).toThrow(ResumeParserException);
    });

    it('should throw exception for undefined mime type', () => {
      expect(() => {
        ResumeParserFactory.getParser('undefined/unknown');
      }).toThrow(ResumeParserException);
    });

    it('should include error code in thrown exception', () => {
      try {
        ResumeParserFactory.getParser('application/octet-stream');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResumeParserException);
        if (error instanceof ResumeParserException) {
          expect(error.enhancedDetails.code).toBe(
            ResumeParserErrorCode.UNSUPPORTED_FORMAT,
          );
          expect(error.enhancedDetails.type).toBeDefined();
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle filename with no extension', async () => {
      const content = Buffer.from('Some content');

      const result = await pdfParser.parse(content, 'resume');

      expect(result.success).toBe(false);
    });

    it('should handle very long filename', async () => {
      const content = Buffer.from('%PDF-1.4\nTest');
      const longName = 'a'.repeat(200) + '.pdf';

      const result = await pdfParser.parse(content, longName);

      expect(result.success).toBe(true);
    });

    it('should handle filename with special characters', async () => {
      const content = Buffer.from('%PDF-1.4\nTest');
      const specialName = 'résumé (2023) [final].pdf';

      const result = await pdfParser.parse(content, specialName);

      expect(result.success).toBe(true);
    });

    it('should handle multiple concurrent parsing failures', async () => {
      const corruptedFiles = [
        { buffer: Buffer.from([]), name: 'empty.pdf' },
        { buffer: Buffer.from('Not PDF'), name: 'fake.pdf' },
        { buffer: Buffer.alloc(10, 0xff), name: 'garbage.pdf' },
      ];

      const results = await Promise.all(
        corruptedFiles.map((f) => pdfParser.parse(f.buffer, f.name)),
      );

      results.forEach((result) => {
        expect(result.success).toBe(false);
      });
    });
  });
});
