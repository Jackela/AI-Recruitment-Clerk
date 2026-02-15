import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MobileSwipeComponent } from './mobile-swipe.component';
import { createMockTouch, createMockTouchEvent, mockActions } from './mobile-swipe.test-helper';

describe('MobileSwipeComponent - Touch Event Handlers', () => {
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
    fixture.detectChanges();
  });

  beforeEach(() => {
    component.ngOnInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onTouchStart Handler', () => {
    it('should initialize swipe state on touch start', () => {
      const touch = createMockTouch(1, 200, 100);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);

      component.onTouchStart(touchEvent);

      expect(component['startX']).toBe(200);
      expect(component['currentX']).toBe(200);
      expect(component['isDragging']).toBe(true);
      expect(component['isSwiping']).toBe(true);
      expect(component['isMouseEvent']).toBe(false);
    });

    it('should emit swipeStart event on touch start', () => {
      const touch = createMockTouch(1, 200, 100);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);
      const swipeStartSpy = jest.spyOn(component.swipeStart, 'emit');

      component.onTouchStart(touchEvent);

      expect(swipeStartSpy).toHaveBeenCalled();
    });

    it('should not start swipe when disabled is true', () => {
      component.disabled = true;
      const touch = createMockTouch(1, 200, 100);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);
      const swipeStartSpy = jest.spyOn(component.swipeStart, 'emit');

      component.onTouchStart(touchEvent);

      expect(component['isDragging']).toBe(false);
      expect(component['isSwiping']).toBe(false);
      expect(swipeStartSpy).not.toHaveBeenCalled();
    });

    it('should set isMouseEvent flag to false for touch events', () => {
      const touch = createMockTouch(1, 200, 100);
      const touchEvent = createMockTouchEvent('touchstart', [touch]);

      component['isMouseEvent'] = true; // Set it to true first
      component.onTouchStart(touchEvent);

      expect(component['isMouseEvent']).toBe(false);
    });

    it('should handle touch start at different X coordinates', () => {
      const testCases = [0, 50, 100, 200, 350, 500];

      testCases.forEach((clientX) => {
        component.resetSwipe();
        const touch = createMockTouch(1, clientX, 100);
        const touchEvent = createMockTouchEvent('touchstart', [touch]);

        component.onTouchStart(touchEvent);

        expect(component['startX']).toBe(clientX);
        expect(component['currentX']).toBe(clientX);
      });
    });

    it('should use first touch from touches array', () => {
      const touch1 = createMockTouch(1, 200, 100);
      const touch2 = createMockTouch(2, 250, 150);
      const touchEvent = createMockTouchEvent('touchstart', [touch1, touch2]);

      component.onTouchStart(touchEvent);

      // Should use touches[0] which is touch1
      expect(component['startX']).toBe(200);
    });
  });

  describe('onTouchMove Handler', () => {
    it('should update swipe position during touch move', () => {
      // Start swipe at X=200
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left to X=150 (deltaX = 200 - 150 = 50)
      const moveTouch = createMockTouch(1, 150, 100);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch]);
      const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

      component.onTouchMove(moveEvent);

      expect(component['currentX']).toBe(150);
      expect(component.translateX).toBe(-50); // -Math.min(50, 160) = -50
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should call preventDefault to stop scrolling during swipe', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      const moveTouch = createMockTouch(1, 150, 100);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch]);
      const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

      component.onTouchMove(moveEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not process move when not dragging', () => {
      component['isDragging'] = false;
      const moveTouch = createMockTouch(1, 150, 100);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch]);
      const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

      component.onTouchMove(moveEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(component.translateX).toBe(0);
    });

    it('should not process move when disabled', () => {
      component.disabled = true;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      const moveTouch = createMockTouch(1, 150, 100);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch]);
      const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');

      component.onTouchMove(moveEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should set actionsVisible when passing half threshold', () => {
      component.swipeThreshold = 80;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left by 50 (greater than threshold/2 = 40)
      const moveTouch = createMockTouch(1, 150, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.actionsVisible).toBe(true);
    });

    it('should not set actionsVisible when below half threshold', () => {
      component.swipeThreshold = 80;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left by 30 (less than threshold/2 = 40)
      const moveTouch = createMockTouch(1, 170, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.actionsVisible).toBe(false);
    });

    it('should cap translateX at maxSwipeDistance', () => {
      component.actions = [{ id: 'a', label: 'A', icon: 'test', color: 'primary', width: 80 }];
      component.ngOnInit(); // maxSwipeDistance = 80

      const startTouch = createMockTouch(1, 300, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Try to move left by 200 (more than max)
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      // Should be capped at -80
      expect(component.translateX).toBe(-80);
    });

    it('should only allow left swipe (positive deltaX)', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Try to move right (X increases, deltaX negative)
      const moveTouch = createMockTouch(1, 250, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      // Right swipe should not move content
      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });

    it('should reset translateX and actionsVisible on right swipe', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // First move left
      let moveTouch = createMockTouch(1, 150, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).not.toBe(0);

      // Then move right past start
      moveTouch = createMockTouch(1, 250, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });
  });

  describe('onTouchEnd Handler', () => {
    it('should end swipe and reset dragging state', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      expect(component['isDragging']).toBe(true);
      expect(component['isSwiping']).toBe(true);

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component['isDragging']).toBe(false);
      expect(component['isSwiping']).toBe(false);
    });

    it('should emit swipeEnd event', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      component.onTouchEnd(endEvent);

      expect(swipeEndSpy).toHaveBeenCalled();
    });

    it('should snap back to original position when threshold not reached', () => {
      component.swipeThreshold = 80;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left by 30 (less than threshold)
      const moveTouch = createMockTouch(1, 170, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });

    it('should show actions when threshold is reached', () => {
      component.swipeThreshold = 80;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left by 100 (more than threshold)
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.translateX).toBe(-160); // -maxSwipeDistance
      expect(component.actionsVisible).toBe(true);
    });

    it('should not process end when not dragging', () => {
      component['isDragging'] = false;
      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(swipeEndSpy).not.toHaveBeenCalled();
    });

    it('should not process end when disabled', () => {
      component.disabled = true;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      const swipeEndSpy = jest.spyOn(component.swipeEnd, 'emit');
      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(swipeEndSpy).not.toHaveBeenCalled();
    });

    it('should handle exact threshold distance', () => {
      component.swipeThreshold = 80;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move exactly by threshold
      const moveTouch = createMockTouch(1, 120, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // deltaX = 80, which is not > 80 (it's equal), so should snap back
      expect(component.translateX).toBe(0);
    });
  });
});
