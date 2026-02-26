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
  metadata?: Record<string, unknown>;
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
  public getContext(): ErrorCorrelationContext {
    return this.currentContext.value;
  }

  /**
   * Get correlation context as observable
   */
  public getContext$(): Observable<ErrorCorrelationContext> {
    return this.currentContext.asObservable();
  }

  /**
   * Generate HTTP headers with correlation information
   */
  public getCorrelationHeaders(): HttpHeaders {
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
  public createStructuredError(
    error: Error | unknown,
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
      stack: error instanceof Error ? error.stack : undefined,
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
  public async reportError(error: StructuredError): Promise<void> {
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
  public getErrorHistory(): readonly StructuredError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  public clearHistory(): void {
    this.errorHistory.length = 0;
    sessionStorage.removeItem('error-correlation-history');
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
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
      bySeverity: this.groupBy(this.errorHistory as unknown as Record<string, unknown>[], 'severity') as Record<StructuredError['severity'], number>,
      byCategory: this.groupBy(this.errorHistory as unknown as Record<string, unknown>[], 'category') as Record<StructuredError['category'], number>,
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

    const updateContext = (): void => {
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
      } catch (_e) {
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

  private generateErrorCode(error: unknown, category: string): string {
    if (error instanceof Error && error.name) {
      return `${category.toUpperCase()}_${error.name.toUpperCase()}`;
    }
    const errorObj = error as { status?: number } | undefined;
    if (errorObj?.status !== undefined) {
      return `HTTP_${errorObj.status}`;
    }
    return `${category.toUpperCase()}_UNKNOWN`;
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error && error.message) return error.message;
    const errorObj = error as { message?: string; error?: { message?: string } } | undefined;
    if (errorObj?.message) return errorObj.message;
    if (errorObj?.error?.message) return errorObj.error.message;
    return 'Unknown error occurred';
  }

  private extractMetadata(error: unknown): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    if (error instanceof Error) {
      metadata.errorName = error.name;
    }

    const errorObj = error as { status?: number; url?: string; code?: string } | undefined;
    if (errorObj?.status !== undefined) metadata.httpStatus = errorObj.status;
    if (errorObj?.url !== undefined) metadata.requestUrl = errorObj.url;
    if (errorObj?.code !== undefined) metadata.errorCode = errorObj.code;

    return metadata;
  }

  private isRecoverable(error: unknown, category: string): boolean {
    // Network errors are usually recoverable
    if (category === 'network') return true;

    // HTTP errors - most are recoverable except 4xx client errors
    const errorObj = error as { status?: number } | undefined;
    if (errorObj?.status !== undefined) {
      return (
        errorObj.status >= 500 || errorObj.status === 408 || errorObj.status === 429
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
    } catch (_e) {
      // Storage full, clear old errors
      this.errorHistory.splice(0, 10);
      try {
        sessionStorage.setItem(
          'error-correlation-history',
          JSON.stringify(this.errorHistory),
        );
      } catch (_e2) {
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
    } catch (_e) {
      // Failed to store
    }
  }

  private getFrontendVersion(): string {
    return '1.0.0'; // Get from environment or package.json
  }

  private getBrowserInfo(): Record<string, unknown> {
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

  private getPerformanceMetrics(): Record<string, unknown> {
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
    const win = window as Window & { performance?: { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } } };
    const performanceWithMemory = win?.performance?.memory;

    return performanceWithMemory
      ? {
          usedJSHeapSize: performanceWithMemory.usedJSHeapSize || 0,
          totalJSHeapSize: performanceWithMemory.totalJSHeapSize || 0,
          jsHeapSizeLimit: performanceWithMemory.jsHeapSizeLimit || 0,
        }
      : null;
  }

  private groupBy<T extends Record<string, unknown>>(
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
