/**
 * Global Error Interceptor - Ensures all errors follow standardized format
 * Automatically catches and formats all exceptions across the application
 */

import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler} from '@nestjs/common';
import {
  Injectable,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Observable} from 'rxjs';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { EnhancedAppException } from '../errors/enhanced-error-types';
import { StandardizedErrorResponseFormatter } from '../errors/error-response-formatter';
import { ErrorHandler } from '../common/error-handling.patterns';
import { ErrorCorrelationManager } from '../errors/error-correlation';

/**
 * Represents the global error interceptor.
 */
@Injectable()
export class GlobalErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalErrorInterceptor.name);

  /**
   * Performs the intercept operation.
   * @param context - The context.
   * @param next - The next.
   * @returns The Observable<any>.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Set correlation context from request headers
    this.setCorrelationContext(request);

    return next.handle().pipe(
      catchError((error: Error) => {
        return throwError(() =>
          this.transformError(error, request, response, context),
        );
      }),
    );
  }

  private transformError(
    error: Error,
    request: Request,
    response: Response,
    context: ExecutionContext,
  ): HttpException {
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const operationContext = `${controllerName}.${handlerName}`;

    // If already an EnhancedAppException, format and return
    if (error instanceof EnhancedAppException) {
      this.setErrorResponse(error, request, response);
      return error;
    }

    // If standard HttpException, convert to enhanced
    if (error instanceof HttpException) {
      const enhancedError = this.convertHttpExceptionToEnhanced(
        error,
        operationContext,
      );
      this.setErrorResponse(enhancedError, request, response);
      return enhancedError;
    }

    // Handle unknown errors
    const appError = ErrorHandler.handleError(error, operationContext);
    const enhancedError = this.convertAppExceptionToEnhanced(
      appError,
      operationContext,
    );
    this.setErrorResponse(enhancedError, request, response);
    return enhancedError;
  }

  private convertAppExceptionToEnhanced(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appError: any,
    context: string,
  ): EnhancedAppException {
    if (appError instanceof EnhancedAppException) {
      return appError;
    }

    const enhancedError = new EnhancedAppException(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (appError.errorDetails?.type as any) || 'SYSTEM_ERROR',
      appError.errorDetails?.code || 'UNKNOWN_ERROR',
      appError.message,
      appError.getStatus?.() || 500,
      appError.errorDetails?.details,
      { originalContext: context },
    );

    // Set appropriate severity
    const severity = appError.errorDetails?.severity || 'high';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enhancedError.withSeverity(severity as any);

    return enhancedError;
  }

  private convertHttpExceptionToEnhanced(
    httpError: HttpException,
    context: string,
  ): EnhancedAppException {
    const errorResponse = httpError.getResponse();
    const httpStatus = httpError.getStatus();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorDetails: any = {};
    if (typeof errorResponse === 'object') {
      errorDetails = errorResponse;
    } else if (typeof errorResponse === 'string') {
      errorDetails = { message: errorResponse };
    }

    const enhancedError = new EnhancedAppException(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.mapHttpStatusToErrorType(httpStatus) as any,
      errorDetails.code || 'HTTP_EXCEPTION',
      errorDetails.message || httpError.message,
      httpStatus,
      errorDetails,
      { originalContext: context },
    );

    // Set appropriate severity based on HTTP status
    const severity = this.mapHttpStatusToSeverity(httpStatus);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enhancedError.withSeverity(severity as any);

    return enhancedError;
  }

  private setErrorResponse(
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

    if (error.enhancedDetails.correlationContext?.traceId) {
      response.setHeader(
        'X-Trace-ID',
        error.enhancedDetails.correlationContext.traceId,
      );
    }

    // Log error for monitoring
    this.logError(error, requestContext);

    // Set the response body (NestJS will handle the HTTP status)
    response.json(formattedResponse);
  }

  private setCorrelationContext(request: Request): void {
    const traceId =
      (request.headers['x-trace-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const requestId = (request.headers['x-request-id'] as string) || traceId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (request as any).user?.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionId = (request as any).sessionId;

    ErrorCorrelationManager.setContext({
      traceId,
      requestId,
      spanId: `span_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      serviceName: 'app-gateway', // This should be configurable per service
      operationName: `${request.method} ${request.path}`,
      startTime: Date.now(),
      clientIp: this.getClientIP(request),
      userAgent: request.headers['user-agent'],
      metadata: {
        path: request.path,
        method: request.method,
        query: request.query,
        headers: this.sanitizeHeaders(request.headers),
      },
    });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    const sanitized: Record<string, string> = {};

    Object.keys(headers).forEach((key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(headers[key]);
      }
    });

    return sanitized;
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
