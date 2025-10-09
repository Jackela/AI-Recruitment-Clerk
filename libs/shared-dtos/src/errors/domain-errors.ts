/**
 * Domain-Specific Error Classes for All Microservices
 * Provides service-specific error types with enhanced context and recovery strategies
 */

import { HttpStatus } from '@nestjs/common';
import { EnhancedAppException, ExtendedErrorType } from './enhanced-error-types';
import { ErrorType } from '../common/error-handling.patterns';

/**
 * Resume Parser Service Error Codes
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
  GRIDFS_STORAGE_FAILED = 'GRIDFS_STORAGE_FAILED'
}

/**
 * Resume Parser Service Error Messages
 */
export const ResumeParserErrorMessages: Record<ResumeParserErrorCode, string> = {
  [ResumeParserErrorCode.FILE_PARSE_FAILED]: 'Failed to parse resume file',
  [ResumeParserErrorCode.UNSUPPORTED_FORMAT]: 'Resume file format is not supported',
  [ResumeParserErrorCode.FILE_TOO_LARGE]: 'Resume file size exceeds maximum limit',
  [ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED]: 'Failed to extract text content from resume',
  [ResumeParserErrorCode.SKILL_DETECTION_FAILED]: 'Failed to detect skills from resume content',
  [ResumeParserErrorCode.PDF_CORRUPTION]: 'PDF file appears to be corrupted',
  [ResumeParserErrorCode.OCR_PROCESSING_FAILED]: 'OCR processing failed for scanned resume',
  [ResumeParserErrorCode.RESUME_STRUCTURE_INVALID]: 'Resume structure is invalid or unrecognizable',
  [ResumeParserErrorCode.PERSONAL_INFO_EXTRACTION_FAILED]: 'Failed to extract personal information',
  [ResumeParserErrorCode.WORK_EXPERIENCE_EXTRACTION_FAILED]: 'Failed to extract work experience',
  [ResumeParserErrorCode.EDUCATION_EXTRACTION_FAILED]: 'Failed to extract education information',
  [ResumeParserErrorCode.GEMINI_PARSING_FAILED]: 'Gemini AI parsing service failed',
  [ResumeParserErrorCode.GRIDFS_STORAGE_FAILED]: 'Failed to store resume in GridFS'
};

/**
 * Resume Parser Service Exception
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
    details?: any,
    context?: Record<string, any>
  ) {
    super(
      ExtendedErrorType.PARSING_ERROR,
      code,
      ResumeParserErrorMessages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies(this.getRecoveryStrategies(code))
        .withMonitoringTags({
          'service': 'resume-parser',
          'error.code': code,
          'component': 'resume-processing'
        });
  }

  private getRecoveryStrategies(code: ResumeParserErrorCode): string[] {
    switch (code) {
      case ResumeParserErrorCode.FILE_PARSE_FAILED:
        return ['Try alternative parser', 'Check file integrity', 'Request file resubmission'];
      case ResumeParserErrorCode.UNSUPPORTED_FORMAT:
        return ['Convert file to supported format', 'Use OCR for image-based files', 'Request PDF version'];
      case ResumeParserErrorCode.FILE_TOO_LARGE:
        return ['Compress file', 'Split into sections', 'Use cloud processing'];
      case ResumeParserErrorCode.OCR_PROCESSING_FAILED:
        return ['Improve image quality', 'Try different OCR engine', 'Manual transcription'];
      case ResumeParserErrorCode.GEMINI_PARSING_FAILED:
        return ['Use fallback parser', 'Retry with different prompt', 'Process sections individually'];
      default:
        return ['Retry operation', 'Use alternative processing method', 'Request technical support'];
    }
  }
}

/**
 * Report Generator Service Error Codes
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
  DATA_VALIDATION_FAILED = 'REPORT_DATA_VALIDATION_FAILED'
}

/**
 * Report Generator Service Exception
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
    details?: any,
    context?: Record<string, any>
  ) {
    const messages: Record<ReportGeneratorErrorCode, string> = {
      [ReportGeneratorErrorCode.REPORT_GENERATION_FAILED]: 'Report generation process failed',
      [ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND]: 'Report template not found',
      [ReportGeneratorErrorCode.DATA_AGGREGATION_FAILED]: 'Failed to aggregate report data',
      [ReportGeneratorErrorCode.EXPORT_FORMAT_UNSUPPORTED]: 'Export format is not supported',
      [ReportGeneratorErrorCode.ANALYTICS_COMPUTATION_FAILED]: 'Analytics computation failed',
      [ReportGeneratorErrorCode.PDF_GENERATION_FAILED]: 'PDF report generation failed',
      [ReportGeneratorErrorCode.CHART_RENDERING_FAILED]: 'Chart rendering failed',
      [ReportGeneratorErrorCode.REPORT_STORAGE_FAILED]: 'Failed to store generated report',
      [ReportGeneratorErrorCode.TEMPLATE_COMPILATION_FAILED]: 'Report template compilation failed',
      [ReportGeneratorErrorCode.DATA_VALIDATION_FAILED]: 'Report data validation failed'
    };

    super(
      ExtendedErrorType.REPORT_GENERATION_ERROR,
      code,
      messages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Use fallback template',
          'Regenerate with simplified data',
          'Use alternative export format',
          'Process data in smaller chunks'
        ])
        .withMonitoringTags({
          'service': 'report-generator',
          'error.code': code,
          'component': 'report-processing'
        });
  }
}

/**
 * JD Extractor Service Error Codes
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
  EXPERIENCE_LEVEL_EXTRACTION_FAILED = 'EXPERIENCE_LEVEL_EXTRACTION_FAILED'
}

/**
 * JD Extractor Service Exception
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
    details?: any,
    context?: Record<string, any>
  ) {
    const messages: Record<JDExtractorErrorCode, string> = {
      [JDExtractorErrorCode.JD_PARSE_FAILED]: 'Job description parsing failed',
      [JDExtractorErrorCode.REQUIREMENTS_EXTRACTION_FAILED]: 'Failed to extract job requirements',
      [JDExtractorErrorCode.SKILL_MAPPING_FAILED]: 'Failed to map skills from job description',
      [JDExtractorErrorCode.COMPANY_INFO_EXTRACTION_FAILED]: 'Failed to extract company information',
      [JDExtractorErrorCode.JD_STRUCTURE_INVALID]: 'Job description structure is invalid',
      [JDExtractorErrorCode.GEMINI_EXTRACTION_FAILED]: 'Gemini AI extraction service failed',
      [JDExtractorErrorCode.SALARY_EXTRACTION_FAILED]: 'Failed to extract salary information',
      [JDExtractorErrorCode.LOCATION_EXTRACTION_FAILED]: 'Failed to extract location information',
      [JDExtractorErrorCode.EXPERIENCE_LEVEL_EXTRACTION_FAILED]: 'Failed to extract experience level requirements'
    };

    super(
      ExtendedErrorType.PARSING_ERROR,
      code,
      messages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Use alternative extraction method',
          'Parse with different AI model',
          'Use rule-based extraction',
          'Request manual review'
        ])
        .withMonitoringTags({
          'service': 'jd-extractor',
          'error.code': code,
          'component': 'jd-processing'
        });
  }
}

/**
 * Scoring Engine Service Error Codes
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
  CONFIDENCE_CALCULATION_FAILED = 'CONFIDENCE_CALCULATION_FAILED'
}

/**
 * Scoring Engine Service Exception
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
    details?: any,
    context?: Record<string, any>
  ) {
    const messages: Record<ScoringEngineErrorCode, string> = {
      [ScoringEngineErrorCode.SCORING_ALGORITHM_FAILED]: 'Scoring algorithm execution failed',
      [ScoringEngineErrorCode.INSUFFICIENT_DATA]: 'Insufficient data for accurate scoring',
      [ScoringEngineErrorCode.WEIGHT_CALCULATION_ERROR]: 'Error calculating scoring weights',
      [ScoringEngineErrorCode.MODEL_PREDICTION_FAILED]: 'ML model prediction failed',
      [ScoringEngineErrorCode.SKILL_MATCHING_FAILED]: 'Skill matching algorithm failed',
      [ScoringEngineErrorCode.EXPERIENCE_SCORING_FAILED]: 'Experience scoring failed',
      [ScoringEngineErrorCode.EDUCATION_SCORING_FAILED]: 'Education scoring failed',
      [ScoringEngineErrorCode.OVERALL_SCORE_CALCULATION_FAILED]: 'Overall score calculation failed',
      [ScoringEngineErrorCode.CONFIDENCE_CALCULATION_FAILED]: 'Confidence score calculation failed'
    };

    super(
      ExtendedErrorType.SCORING_ERROR,
      code,
      messages[code],
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
      context
    );

    this.withBusinessImpact('high')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Use fallback scoring algorithm',
          'Apply rule-based scoring',
          'Use default weights',
          'Request additional data',
          'Generate partial scores'
        ])
        .withMonitoringTags({
          'service': 'scoring-engine',
          'error.code': code,
          'component': 'scoring-processing'
        });
  }
}

/**
 * App Gateway Service Error Codes
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
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN'
}

/**
 * App Gateway Service Exception
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
    details?: any,
    context?: Record<string, any>
  ) {
    const messages: Record<AppGatewayErrorCode, string> = {
      [AppGatewayErrorCode.SERVICE_UNAVAILABLE]: 'Downstream service is unavailable',
      [AppGatewayErrorCode.ROUTING_FAILED]: 'Request routing failed',
      [AppGatewayErrorCode.RATE_LIMIT_EXCEEDED]: 'API rate limit exceeded',
      [AppGatewayErrorCode.AUTHENTICATION_FAILED]: 'API authentication failed',
      [AppGatewayErrorCode.AUTHORIZATION_FAILED]: 'API authorization failed',
      [AppGatewayErrorCode.REQUEST_VALIDATION_FAILED]: 'Request validation failed',
      [AppGatewayErrorCode.SERVICE_TIMEOUT]: 'Downstream service timeout',
      [AppGatewayErrorCode.LOAD_BALANCER_ERROR]: 'Load balancer error',
      [AppGatewayErrorCode.CIRCUIT_BREAKER_OPEN]: 'Circuit breaker is open'
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
      [AppGatewayErrorCode.CIRCUIT_BREAKER_OPEN]: HttpStatus.SERVICE_UNAVAILABLE
    };

    super(
      ErrorType.EXTERNAL_SERVICE,
      code,
      messages[code],
      httpStatusMap[code],
      details,
      context
    );

    this.withBusinessImpact('high')
        .withUserImpact('severe')
        .withRecoveryStrategies([
          'Retry with exponential backoff',
          'Use alternative service instance',
          'Enable circuit breaker',
          'Implement graceful degradation',
          'Cache previous results'
        ])
        .withMonitoringTags({
          'service': 'app-gateway',
          'error.code': code,
          'component': 'api-gateway'
        });
  }
}

/**
 * Database-specific enhanced errors
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
  OPERATION_FAILED = 'DB_OPERATION_FAILED'
}

/**
 * Database Exception
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
    details?: any,
    context?: Record<string, any>
  ) {
    const messages: Record<DatabaseErrorCode, string> = {
      [DatabaseErrorCode.CONNECTION_FAILED]: 'Database connection failed',
      [DatabaseErrorCode.QUERY_TIMEOUT]: 'Database query timeout',
      [DatabaseErrorCode.CONSTRAINT_VIOLATION]: 'Database constraint violation',
      [DatabaseErrorCode.DUPLICATE_KEY]: 'Duplicate key constraint violation',
      [DatabaseErrorCode.TRANSACTION_FAILED]: 'Database transaction failed',
      [DatabaseErrorCode.INDEX_CORRUPTION]: 'Database index corruption detected',
      [DatabaseErrorCode.DISK_FULL]: 'Database disk space full',
      [DatabaseErrorCode.PERFORMANCE_DEGRADATION]: 'Database performance degradation detected',
      [DatabaseErrorCode.OPERATION_FAILED]: 'Database operation failed'
    };

    super(
      ErrorType.DATABASE,
      code,
      `${messages[code]} during ${operation}${table ? ` on table ${table}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, table, ...details },
      context
    );

    this.withBusinessImpact('high')
        .withUserImpact('severe')
        .withRecoveryStrategies([
          'Retry with connection pool reset',
          'Use read replica if available',
          'Implement database failover',
          'Enable query optimization',
          'Scale database resources'
        ])
        .withMonitoringTags({
          'db.operation': operation,
          'db.table': table || 'unknown',
          'error.code': code,
          'component': 'database'
        });
  }
}

/**
 * Error factory for creating service-specific errors
 */
export class DomainErrorFactory {
  /**
   * Performs the resume parser error operation.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   * @returns The ResumeParserException.
   */
  static resumeParserError(
    code: ResumeParserErrorCode,
    details?: any,
    context?: Record<string, any>
  ): ResumeParserException {
    return new ResumeParserException(code, details, context);
  }

  /**
   * Performs the report generator error operation.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   * @returns The ReportGeneratorException.
   */
  static reportGeneratorError(
    code: ReportGeneratorErrorCode,
    details?: any,
    context?: Record<string, any>
  ): ReportGeneratorException {
    return new ReportGeneratorException(code, details, context);
  }

  /**
   * Performs the jd extractor error operation.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   * @returns The JDExtractorException.
   */
  static jdExtractorError(
    code: JDExtractorErrorCode,
    details?: any,
    context?: Record<string, any>
  ): JDExtractorException {
    return new JDExtractorException(code, details, context);
  }

  /**
   * Performs the scoring engine error operation.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   * @returns The ScoringEngineException.
   */
  static scoringEngineError(
    code: ScoringEngineErrorCode,
    details?: any,
    context?: Record<string, any>
  ): ScoringEngineException {
    return new ScoringEngineException(code, details, context);
  }

  /**
   * Performs the app gateway error operation.
   * @param code - The code.
   * @param details - The details.
   * @param context - The context.
   * @returns The AppGatewayException.
   */
  static appGatewayError(
    code: AppGatewayErrorCode,
    details?: any,
    context?: Record<string, any>
  ): AppGatewayException {
    return new AppGatewayException(code, details, context);
  }

  /**
   * Performs the database error operation.
   * @param code - The code.
   * @param operation - The operation.
   * @param table - The table.
   * @param details - The details.
   * @param context - The context.
   * @returns The DatabaseException.
   */
  static databaseError(
    code: DatabaseErrorCode,
    operation: string,
    table?: string,
    details?: any,
    context?: Record<string, any>
  ): DatabaseException {
    return new DatabaseException(code, operation, table, details, context);
  }
}