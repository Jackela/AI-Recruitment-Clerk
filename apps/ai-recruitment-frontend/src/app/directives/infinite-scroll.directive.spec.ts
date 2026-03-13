import type { Component } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InfiniteScrollDirective } from './infinite-scroll.directive';

@Component({
  template: `
    <div
      class="scroll-container"
      style="height: 200px; overflow-y: auto;"
      arcInfiniteScroll
      [scrollThreshold]="80"
      [infiniteScrollEnabled]="enabled"
      (scrolled)="onScrolled()"
    >
      <div style="height: 1000px;">Content</div>
    </div>
  `,
  standalone: true,
  imports: [InfiniteScrollDirective],
})
class TestComponent {
  scrolled = false;
  enabled = true;

  onScrolled(): void {
    this.scrolled = true;
  }
}

describe('InfiniteScrollDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let container: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestComponent, InfiniteScrollDirective],
    });
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    container = fixture.debugElement.query(
      By.css('.scroll-container'),
    ).nativeElement;
  });

  describe('Event handling', () => {
    it('should emit scrolled event when scroll reaches threshold', fakeAsync(() => {
      container.scrollTop = 650;
      container.dispatchEvent(new Event('scroll'));
      tick(0);
      fixture.detectChanges();

      expect(component.scrolled).toBe(true);
    }));

    it('should not emit scrolled event when scroll below threshold', () => {
      container.scrollTop = 100;
      container.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(component.scrolled).toBe(false);
    });

    it('should throttle scroll events', fakeAsync(() => {
      container.scrollTop = 650;
      container.dispatchEvent(new Event('scroll'));
      tick(0);

      component.scrolled = false;
      container.dispatchEvent(new Event('scroll'));
      tick(50);

      expect(component.scrolled).toBe(false);

      tick(200);
      container.dispatchEvent(new Event('scroll'));
      tick(0);

      expect(component.scrolled).toBe(true);
    }));
  });

  describe('Host binding', () => {
    it('should not emit when infiniteScrollEnabled is false', () => {
      component.enabled = false;
      fixture.detectChanges();

      container.scrollTop = 650;
      container.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(component.scrolled).toBe(false);
    });
  });
});
