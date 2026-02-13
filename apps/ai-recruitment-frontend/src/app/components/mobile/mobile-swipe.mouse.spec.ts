import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MobileSwipeComponent } from './mobile-swipe.component';
import { createMockMouseEvent, createMockTouchEvent, createMockTouch, mockActions } from './mobile-swipe.test-helper';

describe('MobileSwipeComponent - Mouse Event Handlers (Desktop)', () => {
  let component: MobileSwipeComponent;
  let fixture: ComponentFixture<MobileSwipeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileSwipeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileSwipeComponent);
    component = fixture.componentInstance;
    component.actions = mockActions;
    component.item = { id: 'test-item' };

    // Mock window.innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    fixture.detectChanges();
  });

  beforeEach(() => {
    component.ngOnInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onMouseDown Handler', () => {
    it('should initialize swipe state on mouse down', () => {
      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);
      const preventDefaultSpy = jest.spyOn(mouseEvent, 'preventDefault');

      component.onMouseDown(mouseEvent);

      expect(component['startX']).toBe(200);
      expect(component['currentX']).toBe(200);
      expect(component['isDragging']).toBe(true);
      expect(component['isSwiping']).toBe(true);
      expect(component['isMouseEvent']).toBe(true);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not start mouse drag when disabled', () => {
      component.disabled = true;
      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);
      const preventDefaultSpy = jest.spyOn(mouseEvent, 'preventDefault');

      component.onMouseDown(mouseEvent);

      expect(component['isDragging']).toBe(false);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should not start mouse drag on desktop (width >= 768)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);
      const preventDefaultSpy = jest.spyOn(mouseEvent, 'preventDefault');

      component.onMouseDown(mouseEvent);

      expect(component['isDragging']).toBe(false);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should set isMouseEvent flag to true for mouse events', () => {
      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);

      component['isMouseEvent'] = false; // Set it to false first
      component.onMouseDown(mouseEvent);

      expect(component['isMouseEvent']).toBe(true);
    });

    it('should prevent default on mouse down', () => {
      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);
      const preventDefaultSpy = jest.spyOn(mouseEvent, 'preventDefault');

      component.onMouseDown(mouseEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle mouse down at different X coordinates', () => {
      const testCases = [0, 50, 100, 200, 350, 500];

      testCases.forEach((clientX) => {
        component.resetSwipe();
        const mouseEvent = createMockMouseEvent('mousedown', clientX, 100);
        component.onMouseDown(mouseEvent);

        expect(component['startX']).toBe(clientX);
        expect(component['currentX']).toBe(clientX);
      });
    });

    it('should work at exactly mobile breakpoint (767px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseEvent);

      expect(component['isDragging']).toBe(true);
    });

    it('should not work at desktop breakpoint (768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const mouseEvent = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseEvent);

      expect(component['isDragging']).toBe(false);
    });
  });

  describe('onMouseMove Handler', () => {
    it('should update swipe position during mouse drag', () => {
      // Start drag at X=200
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      // Move to X=150
      const mouseMove = createMockMouseEvent('mousemove', 150, 100);
      const preventDefaultSpy = jest.spyOn(mouseMove, 'preventDefault');

      component.onMouseMove(mouseMove);

      expect(component['currentX']).toBe(150);
      expect(component.translateX).toBe(-50);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not process mouse move when not dragging', () => {
      component['isDragging'] = false;
      const mouseMove = createMockMouseEvent('mousemove', 150, 100);
      const preventDefaultSpy = jest.spyOn(mouseMove, 'preventDefault');

      component.onMouseMove(mouseMove);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should not process mouse move when not initiated by mouse', () => {
      component['isDragging'] = true;
      component['isMouseEvent'] = false; // Initiated by touch
      const mouseMove = createMockMouseEvent('mousemove', 150, 100);
      const preventDefaultSpy = jest.spyOn(mouseMove, 'preventDefault');

      component.onMouseMove(mouseMove);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should not process mouse move when disabled', () => {
      component.disabled = true;
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseMove = createMockMouseEvent('mousemove', 150, 100);
      const preventDefaultSpy = jest.spyOn(mouseMove, 'preventDefault');

      component.onMouseMove(mouseMove);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should cap translateX at maxSwipeDistance for mouse', () => {
      component.actions = [{ id: 'a', label: 'A', icon: 'test', color: 'primary', width: 80 }];
      component.ngOnInit();

      const mouseDown = createMockMouseEvent('mousedown', 300, 100);
      component.onMouseDown(mouseDown);

      const mouseMove = createMockMouseEvent('mousemove', 100, 100);
      component.onMouseMove(mouseMove);

      expect(component.translateX).toBe(-80);
    });

    it('should only allow left swipe with mouse', () => {
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      // Try to move right
      const mouseMove = createMockMouseEvent('mousemove', 250, 100);
      component.onMouseMove(mouseMove);

      expect(component.translateX).toBe(0);
    });
  });

  describe('onMouseUp Handler', () => {
    it('should end mouse drag', () => {
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      expect(component['isDragging']).toBe(true);

      const mouseUp = createMockMouseEvent('mouseup', 150, 100);
      component.onMouseUp(mouseUp);

      expect(component['isDragging']).toBe(false);
    });

    it('should emit swipeEnd on mouse up', () => {
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseUp = createMockMouseEvent('mouseup', 150, 100);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onMouseUp(mouseUp);

      expect(swipeEndSpy).toHaveBeenCalled();
    });

    it('should not process mouse up when not initiated by mouse', () => {
      component['isMouseEvent'] = false;
      const mouseUp = createMockMouseEvent('mouseup', 150, 100);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onMouseUp(mouseUp);

      expect(swipeEndSpy).not.toHaveBeenCalled();
    });

    it('should not process mouse up when disabled', () => {
      component.disabled = true;
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseUp = createMockMouseEvent('mouseup', 150, 100);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onMouseUp(mouseUp);

      expect(swipeEndSpy).not.toHaveBeenCalled();
    });

    it('should snap back when threshold not reached with mouse', () => {
      component.swipeThreshold = 80;
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseMove = createMockMouseEvent('mousemove', 170, 100);
      component.onMouseMove(mouseMove);

      const mouseUp = createMockMouseEvent('mouseup', 170, 100);
      component.onMouseUp(mouseUp);

      expect(component.translateX).toBe(0);
    });

    it('should show actions when threshold reached with mouse', () => {
      component.swipeThreshold = 80;
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseMove = createMockMouseEvent('mousemove', 100, 100);
      component.onMouseMove(mouseMove);

      const mouseUp = createMockMouseEvent('mouseup', 100, 100);
      component.onMouseUp(mouseUp);

      expect(component.translateX).toBe(-160);
      expect(component.actionsVisible).toBe(true);
    });
  });

  describe('onMouseLeave Handler', () => {
    it('should end swipe when mouse leaves element', () => {
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      expect(component['isDragging']).toBe(true);

      const mouseLeave = createMockMouseEvent('mouseleave', 150, 100);
      component.onMouseLeave(mouseLeave);

      expect(component['isDragging']).toBe(false);
    });

    it('should emit swipeEnd when mouse leaves', () => {
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseLeave = createMockMouseEvent('mouseleave', 150, 100);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onMouseLeave(mouseLeave);

      expect(swipeEndSpy).toHaveBeenCalled();
    });

    it('should not process mouse leave when not initiated by mouse', () => {
      component['isMouseEvent'] = false;
      const mouseLeave = createMockMouseEvent('mouseleave', 150, 100);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onMouseLeave(mouseLeave);

      expect(swipeEndSpy).not.toHaveBeenCalled();
    });

    it('should not process mouse leave when disabled', () => {
      component.disabled = true;
      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseLeave = createMockMouseEvent('mouseleave', 150, 100);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onMouseLeave(mouseLeave);

      expect(swipeEndSpy).not.toHaveBeenCalled();
    });
  });

  describe('Desktop Swipe with Mouse Events', () => {
    it('should support left swipe with mouse events on mobile', () => {
      component.swipeThreshold = 80;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const mouseDown = createMockMouseEvent('mousedown', 200, 100);
      component.onMouseDown(mouseDown);

      const mouseMove = createMockMouseEvent('mousemove', 100, 100);
      component.onMouseMove(mouseMove);

      const mouseUp = createMockMouseEvent('mouseup', 100, 100);
      component.onMouseUp(mouseUp);

      expect(component.actionsVisible).toBe(true);
      expect(component.translateX).toBe(-component['maxSwipeDistance']);
    });
  });
});
