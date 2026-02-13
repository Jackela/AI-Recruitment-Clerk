import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MobileSwipeComponent, type SwipeAction } from './mobile-swipe.component';
import { createMockMouseEvent, createMockTouchEvent, createMockTouch, mockActions } from './mobile-swipe.test-helper';

describe('MobileSwipeComponent - Threshold & Swipe Detection Logic', () => {
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

  describe('Swipe Threshold Calculation', () => {
    it('should require swipe distance > threshold to trigger action reveal', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move exactly threshold distance (80)
      const moveTouch = createMockTouch(1, startX - 80, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Exactly threshold is NOT > threshold, should snap back
      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });

    it('should trigger action reveal when swipe exceeds threshold', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move more than threshold (81 pixels)
      const moveTouch = createMockTouch(1, startX - 81, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // deltaX > threshold, should reveal actions
      expect(component.translateX).toBe(-component['maxSwipeDistance']);
      expect(component.actionsVisible).toBe(true);
    });

    it('should show partial action visibility above half threshold', () => {
      component.swipeThreshold = 100;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move just above half threshold (51 pixels, where 51 > 50)
      const moveTouch = createMockTouch(1, startX - 51, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.actionsVisible).toBe(true);
    });

    it('should not show partial action visibility below half threshold', () => {
      component.swipeThreshold = 100;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move just below half threshold (49 pixels)
      const moveTouch = createMockTouch(1, startX - 49, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.actionsVisible).toBe(false);
    });

    it('should work with custom threshold values', () => {
      const thresholds = [40, 60, 80, 100, 150, 200];

      thresholds.forEach((threshold) => {
        component.resetSwipe();
        component.swipeThreshold = threshold;

        const startTouch = createMockTouch(1, 300, 100);
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        // Move just above half threshold
        const aboveHalfThresholdTouch = createMockTouch(1, 300 - Math.ceil(threshold / 2) - 1, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [aboveHalfThresholdTouch]));

        expect(component.actionsVisible).toBe(true);

        // Reset and try below half
        component.resetSwipe();
        component.swipeThreshold = threshold;
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        const belowHalfTouch = createMockTouch(1, 300 - Math.floor(threshold / 2) + 1, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [belowHalfTouch]));

        expect(component.actionsVisible).toBe(false);
      });
    });

    it('should cap translateX at maxSwipeDistance regardless of threshold', () => {
      component.swipeThreshold = 50;
      component.actions = [
        { id: 'a', label: 'A', icon: 'test', color: 'primary', width: 60 },
        { id: 'b', label: 'B', icon: 'test', color: 'danger', width: 60 },
      ];
      component.ngOnInit(); // maxSwipeDistance = 120

      const startTouch = createMockTouch(1, 400, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Try to swipe way beyond maxSwipeDistance
      const moveTouch = createMockTouch(1, 100, 100); // 300 pixels
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.translateX).toBe(-120); // Capped at maxSwipeDistance
    });

    it('should handle threshold larger than maxSwipeDistance', () => {
      component.actions = [
        { id: 'a', label: 'A', icon: 'test', color: 'primary', width: 40 },
      ];
      component.swipeThreshold = 100; // Larger than maxSwipeDistance (40)
      component.ngOnInit();

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe to max distance (40 pixels)
      const moveTouch = createMockTouch(1, 160, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Even though we capped at maxSwipeDistance, we didn't exceed threshold
      expect(component.translateX).toBe(0);
    });
  });

  describe('isSwipe判定 (Swipe Detection Logic)', () => {
    it('should identify valid swipe when deltaX > threshold', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe 90 pixels (exceeds threshold)
      const moveTouch = createMockTouch(1, 110, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Valid swipe - actions revealed
      expect(component.actionsVisible).toBe(true);
      expect(component.translateX).toBe(-component['maxSwipeDistance']);
    });

    it('should reject gesture as swipe when deltaX <= threshold', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe 70 pixels (below threshold)
      const moveTouch = createMockTouch(1, 130, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Not a valid swipe - snaps back
      expect(component.actionsVisible).toBe(false);
      expect(component.translateX).toBe(0);
    });

    it('should handle exact threshold boundary (deltaX === threshold)', () => {
      component.swipeThreshold = 75;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe exactly 75 pixels
      const moveTouch = createMockTouch(1, 125, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // deltaX === threshold is NOT > threshold, so not a swipe
      expect(component.actionsVisible).toBe(false);
      expect(component.translateX).toBe(0);
    });

    it('should only recognize left swipes (positive deltaX)', () => {
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe right (negative deltaX)
      const moveTouch = createMockTouch(1, 280, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Right swipes are never valid
      expect(component.actionsVisible).toBe(false);
      expect(component.translateX).toBe(0);
    });

    it('should require left direction AND exceed threshold for valid swipe', () => {
      component.swipeThreshold = 60;

      // Test case 1: Left direction, below threshold
      component.resetSwipe();
      let startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));
      let moveTouch = createMockTouch(1, 150, 100); // deltaX = 50, below threshold
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      let endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);
      expect(component.actionsVisible).toBe(false);

      // Test case 2: Right direction, exceed distance threshold
      component.resetSwipe();
      startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));
      moveTouch = createMockTouch(1, 280, 100); // deltaX negative (right)
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);
      expect(component.actionsVisible).toBe(false);

      // Test case 3: Left direction, exceed threshold (valid swipe)
      component.resetSwipe();
      startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));
      moveTouch = createMockTouch(1, 120, 100); // deltaX = 80, exceeds threshold
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);
      expect(component.actionsVisible).toBe(true);
    });
  });

  describe('Threshold-Based Triggering', () => {
    it('should require swipe distance greater than threshold to reveal actions', () => {
      component.swipeThreshold = 100;

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe exactly 100 pixels (not greater than threshold)
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Should not reveal actions (needs > threshold, not >=)
      expect(component.actionsVisible).toBe(false);
      expect(component.translateX).toBe(0);
    });

    it('should reveal actions when swipe is just above threshold', () => {
      component.swipeThreshold = 100;

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe 101 pixels (just above threshold)
      const moveTouch = createMockTouch(1, 99, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.actionsVisible).toBe(true);
      expect(component.translateX).toBe(-component['maxSwipeDistance']);
    });

    it('should show partial visibility when above half threshold', () => {
      component.swipeThreshold = 100;

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe 51 pixels (above half threshold of 50)
      const moveTouch = createMockTouch(1, 149, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      // During swipe, actionsVisible should be true above half threshold
      expect(component.actionsVisible).toBe(true);
    });

    it('should not show partial visibility when below half threshold', () => {
      component.swipeThreshold = 100;

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe 49 pixels (below half threshold of 50)
      const moveTouch = createMockTouch(1, 151, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.actionsVisible).toBe(false);
    });

    it('should respect custom threshold values', () => {
      const thresholds = [40, 60, 100, 150];

      thresholds.forEach((threshold) => {
        component.resetSwipe();
        component.swipeThreshold = threshold;

        const startTouch = createMockTouch(1, 300, 100);
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        // Swipe just above threshold
        const moveTouch = createMockTouch(1, 300 - threshold - 1, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

        const endEvent = createMockTouchEvent('touchend', []);
        component.onTouchEnd(endEvent);

        expect(component.actionsVisible).toBe(true);
      });
    });

    it('should snap back to zero when swipe is below threshold', () => {
      component.swipeThreshold = 80;

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe below threshold
      const moveTouch = createMockTouch(1, 130, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Should snap back to original position
      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });

    it('should snap to max distance when swipe exceeds threshold', () => {
      component.swipeThreshold = 80;

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe beyond threshold
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Should snap to full reveal position
      expect(component.translateX).toBe(-component['maxSwipeDistance']);
      expect(component.actionsVisible).toBe(true);
    });
  });

  describe('Left Swipe Action Reveal', () => {
    it('should reveal actions when left swipe exceeds threshold', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe left beyond threshold (100 pixels)
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Actions should be revealed
      expect(component.actionsVisible).toBe(true);
      expect(component.translateX).toBe(-component['maxSwipeDistance']);
    });

    it('should not reveal actions when left swipe is below threshold', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe left but below threshold (50 pixels)
      const moveTouch = createMockTouch(1, 150, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Actions should not be revealed
      expect(component.actionsVisible).toBe(false);
      expect(component.translateX).toBe(0);
    });

    it('should reveal actions at exactly threshold + 1 pixel', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe exactly threshold + 1 (81 pixels)
      const moveTouch = createMockTouch(1, 119, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.actionsVisible).toBe(true);
    });
  });
});
