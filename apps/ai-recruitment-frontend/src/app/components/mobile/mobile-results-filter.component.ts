import type { OnInit, OnDestroy } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

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
 * Filter option configuration for dynamic rendering.
 */
export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Mobile results filter component.
 * Handles all filtering UI and logic including score range, status, and experience filters.
 * Emits filter changes to parent component for application to results.
 */
@Component({
  selector: 'arc-mobile-results-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filters-panel" [class.open]="isOpen">
      <div class="filter-header">
        <h3>Filter Results</h3>
        <button
          class="clear-filters"
          (click)="onClearFilters()"
          [disabled]="activeFiltersCount === 0"
        >
          Clear All
        </button>
      </div>

      <div class="filter-sections">
        <!-- Score Range -->
        <div class="filter-section">
          <label class="filter-label" for="score-min-slider">
            Minimum Score
            <span class="filter-value">{{ filters.score.min }}%</span>
          </label>
          <div class="score-filter">
            <input
              id="score-min-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              [(ngModel)]="filters.score.min"
              (input)="onFilterChange()"
              class="score-slider"
              [attr.aria-valuenow]="filters.score.min"
              attr.aria-valuemin="0"
              attr.aria-valuemax="100"
            />
          </div>
        </div>

        <!-- Status Filter -->
        <div class="filter-section">
          <span class="filter-label" id="status-filter-label">Status</span>
          <div
            class="filter-chips"
            role="group"
            aria-labelledby="status-filter-label"
          >
            <button
              *ngFor="let option of statusOptions"
              class="filter-chip"
              [class.active]="filters.status.includes(option.value)"
              (click)="toggleFilter('status', option.value)"
              [attr.aria-pressed]="filters.status.includes(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Experience Filter -->
        <div class="filter-section">
          <span class="filter-label" id="experience-filter-label">
            Experience Level
          </span>
          <div
            class="filter-chips"
            role="group"
            aria-labelledby="experience-filter-label"
          >
            <button
              *ngFor="let option of experienceOptions"
              class="filter-chip"
              [class.active]="filters.experience.includes(option.value)"
              (click)="toggleFilter('experience', option.value)"
              [attr.aria-pressed]="filters.experience.includes(option.value)"
            >
              {{ option.value }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .filters-panel {
        background: white;
        border-bottom: 1px solid #e9ecef;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;

        &.open {
          max-height: 500px;
        }

        .filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #f1f3f4;

          h3 {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
          }

          .clear-filters {
            background: none;
            border: none;
            color: #e74c3c;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: underline;
            transition: opacity 0.2s ease;

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
              text-decoration: none;
            }
          }
        }

        .filter-sections {
          padding: 0 16px 16px;

          .filter-section {
            margin-bottom: 20px;

            &:last-child {
              margin-bottom: 0;
            }

            .filter-label {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 14px;
              font-weight: 500;
              color: #2c3e50;
              margin-bottom: 12px;

              .filter-value {
                font-size: 12px;
                font-weight: 600;
                color: #3498db;
                min-width: 36px;
                text-align: right;
              }
            }

            .score-filter {
              .score-slider {
                width: 100%;
                -webkit-appearance: none;
                appearance: none;
                height: 4px;
                border-radius: 2px;
                background: #e9ecef;
                outline: none;

                &::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #3498db;
                  cursor: pointer;
                  transition: transform 0.2s ease;

                  &:active {
                    transform: scale(1.1);
                  }
                }

                &::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #3498db;
                  cursor: pointer;
                  border: none;
                  transition: transform 0.2s ease;

                  &:active {
                    transform: scale(1.1);
                  }
                }

                &:focus {
                  &::-webkit-slider-thumb,
                  &::-moz-range-thumb {
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
                  }
                }
              }
            }

            .filter-chips {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;

              .filter-chip {
                padding: 6px 12px;
                border: 1px solid #dee2e6;
                border-radius: 16px;
                background: white;
                color: #495057;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;

                &:active {
                  transform: scale(0.96);
                }

                &.active {
                  background: #3498db;
                  color: white;
                  border-color: #3498db;
                }

                &:focus {
                  outline: 2px solid #3498db;
                  outline-offset: 2px;
                }
              }
            }
          }
        }
      }
    `,
  ],
})
export class MobileResultsFilterComponent implements OnInit, OnDestroy {
  @Input() public isOpen = false;
  @Input() public filters: ResultsFilter = {
    score: { min: 0, max: 100 },
    experience: [],
    skills: [],
    location: [],
    status: [],
  };

  @Output() public filtersChanged = new EventEmitter<ResultsFilter>();
  @Output() public clearFilters = new EventEmitter<void>();
  @Output() public openChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  // Available filter options
  public readonly statusOptions: FilterOption[] = [
    { label: 'New', value: 'new' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Shortlisted', value: 'shortlisted' },
    { label: 'Interviewed', value: 'interviewed' },
  ];

  public readonly experienceOptions: FilterOption[] = [
    { label: 'Junior', value: 'Junior' },
    { label: 'Mid-level', value: 'Mid-level' },
    { label: 'Senior', value: 'Senior' },
    { label: 'Lead', value: 'Lead' },
    { label: 'Principal', value: 'Principal' },
  ];

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    // Initialize filters if empty
    if (!this.filters) {
      this.resetFilters();
    }
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Calculates the number of active filters.
   */
  public get activeFiltersCount(): number {
    let count = 0;
    if (this.filters?.score.min > 0) count++;
    count += this.filters?.status.length ?? 0;
    count += this.filters?.experience.length ?? 0;
    count += this.filters?.skills.length ?? 0;
    count += this.filters?.location.length ?? 0;
    return count;
  }

  /**
   * Toggles a filter value on/off for the specified filter type.
   * @param filterType - The type of filter to toggle ('status' | 'experience')
   * @param value - The value to toggle
   */
  public toggleFilter(filterType: 'status' | 'experience', value: string): void {
    const filterArray = this.filters[filterType];
    const index = filterArray.indexOf(value);

    if (index > -1) {
      filterArray.splice(index, 1);
    } else {
      filterArray.push(value);
    }

    this.onFilterChange();
  }

  /**
   * Handles filter value changes and emits the updated filter state.
   */
  public onFilterChange(): void {
    this.filtersChanged.emit(this.filters);
  }

  /**
   * Clears all filters and resets to default values.
   */
  public onClearFilters(): void {
    this.resetFilters();
    this.clearFilters.emit();
    this.filtersChanged.emit(this.filters);
  }

  /**
   * Resets filters to their default empty state.
   */
  private resetFilters(): void {
    this.filters = {
      score: { min: 0, max: 100 },
      experience: [],
      skills: [],
      location: [],
      status: [],
    };
  }
}
