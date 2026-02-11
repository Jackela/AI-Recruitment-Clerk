# Mobile Components - AI Recruitment Clerk

This directory contains mobile-first Angular components for the AI Recruitment Clerk application.

## Component Organization

### Main Components
- `mobile-dashboard.component.ts` - Main dashboard coordinator
- `mobile-results.component.ts` - Candidate results coordinator
- `mobile-navigation.component.ts` - Bottom navigation bar
- `mobile-upload.component.ts` - Resume upload interface
- `mobile-performance.component.ts` - Performance metrics display
- `mobile-swipe.component.ts` - Swipe gesture handler

### Extracted Display Components
- `dashboard-stats.component.ts` - Statistics cards (extracted from mobile-dashboard)
- `dashboard-charts.component.ts` - Chart visualizations (extracted from mobile-dashboard)
- `mobile-results-display.component.ts` - Candidate card display (extracted from mobile-results)
- `mobile-results-filter.component.ts` - Filter UI (extracted from mobile-results)

### Services
- `mobile-dashboard.service.ts` - Dashboard business logic and state management
- `mobile-results.service.ts` - Results filtering, sorting, and state management
- `touch-gesture.service.ts` - Touch gesture handling for mobile interactions
- `pwa.service.ts` - Progressive Web App functionality

## Component Splitting Patterns

### When to Split a Component
Split a component when it exceeds **500 lines** or has multiple distinct responsibilities:

1. **Display Logic Extraction** - Create `*-display.component.ts`
   - Move template rendering for items (cards, lists)
   - Move UI state (empty, loading, error states)
   - Emit events for parent actions

2. **Filter Logic Extraction** - Create `*-filter.component.ts`
   - Move filter state and UI controls
   - Emit filtersChanged events
   - Keep filter validation internal

3. **Business Logic to Service** - Create `mobile-*.service.ts`
   - Move data fetching and transformation
   - Move state management (BehaviorSubject pattern)
   - Keep component as thin orchestrator

### Component Communication Pattern

```typescript
// Child component (filter)
@Output() filtersChanged = new EventEmitter<ResultsFilter>();

// Parent component
onFiltersChanged(filters: ResultsFilter): void {
  this.filterService.updateFilters(filters);
}
```

### Service State Management Pattern

```typescript
export class MobileResultsService {
  private candidatesSubject = new BehaviorSubject<CandidateResult[]>([]);
  private filtersSubject = new BehaviorSubject<ResultsFilter>(getDefaultFilters());

  public readonly state$ = combineLatest([
    this.candidatesSubject.asObservable(),
    this.filtersSubject.asObservable()
  ]).pipe(
    map(([candidates, filters]) => this.applyFilters(candidates, filters))
  );
}
```

## Mobile-Specific UI Patterns

### Touch Gestures
- Use `TouchGestureService` for swipe, tap, long-press handling
- Gesture events: `swipeLeft`, `swipeRight`, `tap`, `longPress`
- Bind to template: `(swipeLeft)="onSwipeLeft($event)"`

### Responsive Breakpoints
- Mobile: < 768px (1 column layout)
- Tablet: 768px - 1024px (2 column layout)
- Desktop: > 1024px (4 column layout)

```scss
@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Bento Grid Card Design
- Use `arc-card` CSS class for consistent card styling
- Card variants: `stat-card`, `action-card`, `chart-card`
- Spacing: 16px gaps between cards
- Border radius: 12px
- Elevation: subtle shadow (0 2px 8px rgba(0,0,0,0.1))

## Testing Approach

### Unit Tests
- Test services independently (no Angular TestBed needed)
- Test component logic with `TestBed` for Angular dependencies
- Mock service methods using `jest.fn()`

### Test File Naming
- Component tests: `*.component.spec.ts` (co-located with component)
- Service tests: `*.service.spec.ts` (co-located with service)

### Test Patterns

```typescript
// Service test (pure functions)
describe('MobileResultsService', () => {
  it('should filter candidates by status', () => {
    const service = new MobileResultsService();
    const candidates = mockCandidates;
    const filtered = service.applyFilters(candidates, { status: 'shortlisted' });
    expect(filtered.every(c => c.status === 'shortlisted')).toBe(true);
  });
});

// Component test (Angular TestBed)
describe('MobileResultsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    declarations: [MobileResultsComponent],
    providers: [MobileResultsService]
  }));

  it('should display candidates', () => {
    const fixture = TestBed.createComponent(MobileResultsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('John Doe');
  });
});
```

## Service Injection Pattern

For standalone components, use the `inject()` function:

```typescript
export class MobileResultsComponent implements OnInit, OnDestroy {
  private resultsService = inject(MobileResultsService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.resultsService.state$.pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Common Imports

```typescript
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';
```

## Module Declaration

Add new components to `mobile.module.ts`:

```typescript
@NgModule({
  declarations: [
    MobileResultsComponent,
    MobileResultsDisplayComponent,
    MobileResultsFilterComponent,
    // ...
  ],
  exports: [
    MobileResultsComponent,
    MobileResultsDisplayComponent,
    MobileResultsFilterComponent,
    // ...
  ],
})
export class MobileModule {}
```
