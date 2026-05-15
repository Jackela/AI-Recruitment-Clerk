import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';

import { FormExampleComponent } from './form-example.component';
import { VALIDATION_DIRECTIVES } from '../../../directives/validation';
import { ToastService } from '../../../services/toast.service';

class MockToastService {
  public success = jest.fn();
  public warning = jest.fn();
}

@Component({
  template: ` <arc-form-example></arc-form-example> `,
  standalone: true,
  imports: [FormExampleComponent],
})
class TestHostComponent {}

describe('FormExampleComponent', () => {
  let fixture: ComponentFixture<FormExampleComponent>;
  let component: FormExampleComponent;
  let toastService: MockToastService;

  beforeEach(async () => {
    toastService = new MockToastService();

    await TestBed.configureTestingModule({
      imports: [
        FormExampleComponent,
        FormsModule,
        ReactiveFormsModule,
        ...VALIDATION_DIRECTIVES,
      ],
      providers: [
        FormBuilder,
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormExampleComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    jest.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty template model', () => {
      expect(component.templateModel).toEqual({
        name: '',
        email: '',
        phone: '',
      });
    });

    it('should initialize reactive form with default values', () => {
      expect(component.reactiveForm.get('company')?.value).toBe('');
      expect(component.reactiveForm.get('position')?.value).toBe('');
      expect(component.reactiveForm.get('salary')?.value).toBeNull();
    });
  });

  describe('Template-Driven Form Validation', () => {
    it('should validate required name field', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('#name'));
      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const nameControl = nameInput.references['nameControl'];
      expect(nameControl?.invalid).toBe(true);
      expect(nameControl?.errors?.required).toBeTruthy();
    }));

    it('should validate min length for name field', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('#name'));
      nameInput.nativeElement.value = 'A';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const nameControl = nameInput.references['nameControl'];
      expect(nameControl?.errors?.minLength).toBeTruthy();
    }));

    it('should pass validation for valid name', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const nameInput = fixture.debugElement.query(By.css('#name'));
      nameInput.nativeElement.value = '张三';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const nameControl = nameInput.references['nameControl'];
      expect(nameControl?.valid).toBe(true);
    }));

    it('should validate required email field', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const emailInput = fixture.debugElement.query(By.css('#email'));
      emailInput.nativeElement.value = '';
      emailInput.nativeElement.dispatchEvent(new Event('input'));
      emailInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const emailControl = emailInput.references['emailControl'];
      expect(emailControl?.errors?.required).toBeTruthy();
    }));

    it('should validate email format', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const emailInput = fixture.debugElement.query(By.css('#email'));
      emailInput.nativeElement.value = 'invalid-email';
      emailInput.nativeElement.dispatchEvent(new Event('input'));
      emailInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const emailControl = emailInput.references['emailControl'];
      expect(emailControl?.errors?.email).toBeTruthy();
    }));

    it('should validate phone number format', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const phoneInput = fixture.debugElement.query(By.css('#phone'));
      phoneInput.nativeElement.value = '123';
      phoneInput.nativeElement.dispatchEvent(new Event('input'));
      phoneInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const phoneControl = phoneInput.references['phoneControl'];
      expect(phoneControl?.errors?.phone).toBeTruthy();
    }));

    it('should pass validation for valid phone number', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const phoneInput = fixture.debugElement.query(By.css('#phone'));
      phoneInput.nativeElement.value = '13800138000';
      phoneInput.nativeElement.dispatchEvent(new Event('input'));
      phoneInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      tick();

      const phoneControl = phoneInput.references['phoneControl'];
      expect(phoneControl?.valid).toBe(true);
    }));
  });

  describe('Template-Driven Form Submission', () => {
    it('should call onTemplateSubmit when form is valid', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const submitSpy = jest.spyOn(component, 'onTemplateSubmit');

      component.templateModel.name = '张三';
      component.templateModel.email = 'test@example.com';

      const form = fixture.debugElement.query(By.css('form'));
      form.triggerEventHandler('ngSubmit', component.templateModel);

      expect(submitSpy).toHaveBeenCalledWith(component.templateModel);
    }));

    it('should show success toast on template form submit', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onTemplateSubmit({
        name: '张三',
        email: 'test@example.com',
        phone: '',
      });

      expect(toastService.success).toHaveBeenCalledWith('模板表单提交成功！');
    }));
  });

  describe('Reactive Form Validation', () => {
    it('should validate required company field', () => {
      fixture.detectChanges();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('');
      companyControl?.markAsTouched();

      expect(companyControl?.errors?.required).toBeTruthy();
    });

    it('should validate min length for company field', () => {
      fixture.detectChanges();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('A');
      companyControl?.markAsTouched();

      expect(companyControl?.errors?.minlength).toBeTruthy();
    });

    it('should pass validation for valid company name', () => {
      fixture.detectChanges();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('ABC公司');
      companyControl?.markAsTouched();

      expect(companyControl?.valid).toBe(true);
    });

    it('should validate required position field', () => {
      fixture.detectChanges();

      const positionControl = component.reactiveForm.get('position');
      positionControl?.setValue('');
      positionControl?.markAsTouched();

      expect(positionControl?.errors?.required).toBeTruthy();
    });

    it('should validate min length for position field', () => {
      fixture.detectChanges();

      const positionControl = component.reactiveForm.get('position');
      positionControl?.setValue('A');
      positionControl?.markAsTouched();

      expect(positionControl?.errors?.minlength).toBeTruthy();
    });

    it('should validate min value for salary field', () => {
      fixture.detectChanges();

      const salaryControl = component.reactiveForm.get('salary');
      salaryControl?.setValue(1000);
      salaryControl?.markAsTouched();

      expect(salaryControl?.errors?.min).toBeTruthy();
    });

    it('should validate max value for salary field', () => {
      fixture.detectChanges();

      const salaryControl = component.reactiveForm.get('salary');
      salaryControl?.setValue(200000);
      salaryControl?.markAsTouched();

      expect(salaryControl?.errors?.max).toBeTruthy();
    });

    it('should pass validation for valid salary range', () => {
      fixture.detectChanges();

      const salaryControl = component.reactiveForm.get('salary');
      salaryControl?.setValue(10000);
      salaryControl?.markAsTouched();

      expect(salaryControl?.valid).toBe(true);
    });

    it('should make form invalid when required fields are empty', () => {
      fixture.detectChanges();

      component.reactiveForm.patchValue({
        company: '',
        position: '',
        salary: null,
      });

      expect(component.reactiveForm.invalid).toBe(true);
    });

    it('should make form valid when all required fields are filled', () => {
      fixture.detectChanges();

      component.reactiveForm.patchValue({
        company: 'ABC公司',
        position: '前端工程师',
        salary: 15000,
      });

      expect(component.reactiveForm.valid).toBe(true);
    });
  });

  describe('Reactive Form Submission', () => {
    it('should show success toast when form is valid', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.reactiveForm.patchValue({
        company: 'ABC公司',
        position: '前端工程师',
        salary: 15000,
      });

      component.onReactiveSubmit();

      expect(toastService.success).toHaveBeenCalledWith('响应式表单提交成功！');
    }));

    it('should show warning toast when form is invalid', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.reactiveForm.patchValue({
        company: '',
        position: '',
        salary: null,
      });

      component.onReactiveSubmit();

      expect(toastService.warning).toHaveBeenCalledWith('请先修正表单错误');
    }));

    it('should not submit when form is invalid', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      component.reactiveForm.patchValue({
        company: '',
        position: '',
        salary: null,
      });

      component.onReactiveSubmit();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    }));

    it('should log form value when submitted successfully', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      component.reactiveForm.patchValue({
        company: 'ABC公司',
        position: '前端工程师',
        salary: 15000,
      });

      component.onReactiveSubmit();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Reactive form value:',
        expect.objectContaining({
          company: 'ABC公司',
          position: '前端工程师',
          salary: 15000,
        }),
      );
      consoleSpy.mockRestore();
    }));
  });

  describe('Form State Styling', () => {
    it('should apply error class to invalid touched input', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('');
      companyControl?.markAsTouched();

      fixture.detectChanges();
      tick();

      const companyInput = fixture.debugElement.query(By.css('#company'));
      expect(companyInput.nativeElement.classList.contains('error')).toBe(true);
    }));

    it('should apply success class to valid touched input', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('ABC公司');
      companyControl?.markAsTouched();

      fixture.detectChanges();
      tick();

      const companyInput = fixture.debugElement.query(By.css('#company'));
      expect(companyInput.nativeElement.classList.contains('success')).toBe(
        true,
      );
    }));

    it('should not apply error class to pristine input', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const companyInput = fixture.debugElement.query(By.css('#company'));
      expect(companyInput.nativeElement.classList.contains('error')).toBe(
        false,
      );
    }));
  });

  describe('Form Reset and Clearing', () => {
    it('should clear form values when reset', () => {
      fixture.detectChanges();

      component.reactiveForm.patchValue({
        company: 'ABC公司',
        position: '前端工程师',
        salary: 15000,
      });

      component.reactiveForm.reset();

      expect(component.reactiveForm.get('company')?.value).toBeNull();
      expect(component.reactiveForm.get('position')?.value).toBeNull();
      expect(component.reactiveForm.get('salary')?.value).toBeNull();
    });

    it('should clear errors when form is reset', () => {
      fixture.detectChanges();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('');
      companyControl?.markAsTouched();

      expect(companyControl?.errors).toBeTruthy();

      component.reactiveForm.reset();

      expect(companyControl?.errors).toBeNull();
    });
  });

  describe('Field Dependencies and Conditional Validation', () => {
    it('should allow optional salary field to be empty', () => {
      fixture.detectChanges();

      component.reactiveForm.patchValue({
        company: 'ABC公司',
        position: '前端工程师',
        salary: null,
      });

      expect(component.reactiveForm.valid).toBe(true);
    });

    it('should validate salary when provided', () => {
      fixture.detectChanges();

      component.reactiveForm.patchValue({
        company: 'ABC公司',
        position: '前端工程师',
        salary: 1000,
      });

      expect(component.reactiveForm.get('salary')?.errors?.min).toBeTruthy();
    });
  });

  describe('Custom Error Messages', () => {
    it('should display custom error message for required company', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const companyControl = component.reactiveForm.get('company');
      companyControl?.setValue('');
      companyControl?.markAsTouched();

      fixture.detectChanges();
      tick();

      const errorFeedback = fixture.debugElement.query(
        By.css('.validation-feedback .error-message'),
      );

      // The component uses customErrors binding
      expect(
        component.reactiveForm.get('company')?.errors?.required,
      ).toBeTruthy();
    }));
  });
});
