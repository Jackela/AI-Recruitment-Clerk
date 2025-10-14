import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  LOG = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Defines the shape of the log entry.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: Date;
  error?: Error;
}

/**
 * Provides logger functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly isDevelopment = !environment.production;
  private readonly logLevel: LogLevel = this.isDevelopment
    ? LogLevel.DEBUG
    : LogLevel.WARN;
  private readonly maxLogEntries = 1000;
  private logHistory: LogEntry[] = [];

  /**
   * Log an informational message
   */
  log(message: string, context?: string, data?: any): void {
    this.writeLog(LogLevel.LOG, message, context, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, data?: any): void {
    this.writeLog(LogLevel.WARN, message, context, data);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: string, error?: Error | any): void {
    this.writeLog(LogLevel.ERROR, message, context, undefined, error);
  }

  /**
   * Log a debug message (development only)
   */
  debug(message: string, context?: string, data?: any): void {
    this.writeLog(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Log performance metrics
   */
  performance(
    operation: string,
    duration: number,
    context?: string,
    data?: any,
  ): void {
    const message = `⚡ ${operation} completed in ${duration}ms`;
    this.writeLog(LogLevel.LOG, message, context, {
      operation,
      duration,
      ...data,
    });
  }

  /**
   * Log user actions for analytics
   */
  userAction(action: string, context?: string, data?: any): void {
    const message = `👤 User action: ${action}`;
    this.writeLog(LogLevel.LOG, message, context, { action, ...data });
  }

  /**
   * Log API calls and responses
   */
  api(
    method: string,
    url: string,
    status: number,
    duration?: number,
    context?: string,
  ): void {
    const message = `🌐 ${method} ${url} → ${status}${duration ? ` (${duration}ms)` : ''}`;
    this.writeLog(LogLevel.LOG, message, context, {
      method,
      url,
      status,
      duration,
    });
  }

  /**
   * Get recent log entries (for debugging)
   */
  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Core logging method
   */
  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error,
  ): void {
    // Check if we should log at this level
    if (level < this.logLevel) {
      return;
    }

    const timestamp = new Date();
    const logEntry: LogEntry = {
      level,
      message,
      context,
      data,
      timestamp,
      error,
    };

    // Add to history
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxLogEntries) {
      this.logHistory.shift();
    }

    // Format and output to console in development
    if (this.isDevelopment) {
      this.outputToConsole(logEntry);
    }

    // In production, only output errors and warnings
    if (!this.isDevelopment && level >= LogLevel.WARN) {
      this.outputToConsole(logEntry);
    }

    // Send to external logging service if configured
    if (environment.production && level >= LogLevel.ERROR) {
      this.sendToRemoteLogging(logEntry);
    }
  }

  /**
   * Output log entry to browser console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}]`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const fullMessage = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, entry.data);
        break;
      case LogLevel.LOG:
        console.log(fullMessage, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, entry.data);
        break;
      case LogLevel.ERROR:
        if (entry.error) {
          console.error(fullMessage, entry.error, entry.data);
        } else {
          console.error(fullMessage, entry.data);
        }
        break;
    }
  }

  /**
   * Send error logs to remote logging service
   */
  private sendToRemoteLogging(entry: LogEntry): void {
    // TODO: Implement remote logging integration
    // This could send to services like Sentry, LogRocket, or custom backend
    try {
      if (entry.level >= LogLevel.ERROR) {
        // Example: Send to analytics or error tracking service
        // analytics.track('error_logged', { message: entry.message, context: entry.context });
      }
    } catch (err) {
      // Silently fail to avoid logging loops
    }
  }

  /**
   * Create a logger instance for a specific component/service
   */
  createLogger(context: string) {
    return {
      log: (message: string, data?: any) => this.log(message, context, data),
      warn: (message: string, data?: any) => this.warn(message, context, data),
      error: (message: string, error?: Error | any) =>
        this.error(message, context, error),
      debug: (message: string, data?: any) =>
        this.debug(message, context, data),
      performance: (operation: string, duration: number, data?: any) =>
        this.performance(operation, duration, context, data),
      userAction: (action: string, data?: any) =>
        this.userAction(action, context, data),
      api: (method: string, url: string, status: number, duration?: number) =>
        this.api(method, url, status, duration, context),
    };
  }
}

/**
 * Logger decorator for automatic context injection
 */
export function Logger(context?: string) {
  return function (target: any, propertyKey: string) {
    const loggerContext = context || target.constructor.name;

    Object.defineProperty(target, propertyKey, {
      get: function () {
        if (!this._logger) {
          const loggerService = new LoggerService();
          this._logger = loggerService.createLogger(loggerContext);
        }
        return this._logger;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
