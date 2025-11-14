import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { LoggerService } from './shared/logger.service';

/**
 * Represents the smart preloading strategy.
 */
@Injectable({
  providedIn: 'root',
})
export class SmartPreloadingStrategy implements PreloadingStrategy {
  private readonly logger = inject(LoggerService).createLogger(
    'SmartPreloadingStrategy',
  );
  private preloadedModules = new Set<string>();
  private networkCondition: 'slow' | 'fast' = 'fast';
  private userEngagement = {
    clicks: 0,
    prefetches: 0,
    routeFrequency: {} as Record<string, number>,
    connectionInfo: {} as Record<string, unknown>,
    isIdle: false,
    interactionCount: 0,
    lastInteraction: Date.now(),
  };

  /**
   * Initializes a new instance of the Smart Preloading Strategy.
   */
  constructor() {
    this.detectNetworkCondition();
    this.trackUserEngagement();
  }

  /**
   * Performs the preload operation.
   * @param route - The route.
   * @param load - The load.
   * @returns The Observable<any>.
   */
  preload<T>(
    route: Route,
    load: () => Observable<T>,
  ): Observable<T | null> {
    const routePath = route.path || 'unknown';

    // Skip if already preloaded
    if (this.preloadedModules.has(routePath)) {
      return of(null);
    }

    // Check if route should be preloaded
    if (!this.shouldPreload(route)) {
      return of(null);
    }

    // Determine delay based on priority and network condition
    const delay = this.calculateDelay(route);

    return timer(delay).pipe(
      mergeMap(() => {
        this.logger.debug(`Preloading route: ${routePath}`);
        this.preloadedModules.add(routePath);
        return load();
      }),
    );
  }

  private shouldPreload(route: Route): boolean {
    const data = route.data || {};

    // Don't preload if explicitly disabled
    if (data['preload'] === false) {
      return false;
    }

    // Don't preload on slow network for low priority routes
    if (this.networkCondition === 'slow' && data['priority'] === 'low') {
      return false;
    }

    // Don't preload if user is actively interacting (last 2 seconds)
    if (Date.now() - this.userEngagement.lastInteraction < 2000) {
      return false;
    }

    // Preload high priority routes immediately
    if (data['priority'] === 'high') {
      return true;
    }

    // Preload medium priority routes after user becomes idle
    if (data['priority'] === 'medium' && this.userEngagement.isIdle) {
      return true;
    }

    // Default preload behavior
    return data['preload'] !== false;
  }

  private calculateDelay(route: Route): number {
    const data = route.data || {};
    const priority = data['priority'] || 'medium';

    let baseDelay = 1000;

    switch (priority) {
      case 'high':
        baseDelay = 500;
        break;
      case 'medium':
        baseDelay = 2000;
        break;
      case 'low':
        baseDelay = 5000;
        break;
    }

    // Increase delay on slow network
    if (this.networkCondition === 'slow') {
      baseDelay *= 2;
    }

    // Reduce delay if user is idle
    if (this.userEngagement.isIdle) {
      baseDelay *= 0.5;
    }

    return baseDelay;
  }

  private detectNetworkCondition(): void {
    // Use Navigator.connection API if available
    type NavigatorConnection = Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    };

    const connection =
      (navigator as NavigatorConnection).connection ||
      (navigator as NavigatorConnection).mozConnection ||
      (navigator as NavigatorConnection).webkitConnection;

    if (connection) {
      // Consider effective connection type
      const effectiveType = connection.effectiveType;
      this.networkCondition = ['slow-2g', '2g', '3g'].includes(effectiveType)
        ? 'slow'
        : 'fast';

      // Listen for changes
      connection.addEventListener('change', () => {
        const newType = connection.effectiveType;
        this.networkCondition = ['slow-2g', '2g', '3g'].includes(newType)
          ? 'slow'
          : 'fast';
        this.logger.log(
          `Network condition changed to: ${this.networkCondition}`,
        );
      });
    } else {
      // Fallback: measure a small resource load time
      this.measureNetworkSpeed();
    }
  }

  private measureNetworkSpeed(): void {
    const startTime = performance.now();
    const testImage = new Image();

    testImage.onload = () => {
      const loadTime = performance.now() - startTime;
      this.networkCondition = loadTime > 1000 ? 'slow' : 'fast';
      this.logger.performance('Network speed test', loadTime, {
        networkCondition: this.networkCondition,
      });
    };

    testImage.onerror = () => {
      this.networkCondition = 'slow'; // Assume slow on error
    };

    // Use a small image for testing
    testImage.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }

  private trackUserEngagement(): void {
    let idleTimer: ReturnType<typeof setTimeout>;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      this.userEngagement.isIdle = false;
      this.userEngagement.lastInteraction = Date.now();
      this.userEngagement.interactionCount++;

      // Consider user idle after 3 seconds of no interaction
      idleTimer = setTimeout(() => {
        this.userEngagement.isIdle = true;
      }, 3000);
    };

    // Track various user interactions
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((event) => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Initialize timer
    resetIdleTimer();
  }

  // Public methods for debugging and monitoring
  /**
   * Retrieves preloaded modules.
   * @returns The Set<string>.
   */
  getPreloadedModules(): Set<string> {
    return new Set(this.preloadedModules);
  }

  /**
   * Retrieves network condition.
   * @returns The string value.
   */
  getNetworkCondition(): string {
    return this.networkCondition;
  }

  /**
   * Retrieves user engagement.
   * @returns The {clicks: number; prefetches: number; routeFrequency: Record<string, number>; connectionInfo: Record<string, unknown>}.
   */
  getUserEngagement(): {
    clicks: number;
    prefetches: number;
    routeFrequency: Record<string, number>;
    connectionInfo: Record<string, unknown>;
  } {
    return { ...this.userEngagement };
  }
}
