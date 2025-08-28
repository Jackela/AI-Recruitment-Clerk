import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'arc-validation-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="validation-feedback" *ngIf="shouldShowError()">
      <div class="error-container" [@slideIn]>
        <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="error-message">{{ getErrorMessage() }}</span>
      </div>
    </div>

    <div class="validation-hint" *ngIf="showHint && hint && !shouldShowError()">
      <svg class="hint-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.5 9a3 3 0 0 1 5 2.5c0 1.5-2.5 2-2.5 3.5"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span class="hint-text">{{ hint }}</span>
    </div>

    <div class="validation-success" *ngIf="showSuccess && isValid() && wasTouched()">
      <svg class="success-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22,4 12,14.01 9,11.01"></polyline>
      </svg>
      <span class="success-message">{{ successMessage || '输入正确' }}</span>
    </div>
  `,
  styles: [`
    .validation-feedback {
      margin-top: 0.25rem;
      min-height: 1.5rem;
    }

    .error-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      animation: slideIn 0.2s ease-out;
    }

    .error-icon {
      flex-shrink: 0;
      color: #ef4444;
    }

    .error-message {
      font-size: 0.875rem;
      color: #dc2626;
      line-height: 1.4;
    }

    .validation-hint {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.25rem;
      padding: 0.375rem 0.5rem;
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
    }

    .hint-icon {
      flex-shrink: 0;
      color: #0284c7;
    }

    .hint-text {
      font-size: 0.8125rem;
      color: #0369a1;
      line-height: 1.4;
    }

    .validation-success {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      padding: 0.5rem;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      animation: slideIn 0.2s ease-out;
    }

    .success-icon {
      flex-shrink: 0;
      color: #10b981;
    }

    .success-message {
      font-size: 0.875rem;
      color: #059669;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .error-message,
      .hint-text,
      .success-message {
        font-size: 0.8125rem;
      }
    }
  `],
  animations: []
})
export class ValidationFeedbackComponent {
  @Input() control: AbstractControl | null = null;
  @Input() showHint = true;
  @Input() showSuccess = false;
  @Input() hint?: string;
  @Input() successMessage?: string;
  @Input() customErrors?: { [key: string]: string };

  private defaultErrorMessages: { [key: string]: string } = {
    required: '此字段为必填项',
    email: '请输入有效的邮箱地址',
    minLength: '输入长度不足',
    maxLength: '输入长度超过限制',
    pattern: '输入格式不正确',
    min: '数值太小',
    max: '数值太大',
    phone: '请输入有效的手机号码',
    url: '请输入有效的网址',
    date: '请输入有效的日期'
  };

  shouldShowError(): boolean {
    if (!this.control) return false;
    return !!(this.control.invalid && (this.control.dirty || this.control.touched));
  }

  isValid(): boolean {
    return this.control?.valid ?? false;
  }

  wasTouched(): boolean {
    return this.control?.touched ?? false;
  }

  getErrorMessage(): string {
    if (!this.control || !this.control.errors) {
      return '';
    }

    const errors = this.control.errors;
    const errorKey = Object.keys(errors)[0];
    
    // Check for custom error message
    if (this.customErrors && this.customErrors[errorKey]) {
      return this.customErrors[errorKey];
    }

    // Check if error object has a message property
    if (errors[errorKey]?.message) {
      return errors[errorKey].message;
    }

    // Use default message
    return this.defaultErrorMessages[errorKey] || '输入值无效';
  }

  getErrors(): ValidationErrors | null {
    return this.control?.errors ?? null;
  }
}