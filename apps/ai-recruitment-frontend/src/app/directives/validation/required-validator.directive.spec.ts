import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { RequiredValidatorDirective } from './required-validator.directive';

@Component({
  template: `
    <input
      type="text"
      [(ngModel)]="value"
      #model="ngModel"
      arcRequired
      [customMessage]="customMessage"
    />
  `,
  standalone: true,
  imports: [FormsModule, RequiredValidatorDirective],
})
class TestTemplateComponent {
  public value = '';
  public customMessage?: string;
}

@Component({
  template: `
    <input
      type="text"
      [formControl]="control"
      arcRequired
      [customMessage]="customMessage"
    />
  `,
  standalone: true,
  imports: [ReactiveFormsModule, RequiredValidatorDirective],
})
class TestReactiveComponent {
  public control = new FormControl('');
  public customMessage?: string;
}

describe('RequiredValidatorDirective', () => {
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
        By.directive(RequiredValidatorDirective),
      );
      expect(directive).toBeTruthy();
    });

    it('should validate required field - empty string', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = '';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.required).toBeTruthy();
    });

    it('should validate required field - whitespace only', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = '   ';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
      expect(model.errors?.required).toBeTruthy();
    });

    it('should validate required field - null value', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = null as unknown as string;
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.invalid).toBe(true);
    });

    it('should validate required field - valid value', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = 'Test Value';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.valid).toBe(true);
      expect(model.errors).toBeNull();
    });

    it('should use custom error message', async () => {
      component.customMessage = '自定义必填消息';
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = '';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.required?.message).toBe('自定义必填消息');
    });

    it('should return default message when no custom message provided', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = '';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.required?.message).toBe('此字段为必填项');
    });

    it('should return whitespace message for strings with only spaces', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      component.value = '   ';
      fixture.detectChanges();
      await fixture.whenStable();

      const model = fixture.debugElement.query(By.css('input')).references[
        'model'
      ];
      expect(model.errors?.required?.message).toBe('此字段不能为空');
    });
  });

  describe('Reactive form', () => {
    let fixture: ComponentFixture<TestReactiveComponent>;
    let component: TestReactiveComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestReactiveComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestReactiveComponent);
      component = fixture.componentInstance;
    });

    it('should validate empty array as required', () => {
      const directive = new RequiredValidatorDirective();
      const control = new FormControl([]);

      const result = directive.validate(control);

      expect(result).toEqual({
        required: {
          message: '请至少选择一项',
          required: true,
        },
      });
    });

    it('should pass validation for non-empty array', () => {
      const directive = new RequiredValidatorDirective();
      const control = new FormControl(['item1']);

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should pass validation for undefined value when arcRequired is false', () => {
      const directive = new RequiredValidatorDirective();
      directive.arcRequired = false;
      const control = new FormControl('');

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should pass validation for undefined value when arcRequired is "false"', () => {
      const directive = new RequiredValidatorDirective();
      directive.arcRequired = 'false';
      const control = new FormControl('');

      const result = directive.validate(control);

      expect(result).toBeNull();
    });

    it('should validate when arcRequired is empty string', () => {
      const directive = new RequiredValidatorDirective();
      directive.arcRequired = '';
      const control = new FormControl('');

      const result = directive.validate(control);

      expect(result).toBeTruthy();
    });

    it('should include required flag in error object', () => {
      const directive = new RequiredValidatorDirective();
      const control = new FormControl('');

      const result = directive.validate(control);

      expect(result?.required?.required).toBe(true);
    });
  });
});
