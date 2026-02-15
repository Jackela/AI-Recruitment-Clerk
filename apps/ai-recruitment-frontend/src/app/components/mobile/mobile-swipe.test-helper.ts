// Touch and TouchEvent are browser APIs, not Angular exports
// Using type assertions for mock objects

/**
 * Helper to create a mock Touch object for testing touch events.
 * @param identifier - Unique identifier for the touch point
 * @param clientX - X coordinate relative to the viewport
 * @param clientY - Y coordinate relative to the viewport
 * @returns A mock Touch object
 */
export function createMockTouch(identifier: number, clientX: number, clientY: number): Touch {
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

/**
 * Helper to create a mock TouchEvent for testing touch interactions.
 * @param type - The type of touch event (e.g., 'touchstart', 'touchmove', 'touchend')
 * @param touches - Array of Touch objects representing current touch points
 * @returns A mock TouchEvent object
 */
export function createMockTouchEvent(type: string, touches: Touch[]): TouchEvent {
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

/**
 * Helper to create a mock MouseEvent for testing mouse interactions.
 * @param type - The type of mouse event (e.g., 'mousedown', 'mousemove', 'mouseup')
 * @param clientX - X coordinate relative to the viewport
 * @param clientY - Y coordinate relative to the viewport
 * @returns A mock MouseEvent object
 */
export function createMockMouseEvent(type: string, clientX: number, clientY: number): MouseEvent {
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

/**
 * Default mock actions used across all swipe test suites.
 */
export const mockActions: import('./mobile-swipe.component').SwipeAction[] = [
  { id: 'archive', label: 'Archive', icon: 'M1,2V4H3V2M5,2V4H7V2M9,2V4H11V2M13,2V4H15V2M1,6V8H3V6M5,6V8H7V6M9,6V8H11V6M13,6V8H15V6', color: 'primary', width: 80 },
  { id: 'delete', label: 'Delete', icon: 'M1,2V4H3V2M5,2V4H7V2M9,2V4H11V2M13,2V4H15V2', color: 'danger', width: 80 },
];
