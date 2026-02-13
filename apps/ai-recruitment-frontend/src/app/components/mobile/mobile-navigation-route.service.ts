import { inject, Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

/**
 * Service for tracking route changes and scroll state in mobile navigation.
 * Extracted from MobileNavigationComponent for separation of concerns.
 */
@Injectable({ providedIn: 'root' })
export class MobileNavigationRouteService {
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  public currentRoute = '';
  public isScrolled = false;

  /**
   * Initialize route tracking and scroll listeners.
   */
  public initialize(): void {
    // Set initial route
    this.currentRoute = this.router.url;

    // Track route changes
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    // Track scroll for header shadow effect
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  /**
   * Update scroll state based on window scroll position.
   */
  private handleScroll(): void {
    this.isScrolled = window.scrollY > 10;
  }

  /**
   * Check if a given route is the current active route.
   */
  public isRouteActive(route: string): boolean {
    return this.currentRoute === route;
  }

  /**
   * Clean up event listeners and observables.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}
