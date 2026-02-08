/**
 * Shared Logger
 *
 * Re-exports the Logger service as "shared-logger" for consistency
 * across all microservices. This file provides the standardized
 * logging interface with log levels and metadata support.
 *
 * Log Levels:
 * - error: Critical errors that require immediate attention
 * - warn: Warning messages for potentially harmful situations
 * - log: Informational messages about normal operation (info)
 * - debug: Detailed debugging information
 *
 * @module shared-logger
 */

import { Logger, createLogger, logger as loggerInstance } from './logger.service';
export type { LogContext, LogEntry, LoggerOptions } from './logger.service';

// Re-export the Logger class and utilities
export { Logger, createLogger };

// Re-export the default logger instance as sharedLogger
export const sharedLogger = loggerInstance;
