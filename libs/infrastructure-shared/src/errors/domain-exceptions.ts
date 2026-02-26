// Domain-Specific Exceptions

/**
 * Defines the shape of the error context.
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Represents the resume parser exception.
 */
export class ResumeParserException extends Error {
  /**
   * Initializes a new instance of the Resume Parser Exception.
   * @param code - The code.
   * @param context - The context.
   */
  constructor(
    public readonly code: string,
    public readonly context?: ErrorContext,
  ) {
    super(`Resume parser error: ${code}`);
    this.name = 'ResumeParserException';
  }
}

/**
 * Represents the jd extractor exception.
 */
export class JDExtractorException extends Error {
  /**
   * Initializes a new instance of the JD Extractor Exception.
   * @param code - The code.
   * @param context - The context.
   */
  constructor(
    public readonly code: string,
    public readonly context?: ErrorContext,
  ) {
    super(`JD extractor error: ${code}`);
    this.name = 'JDExtractorException';
  }
}

/**
 * Represents the report generator exception.
 */
export class ReportGeneratorException extends Error {
  /**
   * Initializes a new instance of the Report Generator Exception.
   * @param code - The code.
   * @param context - The context.
   */
  constructor(
    public readonly code: string,
    public readonly context?: ErrorContext,
  ) {
    super(`Report generator error: ${code}`);
    this.name = 'ReportGeneratorException';
  }
}
