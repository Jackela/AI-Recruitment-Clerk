import { HighlightPipe } from './highlight.pipe';

describe('HighlightPipe', () => {
  let pipe: HighlightPipe;

  beforeEach(() => {
    pipe = new HighlightPipe({} as never);
  });

  describe('transform', () => {
    it('should wrap matching search term in mark tags', () => {
      const text = 'Hello world, hello everyone';
      expect(pipe.transform(text, 'hello')).toBe(
        'Hello world, <mark class="highlight">hello</mark> everyone',
      );
    });

    it('should be case insensitive', () => {
      const text = 'Hello World';
      expect(pipe.transform(text, 'world')).toBe(
        'Hello <mark class="highlight">World</mark>',
      );
    });

    it('should use custom highlight class', () => {
      const text = 'Hello world';
      expect(pipe.transform(text, 'world', 'custom-highlight')).toBe(
        'Hello <mark class="custom-highlight">world</mark>',
      );
    });

    it('should handle special regex characters in search term', () => {
      const text = 'Price: $100.00 [test]';
      expect(pipe.transform(text, '$100')).toBe(
        'Price: <mark class="highlight">$100</mark>.00 [test]',
      );
    });

    it('should return original text when search term is empty', () => {
      const text = 'Hello world';
      expect(pipe.transform(text, '')).toBe('Hello world');
      expect(pipe.transform(text, null as never)).toBe('Hello world');
    });

    it('should return empty string when text is null/undefined', () => {
      expect(pipe.transform(null, 'test')).toBe('');
      expect(pipe.transform(undefined, 'test')).toBe('');
    });
  });
});
