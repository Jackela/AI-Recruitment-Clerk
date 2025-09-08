/**
 * Enhanced Error Types - Extensions to existing error-handling.patterns.ts
 * Provides additional error types and enhanced AppException functionality
 */

import { HttpStatus } from '@nestjs/common';
import { AppException, ErrorType, ErrorDetails } from '../common/error-handling.patterns';
import { ErrorCorrelationContext, ErrorCorrelationManager } from './error-correlation';

/**
 * Extended error types for comprehensive error classification
 */
export enum ExtendedErrorType {
  // Existing types from error-handling.patterns.ts are imported
  // New domain-specific error types
  NATS_MESSAGE_ERROR = 'NATS_MESSAGE_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  ML_MODEL_ERROR = 'ML_MODEL_ERROR',
  REPORT_GENERATION_ERROR = 'REPORT_GENERATION_ERROR',
  SCORING_ERROR = 'SCORING_ERROR',
  PDF_PROCESSING_ERROR = 'PDF_PROCESSING_ERROR',
  OCR_ERROR = 'OCR_ERROR',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  ANALYTICS_ERROR = 'ANALYTICS_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR'
}

/**
 * Combined error types (existing + extended)
 */
export type CombinedErrorType = ErrorType | ExtendedErrorType;

/**
 * Enhanced error details with correlation context
 */
export interface EnhancedErrorDetails extends ErrorDetails {
  correlationContext?: ErrorCorrelationContext;
  recoveryStrategies?: string[];
  affectedOperations?: string[];
  relatedErrors?: string[];
  businessImpact?: 'low' | 'medium' | 'high' | 'critical';
  userImpact?: 'none' | 'minimal' | 'moderate' | 'severe';
  monitoringTags?: Record<string, string>;
}

/**
 * Enhanced AppException with correlation support
 */
export class EnhancedAppException extends AppException {
  public readonly enhancedDetails: EnhancedErrorDetails;
  
  constructor(
    type: CombinedErrorType,
    code: string,
    message: string,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: any,
    context?: Record<string, any>
  ) {
    super(type as ErrorType, code, message, httpStatus, details, context);
    
    // Enhance error details with correlation context
    const correlationContext = ErrorCorrelationManager.getContext();
    
    this.enhancedDetails = {
      ...this.errorDetails,
      correlationContext,
      recoveryStrategies: [],
      affectedOperations: [],
      relatedErrors: [],
      businessImpact: 'medium',
      userImpact: 'moderate',
      monitoringTags: {}
    };
  }

  /**
   * Add correlation context to error
   */
  withCorrelation(context: ErrorCorrelationContext): this {
    this.enhancedDetails.correlationContext = context;
    return this;
  }

  /**
   * Add recovery strategies
   */
  withRecoveryStrategies(strategies: string[]): this {
    this.enhancedDetails.recoveryStrategies = strategies;
    return this;
  }

  /**
   * Add affected operations
   */
  withAffectedOperations(operations: string[]): this {
    this.enhancedDetails.affectedOperations = operations;
    return this;
  }

  /**
   * Add related errors for correlation
   */
  withRelatedErrors(errorIds: string[]): this {
    this.enhancedDetails.relatedErrors = errorIds;
    return this;
  }

  /**
   * Set business impact level
   */
  withBusinessImpact(impact: 'low' | 'medium' | 'high' | 'critical'): this {
    this.enhancedDetails.businessImpact = impact;
    return this;
  }

  /**
   * Set user impact level
   */
  withUserImpact(impact: 'none' | 'minimal' | 'moderate' | 'severe'): this {
    this.enhancedDetails.userImpact = impact;
    return this;
  }

  /**
   * Add monitoring tags for observability
   */
  withMonitoringTags(tags: Record<string, string>): this {
    this.enhancedDetails.monitoringTags = { 
      ...this.enhancedDetails.monitoringTags, 
      ...tags 
    };
    return this;
  }

  /**
   * Get comprehensive error context for logging/monitoring
   */
  getEnhancedContext(): Record<string, any> {
    return {
      error: {
        type: this.enhancedDetails.type,
        code: this.enhancedDetails.code,
        message: this.enhancedDetails.message,
        severity: this.enhancedDetails.severity,
        businessImpact: this.enhancedDetails.businessImpact,
        userImpact: this.enhancedDetails.userImpact
      },
      correlation: this.enhancedDetails.correlationContext ? 
        ErrorCorrelationManager.getCorrelationSummary(this.enhancedDetails.correlationContext) : null,
      recovery: {
        strategies: this.enhancedDetails.recoveryStrategies,
        affectedOperations: this.enhancedDetails.affectedOperations,
        relatedErrors: this.enhancedDetails.relatedErrors
      },
      monitoring: this.enhancedDetails.monitoringTags,
      timestamp: this.enhancedDetails.timestamp,
      details: this.enhancedDetails.details,
      context: this.enhancedDetails.context
    };
  }
}

/**
 * NATS messaging error
 */
export class NatsMessageException extends EnhancedAppException {
  constructor(
    operation: string,
    subject: string,
    message: string,
    originalError?: Error
  ) {
    super(
      ExtendedErrorType.NATS_MESSAGE_ERROR,
      'NATS_MESSAGE_FAILED',
      `NATS ${operation} failed for subject '${subject}': ${message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { 
        operation, 
        subject, 
        originalError: originalError?.message 
      }
    );

    this.withBusinessImpact('high')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Retry message operation',
          'Check NATS server connectivity', 
          'Verify subject permissions',
          'Use alternative communication channel'
        ])
        .withMonitoringTags({
          'nats.operation': operation,
          'nats.subject': subject,
          'component': 'messaging'
        });
  }
}

// Note: DatabaseException is defined in domain-errors.ts with comprehensive error handling

/**
 * ML Model processing error
 */
export class MLModelException extends EnhancedAppException {
  constructor(
    modelName: string,
    operation: string,
    message: string,
    confidence?: number
  ) {
    super(
      ExtendedErrorType.ML_MODEL_ERROR,
      'ML_MODEL_PROCESSING_FAILED',
      `ML model '${modelName}' ${operation} failed: ${message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { 
        modelName, 
        operation, 
        confidence,
        timestamp: new Date().toISOString()
      }
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Use fallback model',
          'Retry with different parameters',
          'Use rule-based fallback',
          'Request human review'
        ])
        .withMonitoringTags({
          'ml.model': modelName,
          'ml.operation': operation,
          'component': 'ml-processing'
        });
  }
}

/**
 * File parsing error
 */
export class ParsingException extends EnhancedAppException {
  constructor(
    fileType: string,
    fileName: string,
    parserType: string,
    message: string,
    fileSize?: number
  ) {
    super(
      ExtendedErrorType.PARSING_ERROR,
      'FILE_PARSING_FAILED',
      `Failed to parse ${fileType} file '${fileName}' using ${parserType}: ${message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { 
        fileType, 
        fileName, 
        parserType,
        fileSize,
        timestamp: new Date().toISOString()
      }
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Try alternative parser',
          'Check file format compatibility',
          'Use OCR if text extraction failed',
          'Request file resubmission'
        ])
        .withMonitoringTags({
          'parser.type': parserType,
          'file.type': fileType,
          'component': 'file-processing'
        });
  }
}

/**
 * Cache operation error
 */
export class CacheException extends EnhancedAppException {
  constructor(
    operation: string,
    key: string,
    cacheType: string,
    message: string
  ) {
    super(
      ExtendedErrorType.CACHE_ERROR,
      'CACHE_OPERATION_FAILED',
      `Cache ${operation} failed for key '${key}' in ${cacheType}: ${message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { 
        operation, 
        key, 
        cacheType,
        timestamp: new Date().toISOString()
      }
    );

    this.withBusinessImpact('low')
        .withUserImpact('minimal')
        .withRecoveryStrategies([
          'Bypass cache and fetch from source',
          'Use alternative cache instance',
          'Clear cache if corrupted',
          'Continue operation without cache'
        ])
        .withMonitoringTags({
          'cache.operation': operation,
          'cache.type': cacheType,
          'component': 'caching'
        });
  }
}

/**
 * Queue operation error
 */
export class QueueException extends EnhancedAppException {
  constructor(
    operation: string,
    queueName: string,
    message: string,
    messageId?: string
  ) {
    super(
      ExtendedErrorType.QUEUE_ERROR,
      'QUEUE_OPERATION_FAILED',
      `Queue ${operation} failed on '${queueName}': ${message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { 
        operation, 
        queueName, 
        messageId,
        timestamp: new Date().toISOString()
      }
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Retry queue operation',
          'Use dead letter queue',
          'Process message synchronously',
          'Alert operations team'
        ])
        .withMonitoringTags({
          'queue.operation': operation,
          'queue.name': queueName,
          'component': 'queue-processing'
        });
  }
}

/**
 * Template processing error
 */
export class TemplateException extends EnhancedAppException {
  constructor(
    templateName: string,
    operation: string,
    message: string,
    templateData?: Record<string, any>
  ) {
    super(
      ExtendedErrorType.TEMPLATE_ERROR,
      'TEMPLATE_PROCESSING_FAILED',
      `Template '${templateName}' ${operation} failed: ${message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { 
        templateName, 
        operation,
        templateData,
        timestamp: new Date().toISOString()
      }
    );

    this.withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Use fallback template',
          'Validate template syntax',
          'Check template data compatibility',
          'Generate basic format output'
        ])
        .withMonitoringTags({
          'template.name': templateName,
          'template.operation': operation,
          'component': 'template-processing'
        });
  }
}

/**
 * Error factory for creating typed errors
 */
export class ErrorFactory {
  /**
   * Create NATS messaging error
   */
  static natsError(
    operation: string,
    subject: string,
    message: string,
    originalError?: Error
  ): NatsMessageException {
    return new NatsMessageException(operation, subject, message, originalError);
  }

  // Database error factory moved to domain-errors.ts

  /**
   * Create ML model error
   */
  static mlModelError(
    modelName: string,
    operation: string,
    message: string,
    confidence?: number
  ): MLModelException {
    return new MLModelException(modelName, operation, message, confidence);
  }

  /**
   * Create file parsing error
   */
  static parsingError(
    fileType: string,
    fileName: string,
    parserType: string,
    message: string,
    fileSize?: number
  ): ParsingException {
    return new ParsingException(fileType, fileName, parserType, message, fileSize);
  }

  /**
   * Create cache error
   */
  static cacheError(
    operation: string,
    key: string,
    cacheType: string,
    message: string
  ): CacheException {
    return new CacheException(operation, key, cacheType, message);
  }

  /**
   * Create queue error
   */
  static queueError(
    operation: string,
    queueName: string,
    message: string,
    messageId?: string
  ): QueueException {
    return new QueueException(operation, queueName, message, messageId);
  }

  /**
   * Create template error
   */
  static templateError(
    templateName: string,
    operation: string,
    message: string,
    templateData?: Record<string, any>
  ): TemplateException {
    return new TemplateException(templateName, operation, message, templateData);
  }
}
