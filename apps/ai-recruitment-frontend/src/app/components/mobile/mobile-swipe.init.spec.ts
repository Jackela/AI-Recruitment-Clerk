import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { MobileSwipeComponent, type SwipeAction } from './mobile-swipe.component';
import { mockActions } from './mobile-swipe.test-helper';

describe('MobileSwipeComponent - Component Initialization', () => {
  let component: MobileSwipeComponent;
  let fixture: ComponentFixture<MobileSwipeComponent>;
  let containerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileSwipeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileSwipeComponent);
    component = fixture.componentInstance;
    component.actions = mockActions;
    component.item = { id: 'test-item' };

    fixture.detectChanges();
    containerElement = fixture.debugElement.query(By.css('.mobile-swipe-container')).nativeElement;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct default properties', () => {
      expect(component.actions).toEqual(mockActions);
      expect(component.swipeThreshold).toBe(80);
      expect(component.disabled).toBe(false);
      expect(component.translateX).toBe(0);
      expect(component.isSwiping).toBe(false);
      expect(component.actionsVisible).toBe(false);
      expect(component['isDragging']).toBe(false);
    });

    it('should calculate maxSwipeDistance correctly on ngOnInit', () => {
      component.ngOnInit();
      // Default widths: 80 + 80 = 160
      expect(component['maxSwipeDistance']).toBe(160);
    });

    it('should calculate maxSwipeDistance with custom action widths', () => {
      component.actions = [
        { id: 'a', label: 'A', icon: 'test', color: 'primary', width: 100 },
        { id: 'b', label: 'B', icon: 'test', color: 'danger', width: 120 },
      ];
      component.ngOnInit();
      expect(component['maxSwipeDistance']).toBe(220);
    });

    it('should handle empty actions array', () => {
      component.actions = [];
      component.ngOnInit();
      expect(component['maxSwipeDistance']).toBe(0);
    });
  });

  describe('CSS Class Bindings', () => {
    it('should apply swiping class when isSwiping is true', () => {
      component['isSwiping'] = true;
      fixture.detectChanges();

      expect(containerElement.classList.contains('swiping')).toBe(true);
    });

    it('should not apply swiping class when isSwiping is false', () => {
      component['isSwiping'] = false;
      fixture.detectChanges();

      expect(containerElement.classList.contains('swiping')).toBe(false);
    });

    it('should apply actions-visible class when actionsVisible is true', () => {
      component.actionsVisible = true;
      fixture.detectChanges();

      expect(containerElement.classList.contains('actions-visible')).toBe(true);
    });

    it('should not apply actions-visible class when actionsVisible is false', () => {
      component.actionsVisible = false;
      fixture.detectChanges();

      expect(containerElement.classList.contains('actions-visible')).toBe(false);
    });
  });

  describe('ngOnDestroy Lifecycle', () => {
    it('should reset swipe on destroy', () => {
      component['isDragging'] = true;
      component['isSwiping'] = true;
      component.translateX = -100;

      component.ngOnDestroy();

      expect(component['isDragging']).toBe(false);
      expect(component['isSwiping']).toBe(false);
      expect(component.translateX).toBe(0);
    });
  });
});
