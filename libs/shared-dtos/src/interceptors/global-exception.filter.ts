/**
 * Global Exception Filter - Final layer for unhandled exceptions
 * Ensures all exceptions are properly formatted and logged
 */

import type {
  ExceptionFilter,
  ArgumentsHost} from '@nestjs/common';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EnhancedAppException } from '../errors/enhanced-error-types';
import { StandardizedErrorResponseFormatter } from '../errors/error-response-formatter';
import { ErrorHandler } from '../common/error-handling.patterns';
import { ErrorCorrelationManager } from '../errors/error-correlation';

/**
 * Represents the global exception filter.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Initializes a new instance of the Global Exception Filter.
   * @param serviceName - The service name.
   */
  constructor(
    @Optional() @Inject('SERVICE_NAME') private readonly serviceName?: string,
  ) {}

  /**
   * Performs the catch operation.
   * @param exception - The exception.
   * @param host - The host.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.debug(
      `Processing exception in GlobalExceptionFilter: ${exception}`,
    );

    try {
      const processedException = this.processException(exception, request);
      this.sendErrorResponse(processedException, request, response);
    } catch (processingError) {
      this.logger.error(
        'Error in exception filter processing',
        processingError,
      );
      this.sendFallbackErrorResponse(response);
    }
  }

  private processException(
    exception: unknown,
    request: Request,
  ): EnhancedAppException {
    // Set correlation context if not already set
    this.ensureCorrelationContext(request);

    // If already an EnhancedAppException, return as-is
    if (exception instanceof EnhancedAppException) {
      return exception;
    }

    // If HttpException, convert to enhanced
    if (exception instanceof HttpException) {
      return this.convertHttpExceptionToEnhanced(exception);
    }

    // If Error object, use ErrorHandler
    if (exception instanceof Error) {
      const appError = ErrorHandler.handleError(
        exception,
        'GlobalExceptionFilter',
      );
      return this.convertAppExceptionToEnhanced(
        appError,
        'GlobalExceptionFilter',
      );
    }

    // Handle unknown exceptions
    return this.createUnknownErrorException(exception);
  }

  private convertAppExceptionToEnhanced(
    appError: any,
    context: string,
  ): EnhancedAppException {
    if (appError instanceof EnhancedAppException) {
      return appError;
    }

    const enhancedError = new EnhancedAppException(
      (appError.errorDetails?.type as any) || 'SYSTEM_ERROR',
      appError.errorDetails?.code || 'UNKNOWN_ERROR',
      appError.message,
      appError.getStatus?.() || 500,
      appError.errorDetails?.details,
      { originalContext: context },
    );

    // Set appropriate severity
    const severity = appError.errorDetails?.severity || 'high';
    enhancedError.withSeverity(severity as any);

    return enhancedError;
  }

  private convertHttpExceptionToEnhanced(
    httpError: HttpException,
  ): EnhancedAppException {
    const errorResponse = httpError.getResponse();
    const httpStatus = httpError.getStatus();

    let errorDetails: any = {};
    if (typeof errorResponse === 'object') {
      errorDetails = errorResponse;
    } else if (typeof errorResponse === 'string') {
      errorDetails = { message: errorResponse };
    }

    const enhancedError = new EnhancedAppException(
      this.mapHttpStatusToErrorType(httpStatus) as any,
      errorDetails.code || 'HTTP_EXCEPTION',
      errorDetails.message || httpError.message,
      httpStatus,
      errorDetails,
      { source: 'GlobalExceptionFilter' },
    );

    // Set severity based on HTTP status
    const severity = this.mapHttpStatusToSeverity(httpStatus);
    enhancedError.withSeverity(severity as any);

    return enhancedError;
  }

  private createUnknownErrorException(
    exception: unknown,
  ): EnhancedAppException {
    const errorMessage = this.extractErrorMessage(exception);

    const enhancedError = new EnhancedAppException(
      'SYSTEM_ERROR' as any,
      'UNKNOWN_EXCEPTION',
      `An unexpected error occurred: ${errorMessage}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        originalException: String(exception),
        exceptionType: typeof exception,
      },
      { source: 'GlobalExceptionFilter' },
    );

    enhancedError.withSeverity('critical' as any);

    return enhancedError;
  }

  private extractErrorMessage(exception: unknown): string {
    if (typeof exception === 'string') {
      return exception;
    }

    if (exception && typeof exception === 'object') {
      const errorObj = exception as any;

      if (errorObj.message) {
        return String(errorObj.message);
      }

      if (errorObj.error) {
        return String(errorObj.error);
      }

      if (errorObj.toString) {
        return errorObj.toString();
      }
    }

    return 'Unknown error occurred';
  }

  private sendErrorResponse(
    error: EnhancedAppException,
    request: Request,
    response: Response,
  ): void {
    const requestContext = {
      path: request.path,
      method: request.method,
      ip: this.getClientIP(request),
    };

    const formattedResponse = StandardizedErrorResponseFormatter.formatEnhanced(
      error,
      requestContext,
    );

    // Set response headers for debugging and monitoring
    response.setHeader('X-Error-Type', error.enhancedDetails.type);
    response.setHeader('X-Error-Code', error.enhancedDetails.code);
    response.setHeader('X-Error-Severity', error.enhancedDetails.severity);
    response.setHeader('X-Service-Name', this.serviceName || 'unknown');

    if (error.enhancedDetails.correlationContext?.traceId) {
      response.setHeader(
        'X-Trace-ID',
        error.enhancedDetails.correlationContext.traceId,
      );
    }

    // Log error for monitoring
    this.logError(error, requestContext);

    // Send response
    const httpStatus = error.getStatus();
    response.status(httpStatus).json(formattedResponse);
  }

  private sendFallbackErrorResponse(response: Response): void {
    const fallbackResponse = {
      success: false,
      error: {
        type: 'SYSTEM_ERROR',
        code: 'EXCEPTION_FILTER_ERROR',
        message: 'An error occurred while processing the exception',
        timestamp: new Date().toISOString(),
        severity: 'critical',
      },
      context: {
        serviceName: this.serviceName || 'unknown',
      },
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(fallbackResponse);
  }

  private ensureCorrelationContext(request: Request): void {
    if (!ErrorCorrelationManager.getContext()) {
      const traceId =
        (request.headers['x-trace-id'] as string) ||
        (request.headers['x-request-id'] as string) ||
        `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      ErrorCorrelationManager.setContext({
        traceId,
        requestId: traceId,
        spanId: `span_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        serviceName: this.serviceName || 'unknown',
        operationName: `${request.method} ${request.path}`,
        startTime: Date.now(),
        clientIp: this.getClientIP(request),
        metadata: {
          path: request.path,
          method: request.method,
        },
      });
    }
  }

  private logError(
    error: EnhancedAppException,
    requestContext: { path?: string; method?: string; ip?: string },
  ): void {
    const logData = StandardizedErrorResponseFormatter.formatForLogging(
      error,
      requestContext,
    );

    // Use appropriate log level based on severity
    switch (error.enhancedDetails.severity) {
      case 'critical':
        this.logger.fatal(logData.message, logData);
        break;
      case 'high':
        this.logger.error(logData.message, logData);
        break;
      case 'medium':
        this.logger.warn(logData.message, logData);
        break;
      case 'low':
        this.logger.debug(logData.message, logData);
        break;
      default:
        this.logger.error(logData.message, logData);
    }
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private mapHttpStatusToErrorType(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'AUTHENTICATION_ERROR',
      403: 'AUTHORIZATION_ERROR',
      404: 'NOT_FOUND_ERROR',
      409: 'CONFLICT_ERROR',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_ERROR',
      500: 'SYSTEM_ERROR',
      502: 'EXTERNAL_SERVICE_ERROR',
      503: 'EXTERNAL_SERVICE_ERROR',
      504: 'EXTERNAL_SERVICE_ERROR',
    };

    return statusMap[status] || 'SYSTEM_ERROR';
  }

  private mapHttpStatusToSeverity(status: number): string {
    if (status >= 500) return 'high';
    if (status >= 400) return 'medium';
    return 'low';
  }
}
