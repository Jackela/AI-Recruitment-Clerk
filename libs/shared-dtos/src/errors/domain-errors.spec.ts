import { HttpStatus } from '@nestjs/common';
import {
  ResumeParserException,
  ResumeParserErrorCode,
  ReportGeneratorException,
  ReportGeneratorErrorCode,
  JDExtractorException,
  JDExtractorErrorCode,
  ScoringEngineException,
  ScoringEngineErrorCode,
  AppGatewayException,
  AppGatewayErrorCode,
  DatabaseException,
  DatabaseErrorCode,
  DomainErrorFactory,
} from './domain-errors';
import { ExtendedErrorType } from './enhanced-error-types';
import { ErrorType } from '../common/error-handling.patterns';

describe('Domain Errors', () => {
  describe('ResumeParserErrorCode', () => {
    it('should define all error codes', () => {
      expect(ResumeParserErrorCode.FILE_PARSE_FAILED).toBe('RESUME_PARSE_FAILED');
      expect(ResumeParserErrorCode.UNSUPPORTED_FORMAT).toBe('UNSUPPORTED_FILE_FORMAT');
      expect(ResumeParserErrorCode.FILE_TOO_LARGE).toBe('FILE_SIZE_EXCEEDED');
      expect(ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED).toBe('CONTENT_EXTRACTION_FAILED');
      expect(ResumeParserErrorCode.SKILL_DETECTION_FAILED).toBe('SKILL_DETECTION_FAILED');
      expect(ResumeParserErrorCode.PDF_CORRUPTION).toBe('PDF_CORRUPTION_DETECTED');
      expect(ResumeParserErrorCode.OCR_PROCESSING_FAILED).toBe('OCR_PROCESSING_FAILED');
      expect(ResumeParserErrorCode.RESUME_STRUCTURE_INVALID).toBe('RESUME_STRUCTURE_INVALID');
      expect(ResumeParserErrorCode.PERSONAL_INFO_EXTRACTION_FAILED).toBe('PERSONAL_INFO_EXTRACTION_FAILED');
      expect(ResumeParserErrorCode.WORK_EXPERIENCE_EXTRACTION_FAILED).toBe('WORK_EXPERIENCE_EXTRACTION_FAILED');
      expect(ResumeParserErrorCode.EDUCATION_EXTRACTION_FAILED).toBe('EDUCATION_EXTRACTION_FAILED');
      expect(ResumeParserErrorCode.GEMINI_PARSING_FAILED).toBe('GEMINI_PARSING_FAILED');
      expect(ResumeParserErrorCode.GRIDFS_STORAGE_FAILED).toBe('GRIDFS_STORAGE_FAILED');
    });
  });

  describe('ResumeParserException', () => {
    it('should create a FILE_PARSE_FAILED exception', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.FILE_PARSE_FAILED,
        { fileName: 'resume.pdf', fileType: 'pdf' },
        { resumeId: 'resume-123' },
      );

      expect(exception).toBeInstanceOf(ResumeParserException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.PARSING_ERROR);
      expect(exception.enhancedDetails.code).toBe(ResumeParserErrorCode.FILE_PARSE_FAILED);
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toBe('Failed to parse resume file');
      expect((exception.enhancedDetails.details as Record<string, unknown>).fileName).toBe('resume.pdf');
      expect(exception.enhancedDetails.context?.resumeId).toBe('resume-123');
    });

    it('should create an UNSUPPORTED_FORMAT exception', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.UNSUPPORTED_FORMAT,
        { fileName: 'resume.xyz', fileType: 'xyz' },
      );

      expect(exception.enhancedDetails.code).toBe(ResumeParserErrorCode.UNSUPPORTED_FORMAT);
      expect(exception.message).toBe('Resume file format is not supported');
    });

    it('should create a FILE_TOO_LARGE exception', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.FILE_TOO_LARGE,
        { fileName: 'large.pdf', fileSize: 50000000 },
      );

      expect(exception.enhancedDetails.code).toBe(ResumeParserErrorCode.FILE_TOO_LARGE);
      expect(exception.message).toBe('Resume file size exceeds maximum limit');
    });

    it('should create a GEMINI_PARSING_FAILED exception', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.GEMINI_PARSING_FAILED,
        { parserType: 'gemini' },
      );

      expect(exception.enhancedDetails.code).toBe(ResumeParserErrorCode.GEMINI_PARSING_FAILED);
      expect(exception.message).toBe('Gemini AI parsing service failed');
    });

    it('should have correct business and user impact', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.FILE_PARSE_FAILED,
      );

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have recovery strategies for FILE_PARSE_FAILED', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.FILE_PARSE_FAILED,
      );

      expect(exception.enhancedDetails.recoveryStrategies).toContain('Try alternative parser');
    });

    it('should have recovery strategies for UNSUPPORTED_FORMAT', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.UNSUPPORTED_FORMAT,
      );

      expect(exception.enhancedDetails.recoveryStrategies).toContain('Convert file to supported format');
    });

    it('should have recovery strategies for FILE_TOO_LARGE', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.FILE_TOO_LARGE,
      );

      expect(exception.enhancedDetails.recoveryStrategies).toContain('Compress file');
    });

    it('should have recovery strategies for OCR_PROCESSING_FAILED', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.OCR_PROCESSING_FAILED,
      );

      expect(exception.enhancedDetails.recoveryStrategies).toContain('Improve image quality');
    });

    it('should have recovery strategies for GEMINI_PARSING_FAILED', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.GEMINI_PARSING_FAILED,
      );

      expect(exception.enhancedDetails.recoveryStrategies).toContain('Use fallback parser');
    });

    it('should have default recovery strategies for unknown code', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.CONTENT_EXTRACTION_FAILED,
      );

      expect(exception.enhancedDetails.recoveryStrategies).toContain('Retry operation');
    });

    it('should have monitoring tags', () => {
      const exception = new ResumeParserException(
        ResumeParserErrorCode.FILE_PARSE_FAILED,
      );

      expect(exception.enhancedDetails.monitoringTags?.['service']).toBe('resume-parser');
      expect(exception.enhancedDetails.monitoringTags?.['component']).toBe('resume-processing');
    });
  });

  describe('ReportGeneratorErrorCode', () => {
    it('should define all error codes', () => {
      expect(ReportGeneratorErrorCode.REPORT_GENERATION_FAILED).toBe('REPORT_GENERATION_FAILED');
      expect(ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND).toBe('REPORT_TEMPLATE_NOT_FOUND');
      expect(ReportGeneratorErrorCode.DATA_AGGREGATION_FAILED).toBe('DATA_AGGREGATION_FAILED');
      expect(ReportGeneratorErrorCode.EXPORT_FORMAT_UNSUPPORTED).toBe('EXPORT_FORMAT_UNSUPPORTED');
      expect(ReportGeneratorErrorCode.ANALYTICS_COMPUTATION_FAILED).toBe('ANALYTICS_COMPUTATION_FAILED');
      expect(ReportGeneratorErrorCode.PDF_GENERATION_FAILED).toBe('PDF_GENERATION_FAILED');
      expect(ReportGeneratorErrorCode.CHART_RENDERING_FAILED).toBe('CHART_RENDERING_FAILED');
      expect(ReportGeneratorErrorCode.REPORT_STORAGE_FAILED).toBe('REPORT_STORAGE_FAILED');
      expect(ReportGeneratorErrorCode.TEMPLATE_COMPILATION_FAILED).toBe('TEMPLATE_COMPILATION_FAILED');
      expect(ReportGeneratorErrorCode.DATA_VALIDATION_FAILED).toBe('REPORT_DATA_VALIDATION_FAILED');
    });
  });

  describe('ReportGeneratorException', () => {
    it('should create a TEMPLATE_NOT_FOUND exception', () => {
      const exception = new ReportGeneratorException(
        ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND,
        { templateName: 'custom-template', reportType: 'individual' },
        { reportId: 'report-123', jobId: 'job-456' },
      );

      expect(exception).toBeInstanceOf(ReportGeneratorException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.REPORT_GENERATION_ERROR);
      expect(exception.enhancedDetails.code).toBe(ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND);
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toBe('Report template not found');
      expect((exception.enhancedDetails.details as Record<string, unknown>).templateName).toBe('custom-template');
      expect(exception.enhancedDetails.context?.reportId).toBe('report-123');
    });

    it('should create a PDF_GENERATION_FAILED exception', () => {
      const exception = new ReportGeneratorException(
        ReportGeneratorErrorCode.PDF_GENERATION_FAILED,
        { exportFormat: 'pdf' },
      );

      expect(exception.enhancedDetails.code).toBe(ReportGeneratorErrorCode.PDF_GENERATION_FAILED);
      expect(exception.message).toBe('PDF report generation failed');
    });

    it('should have correct business and user impact', () => {
      const exception = new ReportGeneratorException(
        ReportGeneratorErrorCode.REPORT_GENERATION_FAILED,
      );

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new ReportGeneratorException(
        ReportGeneratorErrorCode.PDF_GENERATION_FAILED,
      );

      expect(exception.enhancedDetails.monitoringTags?.['service']).toBe('report-generator');
      expect(exception.enhancedDetails.monitoringTags?.['component']).toBe('report-processing');
    });
  });

  describe('JDExtractorErrorCode', () => {
    it('should define all error codes', () => {
      expect(JDExtractorErrorCode.JD_PARSE_FAILED).toBe('JD_PARSING_FAILED');
      expect(JDExtractorErrorCode.REQUIREMENTS_EXTRACTION_FAILED).toBe('REQUIREMENTS_EXTRACTION_FAILED');
      expect(JDExtractorErrorCode.SKILL_MAPPING_FAILED).toBe('SKILL_MAPPING_FAILED');
      expect(JDExtractorErrorCode.COMPANY_INFO_EXTRACTION_FAILED).toBe('COMPANY_INFO_EXTRACTION_FAILED');
      expect(JDExtractorErrorCode.JD_STRUCTURE_INVALID).toBe('JD_STRUCTURE_INVALID');
      expect(JDExtractorErrorCode.GEMINI_EXTRACTION_FAILED).toBe('GEMINI_JD_EXTRACTION_FAILED');
      expect(JDExtractorErrorCode.SALARY_EXTRACTION_FAILED).toBe('SALARY_EXTRACTION_FAILED');
      expect(JDExtractorErrorCode.LOCATION_EXTRACTION_FAILED).toBe('LOCATION_EXTRACTION_FAILED');
      expect(JDExtractorErrorCode.EXPERIENCE_LEVEL_EXTRACTION_FAILED).toBe('EXPERIENCE_LEVEL_EXTRACTION_FAILED');
    });
  });

  describe('JDExtractorException', () => {
    it('should create a JD_PARSE_FAILED exception', () => {
      const exception = new JDExtractorException(
        JDExtractorErrorCode.JD_PARSE_FAILED,
        { source: 'linkedin', format: 'html' },
        { jobId: 'job-456', companyId: 'company-789' },
      );

      expect(exception).toBeInstanceOf(JDExtractorException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.PARSING_ERROR);
      expect(exception.enhancedDetails.code).toBe(JDExtractorErrorCode.JD_PARSE_FAILED);
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toBe('Job description parsing failed');
      expect((exception.enhancedDetails.details as Record<string, unknown>).source).toBe('linkedin');
      expect(exception.enhancedDetails.context?.jobId).toBe('job-456');
    });

    it('should create a SKILL_MAPPING_FAILED exception', () => {
      const exception = new JDExtractorException(
        JDExtractorErrorCode.SKILL_MAPPING_FAILED,
      );

      expect(exception.enhancedDetails.code).toBe(JDExtractorErrorCode.SKILL_MAPPING_FAILED);
      expect(exception.message).toBe('Failed to map skills from job description');
    });

    it('should have correct business and user impact', () => {
      const exception = new JDExtractorException(
        JDExtractorErrorCode.JD_PARSE_FAILED,
      );

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new JDExtractorException(
        JDExtractorErrorCode.JD_PARSE_FAILED,
      );

      expect(exception.enhancedDetails.monitoringTags?.['service']).toBe('jd-extractor');
      expect(exception.enhancedDetails.monitoringTags?.['component']).toBe('jd-processing');
    });
  });

  describe('ScoringEngineErrorCode', () => {
    it('should define all error codes', () => {
      expect(ScoringEngineErrorCode.SCORING_ALGORITHM_FAILED).toBe('SCORING_ALGORITHM_FAILED');
      expect(ScoringEngineErrorCode.INSUFFICIENT_DATA).toBe('INSUFFICIENT_MATCHING_DATA');
      expect(ScoringEngineErrorCode.WEIGHT_CALCULATION_ERROR).toBe('SCORING_WEIGHT_ERROR');
      expect(ScoringEngineErrorCode.MODEL_PREDICTION_FAILED).toBe('ML_MODEL_PREDICTION_FAILED');
      expect(ScoringEngineErrorCode.SKILL_MATCHING_FAILED).toBe('SKILL_MATCHING_FAILED');
      expect(ScoringEngineErrorCode.EXPERIENCE_SCORING_FAILED).toBe('EXPERIENCE_SCORING_FAILED');
      expect(ScoringEngineErrorCode.EDUCATION_SCORING_FAILED).toBe('EDUCATION_SCORING_FAILED');
      expect(ScoringEngineErrorCode.OVERALL_SCORE_CALCULATION_FAILED).toBe('OVERALL_SCORE_CALCULATION_FAILED');
      expect(ScoringEngineErrorCode.CONFIDENCE_CALCULATION_FAILED).toBe('CONFIDENCE_CALCULATION_FAILED');
    });
  });

  describe('ScoringEngineException', () => {
    it('should create an INSUFFICIENT_DATA exception', () => {
      const exception = new ScoringEngineException(
        ScoringEngineErrorCode.INSUFFICIENT_DATA,
        { algorithm: 'weighted-average', confidenceLevel: 0.5 },
        { resumeId: 'resume-123', jobId: 'job-456', scoreId: 'score-789' },
      );

      expect(exception).toBeInstanceOf(ScoringEngineException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.SCORING_ERROR);
      expect(exception.enhancedDetails.code).toBe(ScoringEngineErrorCode.INSUFFICIENT_DATA);
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toBe('Insufficient data for accurate scoring');
      expect((exception.enhancedDetails.details as Record<string, unknown>).algorithm).toBe('weighted-average');
      expect(exception.enhancedDetails.context?.resumeId).toBe('resume-123');
    });

    it('should create a MODEL_PREDICTION_FAILED exception', () => {
      const exception = new ScoringEngineException(
        ScoringEngineErrorCode.MODEL_PREDICTION_FAILED,
        { modelName: 'skill-match-v2' },
      );

      expect(exception.enhancedDetails.code).toBe(ScoringEngineErrorCode.MODEL_PREDICTION_FAILED);
      expect(exception.message).toBe('ML model prediction failed');
    });

    it('should have high business impact', () => {
      const exception = new ScoringEngineException(
        ScoringEngineErrorCode.SCORING_ALGORITHM_FAILED,
      );

      expect(exception.enhancedDetails.businessImpact).toBe('high');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new ScoringEngineException(
        ScoringEngineErrorCode.INSUFFICIENT_DATA,
      );

      expect(exception.enhancedDetails.monitoringTags?.['service']).toBe('scoring-engine');
      expect(exception.enhancedDetails.monitoringTags?.['component']).toBe('scoring-processing');
    });
  });

  describe('AppGatewayErrorCode', () => {
    it('should define all error codes', () => {
      expect(AppGatewayErrorCode.SERVICE_UNAVAILABLE).toBe('DOWNSTREAM_SERVICE_UNAVAILABLE');
      expect(AppGatewayErrorCode.ROUTING_FAILED).toBe('REQUEST_ROUTING_FAILED');
      expect(AppGatewayErrorCode.RATE_LIMIT_EXCEEDED).toBe('API_RATE_LIMIT_EXCEEDED');
      expect(AppGatewayErrorCode.AUTHENTICATION_FAILED).toBe('API_AUTHENTICATION_FAILED');
      expect(AppGatewayErrorCode.AUTHORIZATION_FAILED).toBe('API_AUTHORIZATION_FAILED');
      expect(AppGatewayErrorCode.REQUEST_VALIDATION_FAILED).toBe('REQUEST_VALIDATION_FAILED');
      expect(AppGatewayErrorCode.SERVICE_TIMEOUT).toBe('DOWNSTREAM_SERVICE_TIMEOUT');
      expect(AppGatewayErrorCode.LOAD_BALANCER_ERROR).toBe('LOAD_BALANCER_ERROR');
      expect(AppGatewayErrorCode.CIRCUIT_BREAKER_OPEN).toBe('CIRCUIT_BREAKER_OPEN');
    });
  });

  describe('AppGatewayException', () => {
    it('should create a SERVICE_UNAVAILABLE exception', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.SERVICE_UNAVAILABLE,
        { targetService: 'resume-parser-svc', method: 'POST', path: '/api/resumes' },
        { gatewayRequestId: 'gw-123', clientIp: '192.168.1.100' },
      );

      expect(exception).toBeInstanceOf(AppGatewayException);
      expect(exception.enhancedDetails.type).toBe(ErrorType.EXTERNAL_SERVICE);
      expect(exception.enhancedDetails.code).toBe(AppGatewayErrorCode.SERVICE_UNAVAILABLE);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.message).toBe('Downstream service is unavailable');
      expect((exception.enhancedDetails.details as Record<string, unknown>).targetService).toBe('resume-parser-svc');
      expect(exception.enhancedDetails.context?.gatewayRequestId).toBe('gw-123');
    });

    it('should create a RATE_LIMIT_EXCEEDED exception with 429 status', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.RATE_LIMIT_EXCEEDED,
        { statusCode: 429 },
      );

      expect(exception.enhancedDetails.code).toBe(AppGatewayErrorCode.RATE_LIMIT_EXCEEDED);
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.message).toBe('API rate limit exceeded');
    });

    it('should create an AUTHENTICATION_FAILED exception with 401 status', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.AUTHENTICATION_FAILED,
      );

      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should create an AUTHORIZATION_FAILED exception with 403 status', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.AUTHORIZATION_FAILED,
      );

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('should create a SERVICE_TIMEOUT exception with 504 status', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.SERVICE_TIMEOUT,
      );

      expect(exception.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
    });

    it('should create a ROUTING_FAILED exception with 502 status', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.ROUTING_FAILED,
      );

      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should have high business impact and severe user impact', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.SERVICE_UNAVAILABLE,
      );

      expect(exception.enhancedDetails.businessImpact).toBe('high');
      expect(exception.enhancedDetails.userImpact).toBe('severe');
    });

    it('should have monitoring tags', () => {
      const exception = new AppGatewayException(
        AppGatewayErrorCode.SERVICE_UNAVAILABLE,
      );

      expect(exception.enhancedDetails.monitoringTags?.['service']).toBe('app-gateway');
      expect(exception.enhancedDetails.monitoringTags?.['component']).toBe('api-gateway');
    });
  });

  describe('DatabaseErrorCode', () => {
    it('should define all error codes', () => {
      expect(DatabaseErrorCode.CONNECTION_FAILED).toBe('DB_CONNECTION_FAILED');
      expect(DatabaseErrorCode.QUERY_TIMEOUT).toBe('DB_QUERY_TIMEOUT');
      expect(DatabaseErrorCode.CONSTRAINT_VIOLATION).toBe('DB_CONSTRAINT_VIOLATION');
      expect(DatabaseErrorCode.DUPLICATE_KEY).toBe('DB_DUPLICATE_KEY_ERROR');
      expect(DatabaseErrorCode.TRANSACTION_FAILED).toBe('DB_TRANSACTION_FAILED');
      expect(DatabaseErrorCode.INDEX_CORRUPTION).toBe('DB_INDEX_CORRUPTION');
      expect(DatabaseErrorCode.DISK_FULL).toBe('DB_DISK_FULL');
      expect(DatabaseErrorCode.PERFORMANCE_DEGRADATION).toBe('DB_PERFORMANCE_DEGRADATION');
      expect(DatabaseErrorCode.OPERATION_FAILED).toBe('DB_OPERATION_FAILED');
    });
  });

  describe('DatabaseException', () => {
    it('should create a CONNECTION_FAILED exception', () => {
      const exception = new DatabaseException(
        DatabaseErrorCode.CONNECTION_FAILED,
        'connect',
        undefined,
        { originalError: 'Connection refused' },
        { database: 'recruitment_db' },
      );

      expect(exception).toBeInstanceOf(DatabaseException);
      expect(exception.enhancedDetails.type).toBe(ErrorType.DATABASE);
      expect(exception.enhancedDetails.code).toBe(DatabaseErrorCode.CONNECTION_FAILED);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.message).toContain('Database connection failed');
      expect(exception.message).toContain('connect');
      expect(exception.enhancedDetails.context?.database).toBe('recruitment_db');
    });

    it('should create a DUPLICATE_KEY exception with table name', () => {
      const exception = new DatabaseException(
        DatabaseErrorCode.DUPLICATE_KEY,
        'insert',
        'users',
        { dbErrorCode: 11000 },
      );

      expect(exception.enhancedDetails.code).toBe(DatabaseErrorCode.DUPLICATE_KEY);
      expect(exception.message).toContain('Duplicate key constraint violation');
      expect(exception.message).toContain('insert');
      expect(exception.message).toContain('users');
      expect((exception.enhancedDetails.details as Record<string, unknown>).table).toBe('users');
    });

    it('should create a QUERY_TIMEOUT exception', () => {
      const exception = new DatabaseException(
        DatabaseErrorCode.QUERY_TIMEOUT,
        'find',
        'resumes',
      );

      expect(exception.enhancedDetails.code).toBe(DatabaseErrorCode.QUERY_TIMEOUT);
      expect(exception.message).toContain('Database query timeout');
    });

    it('should have high business impact and severe user impact', () => {
      const exception = new DatabaseException(
        DatabaseErrorCode.CONNECTION_FAILED,
        'connect',
      );

      expect(exception.enhancedDetails.businessImpact).toBe('high');
      expect(exception.enhancedDetails.userImpact).toBe('severe');
    });

    it('should have monitoring tags', () => {
      const exception = new DatabaseException(
        DatabaseErrorCode.CONNECTION_FAILED,
        'connect',
        'users',
      );

      expect(exception.enhancedDetails.monitoringTags?.['db.operation']).toBe('connect');
      expect(exception.enhancedDetails.monitoringTags?.['db.table']).toBe('users');
      expect(exception.enhancedDetails.monitoringTags?.['component']).toBe('database');
    });

    it('should use "unknown" for missing table in monitoring tags', () => {
      const exception = new DatabaseException(
        DatabaseErrorCode.CONNECTION_FAILED,
        'connect',
      );

      expect(exception.enhancedDetails.monitoringTags?.['db.table']).toBe('unknown');
    });
  });

  describe('DomainErrorFactory', () => {
    it('should create ResumeParserException', () => {
      const error = DomainErrorFactory.resumeParserError(
        ResumeParserErrorCode.FILE_PARSE_FAILED,
        { fileName: 'resume.pdf' },
        { resumeId: 'resume-123' },
      );

      expect(error).toBeInstanceOf(ResumeParserException);
      expect(error.enhancedDetails.code).toBe(ResumeParserErrorCode.FILE_PARSE_FAILED);
    });

    it('should create ReportGeneratorException', () => {
      const error = DomainErrorFactory.reportGeneratorError(
        ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND,
        { templateName: 'custom' },
        { reportId: 'report-123' },
      );

      expect(error).toBeInstanceOf(ReportGeneratorException);
      expect(error.enhancedDetails.code).toBe(ReportGeneratorErrorCode.TEMPLATE_NOT_FOUND);
    });

    it('should create JDExtractorException', () => {
      const error = DomainErrorFactory.jdExtractorError(
        JDExtractorErrorCode.JD_PARSE_FAILED,
        { source: 'linkedin' },
        { jobId: 'job-456' },
      );

      expect(error).toBeInstanceOf(JDExtractorException);
      expect(error.enhancedDetails.code).toBe(JDExtractorErrorCode.JD_PARSE_FAILED);
    });

    it('should create ScoringEngineException', () => {
      const error = DomainErrorFactory.scoringEngineError(
        ScoringEngineErrorCode.INSUFFICIENT_DATA,
        { algorithm: 'weighted-average' },
        { resumeId: 'resume-123' },
      );

      expect(error).toBeInstanceOf(ScoringEngineException);
      expect(error.enhancedDetails.code).toBe(ScoringEngineErrorCode.INSUFFICIENT_DATA);
    });

    it('should create AppGatewayException', () => {
      const error = DomainErrorFactory.appGatewayError(
        AppGatewayErrorCode.SERVICE_UNAVAILABLE,
        { targetService: 'resume-parser-svc' },
        { gatewayRequestId: 'gw-123' },
      );

      expect(error).toBeInstanceOf(AppGatewayException);
      expect(error.enhancedDetails.code).toBe(AppGatewayErrorCode.SERVICE_UNAVAILABLE);
    });

    it('should create DatabaseException', () => {
      const error = DomainErrorFactory.databaseError(
        DatabaseErrorCode.CONNECTION_FAILED,
        'connect',
        'users',
        { originalError: 'Connection refused' },
        { database: 'test_db' },
      );

      expect(error).toBeInstanceOf(DatabaseException);
      expect(error.enhancedDetails.code).toBe(DatabaseErrorCode.CONNECTION_FAILED);
      expect((error.enhancedDetails.details as Record<string, unknown>).table).toBe('users');
    });

    it('should create DatabaseException without table', () => {
      const error = DomainErrorFactory.databaseError(
        DatabaseErrorCode.QUERY_TIMEOUT,
        'find',
      );

      expect(error).toBeInstanceOf(DatabaseException);
      expect((error.enhancedDetails.details as Record<string, unknown>).table).toBeUndefined();
    });
  });
});
