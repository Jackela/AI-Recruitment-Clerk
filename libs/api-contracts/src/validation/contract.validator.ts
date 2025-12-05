/**
 * Contract Validation Utilities
 * Provides runtime and build-time validation for API contracts
 */

import type { ContractValidationResult } from '@ai-recruitment-clerk/shared-dtos';

// Use canonical type from shared-dtos, re-export for backwards compatibility
export type { ContractValidationResult as ValidationResult } from '@ai-recruitment-clerk/shared-dtos';

// Local type alias for internal use (same as exported ValidationResult)
type ValidationResult = ContractValidationResult;

/**
 * Defines the shape of the contract comparison result.
 */
export interface ContractComparisonResult {
  structureMatch: boolean;
  typeMatch: boolean;
  missingFields: string[];
  extraFields: string[];
  typeMismatches: Array<{
    field: string;
    expected: string;
    actual: string;
  }>;
}

// Enhanced type definitions for contract validation data
// Using flexible types that allow validation while maintaining type safety
/**
 * Defines the shape of the unknown job data.
 */
export interface UnknownJobData {
  id?: string | unknown;
  title?: string | unknown;
  status?: string | unknown;
  createdAt?: Date | unknown;
  resumeCount?: number | unknown;
  jdText?: string | unknown;
  [key: string]: unknown;
}

/**
 * Defines the shape of the unknown report data.
 */
export interface UnknownReportData {
  id?: string | unknown;
  candidateName?: string | unknown;
  matchScore?: number | unknown;
  oneSentenceSummary?: string | unknown;
  generatedAt?: Date | unknown;
  resumeId?: string | unknown;
  jobId?: string | unknown;
  strengths?: unknown[] | unknown;
  potentialGaps?: unknown[] | unknown;
  redFlags?: unknown[] | unknown;
  suggestedInterviewQuestions?: unknown[] | unknown;
  [key: string]: unknown;
}

/**
 * Defines the shape of the unknown validation data.
 */
export interface UnknownValidationData {
  type?: string | unknown;
  [key: string]: unknown;
}

export type ValidationDataInput =
  | UnknownJobData
  | UnknownReportData
  | UnknownValidationData
  | Record<string, unknown>;

/**
 * Runtime contract validator
 */
export class ContractValidator {
  /**
   * Validate job contract structure and types
   */
  static validateJobContract(
    data: UnknownJobData,
    contractType: 'JobBase' | 'JobDetail' | 'JobListItem',
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Base job validation
    if (!data.id || typeof data.id !== 'string') {
      errors.push('id must be a non-empty string');
    }
    if (!data.title || typeof data.title !== 'string') {
      errors.push('title must be a non-empty string');
    }
    if (
      !data.status ||
      typeof data.status !== 'string' ||
      !['draft', 'active', 'processing', 'completed', 'closed'].includes(
        data.status,
      )
    ) {
      errors.push(
        'status must be one of: draft, active, processing, completed, closed',
      );
    }
    if (!data.createdAt || !(data.createdAt instanceof Date)) {
      errors.push('createdAt must be a Date object');
    }
    if (typeof data.resumeCount !== 'number' || data.resumeCount < 0) {
      errors.push('resumeCount must be a non-negative number');
    }

    // JobDetail specific validation
    if (contractType === 'JobDetail') {
      if (!data.jdText || typeof data.jdText !== 'string') {
        errors.push('jdText must be a non-empty string for JobDetail');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      contractName: contractType,
    };
  }

  /**
   * Validate report contract structure and types
   */
  static validateReportContract(
    data: UnknownReportData,
    contractType: 'AnalysisReport' | 'ReportListItem',
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validation
    if (!data.id || typeof data.id !== 'string') {
      errors.push('id must be a non-empty string');
    }
    if (!data.candidateName || typeof data.candidateName !== 'string') {
      errors.push('candidateName must be a non-empty string');
    }
    if (
      typeof data.matchScore !== 'number' ||
      data.matchScore < 0 ||
      data.matchScore > 100
    ) {
      errors.push('matchScore must be a number between 0 and 100');
    }
    if (
      !data.oneSentenceSummary ||
      typeof data.oneSentenceSummary !== 'string'
    ) {
      errors.push('oneSentenceSummary must be a non-empty string');
    }
    if (!data.generatedAt || !(data.generatedAt instanceof Date)) {
      errors.push('generatedAt must be a Date object');
    }

    // AnalysisReport specific validation
    if (contractType === 'AnalysisReport') {
      if (!data.resumeId || typeof data.resumeId !== 'string') {
        errors.push('resumeId must be a non-empty string');
      }
      if (!data.jobId || typeof data.jobId !== 'string') {
        errors.push('jobId must be a non-empty string');
      }
      if (!Array.isArray(data.strengths)) {
        errors.push('strengths must be an array of strings');
      }
      if (!Array.isArray(data.potentialGaps)) {
        errors.push('potentialGaps must be an array of strings');
      }
      if (!Array.isArray(data.redFlags)) {
        errors.push('redFlags must be an array of strings');
      }
      if (!Array.isArray(data.suggestedInterviewQuestions)) {
        errors.push('suggestedInterviewQuestions must be an array of strings');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      contractName: contractType,
    };
  }

  /**
   * Compare frontend and backend contract structures
   */
  static compareContracts(
    frontendData: Record<string, unknown>,
    backendData: Record<string, unknown>,
    _contractName: string,
  ): ContractComparisonResult {
    const frontendKeys = new Set(Object.keys(frontendData));
    const backendKeys = new Set(Object.keys(backendData));

    const missingFields = [...backendKeys].filter(
      (key) => !frontendKeys.has(key),
    );
    const extraFields = [...frontendKeys].filter(
      (key) => !backendKeys.has(key),
    );
    const typeMismatches: Array<{
      field: string;
      expected: string;
      actual: string;
    }> = [];

    // Check type mismatches for common fields
    for (const key of frontendKeys) {
      if (backendKeys.has(key)) {
        const frontendType = typeof frontendData[key];
        const backendType = typeof backendData[key];
        if (frontendType !== backendType) {
          typeMismatches.push({
            field: key,
            expected: backendType,
            actual: frontendType,
          });
        }
      }
    }

    return {
      structureMatch: missingFields.length === 0 && extraFields.length === 0,
      typeMatch: typeMismatches.length === 0,
      missingFields,
      extraFields,
      typeMismatches,
    };
  }

  /**
   * Validate all contracts in a data object
   */
  static validateAllContracts(data: UnknownValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Add specific contract validations based on data type
    if (data.type === 'job') {
      results.push(this.validateJobContract(data, 'JobDetail'));
    } else if (data.type === 'report') {
      results.push(this.validateReportContract(data, 'AnalysisReport'));
    }

    return results;
  }
}
