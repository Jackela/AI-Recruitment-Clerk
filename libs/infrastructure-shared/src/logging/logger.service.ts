/**
 * Shared Logger Wrapper
 *
 * Provides a consistent logging interface across all services.
 * Uses NestJS Logger under the hood with standardized format.
 *
 * Log Levels:
 * - error: Critical errors that require immediate attention
 * - warn: Warning messages for potentially harmful situations
 * - log: Informational messages about normal operation (info)
 * - debug: Detailed debugging information
 */

import type { LogLevel } from '@nestjs/common';
import { Logger as NestLogger } from '@nestjs/common';

/**
 * Standard log context metadata
 */
export interface LogContext {
  /** Service or component name */
  service?: string;
  /** Operation being performed */
  operation?: string;
  /** Unique correlation/trace ID */
  traceId?: string;
  /** Request ID */
  requestId?: string;
  /** User ID */
  userId?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: string;
  /** Log message */
  message: string;
  /** Context metadata */
  context?: LogContext;
  /** Error object if applicable */
  error?: Error;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Service name prefix for all logs */
  service?: string;
  /** Minimum log level to output */
  level?: LogLevel;
  /** Whether to include timestamps */
  timestamps?: boolean;
  /** Whether to include colors in console output */
  colors?: boolean;
}

/**
 * Standardized logger service for consistent logging across microservices
 */
export class Logger {
  private readonly nestLogger: NestLogger;
  private readonly serviceContext: string;
  private readonly defaultContext: LogContext;
  protected presetContext: LogContext = {};

  constructor(context?: string, options?: LoggerOptions) {
    this.serviceContext = options?.service || context || 'Application';
    this.nestLogger = new NestLogger(this.serviceContext);
    this.defaultContext = {
      service: this.serviceContext,
    };
  }

  /**
   * Log error message
   * @param message - Error message
   * @param trace - Optional stack trace or error object
   * @param context - Optional log context
   */
  public error(message: string, trace?: string | Error, context?: LogContext): void {
    const logEntry = this.formatLogEntry('error', message, context, trace);
    this.nestLogger.error(logEntry.message, trace);
  }

  /**
   * Log warning message
   * @param message - Warning message
   * @param context - Optional log context
   */
  public warn(message: string, context?: LogContext): void {
    const logEntry = this.formatLogEntry('warn', message, context);
    this.nestLogger.warn(logEntry.message);
  }

  /**
   * Log informational message
   * @param message - Info message
   * @param context - Optional log context
   */
  public log(message: string, context?: LogContext): void {
    const logEntry = this.formatLogEntry('log', message, context);
    this.nestLogger.log(logEntry.message);
  }

  /**
   * Log debug message
   * @param message - Debug message
   * @param context - Optional log context
   */
  public debug(message: string, context?: LogContext): void {
    const logEntry = this.formatLogEntry('debug', message, context);
    this.nestLogger.debug(logEntry.message);
  }

  /**
   * Log verbose message (alias for debug)
   * @param message - Verbose message
   * @param context - Optional log context
   */
  public verbose(message: string, context?: LogContext): void {
    this.debug(message, context);
  }

  /**
   * Set the log context for subsequent log calls
   * @param context - Context to set
   * @returns The same logger instance (context is merged internally)
   */
  public setContext(context: LogContext): Logger {
    // Store the context for this logger instance
    (this as unknown as { presetContext: LogContext }).presetContext = {
      ...this.defaultContext,
      ...context,
    };
    return this;
  }

  /**
   * Create a child logger with additional context
   * @param context - Additional context for the child logger
   * @returns The same logger instance (context is merged internally)
   */
  public child(context: LogContext): Logger {
    return this.setContext(context);
  }

  /**
   * Format log entry with context
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional context
   * @param error - Optional error
   * @returns Formatted log entry
   */
  private formatLogEntry(
    level: string,
    message: string,
    context?: LogContext,
    error?: Error | string,
  ): LogEntry {
    const mergedContext = { ...this.defaultContext, ...this.presetContext, ...context };

    // Build context string for log message
    const contextParts: string[] = [];
    if (mergedContext.operation) {
      contextParts.push(`[${mergedContext.operation}]`);
    }
    if (mergedContext.traceId) {
      contextParts.push(`trace:${mergedContext.traceId}`);
    }
    if (mergedContext.requestId) {
      contextParts.push(`req:${mergedContext.requestId}`);
    }
    if (mergedContext.userId) {
      contextParts.push(`user:${mergedContext.userId}`);
    }

    const contextStr = contextParts.length > 0 ? ` ${contextParts.join(' ')}` : '';
    const formattedMessage = `${message}${contextStr}`;

    return {
      timestamp: new Date().toISOString(),
      level,
      message: formattedMessage,
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
      error: error instanceof Error ? error : undefined,
    };
  }
}

/**
 * Create a logger instance for a service
 * @param context - Service or component name
 * @param options - Logger options
 * @returns Logger instance
 */
export function createLogger(context?: string, options?: LoggerOptions): Logger {
  return new Logger(context, options);
}

/**
 * Default logger instance for general use
 */
export const logger = new Logger('Application');
