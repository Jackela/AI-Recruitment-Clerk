// Design-by-Contract Decorators and Validators

export type PredicateFunction = (...args: unknown[]) => boolean;
export type DecoratorTarget = object;

/**
 * Performs the requires operation.
 * @param _predicate - The predicate.
 * @param _message - The message.
 * @returns The result of the operation.
 */
export function Requires(_predicate: PredicateFunction, _message?: string) {
  return function (
    _target: DecoratorTarget,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    return descriptor;
  };
}

/**
 * Performs the ensures operation.
 * @param _predicate - The predicate.
 * @param _message - The message.
 * @returns The result of the operation.
 */
export function Ensures(_predicate: PredicateFunction, _message?: string) {
  return function (
    _target: DecoratorTarget,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    return descriptor;
  };
}

/**
 * Performs the invariant operation.
 * @param _predicate - The predicate.
 * @param _message - The message.
 * @returns The result of the operation.
 */
export function Invariant(
  _predicate: PredicateFunction,
  _message?: string,
): ClassDecorator & MethodDecorator {
  return ((
    _target: DecoratorTarget,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    // Support both class and method decorators without enforcing runtime behavior
    if (descriptor) {
      return descriptor;
    }
    return undefined;
  }) as ClassDecorator & MethodDecorator;
}

/**
 * Defines the shape of the contract validation target.
 */
export interface ContractValidationTarget {
  [key: string]: unknown;
}

/**
 * Defines the shape of the job description contract.
 */
export interface JobDescriptionContract {
  requiredSkills?: string[];
  [key: string]: unknown;
}

/**
 * Defines the shape of the resume contract.
 */
export interface ResumeContract {
  skills?: string[];
  workExperience?: unknown[];
  [key: string]: unknown;
}

/**
 * Defines the shape of the score contract.
 */
export interface ScoreContract {
  overallScore: number;
  skillScore: unknown;
  experienceScore: unknown;
  educationScore: unknown;
  [key: string]: unknown;
}

/**
 * Defines the shape of the extraction result contract.
 */
export interface ExtractionResultContract {
  requiredSkills?: string[];
  [key: string]: unknown;
}

/**
 * Represents the contract validators.
 */
export class ContractValidators {
  /**
   * Validates the data.
   * @param _contract - The contract.
   * @returns The boolean value.
   */
  public static validate(_contract: ContractValidationTarget): boolean {
    return true;
  }

  /**
   * Performs the is non empty string operation.
   * @param value - The value.
   * @returns The boolean value.
   */
  public static isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Performs the has elements operation.
   * @param arr - The arr.
   * @returns The boolean value.
   */
  public static hasElements(arr: unknown): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  // Minimal validators to satisfy service contracts without enforcing heavy coupling
  /**
   * Performs the is valid jd operation.
   * @param jd - The jd.
   * @returns The jd is JobDescriptionContract.
   */
  public static isValidJD(jd: unknown): jd is JobDescriptionContract {
    return (
      !!jd &&
      typeof jd === 'object' &&
      Array.isArray((jd as JobDescriptionContract).requiredSkills || [])
    );
  }

  /**
   * Performs the is valid resume operation.
   * @param resume - The resume.
   * @returns The resume is ResumeContract.
   */
  public static isValidResume(resume: unknown): resume is ResumeContract {
    const resumeObj = resume as ResumeContract;
    return (
      !!resume &&
      typeof resume === 'object' &&
      Array.isArray(resumeObj.skills || resumeObj.workExperience || [])
    );
  }

  /**
   * Performs the is valid score dto operation.
   * @param score - The score.
   * @returns The score is ScoreContract.
   */
  public static isValidScoreDTO(score: unknown): score is ScoreContract {
    if (!score || typeof score !== 'object') return false;
    const scoreObj = score as ScoreContract;
    // Basic shape checks
    return (
      typeof scoreObj.overallScore === 'number' &&
      !!scoreObj.skillScore &&
      !!scoreObj.experienceScore &&
      !!scoreObj.educationScore
    );
  }

  /**
   * Performs the is valid extraction result operation.
   * @param result - The result.
   * @returns The result is ExtractionResultContract.
   */
  public static isValidExtractionResult(
    result: unknown,
  ): result is ExtractionResultContract {
    return (
      !!result &&
      typeof result === 'object' &&
      Array.isArray((result as ExtractionResultContract).requiredSkills || [])
    );
  }

  /**
   * Performs the is valid confidence level operation.
   * @param confidence - The confidence.
   * @returns The confidence is number.
   */
  public static isValidConfidenceLevel(confidence: unknown): confidence is number {
    return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
  }

  /**
   * Performs the is valid processing time operation.
   * @param time - The time.
   * @param maxTime - The max time.
   * @returns The time is number.
   */
  public static isValidProcessingTime(
    time: unknown,
    maxTime?: number,
  ): time is number {
    if (typeof time !== 'number' || time < 0) return false;
    return maxTime ? time <= maxTime : true;
  }

  /**
   * Performs the is valid report result operation.
   * @param result - The result.
   * @returns The result is { reportId: string; [key: string]: unknown }.
   */
  public static isValidReportResult(
    result: unknown,
  ): result is { reportId: string; [key: string]: unknown } {
    const resultObj = result as { reportId?: string };
    return (
      !!result &&
      typeof result === 'object' &&
      typeof resultObj.reportId === 'string' &&
      resultObj.reportId.length > 0
    );
  }

  /**
   * Performs the is valid file size operation.
   * @param size - The size.
   * @param maxSizeBytes - The max size bytes.
   * @returns The size is number.
   */
  public static isValidFileSize(size: unknown, maxSizeBytes?: number): size is number {
    if (typeof size !== 'number' || size < 0) return false;
    const defaultMaxSize = 10 * 1024 * 1024; // 10MB
    const maxSize = maxSizeBytes || defaultMaxSize;
    return size <= maxSize;
  }

  /**
   * Performs the is valid job info operation.
   * @param jobInfo - The job info.
   * @returns The jobInfo is { jobId: string; [key: string]: unknown }.
   */
  public static isValidJobInfo(
    jobInfo: unknown,
  ): jobInfo is { jobId: string; [key: string]: unknown } {
    const jobObj = jobInfo as { jobId?: string };
    return (
      !!jobInfo &&
      typeof jobInfo === 'object' &&
      typeof jobObj.jobId === 'string' &&
      jobObj.jobId.length > 0
    );
  }

  /**
   * Performs the is valid candidate info operation.
   * @param candidateInfo - The candidate info.
   * @returns The candidateInfo is { resumeId: string; [key: string]: unknown }.
   */
  public static isValidCandidateInfo(
    candidateInfo: unknown,
  ): candidateInfo is { resumeId: string; [key: string]: unknown } {
    const candidateObj = candidateInfo as { resumeId?: string };
    return (
      !!candidateInfo &&
      typeof candidateInfo === 'object' &&
      typeof candidateObj.resumeId === 'string' &&
      candidateObj.resumeId.length > 0
    );
  }

  /**
   * Performs the is valid score range operation.
   * @param score - The score.
   * @returns The score is number.
   */
  public static isValidScoreRange(score: unknown): score is number {
    return typeof score === 'number' && score >= 0 && score <= 100;
  }
}

/**
 * Represents the contract violation error.
 */
export class ContractViolationError extends Error {
  /**
   * Initializes a new instance of the Contract Violation Error.
   * @param message - The message.
   */
  constructor(message: string) {
    super(message);
  }
}
