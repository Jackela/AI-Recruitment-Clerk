import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { PhoneValidatorDirective } from './phone-validator.directive';

@Component({
  template: `
    <input type="tel" [(ngModel)]="phone" #model="ngModel" arcPhoneValidator />
  `,
  standalone: true,
  imports: [FormsModule, PhoneValidatorDirective],
})
class TestTemplateComponent {
  public phone = '';
}

@Component({
  template: ` <input type="tel" [formControl]="control" arcPhoneValidator /> `,
  standalone: true,
  imports: [ReactiveFormsModule, PhoneValidatorDirective],
})
class TestReactiveComponent {
  public control = new FormControl('');
}

describe('PhoneValidatorDirective', () => {
  describe('Template-driven form', () => {
    let fixture: ComponentFixture<TestTemplateComponent>;
    let component: TestTemplateComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestTemplateComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestTemplateComponent);
      component = fixture.componentInstance;
    });

    it('should create directive', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.query(
        By.directive(PhoneValidatorDirective),
      );
      expect(directive).toBeTruthy();
    });

    it('should pass validation for empty value', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
      expect(model.errors).toBeNull();
    });

    it('should validate Chinese mobile phone number', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '13800138000';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
      expect(model.errors).toBeNull();
    });

    it('should validate Chinese mobile with different prefix', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '15912345678';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should validate international format with plus', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '+1234567890';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should validate international format without plus', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '1234567890';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should invalidate phone with less than 7 digits', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '123456';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.phone).toBeTruthy();
    });

    it('should invalidate phone with more than 15 digits', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '1234567890123456';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
    });

    it('should invalidate Chinese phone not starting with 1', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '23800138000';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
    });

    it('should invalidate Chinese phone with invalid second digit', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = '10200138000';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
    });

    it('should include error message in Chinese', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = 'invalid';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.phone?.message).toBe('请输入有效的手机号码');
    });

    it('should include hint about supported formats', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = 'invalid';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.phone?.hint).toBe('支持中国手机号或国际格式');
    });

    it('should include actual value in error object', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.phone = 'invalid';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.phone?.actualValue).toBe('invalid');
    });
  });

  describe('Reactive form', () => {
    it('should validate null value as valid', () => {
      const directive = new PhoneValidatorDirective();
      const control = new FormControl(null);

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should validate undefined value as valid', () => {
      const directive = new PhoneValidatorDirective();
      const control = new FormControl(undefined);

      const result = directive.validate(control);

      expect(result).toBeNull();
    });
  });
});
