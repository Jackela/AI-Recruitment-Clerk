import { Component, signal, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorReportingService } from '../../../services/error/error-reporting.service';
import {
  ErrorCorrelationService,
} from '../../../services/error/error-correlation.service';
import type { StructuredError } from '../../../services/error/error-correlation.service';
import { ToastService } from '../../../services/toast.service';
import type { ErrorSummaryData } from './error-summary-display.component';
import {
  ErrorSummaryDisplayComponent,
} from './error-summary-display.component';
import {
  ErrorReportFormComponent,
} from './error-report-form.component';

/**
 * Represents error reporting component.
 * Provides a modal interface for users to report errors they encounter.
 */
@Component({
  selector: 'arc-error-reporting',
  standalone: true,
  imports: [
    CommonModule,
    ErrorSummaryDisplayComponent,
    ErrorReportFormComponent,
  ],
  template: `
    <div class="error-reporting-modal" *ngIf="isVisible()">
      <div class="modal-backdrop" (click)="close()" (keydown.enter)="close()" (keydown.space)="close()" tabindex="0" role="button" aria-label="Close modal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            错误反馈
          </h2>
          <button type="button" class="close-button" (click)="close()">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Error Summary Display -->
          <arc-error-summary-display
            *ngIf="errorSummary()"
            [summaryData]="errorSummary()!"
          />

          <!-- Error Report Form -->
          <arc-error-report-form
            (handleSubmit)="onSubmit($event)"
            (handleCancel)="close()"
            [submitButtonText]="submitButtonText()"
          />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-reporting-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }

      .modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 2rem;
        border-bottom: 1px solid #e5e7eb;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .modal-header h2 {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .close-button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background-color 0.2s;
      }

      .close-button:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .modal-body {
        padding: 2rem;
        overflow-y: auto;
      }

      @media (max-width: 640px) {
        .error-reporting-modal {
          padding: 1rem;
        }

        .modal-header,
        .modal-body {
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class ErrorReportingComponent {
  private readonly errorReporting = inject(ErrorReportingService);
  private readonly errorCorrelation = inject(ErrorCorrelationService);
  private readonly toastService = inject(ToastService);

  public errors: StructuredError[] = [];

  public isVisible = signal(false);
  public submitButtonText = signal('提交反馈');
  public errorSummary = signal<ErrorSummaryData | null>(null);

  /**
   * Reference to the form component.
   */
  @ViewChild(ErrorReportFormComponent) private formComponent?: ErrorReportFormComponent;

  /**
   * Performs show operation.
   * @param errors - The errors.
   */
  public show(errors?: StructuredError[]): void {
    if (errors && errors.length > 0) {
      this.errors = errors;
      this.errorSummary.set(
        this.errorReporting.generateErrorReportSummary(errors),
      );
    } else {
      // Use recent errors from correlation service
      const recentErrors = this.errorCorrelation.getErrorHistory().slice(-3);
      if (recentErrors.length > 0) {
        this.errors = recentErrors;
        this.errorSummary.set(
          this.errorReporting.generateErrorReportSummary(recentErrors),
        );
      }
    }

    this.isVisible.set(true);
    this.submitButtonText.set('提交反馈');
    this.resetForm();
  }

  /**
   * Performs close operation.
   */
  public close(): void {
    this.isVisible.set(false);
    this.resetForm();
  }

  /**
   * Performs on submit operation.
   * @param data - The form submission data.
   * @returns A promise that resolves when operation completes.
   */
  public async onSubmit(data: {
    formData: {
      category: string;
      feedback: string;
      expectedBehavior: string;
      actualBehavior: string;
      contactInfo: string;
    };
    reproductionSteps: string[];
  }): Promise<void> {
    this.submitButtonText.set('提交中...');

    try {
      const result = await this.errorReporting
        .submitErrorReport(
          this.errors,
          data.formData.feedback,
          data.reproductionSteps.length > 0 ? data.reproductionSteps : undefined,
          data.formData.expectedBehavior || undefined,
          data.formData.actualBehavior || undefined,
        )
        .toPromise();

      if (result?.submitted) {
        this.toastService.success('错误反馈已成功提交，感谢您的反馈！', 5000);
      } else {
        this.toastService.info('错误反馈已保存，将在网络恢复后自动提交', 5000);
      }

      this.close();
    } catch (error) {
      console.error('Failed to submit error report:', error);
      this.toastService.error('提交失败，请稍后重试', 5000);
    } finally {
      this.submitButtonText.set('提交反馈');
    }
  }

  private resetForm(): void {
    this.formComponent?.resetForm();
  }
}
