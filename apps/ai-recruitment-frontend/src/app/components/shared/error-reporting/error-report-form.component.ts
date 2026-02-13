import { Component, output, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { FormGroup } from '@angular/forms';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorReportingService } from '../../../services/error/error-reporting.service';
import { ReproductionStepsComponent } from './reproduction-steps.component';

/**
 * Error category interface.
 */
export interface ErrorCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
}

/**
 * Form data interface for error report submission.
 */
export interface ErrorReportFormData {
  category: string;
  feedback: string;
  expectedBehavior: string;
  actualBehavior: string;
  contactInfo: string;
}

/**
 * Handles the error report form with categories, feedback input,
 * reproduction steps, and behavior comparison.
 */
@Component({
  selector: 'arc-error-report-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ReproductionStepsComponent,
  ],
  template: `
    <form [formGroup]="reportForm" (ngSubmit)="handleSubmit()">
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
      <arc-reproduction-steps [(steps)]="reproductionSteps" />

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
        <button type="button" (click)="handleCancel.emit()" class="btn-secondary">
          取消
        </button>
        <button
          type="submit"
          [disabled]="!reportForm.valid"
          class="btn-primary"
        >
          {{ submitButtonText() }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
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

      @media (max-width: 640px) {
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
export class ErrorReportFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly errorReporting = inject(ErrorReportingService);

  /**
   * Submit button text to display (from parent).
   */
  public readonly submitButtonText = input('提交反馈');

  /**
   * Emits when form is submitted with form data and reproduction steps.
   */
  public readonly handleSubmit = output<{
    formData: ErrorReportFormData;
    reproductionSteps: string[];
  }>();

  /**
   * Emits when cancel button is clicked.
   */
  public readonly handleCancel = output<void>();

  /**
   * Form group for the error report.
   */
  public reportForm: FormGroup;

  /**
   * Available error categories.
   */
  public categories: ErrorCategory[] = [];

  /**
   * Current reproduction steps (two-way bindable).
   */
  public reproductionSteps: string[] = [''];

  constructor() {
    this.reportForm = this.fb.group({
      category: ['', Validators.required],
      feedback: ['', [Validators.required, Validators.maxLength(1000)]],
      expectedBehavior: [''],
      actualBehavior: [''],
      contactInfo: ['', [Validators.email]],
    });

    this.categories = this.errorReporting.getUserFriendlyCategories();
  }

  /**
   * Gets the selected category object.
   * @returns The selected category or undefined.
   */
  public selectedCategory(): ErrorCategory | undefined {
    const categoryKey = this.reportForm.get('category')?.value;
    return this.categories.find((cat) => cat.key === categoryKey);
  }

  /**
   * Handles form submit.
   */
  private handleSubmit(): void {
    if (!this.reportForm.valid) return;

    const formData = this.reportForm.value as ErrorReportFormData;
    const reproductionSteps = this.getFilteredReproductionSteps();

    this.handleSubmit.emit({ formData, reproductionSteps });
  }

  /**
   * Gets the filtered reproduction steps.
   * @returns Array of non-empty reproduction steps.
   */
  private getFilteredReproductionSteps(): string[] {
    return this.reproductionSteps.filter((step) => step.trim() !== '');
  }

  /**
   * Resets the form to its initial state.
   */
  public resetForm(): void {
    this.reportForm.reset();
    this.reproductionSteps = [''];
  }

  /**
   * Checks if the form is valid.
   * @returns True if form is valid.
   */
  public isFormValid(): boolean {
    return this.reportForm.valid;
  }
}
