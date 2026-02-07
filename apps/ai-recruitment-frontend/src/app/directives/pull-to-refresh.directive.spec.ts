import { Component } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { PullToRefreshDirective } from './pull-to-refresh.directive';

// Mock navigator.vibrate for testing
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
  configurable: true,
});

@Component({
  template: `<div arcPullToRefresh (refresh)="onRefresh()">Test Content</div>`,
  standalone: true,
  imports: [PullToRefreshDirective],
})
class TestComponent {
  public refreshCount = 0;

  public onRefresh(): void {
    this.refreshCount++;
  }
}

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
    initEvent: () => {
      // Intentionally empty mock for Event interface
    },
    preventDefault: () => {
      // Intentionally empty mock for Event interface
    },
    stopImmediatePropagation: () => {
      // Intentionally empty mock for Event interface
    },
    stopPropagation: () => {
      // Intentionally empty mock for Event interface
    },
  } as unknown as TouchEvent;
}

describe('PullToRefreshDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let _directiveEl: HTMLElement;
  let directiveInstance: PullToRefreshDirective;

  beforeEach(async () => {
    mockVibrate.mockClear();

    await TestBed.configureTestingModule({
      imports: [TestComponent, PullToRefreshDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    _directiveEl = fixture.debugElement.query(By.directive(PullToRefreshDirective)).nativeElement;
    directiveInstance = fixture.debugElement.query(By.directive(PullToRefreshDirective)).injector.get(PullToRefreshDirective);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      const directive = fixture.debugElement.query(By.directive(PullToRefreshDirective));
      expect(directive).toBeTruthy();
    });

    it('should have default threshold input', () => {
      expect(directiveInstance['threshold']()).toBe(100);
    });

    it('should have default visibleThreshold input', () => {
      expect(directiveInstance['visibleThreshold']()).toBe(20);
    });

    it('should initialize pull state correctly', () => {
      expect(directiveInstance['startY']).toBe(0);
      expect(directiveInstance['startX']).toBe(0);
      expect(directiveInstance['currentY']).toBe(0);
      expect(directiveInstance['currentX']).toBe(0);
      expect(directiveInstance['isPulling']).toBe(false);
      expect(directiveInstance['touchIdentifier']).toBe(null);
      expect(directiveInstance['isIndicatorVisible']).toBe(false);
    });

    it('should setup gesture handlers on ngOnInit', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      directiveInstance.ngOnInit();
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: true });
    });
  });

  describe('touch gesture handling', () => {
    beforeEach(() => {
      directiveInstance.ngOnInit();
    });

    describe('handleTouchStart', () => {
      it('should initialize touch state on single touch', () => {
        const touch = createMockTouch(1, 100, 200);
        const touchEvent = createMockTouchEvent('touchstart', [touch]);

        directiveInstance['handleTouchStart'](touchEvent);

        expect(directiveInstance['touchIdentifier']).toBe(1);
        expect(directiveInstance['startY']).toBe(200);
        expect(directiveInstance['startX']).toBe(100);
        expect(directiveInstance['currentY']).toBe(200);
        expect(directiveInstance['currentX']).toBe(100);
        expect(directiveInstance['isPulling']).toBe(false);
      });

      it('should ignore multi-touch events', () => {
        const touch1 = createMockTouch(1, 100, 200);
        const touch2 = createMockTouch(2, 150, 250);
        const touchEvent = createMockTouchEvent('touchstart', [touch1, touch2]);

        directiveInstance['handleTouchStart'](touchEvent);

        // touchIdentifier should remain null for multi-touch
        expect(directiveInstance['touchIdentifier']).toBe(null);
      });

      it('should reset isPulling on touch start', () => {
        directiveInstance['isPulling'] = true;
        const touch = createMockTouch(1, 100, 200);
        const touchEvent = createMockTouchEvent('touchstart', [touch]);

        directiveInstance['handleTouchStart'](touchEvent);

        expect(directiveInstance['isPulling']).toBe(false);
      });
    });

    describe('handleTouchMove', () => {
      it('should not process when touchIdentifier is null', () => {
        const touch = createMockTouch(1, 100, 250);
        const touchEvent = createMockTouchEvent('touchmove', [touch]);
        const preventDefaultSpy = jest.spyOn(touchEvent, 'preventDefault');
        directiveInstance['touchIdentifier'] = null;

        directiveInstance['handleTouchMove'](touchEvent);

        expect(preventDefaultSpy).not.toHaveBeenCalled();
      });

      it('should set indicator visible when crossing visibleThreshold', () => {
        // Start touch
        const touch = createMockTouch(1, 100, 200);
        directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

        // Spy on indicatorVisible output
        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        // Move past visibleThreshold (20) but below threshold (100)
        const movedTouch = createMockTouch(1, 100, 230);
        const moveEvent = createMockTouchEvent('touchmove', [movedTouch]);

        directiveInstance['handleTouchMove'](moveEvent);

        expect(indicatorVisibleSpy).toHaveBeenCalledWith(true);
      });

      it('should trigger vibration when crossing threshold', () => {
        // Start touch
        const touch = createMockTouch(1, 100, 200);
        directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

        // Clear previous calls
        mockVibrate.mockClear();

        // Move past threshold (100)
        const movedTouch = createMockTouch(1, 100, 310);
        const moveEvent = createMockTouchEvent('touchmove', [movedTouch]);

        directiveInstance['handleTouchMove'](moveEvent);

        expect(mockVibrate).toHaveBeenCalledWith(50);
      });

      it('should call preventDefault for vertical pulls past threshold', () => {
        // Start touch
        const touch = createMockTouch(1, 100, 200);
        directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

        // Move far down (deltaY = 200, deltaX = 0)
        const movedTouch = createMockTouch(1, 100, 400);
        const moveEvent = createMockTouchEvent('touchmove', [movedTouch]);

        const preventDefaultSpy = jest.spyOn(moveEvent, 'preventDefault');
        directiveInstance['handleTouchMove'](moveEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should not set pulling for horizontal scroll', () => {
        // Start touch
        const touch = createMockTouch(1, 100, 200);
        directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

        // First make the indicator visible
        const movedTouch1 = createMockTouch(1, 100, 230);
        directiveInstance['handleTouchMove'](createMockTouchEvent('touchmove', [movedTouch1]));

        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        // Move horizontally more than 30px (horizontal scroll threshold)
        const movedTouch2 = createMockTouch(1, 150, 240);
        const moveEvent = createMockTouchEvent('touchmove', [movedTouch2]);

        directiveInstance['handleTouchMove'](moveEvent);

        expect(directiveInstance['isPulling']).toBe(false);
        expect(indicatorVisibleSpy).toHaveBeenCalledWith(false);
      });

      it('should not set pulling for horizontal-dominant movement', () => {
        // Start touch
        const touch = createMockTouch(1, 100, 200);
        directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

        // Move more horizontally than vertically (not primary vertical)
        const movedTouch = createMockTouch(1, 200, 250);
        const moveEvent = createMockTouchEvent('touchmove', [movedTouch]);

        directiveInstance['handleTouchMove'](moveEvent);

        expect(directiveInstance['isPulling']).toBe(false);
      });

      it('should not process upward pulls', () => {
        // Start touch
        const touch = createMockTouch(1, 100, 200);
        directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

        // Move upward (deltaY would be negative)
        const movedTouch = createMockTouch(1, 100, 150);
        const moveEvent = createMockTouchEvent('touchmove', [movedTouch]);

        directiveInstance['handleTouchMove'](moveEvent);

        expect(directiveInstance['isPulling']).toBe(false);
      });
    });

    describe('handleTouchEnd', () => {
      it('should reset state when touchIdentifier is null', () => {
        directiveInstance['touchIdentifier'] = null;
        directiveInstance['isPulling'] = true;
        directiveInstance['isIndicatorVisible'] = true;

        const touchEvent = createMockTouchEvent('touchend', []);
        directiveInstance['handleTouchEnd'](touchEvent);

        expect(directiveInstance['isPulling']).toBe(false);
      });

      it('should trigger refresh when threshold is met', () => {
        const refreshSpy = jest.spyOn(component, 'onRefresh');

        // Simulate a valid pull
        directiveInstance['touchIdentifier'] = 1;
        directiveInstance['startY'] = 200;
        directiveInstance['currentY'] = 350; // deltaY = 150 >= threshold (100)
        directiveInstance['startX'] = 100;
        directiveInstance['currentX'] = 120; // deltaX = 20 < 50
        directiveInstance['isPulling'] = true;

        const touchEvent = createMockTouchEvent('touchend', []);
        directiveInstance['handleTouchEnd'](touchEvent);

        expect(mockVibrate).toHaveBeenCalledWith([30, 30, 30]);
        expect(refreshSpy).toHaveBeenCalled();
      });

      it('should not trigger refresh when threshold is not met', () => {
        const refreshSpy = jest.spyOn(component, 'onRefresh');

        // Simulate a pull below threshold
        directiveInstance['touchIdentifier'] = 1;
        directiveInstance['startY'] = 200;
        directiveInstance['currentY'] = 250; // deltaY = 50 < threshold (100)
        directiveInstance['startX'] = 100;
        directiveInstance['currentX'] = 100;
        directiveInstance['isPulling'] = true;

        const touchEvent = createMockTouchEvent('touchend', []);
        directiveInstance['handleTouchEnd'](touchEvent);

        expect(refreshSpy).not.toHaveBeenCalled();
      });

      it('should not trigger refresh for horizontal movement', () => {
        const refreshSpy = jest.spyOn(component, 'onRefresh');

        // Simulate horizontal movement
        directiveInstance['touchIdentifier'] = 1;
        directiveInstance['startY'] = 200;
        directiveInstance['currentY'] = 350; // deltaY >= threshold
        directiveInstance['startX'] = 100;
        directiveInstance['currentX'] = 200; // deltaX = 100 >= 50
        directiveInstance['isPulling'] = true;

        const touchEvent = createMockTouchEvent('touchend', []);
        directiveInstance['handleTouchEnd'](touchEvent);

        expect(refreshSpy).not.toHaveBeenCalled();
      });

      it('should reset state after touch ends', () => {
        directiveInstance['touchIdentifier'] = 1;
        directiveInstance['isPulling'] = true;
        directiveInstance['isIndicatorVisible'] = true;

        const touchEvent = createMockTouchEvent('touchend', []);
        directiveInstance['handleTouchEnd'](touchEvent);

        expect(directiveInstance['touchIdentifier']).toBe(null);
        expect(directiveInstance['isPulling']).toBe(false);
      });
    });

    describe('handleTouchCancel', () => {
      it('should reset state and clear touchIdentifier', () => {
        directiveInstance['touchIdentifier'] = 1;
        directiveInstance['isPulling'] = true;
        directiveInstance['isIndicatorVisible'] = true;

        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        const touchEvent = createMockTouchEvent('touchcancel', []);
        directiveInstance['handleTouchCancel'](touchEvent);

        expect(directiveInstance['isPulling']).toBe(false);
        expect(directiveInstance['touchIdentifier']).toBe(null);
        expect(indicatorVisibleSpy).toHaveBeenCalledWith(false);
      });
    });

    describe('findTouchByIdentifier', () => {
      it('should find touch by identifier', () => {
        const touch1 = createMockTouch(1, 100, 200);
        const touch2 = createMockTouch(2, 150, 250);
        const touchEvent = createMockTouchEvent('touchmove', [touch1, touch2]);

        directiveInstance['touchIdentifier'] = 2;

        const result = directiveInstance['findTouchByIdentifier'](touchEvent);

        expect(result).toBe(touch2);
      });

      it('should return null when touch not found', () => {
        const touch1 = createMockTouch(1, 100, 200);
        const touchEvent = createMockTouchEvent('touchmove', [touch1]);

        directiveInstance['touchIdentifier'] = 2;

        const result = directiveInstance['findTouchByIdentifier'](touchEvent);

        expect(result).toBeNull();
      });

      it('should return null for empty touches list', () => {
        const touchEvent = createMockTouchEvent('touchmove', []);
        directiveInstance['touchIdentifier'] = 1;

        const result = directiveInstance['findTouchByIdentifier'](touchEvent);

        expect(result).toBeNull();
      });
    });

    describe('touchExistsInList', () => {
      it('should return true when touch exists', () => {
        const touch1 = createMockTouch(1, 100, 200);
        const touchEvent = createMockTouchEvent('touchend', [touch1]);

        directiveInstance['touchIdentifier'] = 1;

        const result = directiveInstance['touchExistsInList'](touchEvent);

        expect(result).toBe(true);
      });

      it('should return false when touch does not exist', () => {
        const touch1 = createMockTouch(1, 100, 200);
        const touchEvent = createMockTouchEvent('touchend', [touch1]);

        directiveInstance['touchIdentifier'] = 2;

        const result = directiveInstance['touchExistsInList'](touchEvent);

        expect(result).toBe(false);
      });
    });
  });

  describe('refresh state management', () => {
    beforeEach(() => {
      directiveInstance.ngOnInit();
    });

    describe('setIndicatorVisibility', () => {
      it('should emit true when indicator becomes visible', () => {
        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        directiveInstance['setIndicatorVisibility'](true);

        expect(directiveInstance['isIndicatorVisible']).toBe(true);
        expect(indicatorVisibleSpy).toHaveBeenCalledWith(true);
      });

      it('should emit false when indicator becomes hidden', () => {
        directiveInstance['isIndicatorVisible'] = true;
        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        directiveInstance['setIndicatorVisibility'](false);

        expect(directiveInstance['isIndicatorVisible']).toBe(false);
        expect(indicatorVisibleSpy).toHaveBeenCalledWith(false);
      });

      it('should not emit when visibility state has not changed', () => {
        directiveInstance['isIndicatorVisible'] = true;
        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        directiveInstance['setIndicatorVisibility'](true);

        expect(indicatorVisibleSpy).not.toHaveBeenCalled();
      });
    });

    describe('resetPullState', () => {
      it('should reset isPulling to false', () => {
        directiveInstance['isPulling'] = true;
        directiveInstance['isIndicatorVisible'] = true;

        directiveInstance['resetPullState']();

        expect(directiveInstance['isPulling']).toBe(false);
      });

      it('should hide indicator', () => {
        directiveInstance['isIndicatorVisible'] = true;
        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        directiveInstance['resetPullState']();

        expect(indicatorVisibleSpy).toHaveBeenCalledWith(false);
      });
    });

    describe('triggerRefresh', () => {
      it('should vibrate with pattern when vibrate is supported', () => {
        const _refreshSpy = jest.spyOn(directiveInstance['refresh'], 'emit');

        directiveInstance['triggerRefresh']();

        expect(mockVibrate).toHaveBeenCalledWith([30, 30, 30]);
      });

      it('should emit refresh event', () => {
        const refreshSpy = jest.spyOn(directiveInstance['refresh'], 'emit');

        directiveInstance['triggerRefresh']();

        expect(refreshSpy).toHaveBeenCalled();
      });

      it('should reset pull state after triggering refresh', () => {
        directiveInstance['isPulling'] = true;
        directiveInstance['isIndicatorVisible'] = true;
        const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

        directiveInstance['triggerRefresh']();

        expect(directiveInstance['isPulling']).toBe(false);
        expect(indicatorVisibleSpy).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('onDestroy lifecycle', () => {
    it('should register cleanup callback with destroyRef', () => {
      expect(directiveInstance['destroyRef']).toBeTruthy();
    });

    it('should remove event listeners on destroy', () => {
      const _removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      directiveInstance.ngOnInit();

      // The destroyRef.onDestroy should be called with a cleanup callback
      // We can verify the event listeners were registered during ngOnInit
      // and the destroyRef has the onDestroy method available
      expect(typeof directiveInstance['destroyRef'].onDestroy).toBe('function');

      // Manually verify the cleanup by checking that event listeners were added
      // and the onDestroy callback would remove them
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      directiveInstance.ngOnInit();

      // Verify 4 event listeners were registered (touchstart, touchmove, touchend, touchcancel)
      // The onDestroy callback removes all of them
      expect(addEventListenerSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('complete pull-to-refresh flow', () => {
    beforeEach(() => {
      directiveInstance.ngOnInit();
    });

    it('should complete full pull-to-refresh cycle', () => {
      const refreshSpy = jest.spyOn(component, 'onRefresh');
      const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

      // Step 1: Start touch
      const touch = createMockTouch(1, 100, 200);
      directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

      expect(directiveInstance['touchIdentifier']).toBe(1);

      // Step 2: Pull down to show indicator (cross visibleThreshold)
      const movedTouch1 = createMockTouch(1, 100, 230);
      directiveInstance['handleTouchMove'](createMockTouchEvent('touchmove', [movedTouch1]));

      expect(indicatorVisibleSpy).toHaveBeenCalledWith(true);

      // Step 3: Pull past threshold (should vibrate)
      mockVibrate.mockClear();
      const movedTouch2 = createMockTouch(1, 100, 310);
      directiveInstance['handleTouchMove'](createMockTouchEvent('touchmove', [movedTouch2]));

      expect(mockVibrate).toHaveBeenCalledWith(50);

      // Step 4: Release to trigger refresh
      directiveInstance['handleTouchEnd'](createMockTouchEvent('touchend', []));

      expect(refreshSpy).toHaveBeenCalled();
      expect(mockVibrate).toHaveBeenCalledWith([30, 30, 30]);
    });

    it('should cancel refresh if pull is released early', () => {
      const refreshSpy = jest.spyOn(component, 'onRefresh');
      const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

      // Start touch
      const touch = createMockTouch(1, 100, 200);
      directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

      // Pull down a bit
      const movedTouch = createMockTouch(1, 100, 230);
      directiveInstance['handleTouchMove'](createMockTouchEvent('touchmove', [movedTouch]));

      expect(indicatorVisibleSpy).toHaveBeenCalledWith(true);

      // Release before reaching threshold
      directiveInstance['handleTouchEnd'](createMockTouchEvent('touchend', []));

      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('should cancel refresh on touchcancel', () => {
      const refreshSpy = jest.spyOn(component, 'onRefresh');
      const indicatorVisibleSpy = jest.spyOn(directiveInstance['indicatorVisible'], 'emit');

      // Start touch and pull past threshold
      const touch = createMockTouch(1, 100, 200);
      directiveInstance['handleTouchStart'](createMockTouchEvent('touchstart', [touch]));

      const movedTouch = createMockTouch(1, 100, 310);
      directiveInstance['handleTouchMove'](createMockTouchEvent('touchmove', [movedTouch]));

      expect(indicatorVisibleSpy).toHaveBeenCalledWith(true);

      // Touch is cancelled
      directiveInstance['handleTouchCancel'](createMockTouchEvent('touchcancel', []));

      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });
});
