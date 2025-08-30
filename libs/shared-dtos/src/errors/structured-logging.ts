/**
 * Structured Logging Utilities for Error Handling
 * Provides consistent, correlation-aware logging across all services
 */

import { Logger } from '@nestjs/common';
import { EnhancedAppException } from './enhanced-error-types';
import { ErrorCorrelationContext, ErrorCorrelationManager } from './error-correlation';
import { StandardizedErrorResponseFormatter } from './error-response-formatter';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Structured log entry interface
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  operation?: string;
  correlation?: {
    traceId?: string;
    requestId?: string;
    spanId?: string;
    parentSpanId?: string;
    userId?: string;
    sessionId?: string;
  };
  error?: {
    type: string;
    code: string;
    severity: string;
    stack?: string;
    businessImpact?: string;
    userImpact?: string;
  };
  context?: {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
    executionTime?: number;
  };
  metadata?: Record<string, any>;
  monitoring?: {
    tags: Record<string, string>;
    metrics: Record<string, number>;
  };
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

/**
 * Structured error logger with correlation support
 */
export class StructuredErrorLogger {
  private readonly logger: Logger;
  private readonly serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = new Logger(`${serviceName}-ErrorLogger`);
  }

  /**
   * Log enhanced error with full context
   */
  logError(
    error: EnhancedAppException,
    operation?: string,
    additionalContext?: Record<string, any>
  ): void {
    const correlationContext = error.enhancedDetails.correlationContext ||
                              ErrorCorrelationManager.getContext();
    
    const logEntry = this.buildLogEntry(
      this.mapSeverityToLogLevel(error.enhancedDetails.severity),
      error.enhancedDetails.message,
      operation || correlationContext?.operationName,
      correlationContext,
      {
        error: {
          type: error.enhancedDetails.type,
          code: error.enhancedDetails.code,
          severity: error.enhancedDetails.severity,
          businessImpact: error.enhancedDetails.businessImpact,
          userImpact: error.enhancedDetails.userImpact,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        },
        context: {
          executionTime: correlationContext?.executionTime
        },
        metadata: {
          ...error.enhancedDetails.details,
          recoveryStrategies: error.enhancedDetails.recoveryStrategies,
          affectedOperations: error.enhancedDetails.affectedOperations,
          ...additionalContext
        },
        monitoring: {
          tags: error.enhancedDetails.monitoringTags || {},
          metrics: {
            timestamp: Date.now(),
            executionTime: correlationContext?.executionTime || 0
          }
        }
      }
    );

    this.writeLogEntry(logEntry);
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    metrics: PerformanceMetrics,
    additionalMetadata?: Record<string, any>
  ): void {
    const correlationContext = ErrorCorrelationManager.getContext();
    
    const logEntry = this.buildLogEntry(
      LogLevel.INFO,
      `Performance metrics for ${operation}`,
      operation,
      correlationContext,
      {
        metadata: {
          duration: metrics.duration,
          memoryUsage: metrics.memoryUsage,
          cpuUsage: metrics.cpuUsage,
          ...additionalMetadata
        },
        monitoring: {
          tags: {
            operation,
            type: 'performance'
          },
          metrics: {
            duration: metrics.duration || 0,
            memoryHeapUsed: metrics.memoryUsage?.heapUsed || 0,
            memoryHeapTotal: metrics.memoryUsage?.heapTotal || 0,
            timestamp: Date.now()
          }
        }
      }
    );

    this.writeLogEntry(logEntry);
  }

  /**
   * Log operation start with correlation
   */
  logOperationStart(
    operation: string,
    metadata?: Record<string, any>
  ): PerformanceMetrics {
    const correlationContext = ErrorCorrelationManager.getContext();
    const startTime = Date.now();
    const memoryStart = process.memoryUsage();
    const cpuStart = process.cpuUsage();

    const logEntry = this.buildLogEntry(
      LogLevel.DEBUG,
      `Starting operation: ${operation}`,
      operation,
      correlationContext,
      {
        metadata: {
          phase: 'start',
          ...metadata
        },
        monitoring: {
          tags: {
            operation,
            phase: 'start'
          },
          metrics: {
            startTime,
            memoryHeapUsed: memoryStart.heapUsed
          }
        }
      }
    );

    this.writeLogEntry(logEntry);

    return {
      startTime,
      memoryUsage: memoryStart,
      cpuUsage: cpuStart
    };
  }

  /**
   * Log operation completion with metrics
   */
  logOperationComplete(
    operation: string,
    startMetrics: PerformanceMetrics,
    success: boolean = true,
    metadata?: Record<string, any>
  ): PerformanceMetrics {
    const endTime = Date.now();
    const memoryEnd = process.memoryUsage();
    const cpuEnd = process.cpuUsage(startMetrics.cpuUsage);
    const duration = endTime - startMetrics.startTime;

    const correlationContext = ErrorCorrelationManager.getContext();
    if (correlationContext) {
      correlationContext.executionTime = duration;
    }

    const completeMetrics: PerformanceMetrics = {
      ...startMetrics,
      endTime,
      duration,
      memoryUsage: memoryEnd,
      cpuUsage: cpuEnd
    };

    const logEntry = this.buildLogEntry(
      success ? LogLevel.INFO : LogLevel.WARN,
      `${success ? 'Completed' : 'Failed'} operation: ${operation} (${duration}ms)`,
      operation,
      correlationContext,
      {
        metadata: {
          phase: 'complete',
          success,
          duration,
          ...metadata
        },
        monitoring: {
          tags: {
            operation,
            phase: 'complete',
            success: success.toString()
          },
          metrics: {
            duration,
            memoryDelta: memoryEnd.heapUsed - startMetrics.memoryUsage!.heapUsed,
            cpuUser: cpuEnd.user / 1000, // Convert to milliseconds
            cpuSystem: cpuEnd.system / 1000,
            timestamp: endTime
          }
        }
      }
    );

    this.writeLogEntry(logEntry);
    
    return completeMetrics;
  }

  /**
   * Log with operation wrapper
   */
  async withLogging<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startMetrics = this.logOperationStart(operation, metadata);
    
    try {
      const result = await fn();
      this.logOperationComplete(operation, startMetrics, true, {
        ...metadata,
        resultType: typeof result
      });
      return result;
    } catch (error) {
      this.logOperationComplete(operation, startMetrics, false, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // If it's already an enhanced error, log it with full context
      if (error instanceof EnhancedAppException) {
        this.logError(error, operation, metadata);
      }
      
      throw error;
    }
  }

  /**
   * Log correlation boundary (service-to-service calls)
   */
  logCorrelationBoundary(
    direction: 'outbound' | 'inbound',
    targetService: string,
    operation: string,
    metadata?: Record<string, any>
  ): void {
    const correlationContext = ErrorCorrelationManager.getContext();
    
    const logEntry = this.buildLogEntry(
      LogLevel.DEBUG,
      `${direction.toUpperCase()} call to ${targetService} for ${operation}`,
      operation,
      correlationContext,
      {
        metadata: {
          direction,
          targetService,
          ...metadata
        },
        monitoring: {
          tags: {
            direction,
            targetService,
            operation,
            type: 'service-boundary'
          },
          metrics: {
            timestamp: Date.now()
          }
        }
      }
    );

    this.writeLogEntry(logEntry);
  }

  /**
   * Build structured log entry
   */
  private buildLogEntry(
    level: LogLevel,
    message: string,
    operation?: string,
    correlationContext?: ErrorCorrelationContext | null,
    additionalData?: Partial<StructuredLogEntry>
  ): StructuredLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      operation,
      correlation: correlationContext ? {
        traceId: correlationContext.traceId,
        requestId: correlationContext.requestId,
        spanId: correlationContext.spanId,
        parentSpanId: correlationContext.parentSpanId,
        userId: correlationContext.userId,
        sessionId: correlationContext.sessionId
      } : undefined,
      context: correlationContext ? {
        method: correlationContext.metadata?.method,
        path: correlationContext.metadata?.path,
        ip: correlationContext.clientIp,
        userAgent: correlationContext.userAgent,
        executionTime: correlationContext.executionTime
      } : undefined,
      ...additionalData
    };
  }

  /**
   * Write log entry to appropriate output
   */
  private writeLogEntry(entry: StructuredLogEntry): void {
    const logMessage = this.formatLogMessage(entry);
    const logContext = this.formatLogContext(entry);

    switch (entry.level) {
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        this.logger.error(logMessage, entry.error?.stack, logContext);
        break;
      case LogLevel.WARN:
        this.logger.warn(logMessage, logContext);
        break;
      case LogLevel.INFO:
        this.logger.log(logMessage, logContext);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(logMessage, logContext);
        break;
      default:
        this.logger.log(logMessage, logContext);
    }

    // Send to external logging system if configured
    this.sendToExternalLoggingSystem(entry);
  }

  /**
   * Format log message for readability
   */
  private formatLogMessage(entry: StructuredLogEntry): string {
    const correlationPrefix = entry.correlation?.traceId 
      ? `[${entry.correlation.traceId}] `
      : '';
    
    const operationPrefix = entry.operation 
      ? `[${entry.operation}] `
      : '';

    return `${correlationPrefix}${operationPrefix}${entry.message}`;
  }

  /**
   * Format log context for structured output
   */
  private formatLogContext(entry: StructuredLogEntry): string {
    const context = {
      service: entry.service,
      operation: entry.operation,
      correlation: entry.correlation,
      context: entry.context,
      metadata: entry.metadata,
      monitoring: entry.monitoring,
      error: entry.error
    };

    // Remove undefined/null values
    const cleanContext = JSON.parse(JSON.stringify(context));
    
    return JSON.stringify(cleanContext);
  }

  /**
   * Send to external logging system (placeholder)
   */
  private sendToExternalLoggingSystem(entry: StructuredLogEntry): void {
    // Implementation would depend on your logging infrastructure
    // Examples: Send to ELK stack, Datadog, CloudWatch, etc.
    
    if (process.env.EXTERNAL_LOGGING_ENABLED === 'true') {
      // Example: Send to external system
      // await this.externalLogger.send(entry);
    }
  }

  /**
   * Map error severity to log level
   */
  private mapSeverityToLogLevel(severity: string): LogLevel {
    const severityMap: Record<string, LogLevel> = {
      'low': LogLevel.INFO,
      'medium': LogLevel.WARN,
      'high': LogLevel.ERROR,
      'critical': LogLevel.FATAL
    };
    
    return severityMap[severity] || LogLevel.ERROR;
  }

  /**
   * Create operation logger decorator
   */
  static createOperationLogger(serviceName: string) {
    const logger = new StructuredErrorLogger(serviceName);
    
    return function LogOperation(operationName?: string) {
      return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const operation = operationName || `${target.constructor.name}.${propertyName}`;

        descriptor.value = async function (...args: any[]) {
          return logger.withLogging(
            operation,
            () => method.apply(this, args),
            {
              className: target.constructor.name,
              methodName: propertyName,
              argumentCount: args.length
            }
          );
        };

        return descriptor;
      };
    };
  }
}

/**
 * Global structured logger factory
 */
export class StructuredLoggerFactory {
  private static loggers = new Map<string, StructuredErrorLogger>();

  /**
   * Get or create logger for service
   */
  static getLogger(serviceName: string): StructuredErrorLogger {
    if (!this.loggers.has(serviceName)) {
      this.loggers.set(serviceName, new StructuredErrorLogger(serviceName));
    }
    return this.loggers.get(serviceName)!;
  }

  /**
   * Configure global logging settings
   */
  static configure(config: {
    enableExternalLogging?: boolean;
    logLevel?: LogLevel;
    enablePerformanceLogging?: boolean;
    enableCorrelationLogging?: boolean;
  }): void {
    // Apply global configuration
    if (config.enableExternalLogging !== undefined) {
      process.env.EXTERNAL_LOGGING_ENABLED = config.enableExternalLogging.toString();
    }
    
    // Additional configuration logic here
  }

  /**
   * Clear all logger instances (useful for testing)
   */
  static clearLoggers(): void {
    this.loggers.clear();
  }
}