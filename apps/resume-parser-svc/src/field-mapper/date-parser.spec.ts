import { DateParser } from './date-parser';
import type { ParsedDate, DateRange } from './date-parser';

describe('DateParser', () => {
  describe('parseDate', () => {
    describe('ISO 8601 formats', () => {
      it('should parse YYYY-MM-DD format', () => {
        const result = DateParser.parseDate('2020-05-15');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.original).toBe('2020-05-15');
        expect(result.confidence).toBe(1.0);
        expect(result.format).toBe('YYYY-MM-DD');
        expect(result.isPresent).toBe(false);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(4); // May is 0-indexed
        expect(result.date?.getDate()).toBe(15);
      });

      it('should parse YYYY-MM format', () => {
        const result = DateParser.parseDate('2020-05');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('YYYY-MM');
        expect(result.confidence).toBe(0.9);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(4);
      });

      it('should parse YYYY format', () => {
        const result = DateParser.parseDate('2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('YYYY');
        expect(result.confidence).toBe(0.8);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(0); // January
        expect(result.date?.getDate()).toBe(1);
      });
    });

    describe('US formats', () => {
      it('should parse MM/DD/YYYY format', () => {
        const result = DateParser.parseDate('05/15/2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('MM/DD/YYYY');
        expect(result.confidence).toBe(0.85);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(4);
        expect(result.date?.getDate()).toBe(15);
      });

      it('should parse MM/YYYY format', () => {
        const result = DateParser.parseDate('05/2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('MM/YYYY');
        expect(result.confidence).toBe(0.8);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(4);
      });

      it('should parse single digit month in MM/DD/YYYY', () => {
        const result = DateParser.parseDate('5/3/2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('MM/DD/YYYY');
        expect(result.date?.getMonth()).toBe(4);
        expect(result.date?.getDate()).toBe(3);
      });
    });

    describe('European formats', () => {
      it('should parse DD.MM.YYYY format', () => {
        const result = DateParser.parseDate('15.05.2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('DD.MM.YYYY');
        expect(result.confidence).toBe(0.85);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(4);
        expect(result.date?.getDate()).toBe(15);
      });

      it('should parse MM.YYYY format', () => {
        const result = DateParser.parseDate('05.2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('MM.YYYY');
        expect(result.confidence).toBe(0.8);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(4);
      });
    });

    describe('Text-based months', () => {
      it('should parse full month name with year', () => {
        const result = DateParser.parseDate('January 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Month YYYY');
        expect(result.confidence).toBe(0.9);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(0);
      });

      it('should parse abbreviated month name with year', () => {
        const result = DateParser.parseDate('Jan 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Month YYYY');
        expect(result.confidence).toBe(0.9);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(0);
      });

      it('should parse February', () => {
        const result = DateParser.parseDate('February 2020');
        expect(result.date?.getMonth()).toBe(1);
      });

      it('should parse March', () => {
        const result = DateParser.parseDate('March 2020');
        expect(result.date?.getMonth()).toBe(2);
      });

      it('should parse April', () => {
        const result = DateParser.parseDate('April 2020');
        expect(result.date?.getMonth()).toBe(3);
      });

      it('should parse May', () => {
        const result = DateParser.parseDate('May 2020');
        expect(result.date?.getMonth()).toBe(4);
      });

      it('should parse June', () => {
        const result = DateParser.parseDate('June 2020');
        expect(result.date?.getMonth()).toBe(5);
      });

      it('should parse July', () => {
        const result = DateParser.parseDate('July 2020');
        expect(result.date?.getMonth()).toBe(6);
      });

      it('should parse August', () => {
        const result = DateParser.parseDate('August 2020');
        expect(result.date?.getMonth()).toBe(7);
      });

      it('should parse September', () => {
        const result = DateParser.parseDate('September 2020');
        expect(result.date?.getMonth()).toBe(8);
      });

      it('should parse October', () => {
        const result = DateParser.parseDate('October 2020');
        expect(result.date?.getMonth()).toBe(9);
      });

      it('should parse November', () => {
        const result = DateParser.parseDate('November 2020');
        expect(result.date?.getMonth()).toBe(10);
      });

      it('should parse December', () => {
        const result = DateParser.parseDate('December 2020');
        expect(result.date?.getMonth()).toBe(11);
      });

      it('should parse Month DD, YYYY format', () => {
        const result = DateParser.parseDate('January 15, 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Month DD, YYYY');
        expect(result.confidence).toBe(0.95);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(0);
        expect(result.date?.getDate()).toBe(15);
      });

      it('should parse Month DD YYYY format without comma', () => {
        const result = DateParser.parseDate('January 15 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Month DD, YYYY');
        expect(result.date?.getDate()).toBe(15);
      });

      it('should parse Mon DD, YYYY format', () => {
        const result = DateParser.parseDate('Jan. 15, 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Mon DD, YYYY');
        expect(result.confidence).toBe(0.9);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(0);
        expect(result.date?.getDate()).toBe(15);
      });

      it('should parse abbreviated month without dot', () => {
        const result = DateParser.parseDate('Jan 15, 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Mon DD, YYYY');
        expect(result.date?.getDate()).toBe(15);
      });
    });

    describe('Quarter formats', () => {
      it('should parse Q# YYYY format', () => {
        const result = DateParser.parseDate('Q1 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Q# YYYY');
        expect(result.confidence).toBe(0.7);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(0); // Q1 = January
      });

      it('should parse Q2', () => {
        const result = DateParser.parseDate('Q2 2020');
        expect(result.date?.getMonth()).toBe(3); // Q2 = April
      });

      it('should parse Q3', () => {
        const result = DateParser.parseDate('Q3 2020');
        expect(result.date?.getMonth()).toBe(6); // Q3 = July
      });

      it('should parse Q4', () => {
        const result = DateParser.parseDate('Q4 2020');
        expect(result.date?.getMonth()).toBe(9); // Q4 = October
      });

      it('should parse YYYY Q# format', () => {
        const result = DateParser.parseDate('2020 Q2');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('YYYY Q#');
        expect(result.confidence).toBe(0.7);
        expect(result.date?.getFullYear()).toBe(2020);
        expect(result.date?.getMonth()).toBe(3);
      });
    });

    describe('Present keywords', () => {
      it('should recognize "present" keyword', () => {
        const result = DateParser.parseDate('present');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('present');
        expect(result.confidence).toBe(1.0);
        expect(result.isPresent).toBe(true);
      });

      it('should recognize "current" keyword', () => {
        const result = DateParser.parseDate('current');

        expect(result.isPresent).toBe(true);
        expect(result.format).toBe('present');
      });

      it('should recognize "now" keyword', () => {
        const result = DateParser.parseDate('now');

        expect(result.isPresent).toBe(true);
      });

      it('should recognize "ongoing" keyword', () => {
        const result = DateParser.parseDate('ongoing');

        expect(result.isPresent).toBe(true);
      });

      it('should recognize "today" keyword', () => {
        const result = DateParser.parseDate('today');

        expect(result.isPresent).toBe(true);
      });

      it('should recognize "till date" keyword', () => {
        const result = DateParser.parseDate('till date');

        expect(result.isPresent).toBe(true);
      });

      it('should recognize "till now" keyword', () => {
        const result = DateParser.parseDate('till now');

        expect(result.isPresent).toBe(true);
      });

      it('should recognize "continuing" keyword', () => {
        const result = DateParser.parseDate('continuing');

        expect(result.isPresent).toBe(true);
      });

      it('should handle mixed case present keywords', () => {
        const result = DateParser.parseDate('PreSenT');

        expect(result.isPresent).toBe(true);
      });
    });

    describe('Edge cases and invalid inputs', () => {
      it('should handle empty string', () => {
        const result = DateParser.parseDate('');

        expect(result.date).toBeNull();
        expect(result.confidence).toBe(0);
        expect(result.format).toBe('unknown');
        expect(result.isPresent).toBe(false);
      });

      it('should handle null input', () => {
        const result = DateParser.parseDate(null as unknown as string);

        expect(result.date).toBeNull();
        expect(result.confidence).toBe(0);
        expect(result.format).toBe('unknown');
      });

      it('should handle undefined input', () => {
        const result = DateParser.parseDate(undefined as unknown as string);

        expect(result.date).toBeNull();
        expect(result.confidence).toBe(0);
      });

      it('should handle non-string input', () => {
        const result = DateParser.parseDate(123 as unknown as string);

        expect(result.date).toBeNull();
        expect(result.confidence).toBe(0);
      });

      it('should handle whitespace-only string', () => {
        const result = DateParser.parseDate('   ');

        expect(result.date).toBeNull();
        expect(result.format).toBe('unparseable');
        expect(result.confidence).toBe(0);
      });

      it('should handle unparseable date string', () => {
        const result = DateParser.parseDate('not a date');

        expect(result.date).toBeNull();
        expect(result.format).toBe('unparseable');
        expect(result.confidence).toBe(0);
      });

      it('should use fallback for valid JavaScript dates', () => {
        const result = DateParser.parseDate('2020-05-15T00:00:00Z');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('fallback');
        expect(result.confidence).toBe(0.6);
      });

      it('should parse dates before 1950 (but isReasonableDate rejects them)', () => {
        const result = DateParser.parseDate('1900-01-01');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('YYYY-MM-DD');
        expect(DateParser.isReasonableDate(result)).toBe(false);
      });

      it('should parse dates far in the future (but isReasonableDate rejects them)', () => {
        const result = DateParser.parseDate('2100-01-01');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('YYYY-MM-DD');
        expect(DateParser.isReasonableDate(result)).toBe(false);
      });

      it('should reject non-ISO dates before 1950 in fallback', () => {
        const result = DateParser.parseDate('some random text from 1900');

        expect(result.date).toBeNull();
        expect(result.format).toBe('unparseable');
      });
    });

    describe('Case insensitivity', () => {
      it('should parse uppercase dates', () => {
        const result = DateParser.parseDate('JANUARY 2020');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.format).toBe('Month YYYY');
      });

      it('should parse mixed case dates', () => {
        const result = DateParser.parseDate('JaNuArY 2020');

        expect(result.date).toBeInstanceOf(Date);
      });
    });

    describe('Whitespace handling', () => {
      it('should trim leading whitespace', () => {
        const result = DateParser.parseDate('  2020-05-15');

        expect(result.date).toBeInstanceOf(Date);
        expect(result.original).toBe('  2020-05-15');
      });

      it('should trim trailing whitespace', () => {
        const result = DateParser.parseDate('2020-05-15  ');

        expect(result.date).toBeInstanceOf(Date);
      });

      it('should trim both leading and trailing whitespace', () => {
        const result = DateParser.parseDate('  January 2020  ');

        expect(result.date).toBeInstanceOf(Date);
      });
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration for dates in same year', () => {
      const start: ParsedDate = {
        date: new Date('2020-01-15'),
        original: '2020-01-15',
        confidence: 1,
        format: 'YYYY-MM-DD',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: new Date('2020-06-15'),
        original: '2020-06-15',
        confidence: 1,
        format: 'YYYY-MM-DD',
        isPresent: false,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.years).toBe(0);
      expect(result.months).toBe(5);
      expect(result.totalMonths).toBe(5);
    });

    it('should calculate duration across years', () => {
      const start: ParsedDate = {
        date: new Date('2018-06-15'),
        original: '2018-06',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: new Date('2020-03-15'),
        original: '2020-03',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.years).toBe(1);
      expect(result.months).toBe(9);
      expect(result.totalMonths).toBe(21);
    });

    it('should handle present end date', () => {
      const start: ParsedDate = {
        date: new Date('2019-01-01'),
        original: '2019-01',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: new Date(),
        original: 'present',
        confidence: 1,
        format: 'present',
        isPresent: true,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.totalMonths).toBeGreaterThan(0);
      expect(result.years).toBeGreaterThan(0);
    });

    it('should return zero duration for null start date', () => {
      const start: ParsedDate = {
        date: null,
        original: 'invalid',
        confidence: 0,
        format: 'unparseable',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: new Date('2020-01-01'),
        original: '2020-01',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.years).toBe(0);
      expect(result.months).toBe(0);
      expect(result.totalMonths).toBe(0);
    });

    it('should return zero duration for null end date (non-present)', () => {
      const start: ParsedDate = {
        date: new Date('2020-01-01'),
        original: '2020-01',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: null,
        original: 'invalid',
        confidence: 0,
        format: 'unparseable',
        isPresent: false,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.years).toBe(0);
      expect(result.months).toBe(0);
      expect(result.totalMonths).toBe(0);
    });

    it('should handle exact year durations', () => {
      const start: ParsedDate = {
        date: new Date('2018-05-15'),
        original: '2018-05',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: new Date('2020-05-15'),
        original: '2020-05',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.years).toBe(2);
      expect(result.months).toBe(0);
      expect(result.totalMonths).toBe(24);
    });

    it('should handle end before start (returns zero)', () => {
      const start: ParsedDate = {
        date: new Date('2020-06-15'),
        original: '2020-06',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };
      const end: ParsedDate = {
        date: new Date('2018-06-15'),
        original: '2018-06',
        confidence: 0.9,
        format: 'YYYY-MM',
        isPresent: false,
      };

      const result = DateParser.calculateDuration(start, end);

      expect(result.years).toBe(0);
      expect(result.months).toBe(0);
      expect(result.totalMonths).toBe(0);
    });
  });

  describe('createDateRange', () => {
    it('should create date range from valid strings', () => {
      const result = DateParser.createDateRange('2020-01-15', '2021-06-30');

      expect(result.start.date).toBeInstanceOf(Date);
      expect(result.end.date).toBeInstanceOf(Date);
      expect(result.start.original).toBe('2020-01-15');
      expect(result.end.original).toBe('2021-06-30');
      expect(result.duration.years).toBe(1);
      expect(result.duration.months).toBe(5);
      expect(result.duration.totalMonths).toBe(17);
    });

    it('should create date range with present end date', () => {
      const result = DateParser.createDateRange('2019-05-01', 'present');

      expect(result.start.date).toBeInstanceOf(Date);
      expect(result.end.isPresent).toBe(true);
      expect(result.duration.totalMonths).toBeGreaterThan(0);
    });

    it('should handle invalid start date', () => {
      const result = DateParser.createDateRange('invalid', '2021-06-30');

      expect(result.start.date).toBeNull();
      expect(result.end.date).toBeInstanceOf(Date);
      expect(result.duration.totalMonths).toBe(0);
    });

    it('should handle invalid end date', () => {
      const result = DateParser.createDateRange('2020-01-15', 'invalid');

      expect(result.start.date).toBeInstanceOf(Date);
      expect(result.end.date).toBeNull();
      expect(result.duration.totalMonths).toBe(0);
    });
  });

  describe('normalizeToISO', () => {
    it('should normalize ISO date to same format', () => {
      const result = DateParser.normalizeToISO('2020-05-15');

      expect(result).toBe('2020-05-15');
    });

    it('should normalize YYYY-MM to YYYY-MM-DD', () => {
      const result = DateParser.normalizeToISO('2020-05');

      expect(result).toBe('2020-05-01');
    });

    it('should normalize YYYY to YYYY-01-01', () => {
      const result = DateParser.normalizeToISO('2020');

      expect(result).toBe('2020-01-01');
    });

    it('should normalize US format to ISO', () => {
      const result = DateParser.normalizeToISO('05/15/2020');

      expect(result).toBe('2020-05-15');
    });

    it('should normalize European format to ISO', () => {
      const result = DateParser.normalizeToISO('15.05.2020');

      expect(result).toBe('2020-05-15');
    });

    it('should normalize month name to ISO', () => {
      const result = DateParser.normalizeToISO('January 2020');

      expect(result).toBe('2020-01-01');
    });

    it('should normalize month with day to ISO', () => {
      const result = DateParser.normalizeToISO('January 15, 2020');

      expect(result).toBe('2020-01-15');
    });

    it('should normalize quarter to ISO', () => {
      const result = DateParser.normalizeToISO('Q1 2020');

      expect(result).toBe('2020-01-01');
    });

    it('should return "present" for present dates', () => {
      const result = DateParser.normalizeToISO('present');

      expect(result).toBe('present');
    });

    it('should return empty string for unparseable dates', () => {
      const result = DateParser.normalizeToISO('not a date');

      expect(result).toBe('');
    });

    it('should handle empty string input', () => {
      const result = DateParser.normalizeToISO('');

      expect(result).toBe('');
    });

    it('should pad month and day with zeros', () => {
      const result = DateParser.normalizeToISO('2020-1-5');

      expect(result).toBe('2020-01-05');
    });
  });

  describe('checkDateRangeOverlap', () => {
    it('should detect overlapping ranges', () => {
      const range1: DateRange = {
        start: {
          date: new Date('2020-01-01'),
          original: '2020-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2020-06-30'),
          original: '2020-06',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 5, totalMonths: 5 },
      };
      const range2: DateRange = {
        start: {
          date: new Date('2020-05-01'),
          original: '2020-05',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2020-08-31'),
          original: '2020-08',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 3, totalMonths: 3 },
      };

      const result = DateParser.checkDateRangeOverlap(range1, range2);

      expect(result).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const range1: DateRange = {
        start: {
          date: new Date('2018-01-01'),
          original: '2018-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2019-12-31'),
          original: '2019-12',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 1, months: 11, totalMonths: 23 },
      };
      const range2: DateRange = {
        start: {
          date: new Date('2020-01-01'),
          original: '2020-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2021-12-31'),
          original: '2021-12',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 1, months: 11, totalMonths: 23 },
      };

      const result = DateParser.checkDateRangeOverlap(range1, range2);

      expect(result).toBe(false);
    });

    it('should handle present end date in range1', () => {
      const range1: DateRange = {
        start: {
          date: new Date('2020-01-01'),
          original: '2020-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date(),
          original: 'present',
          confidence: 1,
          format: 'present',
          isPresent: true,
        },
        duration: { years: 5, months: 0, totalMonths: 60 },
      };
      const range2: DateRange = {
        start: {
          date: new Date('2021-01-01'),
          original: '2021-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2021-06-30'),
          original: '2021-06',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 5, totalMonths: 5 },
      };

      const result = DateParser.checkDateRangeOverlap(range1, range2);

      expect(result).toBe(true);
    });

    it('should handle present end date in range2', () => {
      const range1: DateRange = {
        start: {
          date: new Date('2021-01-01'),
          original: '2021-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2021-06-30'),
          original: '2021-06',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 5, totalMonths: 5 },
      };
      const range2: DateRange = {
        start: {
          date: new Date('2020-01-01'),
          original: '2020-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date(),
          original: 'present',
          confidence: 1,
          format: 'present',
          isPresent: true,
        },
        duration: { years: 5, months: 0, totalMonths: 60 },
      };

      const result = DateParser.checkDateRangeOverlap(range1, range2);

      expect(result).toBe(true);
    });

    it('should handle adjacent ranges (not overlapping)', () => {
      const range1: DateRange = {
        start: {
          date: new Date('2020-01-01'),
          original: '2020-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2020-12-31'),
          original: '2020-12',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 11, totalMonths: 11 },
      };
      const range2: DateRange = {
        start: {
          date: new Date('2021-01-01'),
          original: '2021-01',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2021-12-31'),
          original: '2021-12',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 11, totalMonths: 11 },
      };

      const result = DateParser.checkDateRangeOverlap(range1, range2);

      expect(result).toBe(false); // Adjacent ranges are not overlapping (end date is not inclusive)
    });

    it('should return false for null dates', () => {
      const range1: DateRange = {
        start: {
          date: null,
          original: 'invalid',
          confidence: 0,
          format: 'unparseable',
          isPresent: false,
        },
        end: {
          date: new Date('2020-06-30'),
          original: '2020-06',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 0, totalMonths: 0 },
      };
      const range2: DateRange = {
        start: {
          date: new Date('2020-05-01'),
          original: '2020-05',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        end: {
          date: new Date('2020-08-31'),
          original: '2020-08',
          confidence: 0.9,
          format: 'YYYY-MM',
          isPresent: false,
        },
        duration: { years: 0, months: 3, totalMonths: 3 },
      };

      const result = DateParser.checkDateRangeOverlap(range1, range2);

      expect(result).toBe(false);
    });
  });

  describe('isReasonableDate', () => {
    it('should accept valid date in reasonable range', () => {
      const parsed: ParsedDate = {
        date: new Date('2020-05-15'),
        original: '2020-05-15',
        confidence: 1,
        format: 'YYYY-MM-DD',
        isPresent: false,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(true);
    });

    it('should accept date at lower boundary (1950)', () => {
      const parsed: ParsedDate = {
        date: new Date('1950-01-01'),
        original: '1950',
        confidence: 0.8,
        format: 'YYYY',
        isPresent: false,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(true);
    });

    it('should accept date at upper boundary (current year + 1)', () => {
      const nextYear = new Date().getFullYear() + 1;
      const parsed: ParsedDate = {
        date: new Date(`${nextYear}-01-01`),
        original: `${nextYear}`,
        confidence: 0.8,
        format: 'YYYY',
        isPresent: false,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(true);
    });

    it('should reject date before 1950', () => {
      const parsed: ParsedDate = {
        date: new Date('1949-12-31'),
        original: '1949',
        confidence: 0.8,
        format: 'YYYY',
        isPresent: false,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(false);
    });

    it('should reject date beyond current year + 1', () => {
      const futureYear = new Date().getFullYear() + 2;
      const parsed: ParsedDate = {
        date: new Date(`${futureYear}-01-01`),
        original: `${futureYear}`,
        confidence: 0.8,
        format: 'YYYY',
        isPresent: false,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(false);
    });

    it('should accept present dates', () => {
      const parsed: ParsedDate = {
        date: new Date(),
        original: 'present',
        confidence: 1,
        format: 'present',
        isPresent: true,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(true);
    });

    it('should reject null date with isPresent false', () => {
      const parsed: ParsedDate = {
        date: null,
        original: 'invalid',
        confidence: 0,
        format: 'unparseable',
        isPresent: false,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(false);
    });

    it('should accept present with null date', () => {
      const parsed: ParsedDate = {
        date: null,
        original: 'present',
        confidence: 1,
        format: 'present',
        isPresent: true,
      };

      const result = DateParser.isReasonableDate(parsed);

      expect(result).toBe(true);
    });
  });

  describe('getDateBounds', () => {
    it('should return earliest and latest dates from ranges', () => {
      const ranges: DateRange[] = [
        {
          start: {
            date: new Date('2020-01-01'),
            original: '2020-01',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          end: {
            date: new Date('2021-12-31'),
            original: '2021-12',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          duration: { years: 1, months: 11, totalMonths: 23 },
        },
        {
          start: {
            date: new Date('2018-06-01'),
            original: '2018-06',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          end: {
            date: new Date('2019-12-31'),
            original: '2019-12',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          duration: { years: 1, months: 6, totalMonths: 18 },
        },
      ];

      const result = DateParser.getDateBounds(ranges);

      expect(result.earliest).toEqual(new Date('2018-06-01'));
      expect(result.latest).toEqual(new Date('2021-12-31'));
    });

    it('should handle ranges with present end dates', () => {
      const ranges: DateRange[] = [
        {
          start: {
            date: new Date('2020-01-01'),
            original: '2020-01',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          end: {
            date: new Date(),
            original: 'present',
            confidence: 1,
            format: 'present',
            isPresent: true,
          },
          duration: { years: 5, months: 0, totalMonths: 60 },
        },
      ];

      const result = DateParser.getDateBounds(ranges);

      expect(result.earliest).toEqual(new Date('2020-01-01'));
      expect(result.latest).toBeInstanceOf(Date);
      expect(result.latest?.getTime()).toBeCloseTo(new Date().getTime(), -4); // Allow 10 second difference
    });

    it('should return null for both bounds when array is empty', () => {
      const result = DateParser.getDateBounds([]);

      expect(result.earliest).toBeNull();
      expect(result.latest).toBeNull();
    });

    it('should handle null start dates', () => {
      const ranges: DateRange[] = [
        {
          start: {
            date: null,
            original: 'invalid',
            confidence: 0,
            format: 'unparseable',
            isPresent: false,
          },
          end: {
            date: new Date('2021-12-31'),
            original: '2021-12',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          duration: { years: 0, months: 0, totalMonths: 0 },
        },
        {
          start: {
            date: new Date('2020-01-01'),
            original: '2020-01',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          end: {
            date: new Date('2021-12-31'),
            original: '2021-12',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          duration: { years: 1, months: 11, totalMonths: 23 },
        },
      ];

      const result = DateParser.getDateBounds(ranges);

      expect(result.earliest).toEqual(new Date('2020-01-01'));
      expect(result.latest).toEqual(new Date('2021-12-31'));
    });

    it('should handle null end dates', () => {
      const ranges: DateRange[] = [
        {
          start: {
            date: new Date('2020-01-01'),
            original: '2020-01',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          end: {
            date: null,
            original: 'invalid',
            confidence: 0,
            format: 'unparseable',
            isPresent: false,
          },
          duration: { years: 0, months: 0, totalMonths: 0 },
        },
        {
          start: {
            date: new Date('2019-01-01'),
            original: '2019-01',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          end: {
            date: new Date('2020-12-31'),
            original: '2020-12',
            confidence: 0.9,
            format: 'YYYY-MM',
            isPresent: false,
          },
          duration: { years: 1, months: 11, totalMonths: 23 },
        },
      ];

      const result = DateParser.getDateBounds(ranges);

      expect(result.earliest).toEqual(new Date('2019-01-01'));
      expect(result.latest).toEqual(new Date('2020-12-31'));
    });

    it('should return null for both bounds when all dates are null', () => {
      const ranges: DateRange[] = [
        {
          start: {
            date: null,
            original: 'invalid',
            confidence: 0,
            format: 'unparseable',
            isPresent: false,
          },
          end: {
            date: null,
            original: 'invalid',
            confidence: 0,
            format: 'unparseable',
            isPresent: false,
          },
          duration: { years: 0, months: 0, totalMonths: 0 },
        },
      ];

      const result = DateParser.getDateBounds(ranges);

      expect(result.earliest).toBeNull();
      expect(result.latest).toBeNull();
    });
  });
});
