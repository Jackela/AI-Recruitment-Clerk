import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Defines the shape of the results filter.
 */
export interface ResultsFilter {
  score: { min: number; max: number };
  experience: string[];
  skills: string[];
  location: string[];
  status: string[];
}

/**
 * Defines the shape of the candidate result.
 */
export interface CandidateResult {
  id: string;
  name: string;
  title: string;
  experience: string;
  skills: string[];
  score: number;
  match: 'excellent' | 'good' | 'fair' | 'poor';
  avatar?: string;
  summary: string;
  location: string;
  education: string;
  contact?: {
    email: string;
    phone: string;
  };
  lastUpdated: string;
  status:
    | 'new'
    | 'reviewed'
    | 'shortlisted'
    | 'interviewed'
    | 'hired'
    | 'rejected';
  tags: string[];
  strengths: string[];
  weaknesses: string[];
  resumeUrl?: string;
}

/**
 * Sort options configuration.
 */
export interface SortOption {
  label: string;
  value: string;
}

/**
 * Match summary statistics.
 */
export interface MatchSummary {
  excellent: number;
  good: number;
  total: number;
  text: string;
}

/**
 * Service state for filtered and sorted results.
 */
export interface ResultsState {
  filtered: CandidateResult[];
  selected: CandidateResult[];
  activeFiltersCount: number;
  matchSummary: MatchSummary;
}

/**
 * Mobile results service.
 * Handles business logic for filtering, sorting, and selection of candidate results.
 * This service extracts data manipulation logic from the component for better
 * testability and reusability.
 *
 * @example
 * ```typescript
 * constructor(private resultsService: MobileResultsService) {}
 *
 * ngOnInit() {
 *   this.resultsService.setCandidates(this.candidates);
 *   this.results$ = this.resultsService.state$;
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MobileResultsService {
  private readonly destroy$ = new Subject<void>();

  // State
  private readonly candidatesSource = new BehaviorSubject<CandidateResult[]>(
    [],
  );
  private readonly filtersSource = new BehaviorSubject<ResultsFilter>({
    score: { min: 0, max: 100 },
    experience: [],
    skills: [],
    location: [],
    status: [],
  });
  private readonly currentSortSource = new BehaviorSubject<string>(
    'score-desc',
  );
  private readonly selectedCandidatesSource =
    new BehaviorSubject<CandidateResult[]>([]);

  // Computed state
  private readonly filteredResultsSource =
    new BehaviorSubject<CandidateResult[]>([]);
  private readonly stateSource = new BehaviorSubject<ResultsState>({
    filtered: [],
    selected: [],
    activeFiltersCount: 0,
    matchSummary: { excellent: 0, good: 0, total: 0, text: '' },
  });

  // Public observables
  public readonly candidates$ = this.candidatesSource.asObservable();
  public readonly filters$ = this.filtersSource.asObservable();
  public readonly filteredResults$ =
    this.filteredResultsSource.asObservable();
  public readonly selectedCandidates$ =
    this.selectedCandidatesSource.asObservable();
  public readonly state$ = this.stateSource.asObservable();

  // Sort options available
  public readonly sortOptions: SortOption[] = [
    { label: 'Score (High to Low)', value: 'score-desc' },
    { label: 'Score (Low to High)', value: 'score-asc' },
    { label: 'Name (A to Z)', value: 'name-asc' },
    { label: 'Name (Z to A)', value: 'name-desc' },
    { label: 'Recently Updated', value: 'updated-desc' },
  ];

  /**
   * Sets the candidates to be filtered and sorted.
   * @param candidates - The candidate results to process.
   */
  public setCandidates(candidates: CandidateResult[]): void {
    this.candidatesSource.next(candidates);
    this.applyFiltersAndSort();
  }

  /**
   * Updates the current filters and reapplies them.
   * @param filters - The new filter settings.
   */
  public setFilters(filters: ResultsFilter): void {
    this.filtersSource.next(filters);
    this.applyFiltersAndSort();
  }

  /**
   * Returns the current active filters.
   */
  public getFilters(): ResultsFilter {
    return this.filtersSource.value;
  }

  /**
   * Returns the default empty filter state.
   */
  public getDefaultFilters(): ResultsFilter {
    return {
      score: { min: 0, max: 100 },
      experience: [],
      skills: [],
      location: [],
      status: [],
    };
  }

  /**
   * Calculates the number of active filters.
   * @param filters - The filters to count.
   */
  public getActiveFiltersCount(filters: ResultsFilter): number {
    let count = 0;
    if (filters.score.min > 0) count++;
    count += filters.status.length;
    count += filters.experience.length;
    count += filters.skills.length;
    count += filters.location.length;
    return count;
  }

  /**
   * Sets the current sort option and reapplies sorting.
   * @param sortValue - The sort option value.
   */
  public setSortOption(sortValue: string): void {
    this.currentSortSource.next(sortValue);
    this.applyFiltersAndSort();
  }

  /**
   * Returns the current sort option.
   */
  public getCurrentSort(): string {
    return this.currentSortSource.value;
  }

  /**
   * Applies filters to the candidates list.
   * @param candidates - The candidates to filter.
   * @param filters - The filters to apply.
   */
  public applyFilters(
    candidates: CandidateResult[],
    filters: ResultsFilter,
  ): CandidateResult[] {
    let filtered = [...candidates];

    // Apply score filter
    if (filters.score.min > 0) {
      filtered = filtered.filter((c) => c.score >= filters.score.min);
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((c) => filters.status.includes(c.status));
    }

    // Apply experience filter
    if (filters.experience.length > 0) {
      filtered = filtered.filter((c) =>
        filters.experience.some((exp) => c.experience.includes(exp)),
      );
    }

    // Apply skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter((c) =>
        filters.skills.some((skill) =>
          c.skills.some((candidateSkill) =>
            candidateSkill.toLowerCase().includes(skill.toLowerCase()),
          ),
        ),
      );
    }

    // Apply location filter
    if (filters.location.length > 0) {
      filtered = filtered.filter((c) =>
        filters.location.some((loc) =>
          c.location.toLowerCase().includes(loc.toLowerCase()),
        ),
      );
    }

    return filtered;
  }

  /**
   * Applies sorting to the candidates list.
   * @param candidates - The candidates to sort.
   * @param sortValue - The sort option value (field-direction format).
   */
  public applySorting(
    candidates: CandidateResult[],
    sortValue: string,
  ): CandidateResult[] {
    const [field, direction] = sortValue.split('-');

    const sorted = [...candidates];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison =
            new Date(a.lastUpdated).getTime() -
            new Date(b.lastUpdated).getTime();
          break;
      }

      return direction === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Calculates match summary statistics.
   * @param candidates - The candidates to analyze.
   */
  public getMatchSummary(candidates: CandidateResult[]): MatchSummary {
    if (candidates.length === 0) {
      return { excellent: 0, good: 0, total: 0, text: '' };
    }

    const excellent = candidates.filter((c) => c.match === 'excellent').length;
    const good = candidates.filter((c) => c.match === 'good').length;

    let text = '';
    if (excellent > 0) {
      text = `${excellent} excellent match${excellent > 1 ? 'es' : ''}`;
    } else if (good > 0) {
      text = `${good} good match${good > 1 ? 'es' : ''}`;
    } else {
      text = 'See all matches';
    }

    return {
      excellent,
      good,
      total: candidates.length,
      text,
    };
  }

  /**
   * Checks if a candidate is currently selected.
   * @param candidate - The candidate to check.
   */
  public isSelected(candidate: CandidateResult): boolean {
    return this.selectedCandidatesSource.value.some(
      (c) => c.id === candidate.id,
    );
  }

  /**
   * Selects all filtered candidates.
   */
  public selectAll(): void {
    this.selectedCandidatesSource.next([...this.filteredResultsSource.value]);
    this.updateState();
  }

  /**
   * Clears all selections.
   */
  public clearSelection(): void {
    this.selectedCandidatesSource.next([]);
    this.updateState();
  }

  /**
   * Toggles the selection state of a candidate.
   * @param candidate - The candidate to toggle.
   */
  public toggleSelection(candidate: CandidateResult): void {
    const current = this.selectedCandidatesSource.value;
    const index = current.findIndex((c) => c.id === candidate.id);

    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(candidate);
    }

    this.selectedCandidatesSource.next([...current]);
    this.updateState();
  }

  /**
   * Returns the currently selected candidates.
   */
  public getSelectedCandidates(): CandidateResult[] {
    return this.selectedCandidatesSource.value;
  }

  /**
   * Returns the filtered and sorted results.
   */
  public getFilteredResults(): CandidateResult[] {
    return this.filteredResultsSource.value;
  }

  /**
   * Gets the current state snapshot.
   */
  public getStateSnapshot(): ResultsState {
    return this.stateSource.value;
  }

  /**
   * Cleanup method for service destruction.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Applies current filters and sorting to candidates.
   */
  private applyFiltersAndSort(): void {
    const candidates = this.candidatesSource.value;
    const filters = this.filtersSource.value;
    const sortValue = this.currentSortSource.value;

    const filtered = this.applyFilters(candidates, filters);
    const sorted = this.applySorting(filtered, sortValue);

    this.filteredResultsSource.next(sorted);
    this.updateState();
  }

  /**
   * Updates the computed state based on current values.
   */
  private updateState(): void {
    const filtered = this.filteredResultsSource.value;
    const selected = this.selectedCandidatesSource.value;
    const filters = this.filtersSource.value;
    const matchSummary = this.getMatchSummary(filtered);
    const activeFiltersCount = this.getActiveFiltersCount(filters);

    this.stateSource.next({
      filtered,
      selected,
      activeFiltersCount,
      matchSummary,
    });
  }
}
