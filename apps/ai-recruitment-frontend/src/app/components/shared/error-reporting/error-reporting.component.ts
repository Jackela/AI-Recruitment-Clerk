import { Component, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ErrorReportingService } from '../../../services/error/error-reporting.service';
import {
  ErrorCorrelationService,
  StructuredError,
} from '../../../services/error/error-correlation.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'arc-error-reporting',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="error-reporting-modal" *ngIf="isVisible()">
      <div class="modal-backdrop" (click)="close()"></div>
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
          <!-- Error Summary -->
          <div class="error-summary" *ngIf="errorSummary()">
            <h3>问题概述</h3>
            <div class="summary-content">
              <p>{{ errorSummary()?.summary }}</p>
              <details class="technical-details">
                <summary>技术详情</summary>
                <pre>{{ errorSummary()?.technicalDetails }}</pre>
              </details>
            </div>
          </div>

          <!-- Error Report Form -->
          <form [formGroup]="reportForm" (ngSubmit)="onSubmit()">
            <!-- Problem Category -->
            <div class="form-group">
              <label for="category">问题类型 *</label>
              <select
                id="category"
                formControlName="category"
                class="form-control"
              >
                <option value="">请选择问题类型</option>
                <option *ngFor="let cat of categories" [value]="cat.key">
                  {{ cat.icon }} {{ cat.label }}
                </option>
              </select>
              <small *ngIf="selectedCategory()" class="help-text">
                {{ selectedCategory()?.description }}
              </small>
            </div>

            <!-- User Feedback -->
            <div class="form-group">
              <label for="feedback">问题描述 *</label>
              <textarea
                id="feedback"
                formControlName="feedback"
                class="form-control"
                rows="4"
                placeholder="请详细描述您遇到的问题..."
              ></textarea>
              <div class="character-count">
                {{ reportForm.get('feedback')?.value?.length || 0 }}/1000
              </div>
            </div>

            <!-- Reproduction Steps -->
            <div class="form-group">
              <label for="reproductionSteps">重现步骤</label>
              <div class="step-inputs">
                <div
                  *ngFor="let step of reproductionSteps(); let i = index"
                  class="step-input"
                >
                  <span class="step-number">{{ i + 1 }}.</span>
                  <input
                    type="text"
                    [value]="step"
                    (input)="updateReproductionStep(i, $event)"
                    class="form-control"
                    placeholder="描述操作步骤..."
                  />
                  <button
                    type="button"
                    (click)="removeReproductionStep(i)"
                    class="remove-step"
                  >
                    <svg
                      width="16"
                      height="16"
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
              </div>
              <button
                type="button"
                (click)="addReproductionStep()"
                class="add-step-btn"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加步骤
              </button>
            </div>

            <!-- Expected vs Actual Behavior -->
            <div class="behavior-group">
              <div class="form-group">
                <label for="expectedBehavior">期望的结果</label>
                <textarea
                  id="expectedBehavior"
                  formControlName="expectedBehavior"
                  class="form-control"
                  rows="2"
                  placeholder="您期望发生什么..."
                ></textarea>
              </div>

              <div class="form-group">
                <label for="actualBehavior">实际的结果</label>
                <textarea
                  id="actualBehavior"
                  formControlName="actualBehavior"
                  class="form-control"
                  rows="2"
                  placeholder="实际发生了什么..."
                ></textarea>
              </div>
            </div>

            <!-- Contact Information -->
            <div class="form-group">
              <label for="contactInfo">联系方式 (可选)</label>
              <input
                id="contactInfo"
                type="email"
                formControlName="contactInfo"
                class="form-control"
                placeholder="如果需要跟进，请留下您的邮箱"
              />
            </div>

            <!-- Submit Actions -->
            <div class="form-actions">
              <button type="button" (click)="close()" class="btn-secondary">
                取消
              </button>
              <button
                type="submit"
                [disabled]="!reportForm.valid || isSubmitting()"
                class="btn-primary"
              >
                <svg
                  *ngIf="isSubmitting()"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="spinner"
                >
                  <path d="M21,12a9,9 0 1,1 -6.219,-8.56"></path>
                </svg>
                {{ isSubmitting() ? '提交中...' : '提交反馈' }}
              </button>
            </div>
          </form>

          <!-- Guidance -->
          <div class="user-guidance" *ngIf="errorSummary()?.userGuidance">
            <h4>建议的解决方案</h4>
            <div
              class="guidance-content"
              [innerHTML]="formatGuidance(errorSummary()!.userGuidance)"
            ></div>
          </div>
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

      .error-summary {
        background: #fef2f2;
        border-left: 4px solid #ef4444;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 2rem;
      }

      .error-summary h3 {
        margin: 0 0 0.5rem 0;
        color: #dc2626;
        font-size: 1rem;
        font-weight: 600;
      }

      .summary-content p {
        margin: 0 0 1rem 0;
        color: #7f1d1d;
      }

      .technical-details {
        margin-top: 1rem;
      }

      .technical-details summary {
        cursor: pointer;
        font-weight: 500;
        color: #dc2626;
        margin-bottom: 0.5rem;
      }

      .technical-details pre {
        background: #f3f4f6;
        border-radius: 6px;
        padding: 1rem;
        overflow-x: auto;
        font-size: 0.875rem;
        color: #374151;
        margin: 0.5rem 0 0 0;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
      }

      .form-control {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 0.2s;
      }

      .form-control:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .help-text {
        display: block;
        margin-top: 0.5rem;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .character-count {
        text-align: right;
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.25rem;
      }

      .step-inputs {
        margin-bottom: 1rem;
      }

      .step-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .step-number {
        flex-shrink: 0;
        width: 24px;
        text-align: center;
        font-weight: 500;
        color: #667eea;
      }

      .step-input .form-control {
        margin-bottom: 0;
      }

      .remove-step {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .remove-step:hover {
        background: #fee2e2;
      }

      .add-step-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: 2px dashed #d1d5db;
        color: #6b7280;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s;
      }

      .add-step-btn:hover {
        border-color: #667eea;
        color: #667eea;
        background: #f8faff;
      }

      .behavior-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
      }

      .btn-primary,
      .btn-secondary {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.875rem;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }

      .btn-secondary:hover {
        background: #e5e7eb;
      }

      .spinner {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .user-guidance {
        background: #f0f9ff;
        border-left: 4px solid #0ea5e9;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 2rem;
      }

      .user-guidance h4 {
        margin: 0 0 0.75rem 0;
        color: #0c4a6e;
        font-size: 1rem;
        font-weight: 600;
      }

      .guidance-content {
        color: #164e63;
        line-height: 1.6;
      }

      @media (max-width: 640px) {
        .error-reporting-modal {
          padding: 1rem;
        }

        .modal-header,
        .modal-body {
          padding: 1.5rem;
        }

        .behavior-group {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }

        .btn-primary,
        .btn-secondary {
          width: 100%;
          justify-content: center;
        }
      }
    `,
  ],
})
export class ErrorReportingComponent {
  @Input() errors: StructuredError[] = [];

  isVisible = signal(false);
  isSubmitting = signal(false);
  reproductionSteps = signal<string[]>(['']);
  errorSummary = signal<{
    summary: string;
    technicalDetails: string;
    userGuidance: string;
  } | null>(null);

  reportForm: FormGroup;
  categories: Array<{
    key: string;
    label: string;
    description: string;
    icon: string;
  }> = [];

  constructor(
    private fb: FormBuilder,
    private errorReporting: ErrorReportingService,
    private errorCorrelation: ErrorCorrelationService,
    private toastService: ToastService,
  ) {
    this.reportForm = this.fb.group({
      category: ['', Validators.required],
      feedback: ['', [Validators.required, Validators.maxLength(1000)]],
      expectedBehavior: [''],
      actualBehavior: [''],
      contactInfo: ['', [Validators.email]],
    });

    this.categories = this.errorReporting.getUserFriendlyCategories();
  }

  show(errors?: StructuredError[]): void {
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
    this.resetForm();
  }

  close(): void {
    this.isVisible.set(false);
    this.resetForm();
  }

  selectedCategory() {
    const categoryKey = this.reportForm.get('category')?.value;
    return this.categories.find((cat) => cat.key === categoryKey);
  }

  addReproductionStep(): void {
    const steps = [...this.reproductionSteps()];
    steps.push('');
    this.reproductionSteps.set(steps);
  }

  removeReproductionStep(index: number): void {
    const steps = [...this.reproductionSteps()];
    steps.splice(index, 1);
    if (steps.length === 0) {
      steps.push('');
    }
    this.reproductionSteps.set(steps);
  }

  updateReproductionStep(index: number, event: any): void {
    const steps = [...this.reproductionSteps()];
    steps[index] = event.target.value;
    this.reproductionSteps.set(steps);
  }

  formatGuidance(guidance: string): string {
    return guidance.replace(/\n/g, '<br>').replace(/•/g, '&bull;');
  }

  async onSubmit(): Promise<void> {
    if (!this.reportForm.valid) return;

    this.isSubmitting.set(true);

    try {
      const formValue = this.reportForm.value;
      const reproductionSteps = this.reproductionSteps().filter(
        (step) => step.trim() !== '',
      );

      const result = await this.errorReporting
        .submitErrorReport(
          this.errors,
          formValue.feedback,
          reproductionSteps.length > 0 ? reproductionSteps : undefined,
          formValue.expectedBehavior || undefined,
          formValue.actualBehavior || undefined,
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
      this.isSubmitting.set(false);
    }
  }

  private resetForm(): void {
    this.reportForm.reset();
    this.reproductionSteps.set(['']);
  }
}
