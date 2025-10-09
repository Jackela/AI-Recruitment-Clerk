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
    public readonly context: string
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
export function Requires(condition: (...args: any[]) => boolean, message: string) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      if (!condition.apply(this, args)) {
        throw new ContractViolationError(
          message, 
          'PRE', 
          `${_target.constructor.name}.${propertyKey}`
        );
      }
      return await originalMethod.apply(this, args);
    };
    
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
export function Ensures(condition: (result: any) => boolean, message: string) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      if (!condition(result)) {
        throw new ContractViolationError(
          message, 
          'POST', 
          `${_target.constructor.name}.${propertyKey}`
        );
      }
      
      return result;
    };
    
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
export function Invariant(condition: (instance: any) => boolean, message: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        this.checkInvariant();
      }
      
      public checkInvariant() {
        if (!condition(this)) {
          throw new ContractViolationError(
            message, 
            'INV', 
            constructor.name
          );
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
  export function isValidEmail(email: any): boolean {
    return typeof email === 'string' && 
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Validates non-empty string
   * 
   * @function isNonEmptyString
   * @param {any} value - Value to validate
   * @returns {boolean} True if non-empty string
   * 
   * @example
   * ```typescript
   * @Requires(id => ContractValidators.isNonEmptyString(id), 'ID must be non-empty string')
   * ```
   * 
   * @since 1.0.0
   */
  export function isNonEmptyString(value: any): boolean {
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
  export function isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return typeof size === 'number' && size > 0 && size <= maxSize;
  }

  /**
   * Validates PDF file type
   * 
   * @function isPdfFile
   * @param {any} file - File object to validate
   * @returns {boolean} True if PDF file
   * 
   * @since 1.0.0
   */
  export function isPdfFile(file: any): boolean {
    return !!(file && 
           file.mimetype === 'application/pdf' &&
           file.originalname &&
           file.originalname.toLowerCase().endsWith('.pdf'));
  }

  /**
   * Validates array has elements
   * 
   * @function hasElements
   * @param {any} array - Array to validate
   * @returns {boolean} True if array has elements
   * 
   * @since 1.0.0
   */
  export function hasElements(array: any): boolean {
    return Array.isArray(array) && array.length > 0;
  }

  /**
   * Validates job description object
   * 
   * @function isValidJD
   * @param {any} jd - Job description to validate
   * @returns {boolean} True if valid JD structure
   * 
   * @example
   * ```typescript
   * @Requires(jd => ContractValidators.isValidJD(jd), 'JD must be valid')
   * ```
   * 
   * @since 1.0.0
   */
  export function isValidJD(jd: any): boolean {
    return !!(jd && 
      Array.isArray(jd.requiredSkills) && jd.requiredSkills.length > 0 &&
      jd.experienceYears && 
      typeof jd.experienceYears.min === 'number' &&
      typeof jd.experienceYears.max === 'number' &&
      jd.experienceYears.min >= 0 && jd.experienceYears.max >= jd.experienceYears.min &&
      ['bachelor', 'master', 'phd', 'any'].includes(jd.educationLevel) &&
      ['junior', 'mid', 'senior', 'lead', 'executive'].includes(jd.seniority));
  }

  /**
   * Validates resume object
   * 
   * @function isValidResume
   * @param {any} resume - Resume to validate
   * @returns {boolean} True if valid resume structure
   * 
   * @example
   * ```typescript
   * @Requires(resume => ContractValidators.isValidResume(resume), 'Resume must be valid')
   * ```
   * 
   * @since 1.0.0
   */
  export function isValidResume(resume: any): boolean {
    return !!(resume && 
      Array.isArray(resume.skills) && resume.skills.length > 0 &&
      Array.isArray(resume.workExperience) &&
      resume.education &&
      isNonEmptyString(resume.contactInfo?.name));
  }

  /**
   * Validates score range (0-100)
   * 
   * @function isValidScoreRange
   * @param {number} score - Score to validate
   * @returns {boolean} True if score is between 0-100
   * 
   * @example
   * ```typescript
   * @Ensures(result => ContractValidators.isValidScoreRange(result.overallScore), 'Score must be 0-100')
   * ```
   * 
   * @since 1.0.0
   */
  export function isValidScoreRange(score: any): boolean {
    return typeof score === 'number' && score >= 0 && score <= 100;
  }

  /**
   * Validates score DTO structure
   * 
   * @function isValidScoreDTO
   * @param {any} scoreDto - Score DTO to validate
   * @returns {boolean} True if valid score DTO
   * 
   * @example
   * ```typescript
   * @Ensures(result => ContractValidators.isValidScoreDTO(result), 'Must return valid score DTO')
   * ```
   * 
   * @since 1.0.0
   */
  export function isValidScoreDTO(scoreDto: any): boolean {
    return !!(scoreDto &&
      isValidScoreRange(scoreDto.overallScore) &&
      scoreDto.skillScore &&
      isValidScoreRange(scoreDto.skillScore.score) &&
      isNonEmptyString(scoreDto.skillScore.details) &&
      scoreDto.experienceScore &&
      isValidScoreRange(scoreDto.experienceScore.score) &&
      scoreDto.educationScore &&
      isValidScoreRange(scoreDto.educationScore.score));
  }

  /**
   * Validates experience years range
   * 
   * @function isValidExperienceRange
   * @param {any} experienceYears - Experience years object
   * @returns {boolean} True if valid experience range
   * 
   * @since 1.0.0
   */
  export function isValidExperienceRange(experienceYears: any): boolean {
    return !!(experienceYears &&
      typeof experienceYears.min === 'number' &&
      typeof experienceYears.max === 'number' &&
      experienceYears.min >= 0 &&
      experienceYears.max >= experienceYears.min &&
      experienceYears.max <= 50); // 合理上限
  }

  /**
   * Validates candidate information for report generation
   * 
   * @function isValidCandidateInfo
   * @param {any} candidateInfo - Candidate information object
   * @returns {boolean} True if valid candidate info
   * 
   * @since 1.0.0
   */
  export function isValidCandidateInfo(candidateInfo: any): boolean {
    return !!(candidateInfo &&
      isNonEmptyString(candidateInfo.candidateName) &&
      candidateInfo.personalInfo &&
      isValidEmail(candidateInfo.personalInfo.email) &&
      Array.isArray(candidateInfo.workExperience) &&
      Array.isArray(candidateInfo.skills) && candidateInfo.skills.length > 0);
  }

  /**
   * Validates report generation result
   * 
   * @function isValidReportResult
   * @param {any} reportResult - Report generation result
   * @returns {boolean} True if valid report result
   * 
   * @since 1.0.0
   */
  export function isValidReportResult(reportResult: any): boolean {
    return !!(reportResult &&
      isNonEmptyString(reportResult.reportId) &&
      isNonEmptyString(reportResult.pdfUrl) &&
      reportResult.generatedAt instanceof Date &&
      typeof reportResult.pageCount === 'number' &&
      reportResult.pageCount > 0);
  }

  /**
   * Validates job information for report generation
   * 
   * @function isValidJobInfo
   * @param {any} jobInfo - Job information object
   * @returns {boolean} True if valid job info
   * 
   * @since 1.0.0
   */
  export function isValidJobInfo(jobInfo: any): boolean {
    return !!(jobInfo &&
      isNonEmptyString(jobInfo.title) &&
      isNonEmptyString(jobInfo.description) &&
      jobInfo.requirements &&
      Array.isArray(jobInfo.requirements.requiredSkills) &&
      jobInfo.requirements.requiredSkills.length > 0);
  }

  /**
   * Validates extraction result structure
   * 
   * @function isValidExtractionResult
   * @param {any} extractionResult - JD extraction result
   * @returns {boolean} True if valid extraction result
   * 
   * @since 1.0.0
   */
  export function isValidExtractionResult(extractionResult: any): boolean {
    return !!(extractionResult &&
      hasElements(extractionResult.requiredSkills) &&
      isNonEmptyString(extractionResult.jobTitle) &&
      extractionResult.confidence >= 0.0 && extractionResult.confidence <= 1.0 &&
      isValidExperienceRange(extractionResult.experienceYears));
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
  export function isValidProcessingTime(processingTime: number, maxTime = 30000): boolean {
    return typeof processingTime === 'number' && 
           processingTime > 0 && 
           processingTime <= maxTime;
  }

  /**
   * Validates confidence level is within 0-1 range
   * 
   * @function isValidConfidenceLevel
   * @param {number} confidence - Confidence level
   * @returns {boolean} True if confidence is valid
   * 
   * @since 1.0.0
   */
  export function isValidConfidenceLevel(confidence: any): boolean {
    return typeof confidence === 'number' && 
           confidence >= 0.0 && 
           confidence <= 1.0;
  }
}

/**
 * Test utilities for contract validation
 * 
 * @namespace ContractTestUtils
 * @since 1.0.0
 */
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
    expectedMessage?: string
  ): void {
    let error: Error | null = null;
    
    try {
      fn();
    } catch (e) {
      error = e as Error;
    }
    
    if (!(error instanceof ContractViolationError)) {
      throw new Error(`Expected ContractViolationError, got ${error?.constructor.name || 'no error'}`);
    }
    
    if (error.type !== expectedType) {
      throw new Error(`Expected violation type ${expectedType}, got ${error.type}`);
    }
    
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected message to contain "${expectedMessage}", got "${error.message}"`);
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
    expectedMessage?: string
  ): Promise<void> {
    let error: Error | null = null;
    
    try {
      await fn();
    } catch (e) {
      error = e as Error;
    }
    
    if (!(error instanceof ContractViolationError)) {
      throw new Error(`Expected ContractViolationError, got ${error?.constructor.name || 'no error'}`);
    }
    
    if (error.type !== expectedType) {
      throw new Error(`Expected violation type ${expectedType}, got ${error.type}`);
    }
    
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected message to contain "${expectedMessage}", got "${error.message}"`);
    }
  }
}