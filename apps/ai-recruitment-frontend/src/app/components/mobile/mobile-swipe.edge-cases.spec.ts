import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MobileSwipeComponent } from './mobile-swipe.component';
import { createMockTouchEvent, createMockTouch, mockActions } from './mobile-swipe.test-helper';

describe('MobileSwipeComponent - Edge Cases', () => {
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

  describe('Custom Threshold Handling', () => {
    it('should handle swipe with custom threshold', () => {
      component.swipeThreshold = 120;
      component.ngOnInit();

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move by 110 (less than 120 threshold)
      const moveTouch = createMockTouch(1, 90, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.translateX).toBe(0);
    });

    it('should handle actions with no width specified', () => {
      component.actions = [
        { id: 'a', label: 'A', icon: 'test', color: 'primary' }, // No width
      ];
      component.ngOnInit();

      // Default width is 80
      expect(component['maxSwipeDistance']).toBe(80);
    });
  });

  describe('Very Small Swipe Distance', () => {
    it('should handle very small swipe distance', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move by just 1 pixel
      const moveTouch = createMockTouch(1, 199, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.translateX).toBe(0);
    });

    it('should handle zero movement (deltaX = 0)', () => {
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // No movement
      const moveTouch = createMockTouch(1, startX, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.translateX).toBe(0);
    });
  });

  describe('Zero Threshold', () => {
    it('should handle zero threshold', () => {
      component.swipeThreshold = 0;
      component.ngOnInit();

      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Any movement should trigger
      const moveTouch = createMockTouch(1, 199, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // With threshold=0, any positive deltaX should show actions
      expect(component.translateX).toBe(-160);
    });
  });

  describe('Horizontal Swipe Detection (Left/Right)', () => {
    it('should detect left swipe (moving content left)', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left (currentX < startX, deltaX positive)
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      expect(component.translateX).toBeLessThan(0); // Content moves left
    });

    it('should detect right swipe attempt (moving content right)', () => {
      const startTouch = createMockTouch(1, 100, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move right (currentX > startX, deltaX negative)
      const moveTouch = createMockTouch(1, 200, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      // Right swipe is ignored, content stays at 0
      expect(component.translateX).toBe(0);
    });

    it('should only allow left swipe direction', () => {
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Try moving right first
      let moveTouch = createMockTouch(1, 250, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).toBe(0);

      // Then move left
      moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).toBeLessThan(0);
    });

    it('should handle left swipe with varying distances', () => {
      const testDistances = [10, 30, 50, 80, 100, 150];
      const startX = 300;

      testDistances.forEach((distance) => {
        component.resetSwipe();

        const startTouch = createMockTouch(1, startX, 100);
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        const moveTouch = createMockTouch(1, startX - distance, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

        // translateX should be negative of distance (capped at maxSwipeDistance)
        const expectedTranslateX = -Math.min(distance, component['maxSwipeDistance']);
        expect(component.translateX).toBe(expectedTranslateX);
      });
    });

    it('should handle swipe at different screen positions', () => {
      const startXPositions = [50, 200, 350, 500];
      const swipeDistance = 100;

      startXPositions.forEach((startX) => {
        component.resetSwipe();

        const startTouch = createMockTouch(1, startX, 100);
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        const moveTouch = createMockTouch(1, startX - swipeDistance, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

        expect(component.translateX).toBe(-swipeDistance);
      });
    });

    it('should reject right swipe regardless of position', () => {
      const startXPositions = [50, 200, 350, 500];

      startXPositions.forEach((startX) => {
        component.resetSwipe();

        const startTouch = createMockTouch(1, startX, 100);
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        // Try to swipe right
        const moveTouch = createMockTouch(1, startX + 100, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

        expect(component.translateX).toBe(0);
      });
    });
  });

  describe('Swipe Distance and DeltaX Calculation', () => {
    it('should calculate deltaX as startX - currentX', () => {
      const startX = 300;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      const testCases = [
        { currentX: 250, expectedDeltaX: 50 },
        { currentX: 200, expectedDeltaX: 100 },
        { currentX: 150, expectedDeltaX: 150 },
        { currentX: 100, expectedDeltaX: 200 },
      ];

      testCases.forEach((testCase) => {
        component.resetSwipe();

        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));
        component.onTouchMove(createMockTouchEvent('touchmove', [createMockTouch(1, testCase.currentX, 100)]));

        const expectedTranslateX = -Math.min(testCase.expectedDeltaX, component['maxSwipeDistance']);
        expect(component.translateX).toBe(expectedTranslateX);
      });
    });

    it('should clamp translateX to range [-maxSwipeDistance, 0]', () => {
      const startX = 300;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Extreme left movement
      component.onTouchMove(createMockTouchEvent('touchmove', [createMockTouch(1, 0, 100)]));
      expect(component.translateX).toBe(-component['maxSwipeDistance']); // Clamped to max

      // Extreme right movement (negative deltaX)
      component.onTouchMove(createMockTouchEvent('touchmove', [createMockTouch(1, 500, 100)]));
      expect(component.translateX).toBe(0); // Clamped to min
    });

    it('should track currentX accurately during swipe', () => {
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      const positions = [180, 160, 140, 120, 100];

      positions.forEach((pos) => {
        component.onTouchMove(createMockTouchEvent('touchmove', [createMockTouch(1, pos, 100)]));
        expect(component['currentX']).toBe(pos);
      });
    });
  });

  describe('Rapid Back-and-Forth Movements', () => {
    it('should handle rapid back-and-forth movements correctly', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Move left
      let moveTouch = createMockTouch(1, 150, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).toBe(-50);

      // Move right past start
      moveTouch = createMockTouch(1, 250, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).toBe(0); // Reset on right swipe

      // Move left again beyond threshold
      moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).toBe(-100);

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Final position exceeded threshold, should be valid swipe
      expect(component.actionsVisible).toBe(true);
    });
  });

  describe('Right Swipe Action Handling', () => {
    it('should not reveal actions on right swipe', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe right (negative deltaX)
      const moveTouch = createMockTouch(1, 300, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      // Right swipe should not reveal actions
      expect(component.actionsVisible).toBe(false);
      expect(component.translateX).toBe(0);
    });

    it('should reset to zero on right swipe after left swipe', () => {
      component.swipeThreshold = 80;
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // First swipe left
      let moveTouch = createMockTouch(1, 150, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      expect(component.translateX).toBeLessThan(0);

      // Then swipe right past start
      moveTouch = createMockTouch(1, 250, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      // Should reset to zero
      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });

    it('should ignore right swipe regardless of distance', () => {
      const startX = 200;

      const startTouch = createMockTouch(1, startX, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

      // Swipe right a large distance
      const moveTouch = createMockTouch(1, 500, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });
  });
});
