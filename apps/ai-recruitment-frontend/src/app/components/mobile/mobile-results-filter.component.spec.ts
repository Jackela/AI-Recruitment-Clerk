import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import type {
  ResultsFilter} from './mobile-results-filter.component';
import {
  MobileResultsFilterComponent,
  FilterOption,
} from './mobile-results-filter.component';

describe('MobileResultsFilterComponent', () => {
  let component: MobileResultsFilterComponent;
  let fixture: ComponentFixture<MobileResultsFilterComponent>;

  const defaultFilters: ResultsFilter = {
    score: { min: 0, max: 100 },
    experience: [],
    skills: [],
    location: [],
    status: [],
  };

  const activeFilters: ResultsFilter = {
    score: { min: 70, max: 100 },
    experience: ['Senior'],
    skills: ['JavaScript'],
    location: ['Remote'],
    status: ['shortlisted'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, MobileResultsFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileResultsFilterComponent);
    component = fixture.componentInstance;
    component.filters = { ...defaultFilters };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept isOpen input', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
    });

    it('should accept filters input', () => {
      component.filters = activeFilters;
      expect(component.filters.score.min).toBe(70);
    });

    it('should have default isOpen value of false', () => {
      const newComponent = TestBed.createComponent(
        MobileResultsFilterComponent,
      );
      expect(newComponent.componentInstance.isOpen).toBe(false);
    });
  });

  describe('Output Events', () => {
    it('should emit filtersChanged event', () => {
      const emitSpy = jest.spyOn(component.filtersChanged, 'emit');
      component.onFilterChange();
      expect(emitSpy).toHaveBeenCalledWith(component.filters);
    });

    it('should emit clearFilters event', () => {
      const emitSpy = jest.spyOn(component.clearFilters, 'emit');
      component.onClearFilters();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit filtersChanged after clear', () => {
      const emitSpy = jest.spyOn(component.filtersChanged, 'emit');
      component.onClearFilters();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Methods', () => {
    it('should calculate active filters count', () => {
      component.filters = activeFilters;
      expect(component.activeFiltersCount).toBe(5);
    });

    it('should count only min score when > 0', () => {
      component.filters = { ...defaultFilters, score: { min: 50, max: 100 } };
      expect(component.activeFiltersCount).toBe(1);
    });

    it('should not count score when min is 0', () => {
      component.filters = defaultFilters;
      expect(component.activeFiltersCount).toBe(0);
    });

    it('should toggle filter on', () => {
      component.filters = { ...defaultFilters };
      component.toggleFilter('status', 'new');
      expect(component.filters.status).toContain('new');
    });

    it('should toggle filter off', () => {
      component.filters = { ...defaultFilters, status: ['new'] };
      component.toggleFilter('status', 'new');
      expect(component.filters.status).not.toContain('new');
    });

    it('should emit on toggle', () => {
      const emitSpy = jest.spyOn(component.filtersChanged, 'emit');
      component.toggleFilter('status', 'new');
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should reset filters on clear', () => {
      component.filters = activeFilters;
      component.onClearFilters();
      expect(component.filters.score.min).toBe(0);
      expect(component.filters.status).toEqual([]);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should initialize with default filters if empty', () => {
      const newComponent = TestBed.createComponent(
        MobileResultsFilterComponent,
      );
      newComponent.componentInstance.ngOnInit();
      expect(newComponent.componentInstance.filters).toBeDefined();
    });
  });

  describe('Template Rendering', () => {
    it('should render filters panel', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.filters-panel')).toBeTruthy();
    });

    it('should apply open class when isOpen is true', () => {
      component.isOpen = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('.filters-panel')?.classList.contains('open'),
      ).toBe(true);
    });

    it('should render filter header', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Filter Results');
    });

    it('should render clear button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.clear-filters')).toBeTruthy();
    });

    it('should disable clear button when no active filters', () => {
      component.filters = defaultFilters;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.clear-filters');
      expect(button?.getAttribute('disabled')).toBeTruthy();
    });

    it('should render score range slider', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.score-slider')).toBeTruthy();
    });

    it('should render status filter chips', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chips = compiled.querySelectorAll('.filter-chip');
      expect(chips.length).toBeGreaterThan(0);
    });

    it('should render experience filter chips', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Experience Level');
    });
  });

  describe('Filter Options', () => {
    it('should have status options', () => {
      expect(component.statusOptions.length).toBeGreaterThan(0);
      expect(component.statusOptions.some((o) => o.value === 'new')).toBe(true);
    });

    it('should have experience options', () => {
      expect(component.experienceOptions.length).toBeGreaterThan(0);
      expect(
        component.experienceOptions.some((o) => o.value === 'Senior'),
      ).toBe(true);
    });
  });
});
