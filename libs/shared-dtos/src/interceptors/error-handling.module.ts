/**
 * Error Handling Module - Comprehensive error handling setup for NestJS applications
 * Provides global interceptors, filters, and utilities for standardized error management
 */

import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { GlobalErrorInterceptor } from './global-error.interceptor';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ErrorCorrelationManager } from '../errors/error-correlation';
import { StandardizedErrorResponseFormatter } from '../errors/error-response-formatter';

/**
 * Configures the error handling module.
 */
@Global()
@Module({
  providers: [
    // Global Error Interceptor - catches and transforms errors
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalErrorInterceptor,
    },
    // Global Exception Filter - final error processing
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Error utilities available for injection
    ErrorCorrelationManager,
    StandardizedErrorResponseFormatter,
  ],
  exports: [
    ErrorCorrelationManager,
    StandardizedErrorResponseFormatter,
  ],
})
export class ErrorHandlingModule {
  /**
   * Configure error handling for a specific service
   */
  static forService(serviceName: string) {
    return {
      module: ErrorHandlingModule,
      providers: [
        {
          provide: 'SERVICE_NAME',
          useValue: serviceName,
        },
      ],
    };
  }
}