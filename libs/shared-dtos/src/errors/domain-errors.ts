/**
 * @fileoverview Domain-Specific Error Classes for All Microservices
 * @description Provides service-specific error types with enhanced context and recovery strategies.
 * Each microservice has its own set of error codes and exceptions for precise error handling.
 * @module errors/domain-errors
 *
 * @example
 * // Resume Parser error
 * throw new ResumeParserException(
 *   ResumeParserErrorCode.FILE_PARSE_FAILED,
 *   { fileName: 'resume.pdf', fileType: 'pdf' },
 *   { resumeId: 'resume-123', candidateId: 'candidate-456' }
 * );
 *
 * // Scoring Engine error
 * throw new ScoringEngineException(
 *   ScoringEngineErrorCode.INSUFFICIENT_DATA,
 *   { algorithm: 'weighted-average', confidenceLevel: 0.5 },
 *   { resumeId: 'resume-123', jobId: 'job-456' }
 * );
 */

import { HttpStatus } from '@nestjs/common';
import {
  EnhancedAppException,
  ExtendedErrorType,
} from './enhanced-error-types';
import { ErrorType } from '../common/error-handling.patterns';

/**
 * Base interface for error details across all domain errors.
 * Provides common fields for error tracking and debugging.
 *
 * @example
 * const details: DomainErrorDetails = {
 *   originalError: 'Connection refused',
 *   timestamp: '2024-02-28T10:30:00.000Z',
 *   customField: 'custom value'
 * };
 */
export interface DomainErrorDetails {
  /** Original error message if wrapping another error */
  originalError?: string;
  /** ISO 8601 timestamp when the error occurred */
  timestamp?: string;
  /** Additional service-specific details */
  [key: string]: unknown;
}

/**
 * Base interface for error context across all domain errors.
 * Provides request tracing and user identification for debugging.
 *
 * @example
 * const context: DomainErrorContext = {
 *   service: 'resume-parser-svc',
 *   component: 'pdf-parser',
 *   operation: 'extractText',
 *   requestId: 'req-123',
 *   userId: 'user-456'
 * };
 */
export interface DomainErrorContext {
  /** Service where the error originated */
  service?: string;
  /** Component within the service (e.g., 'pdf-parser', 'ocr-processor') */
  component?: string;
  /** Operation that was being performed (e.g., 'extractText', 'detectSkills') */
  operation?: string;
  /** Request or trace ID for correlation across services */
  requestId?: string;
  /** User ID if available from authenticated request */
  userId?: string;
  /** Additional context-specific properties */
  [key: string]: unknown;
}

/**
 * Resume Parser service-specific error details.
 * Contains file processing information for debugging parse failures.
 *
 * @example
 * const details: ResumeParserErrorDetails = {
 *   fileName: 'john_doe_resume.pdf',
 *   fileType: 'pdf',
 *   fileSize: 102400,
 *   parserType: 'pdf-text-extractor'
 * };
 */
export interface ResumeParserErrorDetails extends DomainErrorDetails {
  /** File name being processed */
  fileName?: string;
  /** File type/format (pdf, docx, txt, etc.) */
  fileType?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Parser type used (pdf-text, ocr, gemini, etc.) */
  parserType?: string;
}

/**
 * Resume Parser service-specific error context.
 * Contains identifiers for tracking resume processing operations.
 *
 * @example
 * const context: ResumeParserErrorContext = {
 *   resumeId: 'resume-123',
 *   candidateId: 'candidate-456',
 *   service: 'resume-parser-svc',
 *   operation: 'parseResume'
 * };
 */
export interface ResumeParserErrorContext extends DomainErrorContext {
  /** Resume ID if available */
  resumeId?: string;
  /** Candidate ID if available */
  candidateId?: string;
}

/**
 * Report Generator service-specific error details.
 * Contains report generation information for debugging.
 *
 * @example
 * const details: ReportGeneratorErrorDetails = {
 *   reportType: 'individual',
 *   templateName: 'standard-template',
 *   exportFormat: 'pdf'
 * };
 */
export interface ReportGeneratorErrorDetails extends DomainErrorDetails {
  /** Report type being generated (individual, comparison, batch, etc.) */
  reportType?: string;
  /** Template name used for generation */
  templateName?: string;
  /** Export format (pdf, excel, html, markdown, json) */
  exportFormat?: string;
}

/**
 * Report Generator service-specific error context.
 * Contains identifiers for tracking report generation operations.
 *
 * @example
 * const context: ReportGeneratorErrorContext = {
 *   reportId: 'report-789',
 *   jobId: 'job-456',
 *   service: 'report-generator-svc'
 * };
 */
export interface ReportGeneratorErrorContext extends DomainErrorContext {
  /** Report ID if available */
  reportId?: string;
  /** Job ID associated with report */
  jobId?: string;
}

/**
 * JD (Job Description) Extractor service-specific error details.
 * Contains job description processing information for debugging.
 *
 * @example
 * const details: JDExtractorErrorDetails = {
 *   source: 'linkedin',
 *   format: 'html'
 * };
 */
export interface JDExtractorErrorDetails extends DomainErrorDetails {
  /** Job description source (linkedin, indeed, manual, etc.) */
  source?: string;
  /** Format of the JD (html, text, pdf) */
  format?: string;
}

/**
 * JD Extractor service-specific error context.
 * Contains identifiers for tracking JD extraction operations.
 *
 * @example
 * const context: JDExtractorErrorContext = {
 *   jobId: 'job-456',
 *   companyId: 'company-789'
 * };
 */
export interface JDExtractorErrorContext extends DomainErrorContext {
  /** Job ID */
  jobId?: string;
  /** Company ID */
  companyId?: string;
}

/**
 * Scoring Engine service-specific error details.
 * Contains scoring algorithm information for debugging.
 *
 * @example
 * const details: ScoringEngineErrorDetails = {
 *   algorithm: 'weighted-average',
 *   modelName: 'skill-match-v2',
 *   confidenceLevel: 0.85
 * };
 */
export interface ScoringEngineErrorDetails extends DomainErrorDetails {
  /** Scoring algorithm used (weighted-average, ml-based, rule-based) */
  algorithm?: string;
  /** Model name if ML-based scoring */
  modelName?: string;
  /** Confidence level attempted (0-1) */
  confidenceLevel?: number;
}

/**
 * Scoring Engine service-specific error context.
 * Contains identifiers for tracking scoring operations.
 *
 * @example
 * const context: ScoringEngineContext = {
 *   resumeId: 'resume-123',
 *   jobId: 'job-456',
 *   scoreId: 'score-789'
 * };
 */
export interface ScoringEngineContext extends DomainErrorContext {
  /** Resume ID being scored */
  resumeId?: string;
  /** Job ID for matching */
  jobId?: string;
  /** Score ID if partially generated */
  scoreId?: string;
}

/**
 * App Gateway service-specific error details.
 * Contains API gateway request information for debugging.
 *
 * @example
 * const details: AppGatewayErrorDetails = {
 *   targetService: 'resume-parser-svc',
 *   method: 'POST',
 *   path: '/api/resumes/upload',
 *   statusCode: 503
 * };
 */
export interface AppGatewayErrorDetails extends DomainErrorDetails {
  /** Target service name */
  targetService?: string;
  /** HTTP method */
  method?: string;
  /** Endpoint path */
  path?: string;
  /** Response status code if available */
  statusCode?: number;
}

/**
 * App Gateway service-specific error context.
 * Contains identifiers for tracking gateway operations.
 *
 * @example
 * const context: AppGatewayErrorContext = {
 *   gatewayRequestId: 'gw-123',
 *   clientIp: '192.168.1.100'
 * };
 */
export interface AppGatewayErrorContext extends DomainErrorContext {
  /** Gateway request ID */
  gatewayRequestId?: string;
  /** Client IP address */
  clientIp?: string;
}

/**
 * Database-specific error details.
 * Contains database operation information for debugging.
 *
 * @example
 * const details: DatabaseErrorDetails = {
 *   operation: 'insert',
 *   table: 'resumes',
 *   query: 'INSERT INTO resumes...',
 *   dbErrorCode: 11000
 * };
 */
export interface DatabaseErrorDetails extends DomainErrorDetails {
  /** Database operation type (insert, update, delete, find) */
  operation?: string;
  /** Table or collection name */
  table?: string;
  /** Query that failed (sanitized for security) */
  query?: string;
  /** Error code from database (MongoDB error code, SQL state, etc.) */
  dbErrorCode?: string | number;
}

/**
 * Database-specific error context.
 * Contains database connection information for debugging.
 *
 * @example
 * const context: DatabaseErrorContext = {
 *   database: 'recruitment_db',
 *   poolInfo: '5/10 connections in use'
 * };
 */
export interface DatabaseErrorContext extends DomainErrorContext {
  /** Database name */
  database?: string;
  /** Connection pool info */
  poolInfo?: string;
}

/**
 * Resume Parser Service Error Codes.
 * Defines all possible error conditions during resume parsing operations.
 *
 * @example
 * if (parseFailed) {
 *   throw new ResumeParserException(
 *     ResumeParserErrorCode.FILE_PARSE_FAILED,
 *     { fileName: 'resume.pdf' }
 *   );
 * }
 */
export enum ResumeParserErrorCode {
  FILE_PARSE_FAILED = 'RESUME_PARSE_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FILE_FORMAT',
  FILE_TOO_LARGE = 'FILE_SIZE_EXCEEDED',
  CONTENT_EXTRACTION_FAILED = 'CONTENT_EXTRACTION_FAILED',
  SKILL_DETECTION_FAILED = 'SKILL_DETECTION_FAILED',
  PDF_CORRUPTION = 'PDF_CORRUPTION_DETECTED',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  RESUME_STRUCTURE_INVALID = 'RESUME_STRUCTURE_INVALID',
  PERSONAL_INFO_EXTRACTION_FAILED = 'PERSONAL_INFO_EXTRACTION_FAILED',
  WORK_EXPERIENCE_EXTRACTION_FAILED = 'WORK_EXPERIENCE_EXTRACTION_FAILED',
  EDUCATION_EXTRACTION_FAILED = 'EDUCATION_EXTRACTION_FAILED',
  GEMINI_PARSING_FAILED = 'GEMINI_PARSING_FAILED',
  GRIDFS_STORAGE_FAILED = 'GRIDFS_STORAGE_FAILED',
}

/**
 * Resume Parser Service Error Messages
 */
export const ResumeParserErrorMessages: Record<ResumeParserErrorCode, string> =
  {
    [ResumeParserErrorCode.FILE_PARSE_FAILED]: 'Failed to parse resume file',
    [ResumeParserErrorCode.UNSUPPORTED_FORMAT]:
      'Resume file format is not supported',
    [ResumeParserErrorCode.FILE_TOO_LARGE]:
      'Resume file size exceeds maximum limit',
    [ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED]:
      'Failed to extract text content from resume',
    [ResumeParserErrorCode.SKILL_DETECTION_FAILED]:
      'Failed to detect skills from resume content',
    [ResumeParserErrorCode.PDF_CORRUPTION]: 'PDF file appears to be corrupted',
    [ResumeParserErrorCode.OCR_PROCESSING_FAILED]:
      'OCR processing failed for scanned resume',
    [ResumeParserErrorCode.RESUME_STRUCTURE_INVALID]:
      'Resume structure is invalid or unrecognizable',
    [ResumeParserErrorCode.PERSONAL_INFO_EXTRACTION_FAILED]:
      'Failed to extract personal information',
    [ResumeParserErrorCode.WORK_EXPERIENCE_EXTRACTION_FAILED]:
      'Failed to extract work experience',
    [ResumeParserErrorCode.EDUCATION_EXTRACTION_FAILED]:
      'Failed to extract education information',
    [ResumeParserErrorCode.GEMINI_PARSING_FAILED]:
      'Gemini AI parsing service failed',
    [ResumeParserErrorCode.GRIDFS_STORAGE_FAILED]:
      'Failed to store resume in GridFS',
  };

/**
 * Resume Parser Service Exception.
 * Thrown when resume parsing operations fail due to file issues, format problems,
 * or extraction failures.
 *
 * @extends EnhancedAppException
 *
 * @example
 * // File parsing failure
 * throw new ResumeParserException(
 *   ResumeParserErrorCode.FILE_PARSE_FAILED,
 *   { fileName: 'resume.pdf', fileType: 'pdf', fileSize: 102400 },
 *   { resumeId: 'resume-123', candidateId: 'candidate-456' }
 * );
 *
 * @example
 * // Unsupported format
 * throw new ResumeParserException(
 *   ResumeParserErrorCode.UNSUPPORTED_FORMAT,
 *   { fileName: 'resume.xyz', fileType: 'xyz' }
 * );
 */
export class ResumeParserException extends EnhancedAppException {
  /**
   * Initializes a new instance of the Resume Parser Exception.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    code: ResumeParserErrorCode,
    details?: ResumeParserErrorDetails,
    context?: ResumeParserErrorContext,
  ) {
    super(
      ExtendedErrorType.PARSING_ERROR,
      code,
      ResumeParserErrorMessages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context,
    );

    this.withBusinessImpact('medium')
      .withUserImpact('moderate')
      .withRecoveryStrategies(this.getRecoveryStrategies(code))
      .withMonitoringTags({
        service: 'resume-parser',
        'error.code': code,
        component: 'resume-processing',
      });
  }

  private getRecoveryStrategies(code: ResumeParserErrorCode): string[] {
    switch (code) {
      case ResumeParserErrorCode.FILE_PARSE_FAILED:
        return [
          'Try alternative parser',
          'Check file integrity',
          'Request file resubmission',
        ];
      case ResumeParserErrorCode.UNSUPPORTED_FORMAT:
        return [
          'Convert file to supported format',
          'Use OCR for image-based files',
          'Request PDF version',
        ];
      case ResumeParserErrorCode.FILE_TOO_LARGE:
        return ['Compress file', 'Split into sections', 'Use cloud processing'];
      case ResumeParserErrorCode.OCR_PROCESSING_FAILED:
        return [
          'Improve image quality',
          'Try different OCR engine',
          'Manual transcription',
        ];
      case ResumeParserErrorCode.GEMINI_PARSING_FAILED:
        return [
          'Use fallback parser',
          'Retry with different prompt',
          'Process sections individually',
        ];
      default:
        return [
          'Retry operation',
          'Use alternative processing method',
          'Request technical support',
        ];
    }
  }
}

/**
 * Report Generator Service Error Codes.
 * Defines all possible error conditions during report generation operations.
 *
 * @example
 * if (templateNotFound) {
 *   throw new ReportGeneratorException(
 *     ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND,
 *     { templateName: 'custom-template' }
 *   );
 * }
 */
export enum ReportGeneratorErrorCode {
  REPORT_GENERATION_FAILED = 'REPORT_GENERATION_FAILED',
  TEMPLATE_NOT_FOUND = 'REPORT_TEMPLATE_NOT_FOUND',
  DATA_AGGREGATION_FAILED = 'DATA_AGGREGATION_FAILED',
  EXPORT_FORMAT_UNSUPPORTED = 'EXPORT_FORMAT_UNSUPPORTED',
  ANALYTICS_COMPUTATION_FAILED = 'ANALYTICS_COMPUTATION_FAILED',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  CHART_RENDERING_FAILED = 'CHART_RENDERING_FAILED',
  REPORT_STORAGE_FAILED = 'REPORT_STORAGE_FAILED',
  TEMPLATE_COMPILATION_FAILED = 'TEMPLATE_COMPILATION_FAILED',
  DATA_VALIDATION_FAILED = 'REPORT_DATA_VALIDATION_FAILED',
}

/**
 * Report Generator Service Exception.
 * Thrown when report generation operations fail due to template issues,
 * data aggregation problems, or export failures.
 *
 * @extends EnhancedAppException
 *
 * @example
 * // Template not found
 * throw new ReportGeneratorException(
 *   ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND,
 *   { templateName: 'executive-summary-v2' },
 *   { reportId: 'report-123', jobId: 'job-456' }
 * );
 *
 * @example
 * // PDF generation failure
 * throw new ReportGeneratorException(
 *   ReportGeneratorErrorCode.PDF_GENERATION_FAILED,
 *   { exportFormat: 'pdf' }
 * );
 */
export class ReportGeneratorException extends EnhancedAppException {
  /**
   * Initializes a new instance of the Report Generator Exception.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    code: ReportGeneratorErrorCode,
    details?: ReportGeneratorErrorDetails,
    context?: ReportGeneratorErrorContext,
  ) {
    const messages: Record<ReportGeneratorErrorCode, string> = {
      [ReportGeneratorErrorCode.REPORT_GENERATION_FAILED]:
        'Report generation process failed',
      [ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND]:
        'Report template not found',
      [ReportGeneratorErrorCode.DATA_AGGREGATION_FAILED]:
        'Failed to aggregate report data',
      [ReportGeneratorErrorCode.EXPORT_FORMAT_UNSUPPORTED]:
        'Export format is not supported',
      [ReportGeneratorErrorCode.ANALYTICS_COMPUTATION_FAILED]:
        'Analytics computation failed',
      [ReportGeneratorErrorCode.PDF_GENERATION_FAILED]:
        'PDF report generation failed',
      [ReportGeneratorErrorCode.CHART_RENDERING_FAILED]:
        'Chart rendering failed',
      [ReportGeneratorErrorCode.REPORT_STORAGE_FAILED]:
        'Failed to store generated report',
      [ReportGeneratorErrorCode.TEMPLATE_COMPILATION_FAILED]:
        'Report template compilation failed',
      [ReportGeneratorErrorCode.DATA_VALIDATION_FAILED]:
        'Report data validation failed',
    };

    super(
      ExtendedErrorType.REPORT_GENERATION_ERROR,
      code,
      messages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context,
    );

    this.withBusinessImpact('medium')
      .withUserImpact('moderate')
      .withRecoveryStrategies([
        'Use fallback template',
        'Regenerate with simplified data',
        'Use alternative export format',
        'Process data in smaller chunks',
      ])
      .withMonitoringTags({
        service: 'report-generator',
        'error.code': code,
        component: 'report-processing',
      });
  }
}

/**
 * JD (Job Description) Extractor Service Error Codes.
 * Defines all possible error conditions during job description extraction.
 *
 * @example
 * if (extractionFailed) {
 *   throw new JDExtractorException(
 *     JDExtractorErrorCode.JD_PARSE_FAILED,
 *     { source: 'linkedin' }
 *   );
 * }
 */
export enum JDExtractorErrorCode {
  JD_PARSE_FAILED = 'JD_PARSING_FAILED',
  REQUIREMENTS_EXTRACTION_FAILED = 'REQUIREMENTS_EXTRACTION_FAILED',
  SKILL_MAPPING_FAILED = 'SKILL_MAPPING_FAILED',
  COMPANY_INFO_EXTRACTION_FAILED = 'COMPANY_INFO_EXTRACTION_FAILED',
  JD_STRUCTURE_INVALID = 'JD_STRUCTURE_INVALID',
  GEMINI_EXTRACTION_FAILED = 'GEMINI_JD_EXTRACTION_FAILED',
  SALARY_EXTRACTION_FAILED = 'SALARY_EXTRACTION_FAILED',
  LOCATION_EXTRACTION_FAILED = 'LOCATION_EXTRACTION_FAILED',
  EXPERIENCE_LEVEL_EXTRACTION_FAILED = 'EXPERIENCE_LEVEL_EXTRACTION_FAILED',
}

/**
 * JD Extractor Service Exception.
 * Thrown when job description extraction operations fail due to parsing issues,
 * missing data, or AI service failures.
 *
 * @extends EnhancedAppException
 *
 * @example
 * // Parsing failure
 * throw new JDExtractorException(
 *   JDExtractorErrorCode.JD_PARSE_FAILED,
 *   { source: 'linkedin', format: 'html' },
 *   { jobId: 'job-456', companyId: 'company-789' }
 * );
 *
 * @example
 * // Skill mapping failure
 * throw new JDExtractorException(
 *   JDExtractorErrorCode.SKILL_MAPPING_FAILED,
 *   { source: 'manual' }
 * );
 */
export class JDExtractorException extends EnhancedAppException {
  /**
   * Initializes a new instance of the JD Extractor Exception.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    code: JDExtractorErrorCode,
    details?: JDExtractorErrorDetails,
    context?: JDExtractorErrorContext,
  ) {
    const messages: Record<JDExtractorErrorCode, string> = {
      [JDExtractorErrorCode.JD_PARSE_FAILED]: 'Job description parsing failed',
      [JDExtractorErrorCode.REQUIREMENTS_EXTRACTION_FAILED]:
        'Failed to extract job requirements',
      [JDExtractorErrorCode.SKILL_MAPPING_FAILED]:
        'Failed to map skills from job description',
      [JDExtractorErrorCode.COMPANY_INFO_EXTRACTION_FAILED]:
        'Failed to extract company information',
      [JDExtractorErrorCode.JD_STRUCTURE_INVALID]:
        'Job description structure is invalid',
      [JDExtractorErrorCode.GEMINI_EXTRACTION_FAILED]:
        'Gemini AI extraction service failed',
      [JDExtractorErrorCode.SALARY_EXTRACTION_FAILED]:
        'Failed to extract salary information',
      [JDExtractorErrorCode.LOCATION_EXTRACTION_FAILED]:
        'Failed to extract location information',
      [JDExtractorErrorCode.EXPERIENCE_LEVEL_EXTRACTION_FAILED]:
        'Failed to extract experience level requirements',
    };

    super(
      ExtendedErrorType.PARSING_ERROR,
      code,
      messages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context,
    );

    this.withBusinessImpact('medium')
      .withUserImpact('moderate')
      .withRecoveryStrategies([
        'Use alternative extraction method',
        'Parse with different AI model',
        'Use rule-based extraction',
        'Request manual review',
      ])
      .withMonitoringTags({
        service: 'jd-extractor',
        'error.code': code,
        component: 'jd-processing',
      });
  }
}

/**
 * Scoring Engine Service Error Codes.
 * Defines all possible error conditions during candidate scoring operations.
 *
 * @example
 * if (scoringFailed) {
 *   throw new ScoringEngineException(
 *     ScoringEngineErrorCode.SCORING_ALGORITHM_FAILED,
 *     { algorithm: 'weighted-average' }
 *   );
 * }
 */
export enum ScoringEngineErrorCode {
  SCORING_ALGORITHM_FAILED = 'SCORING_ALGORITHM_FAILED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_MATCHING_DATA',
  WEIGHT_CALCULATION_ERROR = 'SCORING_WEIGHT_ERROR',
  MODEL_PREDICTION_FAILED = 'ML_MODEL_PREDICTION_FAILED',
  SKILL_MATCHING_FAILED = 'SKILL_MATCHING_FAILED',
  EXPERIENCE_SCORING_FAILED = 'EXPERIENCE_SCORING_FAILED',
  EDUCATION_SCORING_FAILED = 'EDUCATION_SCORING_FAILED',
  OVERALL_SCORE_CALCULATION_FAILED = 'OVERALL_SCORE_CALCULATION_FAILED',
  CONFIDENCE_CALCULATION_FAILED = 'CONFIDENCE_CALCULATION_FAILED',
}

/**
 * Scoring Engine Service Exception.
 * Thrown when scoring operations fail due to algorithm errors,
 * insufficient data, or calculation failures.
 *
 * @extends EnhancedAppException
 *
 * @example
 * // Insufficient data for scoring
 * throw new ScoringEngineException(
 *   ScoringEngineErrorCode.INSUFFICIENT_DATA,
 *   { algorithm: 'ml-based', confidenceLevel: 0.5 },
 *   { resumeId: 'resume-123', jobId: 'job-456' }
 * );
 *
 * @example
 * // ML model prediction failure
 * throw new ScoringEngineException(
 *   ScoringEngineErrorCode.MODEL_PREDICTION_FAILED,
 *   { modelName: 'skill-match-v2' }
 * );
 */
export class ScoringEngineException extends EnhancedAppException {
  /**
   * Initializes a new instance of the Scoring Engine Exception.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    code: ScoringEngineErrorCode,
    details?: ScoringEngineErrorDetails,
    context?: ScoringEngineContext,
  ) {
    const messages: Record<ScoringEngineErrorCode, string> = {
      [ScoringEngineErrorCode.SCORING_ALGORITHM_FAILED]:
        'Scoring algorithm execution failed',
      [ScoringEngineErrorCode.INSUFFICIENT_DATA]:
        'Insufficient data for accurate scoring',
      [ScoringEngineErrorCode.WEIGHT_CALCULATION_ERROR]:
        'Error calculating scoring weights',
      [ScoringEngineErrorCode.MODEL_PREDICTION_FAILED]:
        'ML model prediction failed',
      [ScoringEngineErrorCode.SKILL_MATCHING_FAILED]:
        'Skill matching algorithm failed',
      [ScoringEngineErrorCode.EXPERIENCE_SCORING_FAILED]:
        'Experience scoring failed',
      [ScoringEngineErrorCode.EDUCATION_SCORING_FAILED]:
        'Education scoring failed',
      [ScoringEngineErrorCode.OVERALL_SCORE_CALCULATION_FAILED]:
        'Overall score calculation failed',
      [ScoringEngineErrorCode.CONFIDENCE_CALCULATION_FAILED]:
        'Confidence score calculation failed',
    };

    super(
      ExtendedErrorType.SCORING_ERROR,
      code,
      messages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context,
    );

    this.withBusinessImpact('high')
      .withUserImpact('moderate')
      .withRecoveryStrategies([
        'Use fallback scoring algorithm',
        'Apply rule-based scoring',
        'Use default weights',
        'Request additional data',
        'Generate partial scores',
      ])
      .withMonitoringTags({
        service: 'scoring-engine',
        'error.code': code,
        component: 'scoring-processing',
      });
  }
}

/**
 * App Gateway Service Error Codes.
 * Defines all possible error conditions at the API gateway level.
 *
 * @example
 * if (serviceUnavailable) {
 *   throw new AppGatewayException(
 *     AppGatewayErrorCode.SERVICE_UNAVAILABLE,
 *     { targetService: 'resume-parser-svc' }
 *   );
 * }
 */
export enum AppGatewayErrorCode {
  SERVICE_UNAVAILABLE = 'DOWNSTREAM_SERVICE_UNAVAILABLE',
  ROUTING_FAILED = 'REQUEST_ROUTING_FAILED',
  RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED = 'API_AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'API_AUTHORIZATION_FAILED',
  REQUEST_VALIDATION_FAILED = 'REQUEST_VALIDATION_FAILED',
  SERVICE_TIMEOUT = 'DOWNSTREAM_SERVICE_TIMEOUT',
  LOAD_BALANCER_ERROR = 'LOAD_BALANCER_ERROR',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
}

/**
 * App Gateway Service Exception.
 * Thrown when gateway operations fail due to routing issues,
 * authentication problems, or downstream service failures.
 *
 * @extends EnhancedAppException
 *
 * @example
 * // Service unavailable
 * throw new AppGatewayException(
 *   AppGatewayErrorCode.SERVICE_UNAVAILABLE,
 *   { targetService: 'resume-parser-svc', method: 'POST', path: '/api/resumes' },
 *   { gatewayRequestId: 'gw-123', clientIp: '192.168.1.100' }
 * );
 *
 * @example
 * // Rate limit exceeded
 * throw new AppGatewayException(
 *   AppGatewayErrorCode.RATE_LIMIT_EXCEEDED,
 *   { statusCode: 429 }
 * );
 */
export class AppGatewayException extends EnhancedAppException {
  /**
   * Initializes a new instance of the App Gateway Exception.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    code: AppGatewayErrorCode,
    details?: AppGatewayErrorDetails,
    context?: AppGatewayErrorContext,
  ) {
    const messages: Record<AppGatewayErrorCode, string> = {
      [AppGatewayErrorCode.SERVICE_UNAVAILABLE]:
        'Downstream service is unavailable',
      [AppGatewayErrorCode.ROUTING_FAILED]: 'Request routing failed',
      [AppGatewayErrorCode.RATE_LIMIT_EXCEEDED]: 'API rate limit exceeded',
      [AppGatewayErrorCode.AUTHENTICATION_FAILED]: 'API authentication failed',
      [AppGatewayErrorCode.AUTHORIZATION_FAILED]: 'API authorization failed',
      [AppGatewayErrorCode.REQUEST_VALIDATION_FAILED]:
        'Request validation failed',
      [AppGatewayErrorCode.SERVICE_TIMEOUT]: 'Downstream service timeout',
      [AppGatewayErrorCode.LOAD_BALANCER_ERROR]: 'Load balancer error',
      [AppGatewayErrorCode.CIRCUIT_BREAKER_OPEN]: 'Circuit breaker is open',
    };

    const httpStatusMap: Record<AppGatewayErrorCode, HttpStatus> = {
      [AppGatewayErrorCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
      [AppGatewayErrorCode.ROUTING_FAILED]: HttpStatus.BAD_GATEWAY,
      [AppGatewayErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
      [AppGatewayErrorCode.AUTHENTICATION_FAILED]: HttpStatus.UNAUTHORIZED,
      [AppGatewayErrorCode.AUTHORIZATION_FAILED]: HttpStatus.FORBIDDEN,
      [AppGatewayErrorCode.REQUEST_VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
      [AppGatewayErrorCode.SERVICE_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
      [AppGatewayErrorCode.LOAD_BALANCER_ERROR]: HttpStatus.BAD_GATEWAY,
      [AppGatewayErrorCode.CIRCUIT_BREAKER_OPEN]:
        HttpStatus.SERVICE_UNAVAILABLE,
    };

    super(
      ErrorType.EXTERNAL_SERVICE,
      code,
      messages[code],
      httpStatusMap[code],
      details,
      context,
    );

    this.withBusinessImpact('high')
      .withUserImpact('severe')
      .withRecoveryStrategies([
        'Retry with exponential backoff',
        'Use alternative service instance',
        'Enable circuit breaker',
        'Implement graceful degradation',
        'Cache previous results',
      ])
      .withMonitoringTags({
        service: 'app-gateway',
        'error.code': code,
        component: 'api-gateway',
      });
  }
}

/**
 * Database-specific error codes.
 * Defines all possible error conditions for database operations.
 *
 * @example
 * if (connectionFailed) {
 *   throw new DatabaseException(
 *     DatabaseErrorCode.CONNECTION_FAILED,
 *     'connect',
 *     'resumes'
 *   );
 * }
 */
export enum DatabaseErrorCode {
  CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  QUERY_TIMEOUT = 'DB_QUERY_TIMEOUT',
  CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DUPLICATE_KEY = 'DB_DUPLICATE_KEY_ERROR',
  TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  INDEX_CORRUPTION = 'DB_INDEX_CORRUPTION',
  DISK_FULL = 'DB_DISK_FULL',
  PERFORMANCE_DEGRADATION = 'DB_PERFORMANCE_DEGRADATION',
  OPERATION_FAILED = 'DB_OPERATION_FAILED',
}

/**
 * Database Exception.
 * Thrown when database operations fail due to connection issues,
 * constraint violations, or query errors.
 *
 * @extends EnhancedAppException
 *
 * @example
 * // Connection failure
 * throw new DatabaseException(
 *   DatabaseErrorCode.CONNECTION_FAILED,
 *   'connect',
 *   undefined,
 *   { originalError: 'Connection refused' },
 *   { database: 'recruitment_db' }
 * );
 *
 * @example
 * // Duplicate key error
 * throw new DatabaseException(
 *   DatabaseErrorCode.DUPLICATE_KEY,
 *   'insert',
 *   'users',
 *   { dbErrorCode: 11000, query: 'INSERT INTO users...' }
 * );
 */
export class DatabaseException extends EnhancedAppException {
  /**
   * Initializes a new instance of the Database Exception.
   * @param code - The code.
   * @param operation - The operation.
   * @param table - The table.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    code: DatabaseErrorCode,
    operation: string,
    table?: string,
    details?: DatabaseErrorDetails,
    context?: DatabaseErrorContext,
  ) {
    const messages: Record<DatabaseErrorCode, string> = {
      [DatabaseErrorCode.CONNECTION_FAILED]: 'Database connection failed',
      [DatabaseErrorCode.QUERY_TIMEOUT]: 'Database query timeout',
      [DatabaseErrorCode.CONSTRAINT_VIOLATION]: 'Database constraint violation',
      [DatabaseErrorCode.DUPLICATE_KEY]: 'Duplicate key constraint violation',
      [DatabaseErrorCode.TRANSACTION_FAILED]: 'Database transaction failed',
      [DatabaseErrorCode.INDEX_CORRUPTION]:
        'Database index corruption detected',
      [DatabaseErrorCode.DISK_FULL]: 'Database disk space full',
      [DatabaseErrorCode.PERFORMANCE_DEGRADATION]:
        'Database performance degradation detected',
      [DatabaseErrorCode.OPERATION_FAILED]: 'Database operation failed',
    };

    super(
      ErrorType.DATABASE,
      code,
      `${messages[code]} during ${operation}${table ? ` on table ${table}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, table, ...details },
      context,
    );

    this.withBusinessImpact('high')
      .withUserImpact('severe')
      .withRecoveryStrategies([
        'Retry with connection pool reset',
        'Use read replica if available',
        'Implement database failover',
        'Enable query optimization',
        'Scale database resources',
      ])
      .withMonitoringTags({
        'db.operation': operation,
        'db.table': table || 'unknown',
        'error.code': code,
        component: 'database',
      });
  }
}

/**
 * Factory class for creating service-specific errors.
 * Provides static factory methods for creating domain-specific exceptions
 * with proper error codes and context.
 *
 * @example
 * // Create resume parser error
 * const error = DomainErrorFactory.resumeParserError(
 *   ResumeParserErrorCode.FILE_PARSE_FAILED,
 *   { fileName: 'resume.pdf' },
 *   { resumeId: 'resume-123' }
 * );
 *
 * // Create scoring engine error
 * const error = DomainErrorFactory.scoringEngineError(
 *   ScoringEngineErrorCode.INSUFFICIENT_DATA,
 *   { algorithm: 'weighted-average' },
 *   { resumeId: 'resume-123', jobId: 'job-456' }
 * );
 */
export class DomainErrorFactory {
  /**
   * Creates a ResumeParserException with the specified parameters.
   *
   * @param code - The error code identifying the type of failure
   * @param details - Optional details about the file and parsing operation
   * @param context - Optional context with resume and candidate IDs
   * @returns A new ResumeParserException instance
   *
   * @example
   * throw DomainErrorFactory.resumeParserError(
   *   ResumeParserErrorCode.FILE_PARSE_FAILED,
   *   { fileName: 'resume.pdf', fileType: 'pdf' },
   *   { resumeId: 'resume-123' }
   * );
   */
  public static resumeParserError(
    code: ResumeParserErrorCode,
    details?: ResumeParserErrorDetails,
    context?: ResumeParserErrorContext,
  ): ResumeParserException {
    return new ResumeParserException(code, details, context);
  }

  /**
   * Creates a ReportGeneratorException with the specified parameters.
   *
   * @param code - The error code identifying the type of failure
   * @param details - Optional details about the report type and format
   * @param context - Optional context with report and job IDs
   * @returns A new ReportGeneratorException instance
   *
   * @example
   * throw DomainErrorFactory.reportGeneratorError(
   *   ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND,
   *   { templateName: 'custom-template' },
   *   { reportId: 'report-123' }
   * );
   */
  public static reportGeneratorError(
    code: ReportGeneratorErrorCode,
    details?: ReportGeneratorErrorDetails,
    context?: ReportGeneratorErrorContext,
  ): ReportGeneratorException {
    return new ReportGeneratorException(code, details, context);
  }

  /**
   * Creates a JDExtractorException with the specified parameters.
   *
   * @param code - The error code identifying the type of failure
   * @param details - Optional details about the JD source and format
   * @param context - Optional context with job and company IDs
   * @returns A new JDExtractorException instance
   *
   * @example
   * throw DomainErrorFactory.jdExtractorError(
   *   JDExtractorErrorCode.JD_PARSE_FAILED,
   *   { source: 'linkedin', format: 'html' },
   *   { jobId: 'job-456' }
   * );
   */
  public static jdExtractorError(
    code: JDExtractorErrorCode,
    details?: JDExtractorErrorDetails,
    context?: JDExtractorErrorContext,
  ): JDExtractorException {
    return new JDExtractorException(code, details, context);
  }

  /**
   * Creates a ScoringEngineException with the specified parameters.
   *
   * @param code - The error code identifying the type of failure
   * @param details - Optional details about the scoring algorithm
   * @param context - Optional context with resume, job, and score IDs
   * @returns A new ScoringEngineException instance
   *
   * @example
   * throw DomainErrorFactory.scoringEngineError(
   *   ScoringEngineErrorCode.INSUFFICIENT_DATA,
   *   { algorithm: 'weighted-average', confidenceLevel: 0.5 },
   *   { resumeId: 'resume-123', jobId: 'job-456' }
   * );
   */
  public static scoringEngineError(
    code: ScoringEngineErrorCode,
    details?: ScoringEngineErrorDetails,
    context?: ScoringEngineContext,
  ): ScoringEngineException {
    return new ScoringEngineException(code, details, context);
  }

  /**
   * Creates an AppGatewayException with the specified parameters.
   *
   * @param code - The error code identifying the type of failure
   * @param details - Optional details about the target service and request
   * @param context - Optional context with gateway request ID and client IP
   * @returns A new AppGatewayException instance
   *
   * @example
   * throw DomainErrorFactory.appGatewayError(
   *   AppGatewayErrorCode.SERVICE_UNAVAILABLE,
   *   { targetService: 'resume-parser-svc', method: 'POST' },
   *   { gatewayRequestId: 'gw-123' }
   * );
   */
  public static appGatewayError(
    code: AppGatewayErrorCode,
    details?: AppGatewayErrorDetails,
    context?: AppGatewayErrorContext,
  ): AppGatewayException {
    return new AppGatewayException(code, details, context);
  }

  /**
   * Creates a DatabaseException with the specified parameters.
   *
   * @param code - The error code identifying the type of failure
   * @param operation - The database operation that failed (e.g., 'insert', 'find')
   * @param table - Optional table/collection name involved in the operation
   * @param details - Optional details about the query and error code
   * @param context - Optional context with database and pool information
   * @returns A new DatabaseException instance
   *
   * @example
   * throw DomainErrorFactory.databaseError(
   *   DatabaseErrorCode.CONSTRAINT_VIOLATION,
   *   'insert',
   *   'users',
   *   { dbErrorCode: 11000 },
   *   { database: 'recruitment_db' }
   * );
   */
  public static databaseError(
    code: DatabaseErrorCode,
    operation: string,
    table?: string,
    details?: DatabaseErrorDetails,
    context?: DatabaseErrorContext,
  ): DatabaseException {
    return new DatabaseException(code, operation, table, details, context);
  }
}
