import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { ValidationFeedbackComponent } from './validation-feedback.component';

@Component({
  template: `
    <arc-validation-feedback
      [control]="control"
      [showHint]="showHint"
      [showSuccess]="showSuccess"
      [hint]="hint"
      [successMessage]="successMessage"
      [customErrors]="customErrors"
    >
    </arc-validation-feedback>
  `,
  standalone: true,
  imports: [ValidationFeedbackComponent],
})
class TestComponent {
  public control: FormControl | null = null;
  public showHint = true;
  public showSuccess = false;
  public hint?: string;
  public successMessage?: string;
  public customErrors?: { [key: string]: string };
}

describe('ValidationFeedbackComponent', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Creation', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render without control', () => {
      fixture.detectChanges();
      const feedback = fixture.nativeElement.querySelector(
        '.validation-feedback',
      );
      expect(feedback).toBeFalsy();
    });
  });

  describe('Error Display', () => {
    it('should not show error when control is pristine', () => {
      component.control = new FormControl('', [Validators.required]);
      fixture.detectChanges();

      const errorContainer =
        fixture.nativeElement.querySelector('.error-container');
      expect(errorContainer).toBeFalsy();
    });

    it('should show error when control is invalid and touched', () => {
      component.control = new FormControl('', [Validators.required]);
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorContainer =
        fixture.nativeElement.querySelector('.error-container');
      expect(errorContainer).toBeTruthy();
    });

    it('should show error when control is invalid and dirty', () => {
      component.control = new FormControl('', [Validators.required]);
      component.control.markAsDirty();
      fixture.detectChanges();

      const errorContainer =
        fixture.nativeElement.querySelector('.error-container');
      expect(errorContainer).toBeTruthy();
    });

    it('should display error message for required validation', () => {
      component.control = new FormControl('', [Validators.required]);
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage =
        fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('此字段为必填项');
    });

    it('should display error message for email validation', () => {
      component.control = new FormControl('invalid', [Validators.email]);
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage =
        fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('请输入有效的邮箱地址');
    });

    it('should display custom error message when provided', () => {
      component.control = new FormControl('', [Validators.required]);
      component.customErrors = { required: '自定义必填错误' };
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage =
        fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('自定义必填错误');
    });

    it('should display error message from error object', () => {
      component.control = new FormControl('');
      component.control.setErrors({
        custom: { message: '自定义验证错误消息' },
      });
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage =
        fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('自定义验证错误消息');
    });

    it('should display default message for unknown error type', () => {
      component.control = new FormControl('');
      component.control.setErrors({
        unknown: {},
      });
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage =
        fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('输入值无效');
    });

    it('should show error icon', () => {
      component.control = new FormControl('', [Validators.required]);
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorIcon = fixture.nativeElement.querySelector('.error-icon');
      expect(errorIcon).toBeTruthy();
    });
  });

  describe('Hint Display', () => {
    it('should show hint when no error and hint provided', () => {
      component.control = new FormControl('');
      component.hint = '请输入提示信息';
      fixture.detectChanges();

      const hintContainer =
        fixture.nativeElement.querySelector('.validation-hint');
      expect(hintContainer).toBeTruthy();
    });

    it('should display hint text', () => {
      component.control = new FormControl('');
      component.hint = '请输入提示信息';
      fixture.detectChanges();

      const hintText = fixture.nativeElement.querySelector('.hint-text');
      expect(hintText?.textContent).toBe('请输入提示信息');
    });

    it('should show hint icon', () => {
      component.control = new FormControl('');
      component.hint = '提示';
      fixture.detectChanges();

      const hintIcon = fixture.nativeElement.querySelector('.hint-icon');
      expect(hintIcon).toBeTruthy();
    });

    it('should not show hint when showHint is false', () => {
      component.control = new FormControl('');
      component.hint = '提示';
      component.showHint = false;
      fixture.detectChanges();

      const hintContainer =
        fixture.nativeElement.querySelector('.validation-hint');
      expect(hintContainer).toBeFalsy();
    });

    it('should not show hint when there is an error', () => {
      component.control = new FormControl('', [Validators.required]);
      component.hint = '提示';
      component.control.markAsTouched();
      fixture.detectChanges();

      const hintContainer =
        fixture.nativeElement.querySelector('.validation-hint');
      expect(hintContainer).toBeFalsy();
    });
  });

  describe('Success Display', () => {
    it('should not show success by default', () => {
      component.control = new FormControl('valid');
      component.control.markAsTouched();
      fixture.detectChanges();

      const successContainer = fixture.nativeElement.querySelector(
        '.validation-success',
      );
      expect(successContainer).toBeFalsy();
    });

    it('should show success when control is valid and touched', () => {
      component.control = new FormControl('valid');
      component.showSuccess = true;
      component.control.markAsTouched();
      fixture.detectChanges();

      const successContainer = fixture.nativeElement.querySelector(
        '.validation-success',
      );
      expect(successContainer).toBeTruthy();
    });

    it('should display default success message', () => {
      component.control = new FormControl('valid');
      component.showSuccess = true;
      component.control.markAsTouched();
      fixture.detectChanges();

      const successMessage =
        fixture.nativeElement.querySelector('.success-message');
      expect(successMessage?.textContent).toBe('输入正确');
    });

    it('should display custom success message', () => {
      component.control = new FormControl('valid');
      component.showSuccess = true;
      component.successMessage = '格式正确！';
      component.control.markAsTouched();
      fixture.detectChanges();

      const successMessage =
        fixture.nativeElement.querySelector('.success-message');
      expect(successMessage?.textContent).toBe('格式正确！');
    });

    it('should show success icon', () => {
      component.control = new FormControl('valid');
      component.showSuccess = true;
      component.control.markAsTouched();
      fixture.detectChanges();

      const successIcon = fixture.nativeElement.querySelector('.success-icon');
      expect(successIcon).toBeTruthy();
    });

    it('should not show success when control is invalid', () => {
      component.control = new FormControl('', [Validators.required]);
      component.showSuccess = true;
      component.control.markAsTouched();
      fixture.detectChanges();

      const successContainer = fixture.nativeElement.querySelector(
        '.validation-success',
      );
      expect(successContainer).toBeFalsy();
    });

    it('should not show success when control is untouched', () => {
      component.control = new FormControl('valid');
      component.showSuccess = true;
      fixture.detectChanges();

      const successContainer = fixture.nativeElement.querySelector(
        '.validation-success',
      );
      expect(successContainer).toBeFalsy();
    });
  });

  describe('Multiple Errors', () => {
    it('should display first error when multiple errors exist', () => {
      component.control = new FormControl('');
      component.control.setErrors({
        required: true,
        minLength: { message: '长度不够' },
      });
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage =
        fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('此字段为必填项');
    });

    it('should update displayed error when errors change', () => {
      component.control = new FormControl('ab');
      component.control.setValidators([Validators.minLength(5)]);
      component.control.markAsTouched();
      fixture.detectChanges();

      let errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('输入长度不足');

      component.control.setValue('');
      component.control.setValidators([Validators.required]);
      fixture.detectChanges();

      errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toBe('此字段为必填项');
    });
  });

  describe('Error Clearing', () => {
    it('should hide error when control becomes valid', () => {
      component.control = new FormControl('', [Validators.required]);
      component.control.markAsTouched();
      fixture.detectChanges();

      let errorContainer =
        fixture.nativeElement.querySelector('.error-container');
      expect(errorContainer).toBeTruthy();

      component.control.setValue('valid');
      fixture.detectChanges();

      errorContainer = fixture.nativeElement.querySelector('.error-container');
      expect(errorContainer).toBeFalsy();
    });

    it('should show success when error is cleared', () => {
      component.control = new FormControl('', [Validators.required]);
      component.showSuccess = true;
      component.control.markAsTouched();
      fixture.detectChanges();

      component.control.setValue('valid');
      fixture.detectChanges();

      const successContainer = fixture.nativeElement.querySelector(
        '.validation-success',
      );
      expect(successContainer).toBeTruthy();
    });
  });

  describe('Method Tests', () => {
    it('should return false for shouldShowError when control is null', () => {
      const feedbackComponent = fixture.debugElement.query(
        By.directive(ValidationFeedbackComponent),
      ).componentInstance;

      expect(feedbackComponent.shouldShowError()).toBe(false);
    });

    it('should return false for isValid when control is null', () => {
      const feedbackComponent = fixture.debugElement.query(
        By.directive(ValidationFeedbackComponent),
      ).componentInstance;

      expect(feedbackComponent.isValid()).toBe(false);
    });

    it('should return false for wasTouched when control is null', () => {
      const feedbackComponent = fixture.debugElement.query(
        By.directive(ValidationFeedbackComponent),
      ).componentInstance;

      expect(feedbackComponent.wasTouched()).toBe(false);
    });

    it('should return empty string for getErrorMessage when no errors', () => {
      component.control = new FormControl('valid');
      fixture.detectChanges();

      const feedbackComponent = fixture.debugElement.query(
        By.directive(ValidationFeedbackComponent),
      ).componentInstance;

      expect(feedbackComponent.getErrorMessage()).toBe('');
    });

    it('should return null for getErrors when control is null', () => {
      const feedbackComponent = fixture.debugElement.query(
        By.directive(ValidationFeedbackComponent),
      ).componentInstance;

      expect(feedbackComponent.getErrors()).toBeNull();
    });

    it('should return errors object when control has errors', () => {
      component.control = new FormControl('', [Validators.required]);
      component.control.markAsTouched();
      fixture.detectChanges();

      const feedbackComponent = fixture.debugElement.query(
        By.directive(ValidationFeedbackComponent),
      ).componentInstance;

      expect(feedbackComponent.getErrors()).toEqual({ required: true });
    });
  });

  describe('Default Error Messages', () => {
    const testCases = [
      { error: 'maxLength', expected: '输入长度超过限制' },
      { error: 'min', expected: '数值太小' },
      { error: 'max', expected: '数值太大' },
      { error: 'url', expected: '请输入有效的网址' },
      { error: 'date', expected: '请输入有效的日期' },
    ];

    testCases.forEach(({ error, expected }) => {
      it(`should display default message for ${error} error`, () => {
        component.control = new FormControl('');
        component.control.setErrors({ [error]: true });
        component.control.markAsTouched();
        fixture.detectChanges();

        const errorMessage =
          fixture.nativeElement.querySelector('.error-message');
        expect(errorMessage?.textContent).toBe(expected);
      });
    });
  });
});
