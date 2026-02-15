import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MobileSwipeComponent, type SwipeAction, type SwipeEvent } from './mobile-swipe.component';
import { createMockMouseEvent, createMockTouchEvent, createMockTouch, mockActions } from './mobile-swipe.test-helper';

describe('MobileSwipeComponent - Action Handler & Public API', () => {
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

  describe('Action Emission via EventEmitter', () => {
    it('should emit swipeAction event when action button is clicked', () => {
      const action: SwipeAction = {
        id: 'archive',
        label: 'Archive',
        icon: 'test-icon',
        color: 'primary',
      };
      const testItem = { id: 'item-123', name: 'Test Item' };
      component.item = testItem;

      const swipeActionSpy = jest.spyOn(component.swipeAction, 'emit');

      component.onActionClick(action);

      expect(swipeActionSpy).toHaveBeenCalledTimes(1);
      expect(swipeActionSpy).toHaveBeenCalledWith({
        action,
        item: testItem,
      });
    });

    it('should include correct action data in emitted event', () => {
      const action: SwipeAction = {
        id: 'delete',
        label: 'Delete',
        icon: 'M1,2V4H3V2',
        color: 'danger',
        width: 100,
      };

      const swipeActionSpy = jest.spyOn(component.swipeAction, 'emit');
      let emittedEvent: SwipeEvent | undefined;

      component.swipeAction.subscribe((event: SwipeEvent) => {
        emittedEvent = event;
      });

      component.onActionClick(action);

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent?.action).toEqual(action);
      expect(emittedEvent?.action.id).toBe('delete');
      expect(emittedEvent?.action.label).toBe('Delete');
      expect(emittedEvent?.action.color).toBe('danger');
      expect(emittedEvent?.action.width).toBe(100);
    });

    it('should include item data in emitted event', () => {
      const action: SwipeAction = {
        id: 'edit',
        label: 'Edit',
        icon: 'test',
        color: 'warning',
      };
      const testItem = { id: 'abc-123', title: 'Test', value: 42 };
      component.item = testItem;

      const swipeActionSpy = jest.spyOn(component.swipeAction, 'emit');
      let emittedEvent: SwipeEvent | undefined;

      component.swipeAction.subscribe((event: SwipeEvent) => {
        emittedEvent = event;
      });

      component.onActionClick(action);

      expect(emittedEvent?.item).toBe(testItem);
      expect(emittedEvent?.item).toEqual({ id: 'abc-123', title: 'Test', value: 42 });
    });

    it('should allow multiple subscribers to swipeAction event', () => {
      const action: SwipeAction = {
        id: 'share',
        label: 'Share',
        icon: 'test',
        color: 'success',
      };

      const subscriber1Spy = jest.fn();
      const subscriber2Spy = jest.fn();

      component.swipeAction.subscribe(subscriber1Spy);
      component.swipeAction.subscribe(subscriber2Spy);

      component.onActionClick(action);

      expect(subscriber1Spy).toHaveBeenCalled();
      expect(subscriber2Spy).toHaveBeenCalled();
    });
  });

  describe('Action Click After Swipe', () => {
    it('should reset swipe state after action click', () => {
      const action: SwipeAction = {
        id: 'archive',
        label: 'Archive',
        icon: 'test',
        color: 'primary',
      };

      // Simulate a successful swipe
      component.translateX = -160;
      component.actionsVisible = true;

      component.onActionClick(action);

      expect(component.translateX).toBe(0);
      expect(component.actionsVisible).toBe(false);
    });

    it('should emit action event after successful swipe', () => {
      const action: SwipeAction = {
        id: 'delete',
        label: 'Delete',
        icon: 'test',
        color: 'danger',
      };
      const testItem = { id: 'test-id' };
      component.item = testItem;

      // First do a successful swipe
      component.swipeThreshold = 80;
      const startTouch = createMockTouch(1, 200, 100);
      component.onTouchStart(createMockTouchEvent('touchstart', [startTouch]));
      const moveTouch = createMockTouch(1, 100, 100);
      component.onTouchMove(createMockTouchEvent('touchmove', [moveTouch]));
      const endEvent = createMockTouchEvent('touchend', []);
      component.onTouchEnd(endEvent);

      expect(component.actionsVisible).toBe(true);

      // Then click action
      const swipeActionSpy = jest.spyOn(component.swipeAction, 'emit');
      component.onActionClick(action);

      expect(swipeActionSpy).toHaveBeenCalledWith({
        action,
        item: testItem,
      });
    });

    it('should work with programmatic showActions', () => {
      const action: SwipeAction = {
        id: 'edit',
        label: 'Edit',
        icon: 'test',
        color: 'warning',
      };

      // Show actions programmatically
      component.showActions();
      expect(component.actionsVisible).toBe(true);

      // Click action
      const swipeActionSpy = jest.spyOn(component.swipeAction, 'emit');
      component.onActionClick(action);

      expect(swipeActionSpy).toHaveBeenCalled();
      expect(component.actionsVisible).toBe(false);
    });
  });
});
