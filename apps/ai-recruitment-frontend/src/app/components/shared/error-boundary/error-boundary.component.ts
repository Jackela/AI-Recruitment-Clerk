import { Component, ErrorHandler, Injectable, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { ErrorCorrelationService, StructuredError } from '../../../services/error/error-correlation.service';

export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: Date;
  url?: string;
  componentName?: string;
  correlationId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'network' | 'validation' | 'runtime' | 'security' | 'business';
  recoverable?: boolean;
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private toastService: ToastService,
    private router: Router,
    private errorCorrelation: ErrorCorrelationService
  ) {}

  handleError(error: Error): void {
    try {
      // Create structured error with correlation
      const structuredError = this.errorCorrelation.createStructuredError(
        error,
        this.categorizeError(error),
        this.getSeverity(error),
        'Global Error Handler'
      );

      // Enhanced error logging
      this.logStructuredError(error, structuredError);

      // Parse error information for UI
      const errorInfo = this.parseError(error, structuredError);

      // Report error to backend (async)
      this.errorCorrelation.reportError(structuredError).catch(() => {});

      // Show user-friendly error notification
      this.showErrorNotification(errorInfo, structuredError);

      // Store error for error boundary component
      this.storeError(errorInfo);

      // Handle recovery or navigation based on severity
      this.handleErrorRecovery(error, structuredError, errorInfo);
      
    } catch (handlerError) {
      // Prevent infinite recursion in error handler
      console.error('Error in Global Error Handler:', handlerError);
      this.fallbackErrorHandling(error);
    }
  }

  private parseError(error: Error, structuredError: StructuredError): ErrorInfo {
    const errorInfo: ErrorInfo = {
      message: structuredError.message || error.message || '发生了未知错误',
      stack: error.stack,
      timestamp: structuredError.context.timestamp,
      url: structuredError.context.url,
      correlationId: structuredError.correlationId,
      severity: structuredError.severity,
      category: structuredError.category,
      recoverable: structuredError.recoverable
    };

    // Enhanced component name extraction
    if (error.stack) {
      const componentMatch = error.stack.match(/at (\w+(?:Component|Service|Directive|Pipe))/);
      if (componentMatch) {
        errorInfo.componentName = componentMatch[1];
      }
    }

    return errorInfo;
  }

  private showErrorNotification(errorInfo: ErrorInfo, structuredError: StructuredError): void {
    let message = errorInfo.message;

    // Add context for better user understanding
    if (errorInfo.componentName) {
      message = `组件错误 (${errorInfo.componentName}): ${message}`;
    } else if (errorInfo.category) {
      const categoryNames = {
        runtime: '运行时',
        network: '网络',
        validation: '验证',
        security: '安全',
        business: '业务'
      };
      message = `${categoryNames[errorInfo.category] || ''}错误: ${message}`;
    } else {
      message = `应用错误: ${message}`;
    }

    // Add correlation ID in development for debugging
    if (this.isDevelopment() && errorInfo.correlationId) {
      message += ` (ID: ${errorInfo.correlationId.slice(-8)})`;
    }

    // Show appropriate notification based on severity
    const duration = this.getNotificationDuration(errorInfo.severity || 'medium');
    
    switch (errorInfo.severity) {
      case 'critical':
        this.toastService.error(message, duration);
        break;
      case 'high':
        this.toastService.error(message, duration);
        break;
      case 'medium':
        this.toastService.warning(message, duration);
        break;
      case 'low':
        this.toastService.info(message, duration);
        break;
      default:
        this.toastService.error(message, duration);
    }
  }

  private storeError(errorInfo: ErrorInfo): void {
    // Store error in session storage for error boundary component
    const errors = this.getStoredErrors();
    errors.push(errorInfo);
    
    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.shift();
    }

    sessionStorage.setItem('app-errors', JSON.stringify(errors));
  }

  private getStoredErrors(): ErrorInfo[] {
    const stored = sessionStorage.getItem('app-errors');
    return stored ? JSON.parse(stored) : [];
  }

  private categorizeError(error: Error): 'network' | 'validation' | 'runtime' | 'security' | 'business' {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
      return 'network';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }

    // Security-related errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'security';
    }

    // Business logic errors
    if (message.includes('business') || message.includes('rule') || message.includes('constraint')) {
      return 'business';
    }

    // Default to runtime errors
    return 'runtime';
  }

  private getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message?.toLowerCase() || '';
    
    // Critical errors that can crash the app
    const criticalPatterns = [
      /out of memory/i,
      /maximum call stack/i,
      /script error/i
    ];

    // High severity errors that significantly impact functionality
    const highPatterns = [
      /cannot read prop.*undefined/i,
      /cannot read prop.*null/i,
      /is not a function/i,
      /permission denied/i
    ];

    // Medium severity errors
    const mediumPatterns = [
      /validation/i,
      /invalid/i,
      /not found/i
    ];

    if (criticalPatterns.some(pattern => pattern.test(message))) return 'critical';
    if (highPatterns.some(pattern => pattern.test(message))) return 'high';
    if (mediumPatterns.some(pattern => pattern.test(message))) return 'medium';
    
    return 'medium'; // Default
  }

  private logStructuredError(error: Error, structuredError: StructuredError): void {
    if (!this.isDevelopment()) return;

    console.group(`🔴 Global Error - ${structuredError.correlationId}`);
    console.error('Original Error:', error);
    console.error('Structured Error:', structuredError);
    console.error('Context:', structuredError.context);
    if (structuredError.stack) {
      console.error('Stack Trace:', structuredError.stack);
    }
    console.groupEnd();
  }

  private handleErrorRecovery(
    error: Error, 
    structuredError: StructuredError, 
    errorInfo: ErrorInfo
  ): void {
    // Navigate to error page for critical errors
    if (structuredError.severity === 'critical') {
      this.router.navigate(['/error'], { 
        queryParams: { 
          correlationId: structuredError.correlationId,
          message: errorInfo.message,
          timestamp: errorInfo.timestamp.toISOString(),
          recoverable: structuredError.recoverable.toString()
        }
      });
    }
    // For recoverable errors, attempt automatic recovery
    else if (structuredError.recoverable) {
      this.attemptErrorRecovery(structuredError);
    }
  }

  private attemptErrorRecovery(structuredError: StructuredError): void {
    console.log('Attempting error recovery for:', structuredError.correlationId);
    
    // Implement recovery strategies based on error category
    switch (structuredError.category) {
      case 'network':
        // For network errors, could retry or show offline indicator
        console.log('Network error recovery: checking connectivity');
        break;
      case 'validation':
        // For validation errors, could reset form state
        console.log('Validation error recovery: resetting state');
        break;
      case 'runtime':
        // For runtime errors, could refresh component state
        console.log('Runtime error recovery: refreshing state');
        break;
    }
  }

  private fallbackErrorHandling(originalError: Error): void {
    // Last resort error handling when structured approach fails
    console.error('Fallback Error Handler:', originalError);
    
    // Simple error storage
    try {
      const simpleError = {
        message: originalError.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        url: window.location.href
      };
      sessionStorage.setItem('last_error', JSON.stringify(simpleError));
    } catch (e) {
      // Even storage failed, nothing we can do
    }

    // Simple user notification
    this.toastService.error('系统发生错误，请刷新页面', 10000);
  }

  private getNotificationDuration(severity: string): number {
    switch (severity) {
      case 'critical': return 15000;
      case 'high': return 12000;
      case 'medium': return 8000;
      case 'low': return 5000;
      default: return 8000;
    }
  }

  private isDevelopment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.startsWith('127.') ||
           window.location.hostname.startsWith('192.');
  }
}

@Component({
  selector: 'arc-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-boundary-container" *ngIf="hasError()">
      <div class="error-content">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <h1 class="error-title">哎呀，出错了！</h1>
        
        <p class="error-message">{{ errorMessage() }}</p>

        <div class="error-details" *ngIf="showDetails()">
          <h3>错误详情</h3>
          <div class="error-info">
            <p><strong>时间:</strong> {{ errorTimestamp() | date:'medium' }}</p>
            <p *ngIf="componentName()"><strong>组件:</strong> {{ componentName() }}</p>
            <p><strong>URL:</strong> {{ errorUrl() }}</p>
          </div>
          
          <div class="error-stack" *ngIf="isDevelopment() && errorStack()">
            <h4>Stack Trace:</h4>
            <pre>{{ errorStack() }}</pre>
          </div>
        </div>

        <div class="error-actions">
          <button (click)="reload()" class="btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            刷新页面
          </button>
          
          <button (click)="goHome()" class="btn-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
            返回首页
          </button>

          <button (click)="toggleDetails()" class="btn-link">
            {{ showDetails() ? '隐藏' : '显示' }}详情
          </button>
        </div>

        <div class="error-history" *ngIf="errorHistory().length > 1">
          <h3>最近的错误 ({{ errorHistory().length }})</h3>
          <ul>
            <li *ngFor="let error of errorHistory(); let i = index">
              <span class="error-time">{{ error.timestamp | date:'short' }}</span>
              <span class="error-msg">{{ error.message }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Normal content when no error -->
    <ng-content *ngIf="!hasError()"></ng-content>
  `,
  styles: [`
    .error-boundary-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .error-content {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    .error-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: #fee;
      border-radius: 50%;
      margin-bottom: 1.5rem;
      color: #ef4444;
    }

    .error-title {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 1rem;
    }

    .error-message {
      font-size: 1.125rem;
      color: #6b7280;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .error-details {
      background: #f9fafb;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .error-details h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
    }

    .error-info p {
      margin: 0.5rem 0;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .error-info strong {
      color: #111827;
      font-weight: 600;
    }

    .error-stack {
      margin-top: 1rem;
    }

    .error-stack h4 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .error-stack pre {
      background: #111827;
      color: #10b981;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.75rem;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }

    .error-actions button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-link {
      background: transparent;
      color: #6366f1;
      text-decoration: underline;
    }

    .btn-link:hover {
      color: #4f46e5;
    }

    .error-history {
      background: #fef2f2;
      border-radius: 12px;
      padding: 1rem;
      text-align: left;
    }

    .error-history h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 0.75rem;
    }

    .error-history ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .error-history li {
      display: flex;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #fecaca;
      font-size: 0.75rem;
    }

    .error-history li:last-child {
      border-bottom: none;
    }

    .error-time {
      color: #dc2626;
      font-weight: 600;
      white-space: nowrap;
    }

    .error-msg {
      color: #7f1d1d;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      .error-content {
        padding: 2rem 1.5rem;
      }

      .error-title {
        font-size: 1.5rem;
      }

      .error-actions {
        flex-direction: column;
      }

      .error-actions button {
        width: 100%;
      }
    }
  `]
})
export class ErrorBoundaryComponent implements OnInit {
  // Error state
  hasError = signal(false);
  errorMessage = signal('页面遇到了一个意外错误。请刷新页面重试。');
  errorStack = signal<string | undefined>(undefined);
  errorTimestamp = signal<Date>(new Date());
  errorUrl = signal<string>('');
  componentName = signal<string | undefined>(undefined);
  
  // UI state
  showDetails = signal(false);
  errorHistory = signal<ErrorInfo[]>([]);

  constructor(
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Check for stored errors
    this.loadErrorHistory();

    // Listen for navigation errors
    this.router.events.subscribe(event => {
      // Reset error state on successful navigation
      if (event.constructor.name === 'NavigationEnd') {
        this.resetError();
      }
    });
  }

  private loadErrorHistory(): void {
    const stored = sessionStorage.getItem('app-errors');
    if (stored) {
      try {
        const errors = JSON.parse(stored) as ErrorInfo[];
        this.errorHistory.set(errors);
        
        // Display the most recent error if any
        if (errors.length > 0) {
          const latestError = errors[errors.length - 1];
          this.displayError(latestError);
        }
      } catch (e) {
        // Invalid stored data, clear it
        sessionStorage.removeItem('app-errors');
      }
    }
  }

  displayError(errorInfo: ErrorInfo): void {
    this.hasError.set(true);
    this.errorMessage.set(errorInfo.message);
    this.errorStack.set(errorInfo.stack);
    this.errorTimestamp.set(errorInfo.timestamp);
    this.errorUrl.set(errorInfo.url || window.location.href);
    this.componentName.set(errorInfo.componentName);
  }

  resetError(): void {
    this.hasError.set(false);
    this.showDetails.set(false);
  }

  reload(): void {
    window.location.reload();
  }

  goHome(): void {
    this.resetError();
    this.router.navigate(['/']);
  }

  toggleDetails(): void {
    this.showDetails.update(value => !value);
  }

  isDevelopment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.startsWith('127.') ||
           window.location.hostname.startsWith('192.');
  }

  clearHistory(): void {
    sessionStorage.removeItem('app-errors');
    this.errorHistory.set([]);
    this.toastService.info('错误历史已清除');
  }
}