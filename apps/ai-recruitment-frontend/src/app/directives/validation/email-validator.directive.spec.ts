import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { EmailValidatorDirective } from './email-validator.directive';

@Component({
  template: `
    <input
      type="email"
      [(ngModel)]="email"
      #model="ngModel"
      arcEmailValidator
    />
  `,
  standalone: true,
  imports: [FormsModule, EmailValidatorDirective],
})
class TestTemplateComponent {
  public email = '';
}

@Component({
  template: `
    <input type="email" [formControl]="control" arcEmailValidator />
  `,
  standalone: true,
  imports: [ReactiveFormsModule, EmailValidatorDirective],
})
class TestReactiveComponent {
  public control = new FormControl('');
}

describe('EmailValidatorDirective', () => {
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
        By.directive(EmailValidatorDirective),
      );
      expect(directive).toBeTruthy();
    });

    it('should pass validation for empty value', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = '';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
      expect(model.errors).toBeNull();
    });

    it('should validate valid email format', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'test@example.com';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
      expect(model.errors).toBeNull();
    });

    it('should validate email with subdomain', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'user@mail.example.com';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should validate email with plus sign', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'user+tag@example.com';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should invalidate email without @ symbol', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'invalid-email';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.email).toBeTruthy();
    });

    it('should invalidate email without domain', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'user@';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.email).toBeTruthy();
    });

    it('should invalidate email with spaces', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'user @example.com';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
    });

    it('should include actual value in error object', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'invalid';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.email?.actualValue).toBe('invalid');
    });

    it('should include error message in Chinese', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.email = 'invalid';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.email?.message).toBe('请输入有效的邮箱地址');
    });
  });

  describe('Reactive form', () => {
    let fixture: ComponentFixture<TestReactiveComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestReactiveComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestReactiveComponent);
    });

    it('should validate null value as valid', () => {
      const directive = new EmailValidatorDirective();
      const control = new FormControl(null);

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should validate undefined value as valid', () => {
      const directive = new EmailValidatorDirective();
      const control = new FormControl(undefined);

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should invalidate email with multiple @ symbols', () => {
      const directive = new EmailValidatorDirective();
      const control = new FormControl('user@@example.com');

      const result = directive.validate(control);

      expect(result).toBeTruthy();
    });
  });
});
