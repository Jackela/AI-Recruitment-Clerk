/**
 * Date parsing and normalization utilities for resume processing
 */

export interface ParsedDate {
  date: Date | null;
  original: string;
  confidence: number;
  format: string;
  isPresent: boolean;
}

/**
 * Defines the shape of the date range.
 */
export interface DateRange {
  start: ParsedDate;
  end: ParsedDate;
  duration: {
    years: number;
    months: number;
    totalMonths: number;
  };
  overlap?: boolean;
}

/**
 * Represents the date parser.
 */
export class DateParser {
  private static readonly DATE_PATTERNS = [
    // ISO 8601 formats
    {
      pattern: /^(\d{4})-(\d{2})-(\d{2})$/,
      format: 'YYYY-MM-DD',
      confidence: 1.0,
    },
    { pattern: /^(\d{4})-(\d{2})$/, format: 'YYYY-MM', confidence: 0.9 },
    { pattern: /^(\d{4})$/, format: 'YYYY', confidence: 0.8 },

    // US formats
    {
      pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      format: 'MM/DD/YYYY',
      confidence: 0.85,
    },
    { pattern: /^(\d{1,2})\/(\d{4})$/, format: 'MM/YYYY', confidence: 0.8 },

    // European formats
    {
      pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      format: 'DD.MM.YYYY',
      confidence: 0.85,
    },
    { pattern: /^(\d{1,2})\.(\d{4})$/, format: 'MM.YYYY', confidence: 0.8 },

    // Text-based months
    {
      pattern: /^(jan|january)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(feb|february)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(mar|march)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(apr|april)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    { pattern: /^(may)\s+(\d{4})$/i, format: 'Month YYYY', confidence: 0.9 },
    {
      pattern: /^(jun|june)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(jul|july)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(aug|august)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(sep|september)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(oct|october)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(nov|november)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },
    {
      pattern: /^(dec|december)\s+(\d{4})$/i,
      format: 'Month YYYY',
      confidence: 0.9,
    },

    // Full month names with day
    {
      pattern:
        /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})$/i,
      format: 'Month DD, YYYY',
      confidence: 0.95,
    },

    // Abbreviated month names
    {
      pattern:
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2}),?\s+(\d{4})$/i,
      format: 'Mon DD, YYYY',
      confidence: 0.9,
    },

    // Quarter formats
    { pattern: /^q([1-4])\s+(\d{4})$/i, format: 'Q# YYYY', confidence: 0.7 },
    { pattern: /^(\d{4})\s*q([1-4])$/i, format: 'YYYY Q#', confidence: 0.7 },
  ];

  private static readonly MONTH_MAP: Record<string, number> = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12,
  };

  private static readonly PRESENT_KEYWORDS = [
    'present',
    'current',
    'now',
    'ongoing',
    'today',
    'till date',
    'till now',
    'continuing',
  ];

  /**
   * Parse a date string and return structured date information
   */
  public static parseDate(dateString: string): ParsedDate {
    if (!dateString || typeof dateString !== 'string') {
      return {
        date: null,
        original: dateString || '',
        confidence: 0,
        format: 'unknown',
        isPresent: false,
      };
    }

    const trimmed = dateString.trim().toLowerCase();

    // Check for "present" keywords
    if (this.PRESENT_KEYWORDS.some((keyword) => trimmed.includes(keyword))) {
      return {
        date: new Date(),
        original: dateString,
        confidence: 1.0,
        format: 'present',
        isPresent: true,
      };
    }

    // Try each pattern
    for (const { pattern, format, confidence } of this.DATE_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        const parsedDate = this.parseWithPattern(match, format);
        if (parsedDate) {
          return {
            date: parsedDate,
            original: dateString,
            confidence,
            format,
            isPresent: false,
          };
        }
      }
    }

    // Try JavaScript's native Date parsing as fallback
    const fallbackDate = new Date(dateString);
    if (
      !isNaN(fallbackDate.getTime()) &&
      fallbackDate.getFullYear() > 1950 &&
      fallbackDate.getFullYear() <= new Date().getFullYear() + 1
    ) {
      return {
        date: fallbackDate,
        original: dateString,
        confidence: 0.6,
        format: 'fallback',
        isPresent: false,
      };
    }

    return {
      date: null,
      original: dateString,
      confidence: 0,
      format: 'unparseable',
      isPresent: false,
    };
  }

  /**
   * Calculate duration between two dates
   */
  public static calculateDuration(
    startDate: ParsedDate,
    endDate: ParsedDate,
  ): DateRange['duration'] {
    const start = startDate.date;
    const end = endDate.isPresent ? new Date() : endDate.date;

    if (!start || !end) {
      return { years: 0, months: 0, totalMonths: 0 };
    }

    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();

    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    return {
      years: Math.max(0, years),
      months: Math.max(0, months),
      totalMonths: Math.max(0, totalMonths),
    };
  }

  /**
   * Create a date range from start and end date strings
   */
  public static createDateRange(startDateStr: string, endDateStr: string): DateRange {
    const start = this.parseDate(startDateStr);
    const end = this.parseDate(endDateStr);
    const duration = this.calculateDuration(start, end);

    return {
      start,
      end,
      duration,
    };
  }

  /**
   * Normalize a date to ISO 8601 format
   */
  public static normalizeToISO(dateString: string): string {
    const parsed = this.parseDate(dateString);

    if (parsed.isPresent) {
      return 'present';
    }

    if (!parsed.date) {
      return '';
    }

    // Return in YYYY-MM-DD format
    const year = parsed.date.getFullYear();
    const month = String(parsed.date.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Check if two date ranges overlap
   */
  public static checkDateRangeOverlap(range1: DateRange, range2: DateRange): boolean {
    const start1 = range1.start.date;
    const end1 = range1.end.isPresent ? new Date() : range1.end.date;
    const start2 = range2.start.date;
    const end2 = range2.end.isPresent ? new Date() : range2.end.date;

    if (!start1 || !end1 || !start2 || !end2) {
      return false;
    }

    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Validate if a date is reasonable for a resume
   */
  public static isReasonableDate(parsedDate: ParsedDate): boolean {
    if (!parsedDate.date && !parsedDate.isPresent) {
      return false;
    }

    if (parsedDate.isPresent) {
      return true;
    }

    if (!parsedDate.date) {
      return false;
    }

    const year = parsedDate.date.getFullYear();
    const currentYear = new Date().getFullYear();

    // Reasonable range: 1950 to current year + 1 (for future dates)
    return year >= 1950 && year <= currentYear + 1;
  }

  /**
   * Get the earliest and latest dates from a list of date ranges
   */
  public static getDateBounds(ranges: DateRange[]): {
    earliest: Date | null;
    latest: Date | null;
  } {
    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const range of ranges) {
      if (range.start.date) {
        if (!earliest || range.start.date < earliest) {
          earliest = range.start.date;
        }
      }

      const endDate = range.end.isPresent ? new Date() : range.end.date;
      if (endDate) {
        if (!latest || endDate > latest) {
          latest = endDate;
        }
      }
    }

    return { earliest, latest };
  }

  /**
   * Parse date with specific pattern
   */
  private static parseWithPattern(
    match: RegExpMatchArray,
    format: string,
  ): Date | null {
    try {
      switch (format) {
        case 'YYYY-MM-DD':
          return new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]),
          );

        case 'YYYY-MM':
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1);

        case 'YYYY':
          return new Date(parseInt(match[1]), 0, 1);

        case 'MM/DD/YYYY':
          return new Date(
            parseInt(match[3]),
            parseInt(match[1]) - 1,
            parseInt(match[2]),
          );

        case 'MM/YYYY':
          return new Date(parseInt(match[2]), parseInt(match[1]) - 1, 1);

        case 'DD.MM.YYYY':
          return new Date(
            parseInt(match[3]),
            parseInt(match[2]) - 1,
            parseInt(match[1]),
          );

        case 'MM.YYYY':
          return new Date(parseInt(match[2]), parseInt(match[1]) - 1, 1);

        case 'Month YYYY': {
          const monthName = match[1].toLowerCase();
          const monthNum = this.MONTH_MAP[monthName];
          if (monthNum) {
            return new Date(parseInt(match[2]), monthNum - 1, 1);
          }
          break;
        }

        case 'Month DD, YYYY': {
          const fullMonthName = match[1].toLowerCase();
          const fullMonthNum = this.MONTH_MAP[fullMonthName];
          if (fullMonthNum) {
            return new Date(
              parseInt(match[3]),
              fullMonthNum - 1,
              parseInt(match[2]),
            );
          }
          break;
        }

        case 'Mon DD, YYYY': {
          const abbrevMonth = match[1].toLowerCase();
          const abbrevMonthNum = this.MONTH_MAP[abbrevMonth];
          if (abbrevMonthNum) {
            return new Date(
              parseInt(match[3]),
              abbrevMonthNum - 1,
              parseInt(match[2]),
            );
          }
          break;
        }

        case 'Q# YYYY': {
          const quarter = parseInt(match[1]);
          const year = parseInt(match[2]);
          return new Date(year, (quarter - 1) * 3, 1);
        }

        case 'YYYY Q#': {
          const yearQ = parseInt(match[1]);
          const quarterQ = parseInt(match[2]);
          return new Date(yearQ, (quarterQ - 1) * 3, 1);
        }
      }
    } catch (_error) {
      // Parsing failed
    }

    return null;
  }
}
