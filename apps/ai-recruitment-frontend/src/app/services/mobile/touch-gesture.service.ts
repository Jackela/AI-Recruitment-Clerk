import type { ElementRef} from '@angular/core';
import { Injectable, NgZone, inject } from '@angular/core';
import type { Observable} from 'rxjs';
import { Subject, fromEvent, merge } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

/**
 * Defines the shape of the touch point.
 */
export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Defines the shape of the gesture event.
 */
export interface GestureEvent {
  type: 'tap' | 'doubletap' | 'press' | 'swipe' | 'pinch' | 'pan';
  startPoint: TouchPoint;
  endPoint?: TouchPoint;
  deltaX?: number;
  deltaY?: number;
  distance?: number;
  velocity?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  scale?: number;
  target: HTMLElement;
  originalEvent: TouchEvent | MouseEvent;
  preventDefault: () => void;
}

/**
 * Defines the shape of the gesture config.
 */
export interface GestureConfig {
  tapTimeout: number;
  doubletapTimeout: number;
  pressTimeout: number;
  swipeThreshold: number;
  pinchThreshold: number;
  velocityThreshold: number;
  preventDefaultEvents: boolean;
}

/**
 * Provides touch gesture functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class TouchGestureService {
  private defaultConfig: GestureConfig = {
    tapTimeout: 250,
    doubletapTimeout: 300,
    pressTimeout: 500,
    swipeThreshold: 50,
    pinchThreshold: 10,
    velocityThreshold: 0.3,
    preventDefaultEvents: true,
  };

  private gestureSubject = new Subject<GestureEvent>();
  public gesture$ = this.gestureSubject.asObservable();

  private ngZone = inject(NgZone);

  /**
   * Initialize touch gestures on an element
   */
  public initializeGestures(
    elementRef: ElementRef<HTMLElement>,
    config: Partial<GestureConfig> = {},
  ): Observable<GestureEvent> {
    const element = elementRef.nativeElement;
    const gestureConfig = { ...this.defaultConfig, ...config };
    const destroy$ = new Subject<void>();
    const gestureEvents$ = new Subject<GestureEvent>();

    this.ngZone.runOutsideAngular(() => {
      this.setupGestureHandlers(
        element,
        gestureConfig,
        gestureEvents$,
        destroy$,
      );
    });

    return gestureEvents$.asObservable();
  }

  /**
   * Setup all gesture event handlers
   */
  private setupGestureHandlers(
    element: HTMLElement,
    config: GestureConfig,
    gestureEvents$: Subject<GestureEvent>,
    destroy$: Subject<void>,
  ): void {
    const touchState = {
      touches: new Map<number, TouchPoint>(),
      startTime: 0,
      lastTap: 0,
      tapCount: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pressTimer: null as any,
      initialDistance: 0,
      initialScale: 1,
    };

    // Touch Events
    const touchStart$ = fromEvent<TouchEvent>(element, 'touchstart', {
      passive: false,
    });
    const touchMove$ = fromEvent<TouchEvent>(element, 'touchmove', {
      passive: false,
    });
    const touchEnd$ = fromEvent<TouchEvent>(element, 'touchend', {
      passive: false,
    });

    // Mouse Events (for desktop testing)
    const mouseDown$ = fromEvent<MouseEvent>(element, 'mousedown');
    const mouseMove$ = fromEvent<MouseEvent>(element, 'mousemove');
    const mouseUp$ = fromEvent<MouseEvent>(element, 'mouseup');

    // Combined start events
    const startEvents$ = merge(
      touchStart$.pipe(map((e) => ({ event: e, type: 'touch' as const }))),
      mouseDown$.pipe(map((e) => ({ event: e, type: 'mouse' as const }))),
    );

    // Combined move events
    const moveEvents$ = merge(
      touchMove$.pipe(map((e) => ({ event: e, type: 'touch' as const }))),
      mouseMove$.pipe(map((e) => ({ event: e, type: 'mouse' as const }))),
    );

    // Combined end events
    const endEvents$ = merge(
      touchEnd$.pipe(map((e) => ({ event: e, type: 'touch' as const }))),
      mouseUp$.pipe(map((e) => ({ event: e, type: 'mouse' as const }))),
    );

    // Handle start events
    startEvents$.pipe(takeUntil(destroy$)).subscribe(({ event, type: _ }) => {
      const points = this.getEventPoints(event);
      const now = Date.now();

      if (config.preventDefaultEvents) {
        event.preventDefault();
      }

      // Clear existing press timer
      if (touchState.pressTimer) {
        clearTimeout(touchState.pressTimer);
        touchState.pressTimer = null;
      }

      // Update touch state
      touchState.touches.clear();
      points.forEach((point, index) => {
        touchState.touches.set(index, { ...point, timestamp: now });
      });
      touchState.startTime = now;

      // Handle multi-touch
      if (points.length === 2) {
        touchState.initialDistance = this.calculateDistance(
          points[0],
          points[1],
        );
        touchState.initialScale = 1;
      }

      // Setup press detection
      touchState.pressTimer = setTimeout(() => {
        if (touchState.touches.size > 0) {
          const startPoint = Array.from(touchState.touches.values())[0];
          this.emitGestureEvent(gestureEvents$, {
            type: 'press',
            startPoint,
            target: element,
            originalEvent: event,
            preventDefault: () => event.preventDefault(),
          });
        }
      }, config.pressTimeout);
    });

    // Handle move events
    moveEvents$.pipe(takeUntil(destroy$)).subscribe(({ event, type: _ }) => {
      if (touchState.touches.size === 0) return;

      const points = this.getEventPoints(event);
      const now = Date.now();

      if (config.preventDefaultEvents) {
        event.preventDefault();
      }

      // Clear press timer on movement
      if (touchState.pressTimer) {
        clearTimeout(touchState.pressTimer);
        touchState.pressTimer = null;
      }

      if (points.length === 1) {
        // Single touch - pan/swipe
        const currentPoint = { ...points[0], timestamp: now };
        const startPoint = Array.from(touchState.touches.values())[0];

        if (startPoint) {
          const deltaX = currentPoint.x - startPoint.x;
          const deltaY = currentPoint.y - startPoint.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          // Emit pan event
          this.emitGestureEvent(gestureEvents$, {
            type: 'pan',
            startPoint,
            endPoint: currentPoint,
            deltaX,
            deltaY,
            distance,
            target: element,
            originalEvent: event,
            preventDefault: () => event.preventDefault(),
          });
        }
      } else if (points.length === 2) {
        // Two touches - pinch
        const currentDistance = this.calculateDistance(points[0], points[1]);
        const scale = currentDistance / touchState.initialDistance;

        if (
          Math.abs(scale - touchState.initialScale) >
          config.pinchThreshold / 100
        ) {
          this.emitGestureEvent(gestureEvents$, {
            type: 'pinch',
            startPoint: Array.from(touchState.touches.values())[0],
            scale,
            target: element,
            originalEvent: event,
            preventDefault: () => event.preventDefault(),
          });
          touchState.initialScale = scale;
        }
      }
    });

    // Handle end events
    endEvents$.pipe(takeUntil(destroy$)).subscribe(({ event, type: _ }) => {
      if (touchState.touches.size === 0) return;

      const points = this.getEventPoints(event);
      const now = Date.now();
      const startPoint = Array.from(touchState.touches.values())[0];

      if (config.preventDefaultEvents) {
        event.preventDefault();
      }

      // Clear press timer
      if (touchState.pressTimer) {
        clearTimeout(touchState.pressTimer);
        touchState.pressTimer = null;
      }

      if (startPoint && points.length > 0) {
        const endPoint = { ...points[0], timestamp: now };
        const deltaX = endPoint.x - startPoint.x;
        const deltaY = endPoint.y - startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = now - startPoint.timestamp;
        const velocity = distance / duration;

        // Determine gesture type
        if (distance < config.swipeThreshold && duration < config.tapTimeout) {
          // Tap or double tap
          const timeSinceLastTap = now - touchState.lastTap;

          if (
            timeSinceLastTap < config.doubletapTimeout &&
            touchState.tapCount === 1
          ) {
            // Double tap
            touchState.tapCount = 0;
            this.emitGestureEvent(gestureEvents$, {
              type: 'doubletap',
              startPoint,
              endPoint,
              target: element,
              originalEvent: event,
              preventDefault: () => event.preventDefault(),
            });
          } else {
            // Single tap (with delay to check for double tap)
            touchState.tapCount = 1;
            touchState.lastTap = now;

            setTimeout(() => {
              if (touchState.tapCount === 1) {
                touchState.tapCount = 0;
                this.emitGestureEvent(gestureEvents$, {
                  type: 'tap',
                  startPoint,
                  endPoint,
                  target: element,
                  originalEvent: event,
                  preventDefault: () => event.preventDefault(),
                });
              }
            }, config.doubletapTimeout);
          }
        } else if (
          distance >= config.swipeThreshold &&
          velocity >= config.velocityThreshold
        ) {
          // Swipe
          const direction = this.getSwipeDirection(deltaX, deltaY);

          this.emitGestureEvent(gestureEvents$, {
            type: 'swipe',
            startPoint,
            endPoint,
            deltaX,
            deltaY,
            distance,
            velocity,
            direction,
            target: element,
            originalEvent: event,
            preventDefault: () => event.preventDefault(),
          });
        }
      }

      // Clear touch state
      touchState.touches.clear();
    });
  }

  /**
   * Extract touch/mouse points from event
   */
  private getEventPoints(event: TouchEvent | MouseEvent): TouchPoint[] {
    if ('touches' in event) {
      return Array.from(event.touches).map((touch) => ({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      }));
    } else {
      return [
        {
          x: event.clientX,
          y: event.clientY,
          timestamp: Date.now(),
        },
      ];
    }
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  /**
   * Determine swipe direction
   */
  private getSwipeDirection(
    deltaX: number,
    deltaY: number,
  ): 'left' | 'right' | 'up' | 'down' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Emit gesture event
   */
  private emitGestureEvent(
    gestureEvents$: Subject<GestureEvent>,
    gestureEvent: GestureEvent,
  ): void {
    this.ngZone.run(() => {
      gestureEvents$.next(gestureEvent);
      this.gestureSubject.next(gestureEvent);
    });
  }

  /**
   * Create a simple tap handler
   */
  public onTap(elementRef: ElementRef<HTMLElement>): Observable<GestureEvent> {
    return this.initializeGestures(elementRef).pipe(
      filter((event) => event.type === 'tap'),
    );
  }

  /**
   * Create a simple swipe handler
   */
  public onSwipe(
    elementRef: ElementRef<HTMLElement>,
  ): Observable<GestureEvent> {
    return this.initializeGestures(elementRef).pipe(
      filter((event) => event.type === 'swipe'),
    );
  }

  /**
   * Create a simple press handler
   */
  public onPress(
    elementRef: ElementRef<HTMLElement>,
  ): Observable<GestureEvent> {
    return this.initializeGestures(elementRef).pipe(
      filter((event) => event.type === 'press'),
    );
  }

  /**
   * Create a simple pinch handler
   */
  public onPinch(
    elementRef: ElementRef<HTMLElement>,
  ): Observable<GestureEvent> {
    return this.initializeGestures(elementRef).pipe(
      filter((event) => event.type === 'pinch'),
    );
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    this.gestureSubject.complete();
  }
}
