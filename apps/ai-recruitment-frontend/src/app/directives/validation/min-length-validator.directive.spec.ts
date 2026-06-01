import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { MinLengthValidatorDirective } from './min-length-validator.directive';

@Component({
  template: `
    <input
      type="text"
      [(ngModel)]="value"
      #model="ngModel"
      [arcMinLength]="minLength"
      [minLengthMessage]="customMessage"
    />
  `,
  standalone: true,
  imports: [FormsModule, MinLengthValidatorDirective],
})
class TestTemplateComponent {
  public value = '';
  public minLength = 5;
  public customMessage?: string;
}

@Component({
  template: `
    <input
      type="text"
      [formControl]="control"
      [arcMinLength]="minLength"
      [minLengthMessage]="customMessage"
    />
  `,
  standalone: true,
  imports: [ReactiveFormsModule, MinLengthValidatorDirective],
})
class TestReactiveComponent {
  public control = new FormControl('');
  public minLength = 5;
  public customMessage?: string;
}

describe('MinLengthValidatorDirective', () => {
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
        By.directive(MinLengthValidatorDirective),
      );
      expect(directive).toBeTruthy();
    });

    it('should pass validation for empty value', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = '';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should pass validation when value meets min length', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'hello';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
      expect(model.errors).toBeNull();
    });

    it('should pass validation when value exceeds min length', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'hello world';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
    });

    it('should invalidate when value is shorter than min length', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'hi';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.minLength).toBeTruthy();
    });

    it('should include actual length in error object', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'abc';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.minLength?.actualLength).toBe(3);
    });

    it('should include required length in error object', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'abc';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.minLength?.requiredLength).toBe(5);
    });

    it('should use custom error message', async () => {
      component.customMessage = '至少需要5个字符';
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'abc';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.minLength?.message).toBe('至少需要5个字符');
    });

    it('should use default error message when no custom message', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'abc';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.minLength?.message).toBe('最少需要输入 5 个字符');
    });

    it('should handle dynamic min length changes', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'hello';
      component.minLength = 10;
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.minLength?.requiredLength).toBe(10);
    });
  });

  describe('Reactive form', () => {
    it('should pass validation for null value', () => {
      const directive = new MinLengthValidatorDirective();
      directive.arcMinLength = 5;
      const control = new FormControl(null);

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should pass validation when arcMinLength is not set', () => {
      const directive = new MinLengthValidatorDirective();
      const control = new FormControl('ab');

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should coerce string minLength to number', () => {
      const directive = new MinLengthValidatorDirective();
      directive.arcMinLength = '5' as unknown as number;
      const control = new FormControl('abc');

      const result = directive.validate(control);

      expect(result).toBeTruthy();
      expect(result?.minLength?.requiredLength).toBe(5);
    });
  });
});
