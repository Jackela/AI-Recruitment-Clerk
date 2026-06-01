import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  let pipe: DateFormatPipe;

  beforeEach(() => {
    pipe = new DateFormatPipe();
  });

  describe('transform', () => {
    it('should format Date object correctly', () => {
      const date = new Date(2024, 0, 15, 10, 30, 45);
      expect(pipe.transform(date, 'yyyy-MM-dd')).toBe('2024-01-15');
      expect(pipe.transform(date, 'yyyy-MM-dd HH:mm:ss')).toBe(
        '2024-01-15 10:30:45',
      );
    });

    it('should format string date correctly', () => {
      expect(pipe.transform('2024-03-10', 'yyyy-MM-dd')).toBe('2024-03-10');
      expect(pipe.transform('2024-12-25T14:30:00', 'yyyy-MM-dd HH:mm')).toBe(
        '2024-12-25 14:30',
      );
    });

    it('should format timestamp number correctly', () => {
      const timestamp = new Date(2024, 0, 15).getTime();
      expect(pipe.transform(timestamp, 'yyyy-MM-dd')).toBe('2024-01-15');
    });

    it('should return empty string for null/undefined', () => {
      expect(pipe.transform(null)).toBe('');
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for invalid dates', () => {
      expect(pipe.transform('invalid-date')).toBe('');
      expect(pipe.transform(NaN)).toBe('');
    });
  });
});
