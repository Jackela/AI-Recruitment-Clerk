import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import {
  ErrorCorrelationService,
  StructuredError,
} from './error-correlation.service';

/**
 * Defines the shape of the error report.
 */
export interface ErrorReport {
  errors: StructuredError[];
  userFeedback?: string;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo: Record<string, string | number | boolean | undefined>;
  systemInfo: Record<string, string | number | boolean>;
  timestamp: Date;
}

/**
 * Defines the shape of the error report submission.
 */
export interface ErrorReportSubmission {
  reportId: string;
  submittedAt: Date;
  status: 'pending' | 'submitted' | 'failed';
  retryCount: number;
}

/**
 * Provides error reporting functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorReportingService {
  private readonly pendingReports: ErrorReportSubmission[] = [];
  private readonly maxRetryAttempts = 3;
  private readonly retryDelay = 2000;
  private readonly http = inject(HttpClient);
  private readonly errorCorrelation = inject(ErrorCorrelationService);

  /**
   * Initializes a new instance of the Error Reporting Service.
   * @param http - The http.
   * @param errorCorrelation - The error correlation.
   */
  constructor() {
    // Initialize pending reports from storage
    this.loadPendingReports();

    // Process pending reports on startup
    this.processPendingReports();

    // Set up periodic retry of failed reports
    setInterval(() => this.processPendingReports(), 60000); // Every minute
  }

  /**
   * Submit user error report
   */
  submitErrorReport(
    errors: StructuredError[],
    userFeedback?: string,
    reproductionSteps?: string[],
    expectedBehavior?: string,
    actualBehavior?: string,
  ): Observable<{ reportId: string; submitted: boolean }> {
    const report: ErrorReport = {
      errors,
      userFeedback,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      browserInfo: this.getBrowserInfo(),
      systemInfo: this.getSystemInfo(),
      timestamp: new Date(),
    };

    const reportId = this.generateReportId();

    // Add to pending queue
    const submission: ErrorReportSubmission = {
      reportId,
      submittedAt: new Date(),
      status: 'pending',
      retryCount: 0,
    };

    this.pendingReports.push(submission);
    this.savePendingReports();

    // Store report data
    this.storeReport(reportId, report);

    // Attempt immediate submission
    return this.submitReport(reportId, report).pipe(
      catchError((error) => {
        console.warn('Failed to submit error report immediately:', error);
        return of({ reportId, submitted: false });
      }),
    );
  }

  /**
   * Get error report for display
   */
  generateErrorReportSummary(errors: StructuredError[]): {
    summary: string;
    technicalDetails: string;
    userGuidance: string;
  } {
    const errorCount = errors.length;
    const categories = [...new Set(errors.map((e) => e.category))];
    const severities = [...new Set(errors.map((e) => e.severity))];
    const highestSeverity = this.getHighestSeverity(severities);

    // Generate user-friendly summary
    const summary = this.generateUserFriendlySummary(
      errorCount,
      categories,
      highestSeverity,
    );

    // Generate technical details
    const technicalDetails = this.generateTechnicalSummary(errors);

    // Generate user guidance
    const userGuidance = this.generateUserGuidance(
      categories,
      highestSeverity,
      errors,
    );

    return {
      summary,
      technicalDetails,
      userGuidance,
    };
  }

  /**
   * Get user-friendly error categories for reporting UI
   */
  getUserFriendlyCategories(): Array<{
    key: string;
    label: string;
    description: string;
    icon: string;
  }> {
    return [
      {
        key: 'ui_issue',
        label: '界面问题',
        description: '按钮无响应、页面显示异常、布局错乱等',
        icon: '🖥️',
      },
      {
        key: 'functionality_issue',
        label: '功能问题',
        description: '功能无法正常使用、操作失败等',
        icon: '⚙️',
      },
      {
        key: 'performance_issue',
        label: '性能问题',
        description: '页面加载慢、操作卡顿等',
        icon: '🐌',
      },
      {
        key: 'data_issue',
        label: '数据问题',
        description: '数据显示错误、丢失、同步问题等',
        icon: '📊',
      },
      {
        key: 'accessibility_issue',
        label: '可访问性问题',
        description: '键盘导航、屏幕阅读器支持等',
        icon: '♿',
      },
      {
        key: 'other',
        label: '其他问题',
        description: '不属于以上类别的问题',
        icon: '❓',
      },
    ];
  }

  /**
   * Get error report status
   */
  getReportStatus(reportId: string): ErrorReportSubmission | null {
    return this.pendingReports.find((r) => r.reportId === reportId) || null;
  }

  /**
   * Get all pending reports
   */
  getPendingReports(): readonly ErrorReportSubmission[] {
    return [...this.pendingReports];
  }

  /**
   * Clear all pending reports (for testing/debugging)
   */
  clearPendingReports(): void {
    this.pendingReports.length = 0;
    localStorage.removeItem('pending_error_reports');
    localStorage.removeItem('error_report_data');
  }

  private submitReport(
    reportId: string,
    report: ErrorReport,
  ): Observable<{ reportId: string; submitted: boolean }> {
    const headers = this.errorCorrelation.getCorrelationHeaders();

    return this.http
      .post<{ reportId: string; submitted: boolean }>(
        '/api/errors/user-reports',
        {
          reportId,
          ...report,
        },
        { headers },
      )
      .pipe(
        retry({
          count: this.maxRetryAttempts,
          delay: this.retryDelay,
        }),
        catchError((error) => {
          console.error('Failed to submit error report:', error);
          throw error;
        }),
      );
  }

  private processPendingReports(): void {
    const pendingReports = this.pendingReports.filter(
      (r) =>
        r.status === 'pending' ||
        (r.status === 'failed' && r.retryCount < this.maxRetryAttempts),
    );

    pendingReports.forEach((submission) => {
      const report = this.getStoredReport(submission.reportId);
      if (!report) return;

      this.submitReport(submission.reportId, report).subscribe({
        next: () => {
          submission.status = 'submitted';
          this.savePendingReports();
          console.log(
            'Error report submitted successfully:',
            submission.reportId,
          );
        },
        error: (error) => {
          submission.status = 'failed';
          submission.retryCount++;
          this.savePendingReports();
          console.error(
            'Failed to submit error report:',
            submission.reportId,
            error,
          );
        },
      });
    });
  }

  private generateReportId(): string {
    return `error_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeReport(reportId: string, report: ErrorReport): void {
    try {
      const stored = localStorage.getItem('error_report_data') || '{}';
      const data = JSON.parse(stored);
      data[reportId] = report;
      localStorage.setItem('error_report_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to store error report:', error);
    }
  }

  private getStoredReport(reportId: string): ErrorReport | null {
    try {
      const stored = localStorage.getItem('error_report_data') || '{}';
      const data = JSON.parse(stored);
      return data[reportId] || null;
    } catch (error) {
      console.warn('Failed to retrieve stored error report:', error);
      return null;
    }
  }

  private loadPendingReports(): void {
    try {
      const stored = localStorage.getItem('pending_error_reports');
      if (stored) {
        const reports = JSON.parse(stored);
        this.pendingReports.push(...reports);
      }
    } catch (error) {
      console.warn('Failed to load pending reports:', error);
    }
  }

  private savePendingReports(): void {
    try {
      localStorage.setItem(
        'pending_error_reports',
        JSON.stringify(this.pendingReports),
      );
    } catch (error) {
      console.warn('Failed to save pending reports:', error);
    }
  }

  private getBrowserInfo(): Record<string, string | number | boolean | undefined> {
    type NavigatorWithConnection = Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
      };
      mozConnection?: NavigatorWithConnection['connection'];
      webkitConnection?: NavigatorWithConnection['connection'];
      deviceMemory?: number;
    };

    const extendedNavigator = navigator as NavigatorWithConnection;
    const connection =
      extendedNavigator.connection ||
      extendedNavigator.mozConnection ||
      extendedNavigator.webkitConnection;

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: Array.isArray(navigator.languages)
        ? navigator.languages.join(',')
        : undefined,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      maxTouchPoints: navigator.maxTouchPoints,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory:
        typeof extendedNavigator.deviceMemory === 'number'
          ? extendedNavigator.deviceMemory
          : undefined,
      connectionEffectiveType: connection?.effectiveType,
      connectionDownlink: connection?.downlink,
      connectionRtt: connection?.rtt,
    };
  }

  private getSystemInfo(): Record<string, string | number | boolean> {
    return {
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      localStorage: this.testLocalStorage(),
      sessionStorage: this.testSessionStorage(),
      indexedDB: this.testIndexedDB(),
      webWorkers: typeof Worker !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
    };
  }

  private generateUserFriendlySummary(
    errorCount: number,
    categories: string[],
    highestSeverity: string,
  ): string {
    const categoryNames = {
      network: '网络连接',
      validation: '数据验证',
      runtime: '程序运行',
      security: '安全',
      business: '业务逻辑',
    };

    const severityNames: Record<string, string> = {
      low: '轻微',
      medium: '中等',
      high: '严重',
      critical: '致命',
    };

    const categoryStr = categories.map((c) => (categoryNames as Record<string, string>)[c] || c).join('、');
    const severityStr = (severityNames as Record<string, string>)[highestSeverity] || highestSeverity;

    if (errorCount === 1) {
      return `检测到1个${severityStr}错误，涉及${categoryStr}功能。`;
    } else {
      return `检测到${errorCount}个错误，最严重级别为${severityStr}，涉及${categoryStr}功能。`;
    }
  }

  private generateTechnicalSummary(errors: StructuredError[]): string {
    const details = errors
      .map(
        (error) =>
          `• ${error.errorCode}: ${error.message} (${error.severity}/${error.category})`,
      )
      .join('\n');

    return `技术详情:\n${details}`;
  }

  private generateUserGuidance(
    categories: string[],
    highestSeverity: string,
    errors: StructuredError[],
  ): string {
    const guidance: string[] = [];

    // General guidance based on severity
    if (highestSeverity === 'critical') {
      guidance.push('• 建议立即刷新页面或重启应用');
    } else if (highestSeverity === 'high') {
      guidance.push('• 建议刷新页面重试');
    }

    // Category-specific guidance
    if (categories.includes('network')) {
      guidance.push('• 检查网络连接是否正常');
      guidance.push('• 确认服务器是否可访问');
    }

    if (categories.includes('validation')) {
      guidance.push('• 检查输入的数据格式是否正确');
      guidance.push('• 确认必填字段已填写完整');
    }

    if (categories.includes('runtime')) {
      guidance.push('• 尝试清除浏览器缓存');
      guidance.push('• 使用最新版本的浏览器');
    }

    // Check for recoverable errors
    const recoverableErrors = errors.filter(
      (structuredError) => structuredError.recoverable,
    );
    if (recoverableErrors.length > 0) {
      guidance.push('• 部分错误可以自动恢复，请稍等片刻');
    }

    return guidance.length > 0
      ? `建议的解决方案:\n${guidance.join('\n')}`
      : '请联系技术支持获取帮助。';
  }

  private getHighestSeverity(severities: string[]): string {
    const order = ['low', 'medium', 'high', 'critical'];
    return severities.reduce((highest, current) =>
      order.indexOf(current) > order.indexOf(highest) ? current : highest,
    );
  }

  private testLocalStorage(): boolean {
    try {
      const test = 'localStorage_test';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testSessionStorage(): boolean {
    try {
      const test = 'sessionStorage_test';
      sessionStorage.setItem(test, 'test');
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testIndexedDB(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}
