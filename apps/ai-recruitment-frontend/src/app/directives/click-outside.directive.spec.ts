import type { Component } from '@angular/core';
import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
  template: `
    <div class="outside">Outside</div>
    <div class="inside" (arcClickOutside)="onClickOutside()">Inside</div>
  `,
  standalone: true,
  imports: [ClickOutsideDirective],
})
class TestComponent {
  clickedOutside = false;

  onClickOutside(): void {
    this.clickedOutside = true;
  }
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent, ClickOutsideDirective],
    });
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Event handling', () => {
    it('should emit when clicking outside element', () => {
      const outsideDiv = fixture.debugElement.query(
        By.css('.outside'),
      ).nativeElement;
      outsideDiv.click();
      fixture.detectChanges();

      expect(component.clickedOutside).toBe(true);
    });

    it('should not emit when clicking inside element', () => {
      const insideDiv = fixture.debugElement.query(
        By.css('.inside'),
      ).nativeElement;
      insideDiv.click();
      fixture.detectChanges();

      expect(component.clickedOutside).toBe(false);
    });

    it('should emit on document click outside element', () => {
      document.body.click();
      fixture.detectChanges();

      expect(component.clickedOutside).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should clean up event listener on destroy', () => {
      fixture.destroy();

      expect(() => {
        document.body.click();
      }).not.toThrow();
    });
  });
});
