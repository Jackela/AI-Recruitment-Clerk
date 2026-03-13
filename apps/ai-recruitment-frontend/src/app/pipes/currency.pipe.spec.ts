import { CurrencyPipe } from './currency.pipe';

describe('CurrencyPipe', () => {
  let pipe: CurrencyPipe;

  beforeEach(() => {
    pipe = new CurrencyPipe();
  });

  describe('transform', () => {
    it('should format number with default USD currency', () => {
      expect(pipe.transform(1234.56)).toBe('$1,234.56');
      expect(pipe.transform(100)).toBe('$100.00');
    });

    it('should format number with different currencies', () => {
      expect(pipe.transform(100, 'EUR')).toBe('€100.00');
      expect(pipe.transform(100, 'GBP')).toBe('£100.00');
      expect(pipe.transform(100, 'JPY')).toBe('¥100.00');
    });

    it('should format string numbers correctly', () => {
      expect(pipe.transform('999.99')).toBe('$999.99');
      expect(pipe.transform('5000')).toBe('$5,000.00');
    });

    it('should handle custom decimal places', () => {
      expect(pipe.transform(1234.5678, 'USD', 4)).toBe('$1,234.5678');
      expect(pipe.transform(1234.5, 'USD', 0)).toBe('$1,235');
    });

    it('should return empty string for null/undefined', () => {
      expect(pipe.transform(null)).toBe('');
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for NaN', () => {
      expect(pipe.transform('not-a-number')).toBe('');
    });
  });
});
