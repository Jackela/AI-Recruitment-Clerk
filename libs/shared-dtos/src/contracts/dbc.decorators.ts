/**
 * @fileoverview Design by Contract implementation for AI Recruitment System
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module DBCDecorators
 */

/**
 * Contract violation error for pre/post conditions and invariants
 *
 * @class ContractViolationError
 * @extends {Error}
 *
 * @example
 * ```typescript
 * throw new ContractViolationError('Precondition failed: email must be valid', 'PRE', 'UserService.createUser');
 * ```
 *
 * @since 1.0.0
 */
export class ContractViolationError extends Error {
  /**
   * Creates contract violation error
   *
   * @constructor
   * @param {string} message - Error message describing the violation
   * @param {'PRE'|'POST'|'INV'} type - Type of contract violation
   * @param {string} context - Method or class context where violation occurred
   *
   * @throws {ContractViolationError}
   *
   * @since 1.0.0
   */
  constructor(
    message: string,
    public readonly type: 'PRE' | 'POST' | 'INV',
    public readonly context: string,
  ) {
    super(`[${type}] ${context}: ${message}`);
    this.name = 'ContractViolationError';
  }
}

/**
 * Precondition decorator - validates input conditions before method execution
 *
 * @decorator
 * @param {Function} condition - Function that returns boolean for condition check
 * @param {string} message - Error message if condition fails
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Requires(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Email must be valid')
 *   async createUser(email: string): Promise<User> {
 *     // Implementation
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */
export function Requires<Args extends unknown[]>(
  condition: (...args: Args) => boolean,
  message: string,
): <T>(
  _target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> {
  return function <T>(
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value as ((...args: unknown[]) => Promise<unknown>) | undefined;

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      if (!condition.apply(this, args as Args)) {
        throw new ContractViolationError(
          message,
          'PRE',
          `${(_target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`,
        );
      }
      return await originalMethod?.apply(this, args);
    } as T;

    return descriptor;
  };
}

/**
 * Postcondition decorator - validates output conditions after method execution
 *
 * @decorator
 * @param {Function} condition - Function that takes result and returns boolean
 * @param {string} message - Error message if condition fails
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Ensures(result => result.id && result.email, 'User must have id and email')
 *   async createUser(email: string): Promise<User> {
 *     // Implementation
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */
export function Ensures<TResult>(
  condition: (result: TResult) => boolean,
  message: string,
): <T>(
  _target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> {
  return function <T>(
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value as ((...args: unknown[]) => Promise<TResult>) | undefined;

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<TResult> {
      const result = (await originalMethod?.apply(this, args)) as TResult;

      if (!condition(result)) {
        throw new ContractViolationError(
          message,
          'POST',
          `${(_target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`,
        );
      }

      return result;
    } as T;

    return descriptor;
  };
}

/**
 * Class invariant decorator - validates object state consistency
 *
 * @decorator
 * @param {Function} condition - Function that validates instance state
 * @param {string} message - Error message if invariant fails
 *
 * @example
 * ```typescript
 * @Invariant(instance => instance.email && instance.id, 'User must always have email and id')
 * class User {
 *   constructor(public email: string, public id: string) {}
 * }
 * ```
 *
 * @since 1.0.0
 */
export function Invariant<TInstance extends object>(
  condition: (instance: TInstance) => boolean,
  message: string,
): <T extends { new (...args: unknown[]): object }>(constructor: T) => T {
  return function <T extends { new (...args: unknown[]): object }>(constructor: T): T {
    // TypeScript requires mixin class constructors to use 'any[]' type for rest parameters.
    // This is a known language design constraint for class mixins (TS2545).
    // @ts-expect-error - Mixin class constructor requires any[] per TypeScript spec
    return class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);
        this.checkInvariant();
      }

      public checkInvariant(): void {
        if (!condition(this as unknown as TInstance)) {
          throw new ContractViolationError(message, 'INV', constructor.name);
        }
      }
    };
  };
}

/**
 * Validation utilities for common contract conditions
 *
 * @namespace ContractValidators
 * @since 1.0.0
 */
/* eslint-disable @typescript-eslint/no-namespace */
export namespace ContractValidators {
  /**
   * Validates email format
   *
   * @function isValidEmail
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   *
   * @example
   * ```typescript
   * @Requires(email => ContractValidators.isValidEmail(email), 'Email must be valid')
   * ```
   *
   * @since 1.0.0
   */
  export function isValidEmail(email: unknown): boolean {
    return (
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
  }

  /**
   * Validates non-empty string
   *
   * @function isNonEmptyString
   * @param {unknown} value - Value to validate
   * @returns {boolean} True if non-empty string
   *
   * @example
   * ```typescript
   * @Requires(id => ContractValidators.isNonEmptyString(id), 'ID must be non-empty string')
   * ```
   *
   * @since 1.0.0
   */
  export function isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validates file size within limits
   *
   * @function isValidFileSize
   * @param {number} size - File size in bytes
   * @param {number} [maxSize=10485760] - Maximum size in bytes (default 10MB)
   * @returns {boolean} True if within size limits
   *
   * @since 1.0.0
   */
  export function isValidFileSize(
    size: number,
    maxSize: number = 10 * 1024 * 1024,
  ): boolean {
    return typeof size === 'number' && size > 0 && size <= maxSize;
  }

  /**
   * Validates PDF file type
   *
   * @function isPdfFile
   * @param {unknown} file - File object to validate
   * @returns {boolean} True if PDF file
   *
   * @since 1.0.0
   */
  export function isPdfFile(file: unknown): boolean {
    if (!file || typeof file !== 'object') {
      return false;
    }
    const obj = file as Record<string, unknown>;
    return !!(
      obj.mimetype === 'application/pdf' &&
      typeof obj.originalname === 'string' &&
      obj.originalname.toLowerCase().endsWith('.pdf')
    );
  }

  /**
   * Validates array has elements
   *
   * @function hasElements
   * @param {unknown} array - Array to validate
   * @returns {boolean} True if array has elements
   *
   * @since 1.0.0
   */
  export function hasElements(array: unknown): boolean {
    return Array.isArray(array) && array.length > 0;
  }

  /**
   * Validates job description object
   *
   * @function isValidJD
   * @param {unknown} jd - Job description to validate
   * @returns {boolean} True if valid JD structure
   *
   * @example
   * ```typescript
   * @Requires(jd => ContractValidators.isValidJD(jd), 'JD must be valid')
   * ```
   *
   * @since 1.0.0
   */
  export function isValidJD(jd: unknown): boolean {
    if (!jd || typeof jd !== 'object') {
      return false;
    }
    const obj = jd as Record<string, unknown>;
    const experienceYears = obj.experienceYears as Record<string, unknown> | undefined;

    if (!experienceYears) {
      return false;
    }

    const min = experienceYears.min;
    const max = experienceYears.max;

    return !!(
      Array.isArray(obj.requiredSkills) &&
      obj.requiredSkills.length > 0 &&
      typeof min === 'number' &&
      typeof max === 'number' &&
      min >= 0 &&
      max >= min &&
      ['bachelor', 'master', 'phd', 'any'].includes(obj.educationLevel as string) &&
      ['junior', 'mid', 'senior', 'lead', 'executive'].includes(obj.seniority as string)
    );
  }

  /**
   * Validates resume object
   *
   * @function isValidResume
   * @param {unknown} resume - Resume to validate
   * @returns {boolean} True if valid resume structure
   *
   * @example
   * ```typescript
   * @Requires(resume => ContractValidators.isValidResume(resume), 'Resume must be valid')
   * ```
   *
   * @since 1.0.0
   */
  export function isValidResume(resume: unknown): boolean {
    if (!resume || typeof resume !== 'object') {
      return false;
    }
    const obj = resume as Record<string, unknown>;
    return !!(
      Array.isArray(obj.skills) &&
      obj.skills.length > 0 &&
      Array.isArray(obj.workExperience) &&
      obj.education &&
      isNonEmptyString((obj.contactInfo as Record<string, unknown> | undefined)?.name)
    );
  }

  /**
   * Validates score range (0-100)
   *
   * @function isValidScoreRange
   * @param {unknown} score - Score to validate
   * @returns {boolean} True if score is between 0-100
   *
   * @example
   * ```typescript
   * @Ensures(result => ContractValidators.isValidScoreRange(result.overallScore), 'Score must be 0-100')
   * ```
   *
   * @since 1.0.0
   */
  export function isValidScoreRange(score: unknown): boolean {
    return typeof score === 'number' && score >= 0 && score <= 100;
  }

  /**
   * Validates score DTO structure
   *
   * @function isValidScoreDTO
   * @param {unknown} scoreDto - Score DTO to validate
   * @returns {boolean} True if valid score DTO
   *
   * @example
   * ```typescript
   * @Ensures(result => ContractValidators.isValidScoreDTO(result), 'Must return valid score DTO')
   * ```
   *
   * @since 1.0.0
   */
  export function isValidScoreDTO(scoreDto: unknown): boolean {
    if (!scoreDto || typeof scoreDto !== 'object') {
      return false;
    }
    const obj = scoreDto as Record<string, unknown>;
    const skillScore = obj.skillScore as Record<string, unknown> | undefined;
    const experienceScore = obj.experienceScore as Record<string, unknown> | undefined;
    const educationScore = obj.educationScore as Record<string, unknown> | undefined;

    return !!(
      isValidScoreRange(obj.overallScore) &&
      skillScore &&
      isValidScoreRange(skillScore.score) &&
      isNonEmptyString(skillScore.details) &&
      experienceScore &&
      isValidScoreRange(experienceScore.score) &&
      educationScore &&
      isValidScoreRange(educationScore.score)
    );
  }

  /**
   * Validates experience years range
   *
   * @function isValidExperienceRange
   * @param {unknown} experienceYears - Experience years object
   * @returns {boolean} True if valid experience range
   *
   * @since 1.0.0
   */
  export function isValidExperienceRange(experienceYears: unknown): boolean {
    if (!experienceYears || typeof experienceYears !== 'object') {
      return false;
    }
    const obj = experienceYears as Record<string, unknown>;
    return !!(
      typeof obj.min === 'number' &&
      typeof obj.max === 'number' &&
      obj.min >= 0 &&
      obj.max >= obj.min &&
      obj.max <= 50
    ); // 合理上限
  }

  /**
   * Validates candidate information for report generation
   *
   * @function isValidCandidateInfo
   * @param {unknown} candidateInfo - Candidate information object
   * @returns {boolean} True if valid candidate info
   *
   * @since 1.0.0
   */
  export function isValidCandidateInfo(candidateInfo: unknown): boolean {
    if (!candidateInfo || typeof candidateInfo !== 'object') {
      return false;
    }
    const obj = candidateInfo as Record<string, unknown>;
    const personalInfo = obj.personalInfo as Record<string, unknown> | undefined;

    return !!(
      isNonEmptyString(obj.candidateName) &&
      personalInfo &&
      isValidEmail(personalInfo.email) &&
      Array.isArray(obj.workExperience) &&
      Array.isArray(obj.skills) &&
      obj.skills.length > 0
    );
  }

  /**
   * Validates report generation result
   *
   * @function isValidReportResult
   * @param {unknown} reportResult - Report generation result
   * @returns {boolean} True if valid report result
   *
   * @since 1.0.0
   */
  export function isValidReportResult(reportResult: unknown): boolean {
    if (!reportResult || typeof reportResult !== 'object') {
      return false;
    }
    const obj = reportResult as Record<string, unknown>;

    return !!(
      isNonEmptyString(obj.reportId) &&
      isNonEmptyString(obj.pdfUrl) &&
      obj.generatedAt instanceof Date &&
      typeof obj.pageCount === 'number' &&
      obj.pageCount > 0
    );
  }

  /**
   * Validates job information for report generation
   *
   * @function isValidJobInfo
   * @param {unknown} jobInfo - Job information object
   * @returns {boolean} True if valid job info
   *
   * @since 1.0.0
   */
  export function isValidJobInfo(jobInfo: unknown): boolean {
    if (!jobInfo || typeof jobInfo !== 'object') {
      return false;
    }
    const obj = jobInfo as Record<string, unknown>;
    const requirements = obj.requirements as Record<string, unknown> | undefined;

    return !!(
      isNonEmptyString(obj.title) &&
      isNonEmptyString(obj.description) &&
      requirements &&
      Array.isArray(requirements.requiredSkills) &&
      requirements.requiredSkills.length > 0
    );
  }

  /**
   * Validates extraction result structure
   *
   * @function isValidExtractionResult
   * @param {unknown} extractionResult - JD extraction result
   * @returns {boolean} True if valid extraction result
   *
   * @since 1.0.0
   */
  export function isValidExtractionResult(extractionResult: unknown): boolean {
    if (!extractionResult || typeof extractionResult !== 'object') {
      return false;
    }
    const obj = extractionResult as Record<string, unknown>;

    return !!(
      hasElements(obj.requiredSkills) &&
      isNonEmptyString(obj.jobTitle) &&
      typeof obj.confidence === 'number' &&
      obj.confidence >= 0.0 &&
      obj.confidence <= 1.0 &&
      isValidExperienceRange(obj.experienceYears)
    );
  }

  /**
   * Validates processing time is within reasonable limits
   *
   * @function isValidProcessingTime
   * @param {number} processingTime - Time in milliseconds
   * @param {number} maxTime - Maximum allowed time in milliseconds
   * @returns {boolean} True if processing time is acceptable
   *
   * @since 1.0.0
   */
  export function isValidProcessingTime(
    processingTime: number,
    maxTime = 30000,
  ): boolean {
    return (
      typeof processingTime === 'number' &&
      processingTime > 0 &&
      processingTime <= maxTime
    );
  }

  /**
   * Validates confidence level is within 0-1 range
   *
   * @function isValidConfidenceLevel
   * @param {unknown} confidence - Confidence level
   * @returns {boolean} True if confidence is valid
   *
   * @since 1.0.0
   */
  export function isValidConfidenceLevel(confidence: unknown): boolean {
    return (
      typeof confidence === 'number' && confidence >= 0.0 && confidence <= 1.0
    );
  }
}

/**
 * Test utilities for contract validation
 *
 * @namespace ContractTestUtils
 * @since 1.0.0
 */
/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unsafe-function-type */
export namespace ContractTestUtils {
  /**
   * Expects a function to throw specific contract violation
   *
   * @function expectContractViolation
   * @param {Function} fn - Function to test
   * @param {'PRE'|'POST'|'INV'} expectedType - Expected violation type
   * @param {string} [expectedMessage] - Expected error message pattern
   *
   * @throws {Error} When assertion fails
   *
   * @example
   * ```typescript
   * ContractTestUtils.expectContractViolation(
   *   () => service.processData(null),
   *   'PRE',
   *   'Input must be valid'
   * );
   * ```
   *
   * @since 1.0.0
   */
  export function expectContractViolation(
    fn: Function,
    expectedType: 'PRE' | 'POST' | 'INV',
    expectedMessage?: string,
  ): void {
    let error: Error | null = null;

    try {
      fn();
    } catch (e) {
      error = e as Error;
    }

    if (!(error instanceof ContractViolationError)) {
      throw new Error(
        `Expected ContractViolationError, got ${error?.constructor.name || 'no error'}`,
      );
    }

    if (error.type !== expectedType) {
      throw new Error(
        `Expected violation type ${expectedType}, got ${error.type}`,
      );
    }

    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected message to contain "${expectedMessage}", got "${error.message}"`,
      );
    }
  }

  /**
   * Expects async function to throw contract violation
   *
   * @async
   * @function expectAsyncContractViolation
   * @param {Function} fn - Async function to test
   * @param {'PRE'|'POST'|'INV'} expectedType - Expected violation type
   * @param {string} [expectedMessage] - Expected error message pattern
   *
   * @returns {Promise<void>}
   * @throws {Error} When assertion fails
   *
   * @since 1.0.0
   */
  export async function expectAsyncContractViolation(
    fn: Function,
    expectedType: 'PRE' | 'POST' | 'INV',
    expectedMessage?: string,
  ): Promise<void> {
    let error: Error | null = null;

    try {
      await fn();
    } catch (e) {
      error = e as Error;
    }

    if (!(error instanceof ContractViolationError)) {
      throw new Error(
        `Expected ContractViolationError, got ${error?.constructor.name || 'no error'}`,
      );
    }

    if (error.type !== expectedType) {
      throw new Error(
        `Expected violation type ${expectedType}, got ${error.type}`,
      );
    }

    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected message to contain "${expectedMessage}", got "${error.message}"`,
      );
    }
  }
}
