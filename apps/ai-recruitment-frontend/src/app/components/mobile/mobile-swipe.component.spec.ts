import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { MobileSwipeComponent, type SwipeAction, type SwipeEvent } from './mobile-swipe.component';

// Helper to create a mock Touch object
function createMockTouch(identifier: number, clientX: number, clientY: number): Touch {
  return {
    identifier,
    clientX,
    clientY,
    target: null,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
  } as unknown as Touch;
}

// Helper to create a mock TouchEvent
function createMockTouchEvent(type: string, touches: Touch[]): TouchEvent {
  return {
    type,
    touches,
    changedTouches: touches,
    targetTouches: touches,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    composed: true,
    timeStamp: Date.now(),
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    currentTarget: null,
    target: null,
    srcElement: null,
    returnValue: true,
    cancelBubble: false,
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    composedPath: () => [],
    initEvent: () => {},
    preventDefault: () => {},
    stopImmediatePropagation: () => {},
    stopPropagation: () => {},
  } as unknown as TouchEvent;
}

// Helper to create a mock MouseEvent
function createMockMouseEvent(type: string, clientX: number, clientY: number): MouseEvent {
  return {
    type,
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    composed: true,
    timeStamp: Date.now(),
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    button: 0,
    buttons: 1,
    relatedTarget: null,
    currentTarget: null,
    target: null,
    srcElement: null,
    returnValue: true,
    cancelBubble: false,
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    composedPath: () => [],
    initEvent: () => {},
    preventDefault: () => {},
    stopImmediatePropagation: () => {},
    stopPropagation: () => {},
    getModifierState: () => false,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    movementX: 0,
    movementY: 0,
    which: 1,
    region: null,
    layerX: clientX,
    layerY: clientY,
  } as unknown as MouseEvent;
}

describe('MobileSwipeComponent', () => {
  let component: MobileSwipeComponent;
  let fixture: ComponentFixture<MobileSwipeComponent>;
  let containerElement: HTMLElement;

  const mockActions: SwipeAction[] = [
    { id: 'archive', label: 'Archive', icon: 'M1,2V4H3V2M5,2V4H7V2M9,2V4H11V2M13,2V4H15V2M1,6V8H3V6M5,6V8H7V6M9,6V8H11V6M13,6V8H15V6', color: 'primary', width: 80 },
    { id: 'delete', label: 'Delete', icon: 'M1,2V4H3V2M5,2V4H7V2M9,2V4H11V2M13,2V4H15V2', color: 'danger', width: 80 },
  ];

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
      expect(component.isDragging).toBe(false);
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

  describe('onTouchStart Handler', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

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
    beforeEach(() => {
      component.ngOnInit();
    });

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
    beforeEach(() => {
      component.ngOnInit();
    });

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

  describe('onMouseDown Handler (Desktop)', () => {
    beforeEach(() => {
      component.ngOnInit();
      // Mock window.innerWidth to simulate mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

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

  describe('onMouseMove Handler (Desktop)', () => {
    beforeEach(() => {
      component.ngOnInit();
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

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
    beforeEach(() => {
      component.ngOnInit();
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

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
    beforeEach(() => {
      component.ngOnInit();
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

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

  describe('Action Click Handler', () => {
    it('should emit swipeAction with action and item', () => {
      const action: SwipeAction = {
        id: 'archive',
        label: 'Archive',
        icon: 'test-icon',
        color: 'primary',
      };
      const testItem = { id: 'item-123' };
      component.item = testItem;

      const swipeActionSpy = jest.spyOn(component.swipeAction, 'emit');

      component.onActionClick(action);

      expect(swipeActionSpy).toHaveBeenCalledWith({
        action,
        item: testItem,
      });
    });

    it('should reset swipe after action click', () => {
      component.translateX = -100;
      component.actionsVisible = true;
      component['isDragging'] = true;

      const action: SwipeAction = {
        id: 'delete',
        label: 'Delete',
        icon: 'test-icon',
        color: 'danger',
      };

      component.onActionClick(action);

      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
      expect(component['isDragging']).toBe(false);
    });
  });

  describe('Public API Methods', () => {
    it('should reset swipe state via reset()', () => {
      component.translateX = -100;
      component.actionsVisible = true;
      component['isDragging'] = true;
      component['isSwiping'] = true;
      component['isMouseEvent'] = true;

      component.reset();

      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
      expect(component['isDragging']).toBe(false);
      expect(component['isSwiping']).toBe(false);
      expect(component['isMouseEvent']).toBe(false);
    });

    it('should show actions via showActions()', () => {
      component.actions = [
        { id: 'a', label: 'A', icon: 'test', color: 'primary', width: 100 },
        { id: 'b', label: 'B', icon: 'test', color: 'danger', width: 120 },
      ];
      component.ngOnInit();

      component.showActions();

      expect(component.translateX).toBe(-220);
      expect(component.actionsVisible).toBe(true);
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

  describe('Edge Cases', () => {
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

  describe('Swipe Detection Logic', () => {
    beforeEach(() => {
      component.ngOnInit();
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

      it('should handle deltaX of zero (no movement)', () => {
        const startX = 200;

        const startTouch = createMockTouch(1, startX, 100);
        component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));

        // No movement
        const moveTouch = createMockTouch(1, startX, 100);
        component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));

        expect(component.translateX).toBe(0);
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
  });
});
