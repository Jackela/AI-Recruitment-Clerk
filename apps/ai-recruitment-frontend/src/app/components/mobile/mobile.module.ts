import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Mobile Components
import { MobileNavigationComponent } from './mobile-navigation.component';
import { MobileUploadComponent } from './mobile-upload.component';
import { MobileSwipeComponent } from './mobile-swipe.component';
import { MobileDashboardComponent } from './mobile-dashboard.component';
import { MobileResultsComponent } from './mobile-results.component';
import { MobileResultsDisplayComponent } from './mobile-results-display.component';
import { MobileResultsFilterComponent } from './mobile-results-filter.component';
import { MobilePerformanceComponent } from './mobile-performance.component';

// Mobile Services
import { TouchGestureService } from '../../services/mobile/touch-gesture.service';
import { PWAService } from '../../services/mobile/pwa.service';

/**
 * Mobile UI Module
 *
 * Provides comprehensive mobile-first components and services for the AI Recruitment Clerk.
 * Includes PWA capabilities, touch interactions, and mobile-optimized UX patterns.
 *
 * Features:
 * - Mobile-first navigation with bottom tabs and hamburger menu
 * - Touch gesture recognition and swipe interactions
 * - Mobile-optimized file upload with camera integration
 * - PWA functionality with offline support
 * - Performance monitoring and optimization
 * - Responsive design system with mobile breakpoints
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    // Standalone components are imported directly
    MobileNavigationComponent,
    MobileUploadComponent,
    MobileSwipeComponent,
    MobileDashboardComponent,
    MobileResultsComponent,
    MobileResultsDisplayComponent,
    MobileResultsFilterComponent,
    MobilePerformanceComponent,
  ],
  exports: [
    // Export all mobile components for use in other modules
    MobileNavigationComponent,
    MobileUploadComponent,
    MobileSwipeComponent,
    MobileDashboardComponent,
    MobileResultsComponent,
    MobileResultsDisplayComponent,
    MobileResultsFilterComponent,
    MobilePerformanceComponent,
  ],
  providers: [
    // Mobile-specific services
    TouchGestureService,
    PWAService,
  ],
})
export class MobileModule {
  /**
   * Initialize mobile module with optional configuration
   */
  public static forRoot(): { ngModule: typeof MobileModule; providers: (typeof TouchGestureService | typeof PWAService)[] } {
    return {
      ngModule: MobileModule,
      providers: [TouchGestureService, PWAService],
    };
  }
}
