/**
 * Standardized Global Exception Filter
 * Provides consistent error handling across all NestJS microservices
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { ValidationError } from 'class-validator';

import { 
  AppException, 
  ErrorHandler, 
  ErrorType,
  ErrorSeverity 
} from '../common/error-handling.patterns';
import { 
  EnhancedAppException, 
  CombinedErrorType 
} from './enhanced-error-types';
import { 
  ErrorCorrelationManager, 
  ErrorCorrelationContext 
} from './error-correlation';
import { 
  StandardizedErrorResponseFormatter,
  StandardizedErrorResponse 
} from './error-response-formatter';
import { 
  StructuredErrorLogger,
  StructuredLoggerFactory 
} from './structured-logging';

/**
 * Configuration interface for the global exception filter
 */
export interface GlobalExceptionFilterConfig {
  serviceName: string;
  enableCorrelation?: boolean;
  enableStructuredLogging?: boolean;
  enablePerformanceTracking?: boolean;
  includeStackTrace?: boolean;
  enableErrorRecovery?: boolean;
  customErrorMapping?: Record<string, {
    httpStatus: HttpStatus;
    errorType: CombinedErrorType;
    userMessage?: string;
  }>;
}

/**
 * Standardized global exception filter with enhanced error handling
 */
@Catch()
export class StandardizedGlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger;
  private readonly structuredLogger: StructuredErrorLogger;
  private readonly config: Required<GlobalExceptionFilterConfig>;

  /**
   * Initializes a new instance of the Standardized Global Exception Filter.
   * @param config - The config.
   */
  constructor(config: GlobalExceptionFilterConfig) {
    this.config = {
      enableCorrelation: true,
      enableStructuredLogging: true,
      enablePerformanceTracking: true,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      enableErrorRecovery: true,
      customErrorMapping: {},
      ...config
    };

    this.logger = new Logger(`${this.config.serviceName}-GlobalExceptionFilter`);
    this.structuredLogger = StructuredLoggerFactory.getLogger(this.config.serviceName);
  }

  /**
   * Performs the catch operation.
   * @param exception - The exception.
   * @param host - The host.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Create or get correlation context
    const correlationContext = this.getOrCreateCorrelationContext(request);

    // Convert to standardized enhanced exception
    const enhancedException = this.convertToEnhancedException(
      exception, 
      correlationContext
    );

    // Build standardized error response
    const errorResponse = this.buildErrorResponse(
      enhancedException,
      request,
      correlationContext
    );

    // Log error with structured logging
    this.logError(enhancedException, request, correlationContext);

    // Track performance if enabled
    if (this.config.enablePerformanceTracking) {
      this.trackErrorMetrics(enhancedException, correlationContext);
    }

    // Send response
    response
      .status(enhancedException.getStatus())
      .header('X-Trace-ID', correlationContext?.traceId)
      .header('X-Request-ID', correlationContext?.requestId)
      .json(errorResponse);
  }

  /**
   * Get or create correlation context from request
   */
  private getOrCreateCorrelationContext(request: Request): ErrorCorrelationContext {
    if (this.config.enableCorrelation) {
      // Try to get existing context first
      let context = ErrorCorrelationManager.getContext();
      
      if (!context) {
        // Create new context from request
        context = ErrorCorrelationManager.createContextFromRequest(
          request,
          this.config.serviceName,
          this.getOperationName(request)
        );
        ErrorCorrelationManager.setContext(context);
      }
      
      return context;
    }
    
    // Create minimal context if correlation is disabled
    return ErrorCorrelationManager.createContextFromRequest(
      request,
      this.config.serviceName,
      this.getOperationName(request)
    );
  }

  /**
   * Convert any exception to EnhancedAppException
   */
  private convertToEnhancedException(
    exception: unknown,
    correlationContext: ErrorCorrelationContext
  ): EnhancedAppException {
    // If already an EnhancedAppException, add correlation context
    if (exception instanceof EnhancedAppException) {
      return exception.withCorrelation(correlationContext);
    }

    // If it's an AppException, convert to enhanced version
    if (exception instanceof AppException) {
      const enhanced = new EnhancedAppException(
        exception.errorDetails.type as CombinedErrorType,
        exception.errorDetails.code,
        exception.errorDetails.message,
        exception.getStatus(),
        exception.errorDetails.details,
        exception.errorDetails.context
      );
      
      return enhanced
        .withCorrelation(correlationContext)
        .withTraceId(exception.errorDetails.traceId || correlationContext.traceId)
        .withUserId(exception.errorDetails.userId ?? correlationContext.userId ?? '')
        .withSeverity(exception.errorDetails.severity);
    }

    // Handle NestJS specific exceptions
    if (exception instanceof ThrottlerException) {
      return new EnhancedAppException(
        ErrorType.RATE_LIMIT,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests, please try again later',
        HttpStatus.TOO_MANY_REQUESTS
      )
        .withCorrelation(correlationContext)
        .withBusinessImpact('medium')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Wait before retrying',
          'Reduce request frequency',
          'Contact support for rate limit increase'
        ]);
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      const validationErrors = exception as ValidationError[];
      return new EnhancedAppException(
        ErrorType.VALIDATION,
        'VALIDATION_FAILED',
        'Request validation failed',
        HttpStatus.BAD_REQUEST,
        this.formatValidationErrors(validationErrors)
      )
        .withCorrelation(correlationContext)
        .withBusinessImpact('low')
        .withUserImpact('moderate')
        .withRecoveryStrategies([
          'Check all required fields',
          'Verify data formats',
          'Review field constraints'
        ]);
    }

    // Handle standard HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      let errorType: CombinedErrorType;
      let errorCode: string;
      let message: string;
      
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;
        message = responseObj.message || exception.message;
        errorCode = responseObj.error || this.mapStatusToErrorCode(status);
        errorType = this.mapStatusToErrorType(status);
      } else {
        message = response as string || exception.message;
        errorCode = this.mapStatusToErrorCode(status);
        errorType = this.mapStatusToErrorType(status);
      }

      return new EnhancedAppException(
        errorType,
        errorCode,
        message,
        status
      )
        .withCorrelation(correlationContext)
        .withBusinessImpact(this.mapStatusToBusinessImpact(status))
        .withUserImpact(this.mapStatusToUserImpact(status))
        .withRecoveryStrategies(this.getRecoveryStrategiesForStatus(status));
    }

    // Handle generic errors using existing ErrorHandler
    const handledException = ErrorHandler.handleError(
      exception instanceof Error ? exception : new Error(String(exception))
    );

    return new EnhancedAppException(
      handledException.errorDetails.type as CombinedErrorType,
      handledException.errorDetails.code,
      handledException.errorDetails.message,
      handledException.getStatus(),
      handledException.errorDetails.details
    )
      .withCorrelation(correlationContext)
      .withSeverity(ErrorSeverity.HIGH)
      .withBusinessImpact('high')
      .withUserImpact('severe')
      .withRecoveryStrategies([
        'Retry the operation',
        'Check system status',
        'Contact technical support'
      ]);
  }

  /**
   * Build standardized error response
   */
  private buildErrorResponse(
    error: EnhancedAppException,
    request: Request,
    correlationContext: ErrorCorrelationContext
  ): StandardizedErrorResponse {
    const requestContext = {
      path: request.path,
      method: request.method,
      ip: this.getClientIp(request)
    };

    return StandardizedErrorResponseFormatter.formatEnhanced(
      error,
      requestContext
    );
  }

  /**
   * Log error with structured logging
   */
  private logError(
    error: EnhancedAppException,
    request: Request,
    correlationContext: ErrorCorrelationContext
  ): void {
    if (this.config.enableStructuredLogging) {
      this.structuredLogger.logError(
        error,
        correlationContext.operationName,
        {
          request: {
            method: request.method,
            path: request.path,
            ip: this.getClientIp(request),
            userAgent: request.headers['user-agent'],
            query: request.query,
            params: request.params
          }
        }
      );
    } else {
      // Fallback to basic logging
      const { severity } = error.enhancedDetails;
      const logMessage = `${request.method} ${request.path} - ${error.enhancedDetails.code}: ${error.enhancedDetails.message}`;
      
      switch (severity) {
        case 'critical':
        case 'high':
          this.logger.error(logMessage, error.stack);
          break;
        case 'medium':
          this.logger.warn(logMessage);
          break;
        default:
          this.logger.log(logMessage);
      }
    }
  }

  /**
   * Track error metrics for monitoring
   */
  private trackErrorMetrics(
    error: EnhancedAppException,
    _correlationContext: ErrorCorrelationContext
  ): void {
    // This would integrate with your metrics system
    // Example: Prometheus, DataDog, CloudWatch, etc.
    
    const metrics = {
      errorType: error.enhancedDetails.type,
      errorCode: error.enhancedDetails.code,
      severity: error.enhancedDetails.severity,
      businessImpact: error.enhancedDetails.businessImpact,
      userImpact: error.enhancedDetails.userImpact,
      serviceName: this.config.serviceName,
      operationName: _correlationContext.operationName,
      executionTime: _correlationContext.executionTime || 0,
      timestamp: Date.now()
    };

    // Send to metrics collector
    this.sendMetrics(metrics);
  }

  /**
   * Send metrics to monitoring system (placeholder)
   */
  private sendMetrics(_metrics: Record<string, any>): void {
    // Implementation would depend on your monitoring infrastructure
    if (process.env.METRICS_ENABLED === 'true') {
      // Example: Send to monitoring system
      // await this.metricsCollector.increment('error_count', 1, metrics);
    }
  }

  /**
   * Extract client IP address
   */
  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      request.headers['x-real-ip']?.toString() ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Get operation name from request
   */
  private getOperationName(request: Request): string {
    const route = request.route?.path || request.path;
    return `${request.method} ${route}`;
  }

  /**
   * Check if exception is validation error
   */
  private isValidationError(exception: unknown): boolean {
    return Array.isArray(exception) && 
           exception.length > 0 && 
           exception[0] instanceof ValidationError;
  }

  /**
   * Format validation errors
   */
  private formatValidationErrors(errors: ValidationError[]): any {
    return errors.map(error => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children: error.children && error.children.length > 0 ? 
        this.formatValidationErrors(error.children) : undefined,
    }));
  }

  /**
   * Map HTTP status to error type
   */
  private mapStatusToErrorType(status: number): CombinedErrorType {
    const statusMap: Record<number, CombinedErrorType> = {
      400: ErrorType.VALIDATION,
      401: ErrorType.AUTHENTICATION,
      403: ErrorType.AUTHORIZATION,
      404: ErrorType.NOT_FOUND,
      409: ErrorType.CONFLICT,
      422: ErrorType.VALIDATION,
      429: ErrorType.RATE_LIMIT,
      500: ErrorType.SYSTEM,
      502: ErrorType.EXTERNAL_SERVICE,
      503: ErrorType.EXTERNAL_SERVICE,
      504: ErrorType.EXTERNAL_SERVICE
    };

    return statusMap[status] || ErrorType.SYSTEM;
  }

  /**
   * Map HTTP status to error code
   */
  private mapStatusToErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };

    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Map HTTP status to business impact
   */
  private mapStatusToBusinessImpact(status: number): 'low' | 'medium' | 'high' | 'critical' {
    if (status >= 500) return 'high';
    if (status === 429) return 'medium';
    if (status >= 400) return 'low';
    return 'low';
  }

  /**
   * Map HTTP status to user impact
   */
  private mapStatusToUserImpact(status: number): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (status >= 500) return 'severe';
    if (status === 401 || status === 403) return 'moderate';
    if (status >= 400) return 'moderate';
    return 'minimal';
  }

  /**
   * Get recovery strategies for HTTP status
   */
  private getRecoveryStrategiesForStatus(status: number): string[] {
    const strategyMap: Record<number, string[]> = {
      400: ['Check request parameters', 'Validate input data', 'Review API documentation'],
      401: ['Login again', 'Check authentication credentials', 'Verify token validity'],
      403: ['Check permissions', 'Contact administrator', 'Verify access rights'],
      404: ['Check resource exists', 'Verify URL path', 'Check resource identifier'],
      409: ['Refresh data', 'Resolve conflicts', 'Try again later'],
      429: ['Wait before retrying', 'Reduce request frequency', 'Contact support'],
      500: ['Retry operation', 'Check system status', 'Contact technical support'],
      502: ['Retry operation', 'Check service status', 'Use alternative endpoint'],
      503: ['Wait and retry', 'Check service availability', 'Use cached data'],
      504: ['Retry with timeout', 'Check network connectivity', 'Use asynchronous processing']
    };

    return strategyMap[status] || ['Retry operation', 'Check system status', 'Contact support'];
  }
}

/**
 * Factory function to create configured global exception filter
 */
export function createGlobalExceptionFilter(
  serviceName: string,
  customConfig?: Partial<GlobalExceptionFilterConfig>
): StandardizedGlobalExceptionFilter {
  const config: GlobalExceptionFilterConfig = {
    serviceName,
    ...customConfig
  };

  return new StandardizedGlobalExceptionFilter(config);
}

/**
 * Configuration helper for common service patterns
 */
export class ExceptionFilterConfigHelper {
  /**
   * Configuration for API Gateway service
   */
  static forApiGateway(): Partial<GlobalExceptionFilterConfig> {
    return {
      enableCorrelation: true,
      enableStructuredLogging: true,
      enablePerformanceTracking: true,
      enableErrorRecovery: true,
      customErrorMapping: {
        'CIRCUIT_BREAKER_OPEN': {
          httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
          errorType: ErrorType.EXTERNAL_SERVICE,
          userMessage: '服务暂时不可用，请稍后重试'
        }
      }
    };
  }

  /**
   * Configuration for processing services
   */
  static forProcessingService(): Partial<GlobalExceptionFilterConfig> {
    return {
      enableCorrelation: true,
      enableStructuredLogging: true,
      enablePerformanceTracking: true,
      includeStackTrace: true
    };
  }

  /**
   * Configuration for production deployment
   */
  static forProduction(): Partial<GlobalExceptionFilterConfig> {
    return {
      includeStackTrace: false,
      enableErrorRecovery: true,
      enablePerformanceTracking: true
    };
  }
}
