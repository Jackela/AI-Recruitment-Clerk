import type {
  OnInit,
  OnDestroy} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import {
  MobileResultsDisplayComponent,
  type CandidateResult,
} from './mobile-results-display.component';
import {
  MobileResultsFilterComponent,
  type ResultsFilter,
} from './mobile-results-filter.component';

/**
 * Represents the mobile results component.
 * Manages sorting, bulk selection, and coordination for candidate results.
 * Display is delegated to MobileResultsDisplayComponent.
 * Filtering is delegated to MobileResultsFilterComponent.
 */
@Component({
  selector: 'arc-mobile-results',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileResultsDisplayComponent, MobileResultsFilterComponent],
  template: `
    <div class="mobile-results-container">
      <!-- Results Header -->
      <div class="results-header">
        <div class="header-title">
          <h2>{{ title }}</h2>
          <p class="subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="header-actions">
          <button
            class="filter-btn"
            [class.active]="showFilters"
            (click)="toggleFilters()"
            [attr.aria-label]="'Filter results'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z" />
            </svg>
            Filters
            <span class="filter-count" *ngIf="activeFiltersCount > 0">{{
              activeFiltersCount
            }}</span>
          </button>

          <button
            class="sort-btn"
            (click)="toggleSort()"
            [attr.aria-label]="'Sort results'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,13H15V11H3M3,6V8H21V6M3,18H9V16H3V18Z" />
            </svg>
            Sort
          </button>

          <button
            class="view-btn"
            (click)="toggleView()"
            [attr.aria-label]="'Change view'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                [attr.d]="
                  viewMode === 'card'
                    ? 'M3,5V19H21V5H3M5,7H19V17H5V7Z'
                    : 'M3,5H21V7H3V5M3,13V11H21V13H3M3,17V19H21V17H3Z'
                "
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Filters Panel (Delegated to Filter Component) -->
      <arc-mobile-results-filter
        [isOpen]="showFilters"
        [filters]="filters"
        (filtersChanged)="onFiltersChanged($event)"
        (clearFilters)="onClearFilters()"
      ></arc-mobile-results-filter>

      <!-- Sort Panel -->
      <div class="sort-panel" [class.open]="showSort" *ngIf="showSort">
        <div class="sort-options">
          <button
            *ngFor="let option of sortOptions"
            class="sort-option"
            [class.active]="currentSort === option.value"
            (click)="setSortOption(option.value)"
          >
            <span>{{ option.label }}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              *ngIf="currentSort === option.value"
            >
              <path
                d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Results Summary -->
      <div class="results-summary" *ngIf="filteredResults.length > 0">
        <div class="summary-info">
          <span class="results-count"
            >{{ filteredResults.length }} candidates</span
          >
          <span class="match-summary" *ngIf="getMatchSummary()">{{
            getMatchSummary()
          }}</span>
        </div>
        <div class="quick-actions">
          <button
            class="quick-action"
            (click)="selectAll()"
            [disabled]="selectedCandidates.length === filteredResults.length"
          >
            Select All
          </button>
          <button
            class="quick-action"
            *ngIf="selectedCandidates.length > 0"
            (click)="bulkAction('shortlist')"
          >
            Shortlist ({{ selectedCandidates.length }})
          </button>
        </div>
      </div>

      <!-- Results List (Delegated to Display Component) -->
      <arc-mobile-results-display
        [candidates]="filteredResults"
        [isLoading]="isLoading"
        [viewMode]="viewMode"
        [selectedCandidates]="selectedCandidates"
        (candidateSelected)="onCandidateSelected($event)"
        (candidateAction)="onCandidateAction($event)"
        (selectionToggled)="onSelectionToggled($event)"
      ></arc-mobile-results-display>
    </div>
  `,
  styles: [
    `
      .mobile-results-container {
        background: #f8f9fa;
        min-height: 100vh;
        padding-bottom: 80px; // Account for bottom nav
      }

      .results-header {
        background: white;
        padding: 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 56px; // Account for mobile header
        z-index: 10;

        .header-title {
          h2 {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }

          .subtitle {
            font-size: 12px;
            color: #6c757d;
            margin: 2px 0 0 0;
          }
        }

        .header-actions {
          display: flex;
          gap: 8px;

          button {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            background: white;
            color: #495057;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;

            &:active {
              background: #f8f9fa;
              transform: scale(0.98);
            }

            &.active {
              background: #3498db;
              color: white;
              border-color: #3498db;
            }

            .filter-count {
              background: #e74c3c;
              color: white;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 10px;
              margin-left: 4px;
            }
          }
        }
      }

      .sort-panel {
        background: white;
        border-bottom: 1px solid #e9ecef;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;

        &.open {
          max-height: 500px;
        }

        .sort-options {
          padding: 8px 0;

          .sort-option {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border: none;
            background: white;
            color: #495057;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s ease;

            &:active {
              background: #f8f9fa;
            }

            &.active {
              color: #3498db;
              font-weight: 500;
            }
          }
        }
      }

      .results-summary {
        background: white;
        padding: 12px 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .summary-info {
          .results-count {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
          }

          .match-summary {
            font-size: 12px;
            color: #6c757d;
            margin-left: 8px;
          }
        }

        .quick-actions {
          display: flex;
          gap: 8px;

          .quick-action {
            padding: 6px 12px;
            border: 1px solid #3498db;
            border-radius: 4px;
            background: white;
            color: #3498db;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;

            &:active {
              background: #3498db;
              color: white;
              transform: scale(0.98);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }

      @media (min-width: 768px) {
        .mobile-results-container {
          padding-bottom: 24px;
        }
      }
    `,
  ],
})
export class MobileResultsComponent implements OnInit, OnDestroy {
  @Input() public title = 'Candidates';
  @Input() public subtitle = '';
  @Input() public candidates: CandidateResult[] = [];
  @Input() public isLoading = false;

  @Output() public candidateSelected = new EventEmitter<CandidateResult>();
  @Output() public candidateAction = new EventEmitter<{
    action: string;
    candidate: CandidateResult;
  }>();
  @Output() public bulkActionTriggered = new EventEmitter<{
    action: string;
    candidates: CandidateResult[];
  }>();
  @Output() public filtersChanged = new EventEmitter<ResultsFilter>();

  private destroy$ = new Subject<void>();

  // View state
  public viewMode: 'card' | 'detailed' = 'card';
  public showFilters = false;
  public showSort = false;

  // Selection
  public selectedCandidates: CandidateResult[] = [];

  // Filters and sorting
  public filters: ResultsFilter = {
    score: { min: 0, max: 100 },
    experience: [],
    skills: [],
    location: [],
    status: [],
  };

  public currentSort = 'score-desc';
  public filteredResults: CandidateResult[] = [];

  public sortOptions = [
    { label: 'Score (High to Low)', value: 'score-desc' },
    { label: 'Score (Low to High)', value: 'score-asc' },
    { label: 'Name (A to Z)', value: 'name-asc' },
    { label: 'Name (Z to A)', value: 'name-desc' },
    { label: 'Recently Updated', value: 'updated-desc' },
  ];

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.applyFilters();
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs the active filters count operation.
   */
  public get activeFiltersCount(): number {
    let count = 0;
    if (this.filters.score.min > 0) count++;
    count += this.filters.status.length;
    count += this.filters.experience.length;
    count += this.filters.skills.length;
    count += this.filters.location.length;
    return count;
  }

  // UI state management
  /**
   * Performs the toggle filters operation.
   */
  public toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.showSort = false;
  }

  /**
   * Performs the toggle sort operation.
   */
  public toggleSort(): void {
    this.showSort = !this.showSort;
    this.showFilters = false;
  }

  /**
   * Performs the toggle view operation.
   */
  public toggleView(): void {
    this.viewMode = this.viewMode === 'card' ? 'detailed' : 'card';
  }

  // Filter handling
  /**
   * Performs the on filters changed operation.
   * @param updatedFilters - The updated filters.
   */
  public onFiltersChanged(updatedFilters: ResultsFilter): void {
    this.filters = updatedFilters;
    this.applyFilters();
    this.filtersChanged.emit(this.filters);
  }

  /**
   * Performs the on clear filters operation.
   */
  public onClearFilters(): void {
    // Filters are already reset by the filter component
    this.applyFilters();
  }

  /**
   * Sets sort option.
   * @param sortValue - The sort value.
   */
  public setSortOption(sortValue: string): void {
    this.currentSort = sortValue;
    this.showSort = false;
    this.applySorting();
  }

  private applyFilters(): void {
    let filtered = [...this.candidates];

    // Apply score filter
    if (this.filters.score.min > 0) {
      filtered = filtered.filter((c) => c.score >= this.filters.score.min);
    }

    // Apply status filter
    if (this.filters.status.length > 0) {
      filtered = filtered.filter((c) => this.filters.status.includes(c.status));
    }

    // Apply experience filter
    if (this.filters.experience.length > 0) {
      filtered = filtered.filter((c) =>
        this.filters.experience.some((exp) => c.experience.includes(exp)),
      );
    }

    this.filteredResults = filtered;
    this.applySorting();
  }

  private applySorting(): void {
    const [field, direction] = this.currentSort.split('-');

    this.filteredResults.sort((a, b) => {
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
  }

  /**
   * Retrieves match summary.
   */
  public getMatchSummary(): string {
    if (this.filteredResults.length === 0) return '';

    const excellent = this.filteredResults.filter(
      (c) => c.match === 'excellent',
    ).length;
    const good = this.filteredResults.filter((c) => c.match === 'good').length;

    if (excellent > 0) {
      return `${excellent} excellent matches`;
    } else if (good > 0) {
      return `${good} good matches`;
    }

    return 'See all matches';
  }

  // Selection methods
  /**
   * Performs the is selected operation.
   * @param candidate - The candidate.
   */
  public isSelected(candidate: CandidateResult): boolean {
    return this.selectedCandidates.some((c) => c.id === candidate.id);
  }

  /**
   * Performs the select all operation.
   */
  public selectAll(): void {
    this.selectedCandidates = [...this.filteredResults];
  }

  /**
   * Performs the bulk action operation.
   * @param action - The action.
   */
  public bulkAction(action: string): void {
    this.bulkActionTriggered.emit({
      action,
      candidates: this.selectedCandidates,
    });
    this.selectedCandidates = [];
  }

  // Event handlers from display component
  /**
   * Performs the on candidate selected operation.
   * @param candidate - The candidate.
   */
  public onCandidateSelected(candidate: CandidateResult): void {
    this.candidateSelected.emit(candidate);
  }

  /**
   * Performs the on candidate action operation.
   * @param payload - The payload.
   */
  public onCandidateAction(payload: {
    action: string;
    candidate: CandidateResult;
  }): void {
    this.candidateAction.emit(payload);
  }

  /**
   * Performs the on selection toggled operation.
   * @param payload - The payload.
   */
  public onSelectionToggled(payload: {
    candidate: CandidateResult;
    event: Event;
  }): void {
    const { candidate, event } = payload;
    event.stopPropagation();

    const index = this.selectedCandidates.findIndex(
      (c) => c.id === candidate.id,
    );
    if (index > -1) {
      this.selectedCandidates.splice(index, 1);
    } else {
      this.selectedCandidates.push(candidate);
    }
  }
}
