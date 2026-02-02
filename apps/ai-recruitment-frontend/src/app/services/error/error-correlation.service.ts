import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

/**
 * Defines the shape of the error correlation context.
 */
export interface ErrorCorrelationContext {
  traceId: string;
  spanId: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  referrer?: string;
}

/**
 * Defines the shape of the structured error.
 */
export interface StructuredError {
  correlationId: string;
  errorCode: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'runtime' | 'security' | 'business';
  context: ErrorCorrelationContext;
  stack?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  userAction?: string;
  recoverable: boolean;
}

/**
 * Provides error correlation functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorCorrelationService {
  private readonly currentContext =
    new BehaviorSubject<ErrorCorrelationContext>(this.generateContext());
  private readonly errorHistory: StructuredError[] = [];
  private readonly maxHistorySize = 50;

  /**
   * Initializes a new instance of the Error Correlation Service.
   */
  constructor() {
    // Generate new context on page navigation
    this.setupNavigationListener();

    // Initialize session context
    this.initializeSession();
  }

  /**
   * Get current correlation context
   */
  getContext(): ErrorCorrelationContext {
    return this.currentContext.value;
  }

  /**
   * Get correlation context as observable
   */
  getContext$(): Observable<ErrorCorrelationContext> {
    return this.currentContext.asObservable();
  }

  /**
   * Generate HTTP headers with correlation information
   */
  getCorrelationHeaders(): HttpHeaders {
    const context = this.getContext();
    return new HttpHeaders({
      'X-Correlation-ID': context.traceId,
      'X-Span-ID': context.spanId,
      'X-Session-ID': context.sessionId,
      'X-User-Agent': context.userAgent,
      'X-Frontend-Version': this.getFrontendVersion(),
    });
  }

  /**
   * Create structured error with correlation
   */
  createStructuredError(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: Error | any,
    category: StructuredError['category'] = 'runtime',
    severity: StructuredError['severity'] = 'medium',
    userAction?: string,
  ): StructuredError {
    const context = this.getContext();
    const errorCode = this.generateErrorCode(error, category);

    const structuredError: StructuredError = {
      correlationId: context.traceId,
      errorCode,
      message: this.extractErrorMessage(error),
      severity,
      category,
      context,
      stack: error?.stack,
      metadata: this.extractMetadata(error),
      userAction,
      recoverable: this.isRecoverable(error, category),
    };

    // Add to history
    this.addToHistory(structuredError);

    return structuredError;
  }

  /**
   * Report error to backend (with correlation)
   */
  async reportError(error: StructuredError): Promise<void> {
    if (!this.shouldReport(error)) {
      return;
    }

    try {
      // Send to backend error reporting endpoint
      const corr = this.getCorrelationHeaders();
      const extraHeaders: Record<string, string> = {};
      corr.keys().forEach((k) => {
        const v = corr.get(k);
        if (v) extraHeaders[k] = v;
      });
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify({
          ...error,
          frontendVersion: this.getFrontendVersion(),
          browserInfo: this.getBrowserInfo(),
          performanceMetrics: this.getPerformanceMetrics(),
        }),
      });
    } catch (reportingError) {
      // Fallback: store locally for later retry
      this.storeErrorForRetry(error);
      console.warn('Failed to report error:', reportingError);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): readonly StructuredError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory.length = 0;
    sessionStorage.removeItem('error-correlation-history');
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    bySeverity: Record<StructuredError['severity'], number>;
    byCategory: Record<StructuredError['category'], number>;
    errorRate: number;
    lastErrorTime?: Date;
  } {
    const now = Date.now();
    const timeWindow = 60 * 60 * 1000; // 1 hour
    const recentErrors = this.errorHistory.filter(
      (e) => now - e.context.timestamp.getTime() < timeWindow,
    );

    return {
      total: this.errorHistory.length,
      bySeverity: this.groupBy(this.errorHistory, 'severity'),
      byCategory: this.groupBy(this.errorHistory, 'category'),
      errorRate: recentErrors.length,
      lastErrorTime:
        this.errorHistory.length > 0
          ? this.errorHistory[this.errorHistory.length - 1].context.timestamp
          : undefined,
    };
  }

  private generateContext(): ErrorCorrelationContext {
    return {
      traceId: this.generateUUID(),
      spanId: this.generateShortId(),
      userId: this.getUserId(),
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer || undefined,
    };
  }

  private setupNavigationListener(): void {
    // Listen for navigation changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const updateContext = () => {
      const newContext = this.generateContext();
      newContext.sessionId = this.currentContext.value.sessionId; // Keep session ID
      this.currentContext.next(newContext);
    };

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      updateContext();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      updateContext();
    };

    window.addEventListener('popstate', updateContext);
  }

  private initializeSession(): void {
    // Load error history from session storage
    const stored = sessionStorage.getItem('error-correlation-history');
    if (stored) {
      try {
        const parsedHistory = JSON.parse(stored);
        this.errorHistory.push(...parsedHistory.slice(-this.maxHistorySize));
      } catch (e) {
        // Invalid stored data
        sessionStorage.removeItem('error-correlation-history');
      }
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getUserId(): string | undefined {
    // Get user ID from localStorage, session, or token
    return localStorage.getItem('userId') || undefined;
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generateErrorCode(error: any, category: string): string {
    if (error?.name) {
      return `${category.toUpperCase()}_${error.name.toUpperCase()}`;
    }
    if (error?.status) {
      return `HTTP_${error.status}`;
    }
    return `${category.toUpperCase()}_UNKNOWN`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return 'Unknown error occurred';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractMetadata(error: any): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: Record<string, any> = {};

    if (error?.status) metadata.httpStatus = error.status;
    if (error?.url) metadata.requestUrl = error.url;
    if (error?.name) metadata.errorName = error.name;
    if (error?.code) metadata.errorCode = error.code;

    return metadata;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isRecoverable(error: any, category: string): boolean {
    // Network errors are usually recoverable
    if (category === 'network') return true;

    // HTTP errors - most are recoverable except 4xx client errors
    if (error?.status) {
      return (
        error.status >= 500 || error.status === 408 || error.status === 429
      );
    }

    // Runtime errors - depends on type
    if (category === 'runtime') {
      const nonRecoverablePatterns = [
        /out of memory/i,
        /maximum call stack/i,
        /cannot read prop.*undefined/i,
      ];
      return !nonRecoverablePatterns.some((pattern) =>
        pattern.test(this.extractErrorMessage(error)),
      );
    }

    return false;
  }

  private addToHistory(error: StructuredError): void {
    this.errorHistory.push(error);

    // Keep only recent errors
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Store in session storage
    try {
      sessionStorage.setItem(
        'error-correlation-history',
        JSON.stringify(this.errorHistory),
      );
    } catch (e) {
      // Storage full, clear old errors
      this.errorHistory.splice(0, 10);
      try {
        sessionStorage.setItem(
          'error-correlation-history',
          JSON.stringify(this.errorHistory),
        );
      } catch (e) {
        // Still can't store, disable storage
      }
    }
  }

  private shouldReport(error: StructuredError): boolean {
    // Don't report duplicate errors within short time window
    const duplicateWindow = 30 * 1000; // 30 seconds
    const now = Date.now();

    const recentDuplicate = this.errorHistory.find(
      (e) =>
        e.errorCode === error.errorCode &&
        now - e.context.timestamp.getTime() < duplicateWindow,
    );

    if (recentDuplicate) return false;

    // Don't report low severity errors in production
    if (!this.isDevelopment() && error.severity === 'low') return false;

    return true;
  }

  private storeErrorForRetry(error: StructuredError): void {
    const stored = localStorage.getItem('pending-error-reports') || '[]';
    try {
      const pending = JSON.parse(stored);
      pending.push(error);

      // Keep only last 10 pending reports
      if (pending.length > 10) {
        pending.splice(0, pending.length - 10);
      }

      localStorage.setItem('pending-error-reports', JSON.stringify(pending));
    } catch (e) {
      // Failed to store
    }
  }

  private getFrontendVersion(): string {
    return '1.0.0'; // Get from environment or package.json
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getBrowserInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getPerformanceMetrics(): Record<string, any> {
    if (!window.performance) return {};

    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    if (!navigation) return {};

    return {
      domContentLoaded: Math.round(
        navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
      ),
      loadComplete: Math.round(
        navigation.loadEventEnd - navigation.loadEventStart,
      ),
      firstPaint: this.getFirstPaintTime(),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  private getFirstPaintTime(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(
      (entry) => entry.name === 'first-paint',
    );
    return firstPaint ? Math.round(firstPaint.startTime) : undefined;
  }

  private getMemoryUsage(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  } | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performanceWithMemory = (window as any)?.performance?.memory;

    return performanceWithMemory
      ? {
          usedJSHeapSize: performanceWithMemory.usedJSHeapSize || 0,
          totalJSHeapSize: performanceWithMemory.totalJSHeapSize || 0,
          jsHeapSizeLimit: performanceWithMemory.jsHeapSizeLimit || 0,
        }
      : null;
  }

  private groupBy<T extends Record<string, any>>(
    array: T[],
    key: keyof T,
  ): Record<string, number> {
    return array.reduce(
      (acc, item) => {
        const value = String(item[key]);
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private isDevelopment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('127.') ||
      window.location.hostname.startsWith('192.')
    );
  }
}
