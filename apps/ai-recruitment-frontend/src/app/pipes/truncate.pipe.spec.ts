import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  let pipe: TruncatePipe;

  beforeEach(() => {
    pipe = new TruncatePipe();
  });

  describe('transform', () => {
    it('should truncate text exceeding max length', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(pipe.transform(longText, 20)).toBe('This is a very long ...');
    });

    it('should not truncate text within max length', () => {
      const shortText = 'Short text';
      expect(pipe.transform(shortText, 50)).toBe('Short text');
    });

    it('should use custom suffix', () => {
      const text = 'This is a very long text';
      expect(pipe.transform(text, 10, '...')).toBe('This is a ...');
      expect(pipe.transform(text, 10, '→')).toBe('This is a →');
    });

    it('should handle null and undefined', () => {
      expect(pipe.transform(null)).toBe('');
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should use default values when not provided', () => {
      const text = 'a'.repeat(100);
      const result = pipe.transform(text);
      expect(result.length).toBe(53);
      expect(result.endsWith('...')).toBe(true);
    });
  });
});
