import type { Component } from '@angular/core';
import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TooltipDirective } from './tooltip.directive';

@Component({
  template: `
    <button [arcTooltip]="'Test tooltip'" [tooltipPosition]="'top'">
      Click me
    </button>
  `,
  standalone: true,
  imports: [TooltipDirective],
})
class TestComponent {}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let button: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent, TooltipDirective],
    });
    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    button = fixture.debugElement.query(By.css('button')).nativeElement;
  });

  afterEach(() => {
    document.querySelectorAll('.tooltip').forEach((el) => el.remove());
  });

  describe('DOM manipulation', () => {
    it('should create tooltip element on mouseenter', () => {
      button.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();

      const tooltip = document.querySelector('.tooltip');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.textContent).toBe('Test tooltip');
    });

    it('should remove tooltip element on mouseleave', () => {
      button.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();
      expect(document.querySelector('.tooltip')).toBeTruthy();

      button.dispatchEvent(new Event('mouseleave'));
      fixture.detectChanges();
      expect(document.querySelector('.tooltip')).toBeFalsy();
    });

    it('should apply position class', () => {
      button.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();

      const tooltip = document.querySelector('.tooltip');
      expect(tooltip?.classList.contains('tooltip-top')).toBe(true);
    });
  });

  describe('Event handling', () => {
    it('should show tooltip on focus', () => {
      button.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      expect(document.querySelector('.tooltip')).toBeTruthy();
    });

    it('should hide tooltip on blur', () => {
      button.dispatchEvent(new Event('focus'));
      fixture.detectChanges();

      button.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(document.querySelector('.tooltip')).toBeFalsy();
    });
  });
});
