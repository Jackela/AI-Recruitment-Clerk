import type { OnInit } from '@angular/core';
import {
  Component,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { ErrorDisplayComponent } from './error-display.component';

// Re-export GlobalErrorHandler for backward compatibility
export { GlobalErrorHandler } from './global-error-handler';

/**
 * Defines the shape of the error info.
 */
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

/**
 * Represents the error boundary component.
 * Acts as an orchestrator that delegates UI to ErrorDisplayComponent.
 * Catches and displays errors with recovery options.
 */
@Component({
  selector: 'arc-error-boundary',
  standalone: true,
  imports: [CommonModule, ErrorDisplayComponent],
  template: `
    @if (hasError()) {
      <arc-error-display
        [errorData]="errorDisplayData()"
        [showDetails]="showDetails()"
        [errorHistory]="errorHistory()"
        [isDevMode]="isDevelopment()"
        (reload)="reload()"
        (goHome)="goHome()"
        (toggleDetails)="toggleDetails()"
      />
    } @else {
      <ng-content></ng-content>
    }
  `,
  styles: [],
})
export class ErrorBoundaryComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // Error state
  public hasError = signal(false);
  public errorMessage = signal('页面遇到了一个意外错误。请刷新页面重试。');
  public errorStack = signal<string | undefined>(undefined);
  public errorTimestamp = signal<Date>(new Date());
  public errorUrl = signal<string>('');
  public componentName = signal<string | undefined>(undefined);

  // UI state
  public showDetails = signal(false);
  public errorHistory = signal<ErrorInfo[]>([]);

  /**
   * Computed signal for error display data.
   */
  public errorDisplayData = signal<import('./error-display.component').ErrorDisplayData>({
    message: '',
    timestamp: new Date(),
  });

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Check for stored errors
    this.loadErrorHistory();

    // Listen for navigation events to reset error state
    this.router.events.subscribe((event) => {
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
      } catch (_e) {
        // Invalid stored data, clear it
        sessionStorage.removeItem('app-errors');
      }
    }
  }

  /**
   * Performs the display error operation.
   * @param errorInfo - The error info.
   */
  public displayError(errorInfo: ErrorInfo): void {
    this.hasError.set(true);
    this.errorMessage.set(errorInfo.message);
    this.errorStack.set(errorInfo.stack);
    this.errorTimestamp.set(errorInfo.timestamp);
    this.errorUrl.set(errorInfo.url || window.location.href);
    this.componentName.set(errorInfo.componentName);

    // Update display data
    this.errorDisplayData.set({
      message: errorInfo.message,
      stack: errorInfo.stack,
      timestamp: errorInfo.timestamp,
      url: errorInfo.url || window.location.href,
      componentName: errorInfo.componentName,
      correlationId: errorInfo.correlationId,
      severity: errorInfo.severity,
      category: errorInfo.category,
      recoverable: errorInfo.recoverable,
    });
  }

  /**
   * Performs the reset error operation.
   */
  public resetError(): void {
    this.hasError.set(false);
    this.showDetails.set(false);
  }

  /**
   * Performs the reload operation.
   */
  public reload(): void {
    window.location.reload();
  }

  /**
   * Performs the go home operation.
   */
  public goHome(): void {
    this.resetError();
    this.router.navigate(['/']);
  }

  /**
   * Performs the toggle details operation.
   */
  public toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  /**
   * Performs the is development operation.
   * @returns The boolean value.
   */
  public isDevelopment(): boolean {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('127.') ||
      window.location.hostname.startsWith('192.')
    );
  }

  /**
   * Performs the clear history operation.
   */
  public clearHistory(): void {
    sessionStorage.removeItem('app-errors');
    this.errorHistory.set([]);
    this.toastService.info('错误历史已清除');
  }
}
