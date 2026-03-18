import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { VirtualScrollContentComponent } from './virtual-scroll-content.component';

describe('VirtualScrollContentComponent', () => {
  let component: VirtualScrollContentComponent<unknown>;
  let fixture: ComponentFixture<VirtualScrollContentComponent<unknown>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollContentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualScrollContentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render content container', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.virtual-scroll-content',
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default values', () => {
      expect(component.items).toEqual([]);
      expect(component.startIndex).toBe(0);
      expect(component.contentOffset).toBe(0);
    });

    it('should bind items input correctly', () => {
      const items = [{ id: 1 }, { id: 2 }];
      component.items = items;
      fixture.detectChanges();

      expect(component.items).toEqual(items);
    });

    it('should bind startIndex input correctly', () => {
      component.startIndex = 10;
      fixture.detectChanges();

      expect(component.startIndex).toBe(10);
    });

    it('should bind contentOffset input correctly', () => {
      component.contentOffset = 100;
      fixture.detectChanges();

      expect(component.contentOffset).toBe(100);
    });

    it('should bind totalItems input correctly', () => {
      component.totalItems = 1000;
      fixture.detectChanges();

      expect(component.totalItems).toBe(1000);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have role list', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.virtual-scroll-content',
      );
      expect(container.getAttribute('role')).toBe('list');
    });
  });
});
