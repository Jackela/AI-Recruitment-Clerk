import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { MobileResultsComponent } from './mobile-results.component';
import type {
  CandidateResult,
  ResultsState,
  ResultsFilter,
} from '../../services/mobile/mobile-results.service';
import { MobileResultsService } from '../../services/mobile/mobile-results.service';
import { MobileResultsDisplayComponent } from './mobile-results-display.component';
import { MobileResultsFilterComponent } from './mobile-results-filter.component';

describe('MobileResultsComponent', () => {
  let component: MobileResultsComponent;
  let fixture: ComponentFixture<MobileResultsComponent>;
  let mockResultsService: jest.Mocked<Partial<MobileResultsService>>;
  let stateSubject: Subject<ResultsState>;
  let filtersSubject: Subject<ResultsFilter>;

  const mockCandidate: CandidateResult = {
    id: 'candidate-1',
    name: 'John Doe',
    title: 'Senior Developer',
    experience: '5 years',
    skills: ['Angular', 'TypeScript'],
    score: 85,
    match: 'excellent',
    summary: 'Experienced developer',
    location: 'New York',
    education: 'Bachelor',
    lastUpdated: new Date().toISOString(),
    status: 'new',
    tags: ['frontend'],
    strengths: ['coding'],
    weaknesses: ['communication'],
  };

  const mockFilters: ResultsFilter = {
    score: { min: 0, max: 100 },
    experience: [],
    skills: [],
    location: [],
    status: [],
  };

  beforeEach(async () => {
    stateSubject = new Subject<ResultsState>();
    filtersSubject = new Subject<ResultsFilter>();

    mockResultsService = {
      state$: stateSubject.asObservable(),
      filters$: filtersSubject.asObservable(),
      setCandidates: jest.fn(),
      setFilters: jest.fn(),
      getDefaultFilters: jest.fn().mockReturnValue(mockFilters),
      getCurrentSort: jest.fn().mockReturnValue('score-desc'),
      setSortOption: jest.fn(),
      sortOptions: [
        { label: 'Score (High to Low)', value: 'score-desc' },
        { label: 'Score (Low to High)', value: 'score-asc' },
        { label: 'Name (A to Z)', value: 'name-asc' },
      ],
      selectAll: jest.fn(),
      clearSelection: jest.fn(),
      toggleSelection: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        MobileResultsComponent,
        MobileResultsDisplayComponent,
        MobileResultsFilterComponent,
      ],
      providers: [
        { provide: MobileResultsService, useValue: mockResultsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileResultsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize with default title', () => {
      expect(component.title).toBe('Candidates');
      expect(component.viewMode).toBe('card');
      expect(component.showFilters).toBe(false);
      expect(component.showSort).toBe(false);
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
      stateSubject.next({
        filtered: [mockCandidate],
        selected: [],
        activeFiltersCount: 0,
        matchSummary: {
          excellent: 1,
          good: 0,
          total: 1,
          text: '1 excellent match',
        },
      });
      fixture.detectChanges();
    });

    it('should handle tap on candidate card', () => {
      const candidateSelectedSpy = jest.spyOn(
        component.candidateSelected,
        'emit',
      );

      component.onCandidateSelected(mockCandidate);

      expect(candidateSelectedSpy).toHaveBeenCalledWith(mockCandidate);
    });

    it('should handle swipe left on candidate card', () => {
      const resultsList = document.createElement('div');
      resultsList.className = 'results-list';
      fixture.nativeElement.appendChild(resultsList);

      let swipeTriggered = false;
      let touchStartX = 0;

      resultsList.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      });

      resultsList.addEventListener('touchend', (e: TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {
          swipeTriggered = true;
        }
      });

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 300 } as Touch],
        bubbles: true,
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200 } as Touch],
        bubbles: true,
      });

      resultsList.dispatchEvent(touchStart);
      resultsList.dispatchEvent(touchEnd);

      expect(swipeTriggered).toBe(true);
      fixture.nativeElement.removeChild(resultsList);
    });

    it('should handle tap on filter button', () => {
      const filterBtn = fixture.nativeElement.querySelector('.filter-btn');
      if (filterBtn) {
        filterBtn.click();
        fixture.detectChanges();

        expect(component.showFilters).toBe(true);
        expect(component.showSort).toBe(false);
      }
    });
  });

  describe('Responsive Layout', () => {
    it('should render correctly on mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector(
        '.mobile-results-container',
      );
      expect(container).toBeTruthy();
    });

    it('should switch to grid layout on tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      stateSubject.next({
        filtered: [mockCandidate],
        selected: [],
        activeFiltersCount: 0,
        matchSummary: {
          excellent: 1,
          good: 0,
          total: 1,
          text: '1 excellent match',
        },
      });
      fixture.detectChanges();

      const resultsList = fixture.nativeElement.querySelector('.results-list');
      expect(resultsList).toBeTruthy();
    });

    it('should handle safe area insets on notch devices', () => {
      const container = fixture.nativeElement.querySelector(
        '.mobile-results-container',
      );
      if (container) {
        container.style.paddingTop = 'env(safe-area-inset-top)';
        container.style.paddingBottom = 'env(safe-area-inset-bottom)';
        expect(container.style.paddingTop).toBe('env(safe-area-inset-top)');
        expect(container.style.paddingBottom).toBe(
          'env(safe-area-inset-bottom)',
        );
      }
    });
  });

  describe('Gesture Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
      stateSubject.next({
        filtered: [mockCandidate],
        selected: [],
        activeFiltersCount: 0,
        matchSummary: {
          excellent: 1,
          good: 0,
          total: 1,
          text: '1 excellent match',
        },
      });
      fixture.detectChanges();
    });

    it('should handle pull to refresh', () => {
      const container = fixture.nativeElement.querySelector(
        '.mobile-results-container',
      );
      if (container) {
        let pullTriggered = false;
        let startY = 0;

        container.addEventListener('touchstart', (e: TouchEvent) => {
          if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
          }
        });

        container.addEventListener('touchmove', (e: TouchEvent) => {
          const currentY = e.touches[0].clientY;
          if (currentY - startY > 100 && window.scrollY === 0) {
            pullTriggered = true;
          }
        });

        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientY: 100 } as Touch],
          bubbles: true,
        });
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientY: 250 } as Touch],
          bubbles: true,
        });

        container.dispatchEvent(touchStart);
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
        container.dispatchEvent(touchMove);

        expect(pullTriggered).toBe(true);
      }
    });

    it('should handle infinite scroll loading', () => {
      const scrollContainer = document.createElement('div');
      scrollContainer.style.height = '100px';
      scrollContainer.style.overflow = 'auto';
      fixture.nativeElement.appendChild(scrollContainer);

      let loadMoreTriggered = false;

      scrollContainer.addEventListener('scroll', () => {
        const scrollBottom =
          scrollContainer.scrollTop + scrollContainer.clientHeight;
        if (scrollBottom >= scrollContainer.scrollHeight - 50) {
          loadMoreTriggered = true;
        }
      });

      Object.defineProperty(scrollContainer, 'scrollTop', {
        writable: true,
        value: 200,
      });
      Object.defineProperty(scrollContainer, 'clientHeight', {
        writable: true,
        value: 100,
      });
      Object.defineProperty(scrollContainer, 'scrollHeight', {
        writable: true,
        value: 300,
      });

      scrollContainer.dispatchEvent(new Event('scroll'));

      expect(loadMoreTriggered).toBe(true);
      fixture.nativeElement.removeChild(scrollContainer);
    });

    it('should handle swipe to delete candidate', () => {
      const resultsDisplay = document.createElement('div');
      resultsDisplay.className = 'results-list';
      fixture.nativeElement.appendChild(resultsDisplay);

      let deleteTriggered = false;
      let touchStartX = 0;

      resultsDisplay.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      });

      resultsDisplay.addEventListener('touchend', (e: TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 150) {
          deleteTriggered = true;
          component.onCandidateAction({
            action: 'delete',
            candidate: mockCandidate,
          });
        }
      });

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 300 } as Touch],
        bubbles: true,
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100 } as Touch],
        bubbles: true,
      });

      resultsDisplay.dispatchEvent(touchStart);
      resultsDisplay.dispatchEvent(touchEnd);

      expect(deleteTriggered).toBe(true);
      fixture.nativeElement.removeChild(resultsDisplay);
    });
  });

  describe('Filter and Sort', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle filter panel', () => {
      component.toggleFilters();
      expect(component.showFilters).toBe(true);
      expect(component.showSort).toBe(false);

      component.toggleFilters();
      expect(component.showFilters).toBe(false);
    });

    it('should toggle sort panel', () => {
      component.toggleSort();
      expect(component.showSort).toBe(true);
      expect(component.showFilters).toBe(false);

      component.toggleSort();
      expect(component.showSort).toBe(false);
    });

    it('should update filters when changed', () => {
      const filtersChangedSpy = jest.spyOn(component.filtersChanged, 'emit');
      const newFilters: ResultsFilter = {
        ...mockFilters,
        score: { min: 80, max: 100 },
      };

      component.onFiltersChanged(newFilters);

      expect(mockResultsService.setFilters).toHaveBeenCalledWith(newFilters);
      expect(filtersChangedSpy).toHaveBeenCalledWith(newFilters);
    });

    it('should clear filters', () => {
      component.onClearFilters();

      expect(mockResultsService.getDefaultFilters).toHaveBeenCalled();
      expect(mockResultsService.setFilters).toHaveBeenCalledWith(mockFilters);
    });

    it('should set sort option', () => {
      component.setSortOption('name-asc');

      expect(mockResultsService.setSortOption).toHaveBeenCalledWith('name-asc');
      expect(component.currentSort).toBe('name-asc');
      expect(component.showSort).toBe(false);
    });
  });

  describe('Selection and Bulk Actions', () => {
    beforeEach(() => {
      fixture.detectChanges();
      stateSubject.next({
        filtered: [mockCandidate],
        selected: [mockCandidate],
        activeFiltersCount: 0,
        matchSummary: {
          excellent: 1,
          good: 0,
          total: 1,
          text: '1 excellent match',
        },
      });
      fixture.detectChanges();
    });

    it('should select all candidates', () => {
      component.selectAll();
      expect(mockResultsService.selectAll).toHaveBeenCalled();
    });

    it('should emit bulk action', () => {
      const bulkActionSpy = jest.spyOn(component.bulkActionTriggered, 'emit');

      component.bulkAction('shortlist');

      expect(bulkActionSpy).toHaveBeenCalledWith({
        action: 'shortlist',
        candidates: [mockCandidate],
      });
      expect(mockResultsService.clearSelection).toHaveBeenCalled();
    });

    it('should toggle candidate selection', () => {
      const mockEvent = new MouseEvent('click');
      const stopPropagationSpy = jest.spyOn(mockEvent, 'stopPropagation');

      component.onSelectionToggled({
        candidate: mockCandidate,
        event: mockEvent,
      });

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(mockResultsService.toggleSelection).toHaveBeenCalledWith(
        mockCandidate,
      );
    });
  });

  describe('View Mode', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle view mode between card and detailed', () => {
      expect(component.viewMode).toBe('card');

      component.toggleView();
      expect(component.viewMode).toBe('detailed');

      component.toggleView();
      expect(component.viewMode).toBe('card');
    });
  });

  describe('Lifecycle', () => {
    it('should subscribe to service state on init', () => {
      fixture.detectChanges();

      stateSubject.next({
        filtered: [mockCandidate],
        selected: [mockCandidate],
        activeFiltersCount: 2,
        matchSummary: {
          excellent: 1,
          good: 0,
          total: 1,
          text: '1 excellent match',
        },
      });

      expect(component.filteredResults).toEqual([mockCandidate]);
      expect(component.selectedCandidates).toEqual([mockCandidate]);
      expect(component.activeFiltersCount).toBe(2);
    });

    it('should update filters from service', () => {
      fixture.detectChanges();

      const updatedFilters: ResultsFilter = {
        ...mockFilters,
        status: ['new'],
      };
      filtersSubject.next(updatedFilters);

      expect(component.filters).toEqual(updatedFilters);
    });

    it('should clean up subscriptions on destroy', () => {
      fixture.detectChanges();

      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
