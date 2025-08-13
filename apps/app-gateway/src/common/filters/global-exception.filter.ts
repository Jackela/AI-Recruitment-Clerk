import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { ValidationError } from 'class-validator';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log the error with appropriate level
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request) {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = null;
    let errorCode: string | undefined = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || error;
        details = responseObj.details || null;
        errorCode = responseObj.errorCode;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof ThrottlerException) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too many requests, please try again later';
      error = 'Rate Limit Exceeded';
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (this.isValidationError(exception)) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      error = 'Validation Error';
      details = this.formatValidationErrors(exception as ValidationError[]);
      errorCode = 'VALIDATION_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      // Check for specific error patterns
      if (exception.message.includes('timeout')) {
        statusCode = HttpStatus.REQUEST_TIMEOUT;
        error = 'Request Timeout';
        errorCode = 'REQUEST_TIMEOUT';
      } else if (exception.message.includes('connection')) {
        statusCode = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Service Unavailable';
        errorCode = 'SERVICE_UNAVAILABLE';
      }
    }

    return {
      success: false,
      statusCode,
      error,
      message,
      ...(details && { details }),
      ...(errorCode && { errorCode }),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };
  }

  private logError(exception: unknown, request: Request, errorResponse: any): void {
    const { statusCode, error, message } = errorResponse;
    const { method, url, ip } = request;
    
    const logContext = {
      method,
      url,
      ip,
      statusCode,
      error,
      message,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${statusCode} ${error}: ${message}`,
        exception instanceof Error ? exception.stack : exception,
        JSON.stringify(logContext)
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${method} ${url} - ${statusCode} ${error}: ${message}`,
        JSON.stringify(logContext)
      );
    } else {
      this.logger.log(
        `${method} ${url} - ${statusCode} ${error}: ${message}`,
        JSON.stringify(logContext)
      );
    }
  }

  private isValidationError(exception: unknown): boolean {
    return Array.isArray(exception) && 
           exception.length > 0 && 
           exception[0] instanceof ValidationError;
  }

  private formatValidationErrors(errors: ValidationError[]): any {
    return errors.map(error => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children: error.children?.length > 0 ? 
        this.formatValidationErrors(error.children) : undefined,
    }));
  }
}