import { FileValidationPipe } from './pipes/file-validation.pipe';

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  beforeEach(() => {
    pipe = new FileValidationPipe();
  });

  describe('transform', () => {
    it('should validate PDF file', () => {
      const file = {
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = pipe.transform(file, { type: 'body' });

      expect(result).toEqual(file);
    });

    it('should reject non-PDF file', () => {
      const file = {
        originalname: 'resume.docx',
        mimetype: 'application/docx',
        size: 1024,
      };

      expect(() => pipe.transform(file, { type: 'body' })).toThrow();
    });

    it('should reject oversized file', () => {
      const file = {
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 20 * 1024 * 1024,
      };

      expect(() => pipe.transform(file, { type: 'body' })).toThrow();
    });
  });
});
