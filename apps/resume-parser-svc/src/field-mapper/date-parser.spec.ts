import { DateParser } from './date-parser';

describe('DateParser', () => {
  it('parses ISO formatted dates with high confidence', () => {
    const parsed = DateParser.parseDate('2024-05-10');

    expect(parsed.format).toBe('YYYY-MM-DD');
    expect(parsed.confidence).toBeGreaterThan(0.9);
    expect(parsed.date?.getUTCFullYear()).toBe(2024);
    expect(parsed.date?.getUTCMonth()).toBe(4);
    expect(parsed.isPresent).toBe(false);
  });

  it('detects present keywords and normalizes to ISO', () => {
    const present = DateParser.parseDate('Present role');
    expect(present.isPresent).toBe(true);
    expect(present.format).toBe('present');

    const normalized = DateParser.normalizeToISO('May 5, 2021');
    expect(normalized).toBe('2021-05-05');
  });

  it('calculates durations and ranges', () => {
    const start = DateParser.parseDate('2020-01-01');
    const end = DateParser.parseDate('2021-06-01');
    const duration = DateParser.calculateDuration(start, end);

    expect(duration.totalMonths).toBe(17);
    expect(duration.years).toBe(1);
    expect(duration.months).toBe(5);

    const range = DateParser.createDateRange('2020-01-01', '2020-04-01');
    expect(range.duration.totalMonths).toBe(3);
  });

  it('determines overlaps and reasonable dates', () => {
    const first = DateParser.createDateRange('2020-01-01', '2020-06-01');
    const second = DateParser.createDateRange('2020-05-01', '2020-12-01');
    const third = DateParser.createDateRange('2021-01-01', '2021-03-01');

    expect(DateParser.checkDateRangeOverlap(first, second)).toBe(true);
    expect(DateParser.checkDateRangeOverlap(first, third)).toBe(false);

    const reasonable = DateParser.parseDate('1999-01-01');
    const unreasonable = DateParser.parseDate('1940-01-01');

    expect(DateParser.isReasonableDate(reasonable)).toBe(true);
    expect(DateParser.isReasonableDate(unreasonable)).toBe(false);
  });
});
