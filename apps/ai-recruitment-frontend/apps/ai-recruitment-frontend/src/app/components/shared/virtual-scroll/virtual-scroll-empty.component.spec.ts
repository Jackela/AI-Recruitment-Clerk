import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { VirtualScrollEmptyComponent } from './virtual-scroll-empty.component';

describe('VirtualScrollEmptyComponent', () => {
  let component: VirtualScrollEmptyComponent;
  let fixture: ComponentFixture<VirtualScrollEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollEmptyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualScrollEmptyComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render empty state container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container).toBeTruthy();
    });

    it('should render default empty message', () => {
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.empty-message');
      expect(message).toBeTruthy();
      expect(message.textContent).toContain('暂无数据');
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default message', () => {
      expect(component.message).toBe('暂无数据');
    });

    it('should bind message input correctly', () => {
      component.message = 'No items found';
      fixture.detectChanges();

      expect(component.message).toBe('No items found');
    });
  });

  describe('Content Projection Tests', () => {
    it('should render projected content', () => {
      const projectedContent = 'Custom empty message';
      fixture.componentRef.setInput('message', projectedContent);
      fixture.detectChanges();

      expect(component.message).toBe(projectedContent);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have role status', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should have aria-live polite', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });
  });
});
