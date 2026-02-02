import type {
  OnInit,
  OnDestroy} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import type {
  SwipeAction,
  SwipeEvent} from './mobile-swipe.component';
import {
  MobileSwipeComponent
} from './mobile-swipe.component';
import type { TouchGestureService } from '../../services/mobile/touch-gesture.service';

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
 * Represents the mobile results component.
 */
@Component({
  selector: 'arc-mobile-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MobileSwipeComponent],
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

      <!-- Filters Panel -->
      <div class="filters-panel" [class.open]="showFilters" *ngIf="showFilters">
        <div class="filter-header">
          <h3>Filter Results</h3>
          <button class="clear-filters" (click)="clearFilters()">
            Clear All
          </button>
        </div>

        <div class="filter-sections">
          <!-- Score Range -->
          <div class="filter-section">
            <label class="filter-label">Minimum Score</label>
            <div class="score-filter">
              <input
                type="range"
                min="0"
                max="100"
                [(ngModel)]="filters.score.min"
                (input)="onFilterChange()"
                class="score-slider"
              />
              <span class="score-value">{{ filters.score.min }}%</span>
            </div>
          </div>

          <!-- Status Filter -->
          <div class="filter-section">
            <label class="filter-label">Status</label>
            <div class="filter-chips">
              <button
                *ngFor="let status of availableStatuses"
                class="filter-chip"
                [class.active]="filters.status.includes(status)"
                (click)="toggleStatusFilter(status)"
              >
                {{ status | titlecase }}
              </button>
            </div>
          </div>

          <!-- Experience Filter -->
          <div class="filter-section">
            <label class="filter-label">Experience Level</label>
            <div class="filter-chips">
              <button
                *ngFor="let exp of availableExperience"
                class="filter-chip"
                [class.active]="filters.experience.includes(exp)"
                (click)="toggleExperienceFilter(exp)"
              >
                {{ exp }}
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <!-- Results List -->
      <div class="results-list" [class]="'view-' + viewMode">
        <div
          *ngFor="let candidate of filteredResults; trackBy: trackByCandidate"
          class="result-item-wrapper"
        >
          <app-mobile-swipe
            [actions]="getSwipeActions(candidate)"
            [item]="candidate"
            (swipeAction)="onSwipeAction($event)"
          >
            <div
              class="result-item"
              [class.selected]="isSelected(candidate)"
              [class]="'match-' + candidate.match"
              (click)="onCandidateClick(candidate)"
              (longpress)="onCandidateLongPress(candidate)"
            >
              <!-- Candidate Avatar -->
              <div class="candidate-avatar">
                <img
                  *ngIf="candidate.avatar"
                  [src]="candidate.avatar"
                  [alt]="candidate.name"
                  class="avatar-image"
                />
                <div *ngIf="!candidate.avatar" class="avatar-placeholder">
                  {{ candidate.name.charAt(0).toUpperCase() }}
                </div>
                <div
                  class="status-indicator"
                  [class]="'status-' + candidate.status"
                ></div>
              </div>

              <!-- Candidate Info -->
              <div class="candidate-info">
                <div class="candidate-header">
                  <h3 class="candidate-name">{{ candidate.name }}</h3>
                  <div class="score-badge" [class]="'score-' + candidate.match">
                    {{ candidate.score }}%
                  </div>
                </div>

                <div class="candidate-title">{{ candidate.title }}</div>
                <div class="candidate-experience">
                  {{ candidate.experience }} • {{ candidate.location }}
                </div>

                <!-- Skills Tags -->
                <div
                  class="skills-container"
                  *ngIf="candidate.skills.length > 0"
                >
                  <span
                    *ngFor="let skill of candidate.skills.slice(0, 3)"
                    class="skill-tag"
                  >
                    {{ skill }}
                  </span>
                  <span *ngIf="candidate.skills.length > 3" class="skill-more">
                    +{{ candidate.skills.length - 3 }}
                  </span>
                </div>

                <!-- Match Details -->
                <div class="match-details" *ngIf="viewMode === 'detailed'">
                  <div class="strengths" *ngIf="candidate.strengths.length > 0">
                    <strong>Strengths:</strong>
                    {{ candidate.strengths.join(', ') }}
                  </div>
                  <div class="summary">{{ candidate.summary }}</div>
                </div>

                <div class="candidate-meta">
                  <span class="last-updated"
                    >Updated {{ candidate.lastUpdated }}</span
                  >
                  <div class="candidate-tags" *ngIf="candidate.tags.length > 0">
                    <span
                      *ngFor="let tag of candidate.tags.slice(0, 2)"
                      class="tag"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Selection Checkbox -->
              <div class="selection-area">
                <input
                  type="checkbox"
                  [checked]="isSelected(candidate)"
                  (change)="toggleSelection(candidate, $event)"
                  class="selection-checkbox"
                  [attr.aria-label]="'Select ' + candidate.name"
                />
              </div>

              <!-- Quick Actions -->
              <div
                class="quick-actions-menu"
                *ngIf="
                  showQuickActions && selectedCandidate?.id === candidate.id
                "
              >
                <button
                  *ngFor="let action of quickActions"
                  class="quick-action-btn"
                  [class]="'action-' + action.color"
                  (click)="onQuickAction(action, candidate, $event)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path [attr.d]="action.icon" />
                  </svg>
                  {{ action.label }}
                </button>
              </div>
            </div>
          </app-mobile-swipe>
        </div>
      </div>

      <!-- Empty State -->
      <div
        class="empty-state"
        *ngIf="filteredResults.length === 0 && !isLoading"
      >
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M13,9H11V7H13M13,17H11V11H13V17Z"
            />
          </svg>
        </div>
        <h3 class="empty-title">No candidates found</h3>
        <p class="empty-message">
          Try adjusting your filters or search criteria
        </p>
        <button class="empty-action" (click)="clearFilters()">
          Clear Filters
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <p>Loading candidates...</p>
      </div>
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

      .filters-panel,
      .sort-panel {
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
          }
        }

        .filter-sections {
          padding: 0 16px 16px;

          .filter-section {
            margin-bottom: 20px;

            .filter-label {
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: #2c3e50;
              margin-bottom: 8px;
            }

            .score-filter {
              display: flex;
              align-items: center;
              gap: 12px;

              .score-slider {
                flex: 1;
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
                }

                &::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #3498db;
                  cursor: pointer;
                  border: none;
                }
              }

              .score-value {
                font-size: 12px;
                font-weight: 600;
                color: #3498db;
                min-width: 36px;
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
              }
            }
          }
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

      .results-list {
        padding: 0 16px;

        &.view-card {
          .result-item {
            margin-bottom: 12px;
          }
        }

        &.view-detailed {
          .result-item {
            margin-bottom: 16px;

            .match-details {
              display: block;
            }
          }
        }

        .result-item-wrapper {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        }

        .result-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;

          &:active {
            background: #f8f9fa;
          }

          &.selected {
            background: rgba(52, 152, 219, 0.05);
            border-left: 4px solid #3498db;
          }

          &.match-excellent {
            border-left: 4px solid #27ae60;
          }

          &.match-good {
            border-left: 4px solid #3498db;
          }

          &.match-fair {
            border-left: 4px solid #f39c12;
          }

          &.match-poor {
            border-left: 4px solid #e74c3c;
          }

          .candidate-avatar {
            position: relative;
            flex-shrink: 0;

            .avatar-image {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              object-fit: cover;
            }

            .avatar-placeholder {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: #3498db;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              font-weight: 600;
            }

            .status-indicator {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 2px solid white;

              &.status-new {
                background: #3498db;
              }

              &.status-reviewed {
                background: #f39c12;
              }

              &.status-shortlisted {
                background: #27ae60;
              }

              &.status-interviewed {
                background: #9b59b6;
              }

              &.status-hired {
                background: #27ae60;
              }

              &.status-rejected {
                background: #e74c3c;
              }
            }
          }

          .candidate-info {
            flex: 1;
            min-width: 0;

            .candidate-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 4px;

              .candidate-name {
                font-size: 16px;
                font-weight: 600;
                color: #2c3e50;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .score-badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                flex-shrink: 0;

                &.score-excellent {
                  background: rgba(39, 174, 96, 0.1);
                  color: #27ae60;
                }

                &.score-good {
                  background: rgba(52, 152, 219, 0.1);
                  color: #3498db;
                }

                &.score-fair {
                  background: rgba(243, 156, 18, 0.1);
                  color: #f39c12;
                }

                &.score-poor {
                  background: rgba(231, 76, 60, 0.1);
                  color: #e74c3c;
                }
              }
            }

            .candidate-title {
              font-size: 14px;
              color: #495057;
              font-weight: 500;
              margin-bottom: 2px;
            }

            .candidate-experience {
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 8px;
            }

            .skills-container {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-bottom: 8px;

              .skill-tag {
                padding: 2px 6px;
                background: #f1f3f4;
                color: #495057;
                font-size: 10px;
                font-weight: 500;
                border-radius: 4px;
              }

              .skill-more {
                padding: 2px 6px;
                background: #e9ecef;
                color: #6c757d;
                font-size: 10px;
                font-weight: 500;
                border-radius: 4px;
              }
            }

            .match-details {
              display: none;
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 8px;

              .strengths {
                margin-bottom: 4px;
              }

              .summary {
                line-height: 1.4;
              }
            }

            .candidate-meta {
              display: flex;
              align-items: center;
              justify-content: space-between;

              .last-updated {
                font-size: 11px;
                color: #95a5a6;
              }

              .candidate-tags {
                display: flex;
                gap: 4px;

                .tag {
                  padding: 2px 6px;
                  background: rgba(52, 152, 219, 0.1);
                  color: #3498db;
                  font-size: 10px;
                  font-weight: 500;
                  border-radius: 4px;
                }
              }
            }
          }

          .selection-area {
            flex-shrink: 0;
            display: flex;
            align-items: center;

            .selection-checkbox {
              width: 18px;
              height: 18px;
              cursor: pointer;
            }
          }

          .quick-actions-menu {
            position: absolute;
            top: 100%;
            right: 16px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10;
            min-width: 150px;

            .quick-action-btn {
              width: 100%;
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 16px;
              border: none;
              background: white;
              color: #495057;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s ease;

              &:first-child {
                border-radius: 8px 8px 0 0;
              }

              &:last-child {
                border-radius: 0 0 8px 8px;
              }

              &:only-child {
                border-radius: 8px;
              }

              &:hover {
                background: #f8f9fa;
              }

              &.action-primary {
                color: #3498db;
              }

              &.action-success {
                color: #27ae60;
              }

              &.action-danger {
                color: #e74c3c;
              }
            }
          }
        }
      }

      .empty-state,
      .loading-state {
        text-align: center;
        padding: 48px 24px;
        color: #6c757d;

        .empty-icon {
          margin-bottom: 16px;
          color: #95a5a6;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }

        .empty-message {
          font-size: 14px;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .empty-action {
          padding: 10px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;

          &:active {
            background: #2980b9;
            transform: scale(0.98);
          }
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e9ecef;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (min-width: 768px) {
        .results-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          padding: 16px;

          .result-item-wrapper {
            margin-bottom: 0;
          }
        }

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
  public showQuickActions = false;
  public selectedCandidate: CandidateResult | null = null;

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

  // Available filter options
  public availableStatuses = ['new', 'reviewed', 'shortlisted', 'interviewed'];
  public availableExperience = ['Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];

  public sortOptions = [
    { label: 'Score (High to Low)', value: 'score-desc' },
    { label: 'Score (Low to High)', value: 'score-asc' },
    { label: 'Name (A to Z)', value: 'name-asc' },
    { label: 'Name (Z to A)', value: 'name-desc' },
    { label: 'Recently Updated', value: 'updated-desc' },
  ];

  // Swipe actions
  /**
   * Retrieves swipe actions.
   * @param _candidate - The candidate.
   * @returns The an array of SwipeAction.
   */
  public getSwipeActions(_candidate: CandidateResult): SwipeAction[] {
    return [
      {
        id: 'view',
        label: 'View',
        icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z',
        color: 'primary',
        width: 80,
      },
      {
        id: 'shortlist',
        label: 'Shortlist',
        icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
        color: 'success',
        width: 80,
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: 'M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12Z',
        color: 'danger',
        width: 80,
      },
    ];
  }

  // Quick actions menu
  public quickActions = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z',
      color: 'primary',
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: 'M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z',
      color: 'success',
    },
    {
      id: 'notes',
      label: 'Add Notes',
      icon: 'M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z',
      color: 'primary',
    },
  ];

  /**
   * Initializes a new instance of the Mobile Results Component.
   * @param _touchGesture - The touch gesture.
   */
  constructor(private readonly _touchGesture: TouchGestureService) {
    // TouchGesture service will be used for future gesture implementations
    // Prevent unused warning
    void this._touchGesture;
  }

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  public ngOnInit(): void {
    this.applyFilters();
    this.setupGestures();
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupGestures(): void {
    // Setup pull-to-refresh gesture
    // Implementation would go here
  }

  /**
   * Performs the active filters count operation.
   * @returns The number value.
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

  // Filter methods
  /**
   * Performs the toggle filters operation.
   * @returns The result of the operation.
   */
  public toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.showSort = false;
  }

  /**
   * Performs the toggle sort operation.
   * @returns The result of the operation.
   */
  public toggleSort(): void {
    this.showSort = !this.showSort;
    this.showFilters = false;
  }

  /**
   * Performs the toggle view operation.
   * @returns The result of the operation.
   */
  public toggleView(): void {
    this.viewMode = this.viewMode === 'card' ? 'detailed' : 'card';
  }

  /**
   * Performs the on filter change operation.
   * @returns The result of the operation.
   */
  public onFilterChange(): void {
    this.applyFilters();
    this.filtersChanged.emit(this.filters);
  }

  /**
   * Performs the toggle status filter operation.
   * @param status - The status.
   * @returns The result of the operation.
   */
  public toggleStatusFilter(status: string): void {
    const index = this.filters.status.indexOf(status);
    if (index > -1) {
      this.filters.status.splice(index, 1);
    } else {
      this.filters.status.push(status);
    }
    this.onFilterChange();
  }

  /**
   * Performs the toggle experience filter operation.
   * @param experience - The experience.
   * @returns The result of the operation.
   */
  public toggleExperienceFilter(experience: string): void {
    const index = this.filters.experience.indexOf(experience);
    if (index > -1) {
      this.filters.experience.splice(index, 1);
    } else {
      this.filters.experience.push(experience);
    }
    this.onFilterChange();
  }

  /**
   * Performs the clear filters operation.
   * @returns The result of the operation.
   */
  public clearFilters(): void {
    this.filters = {
      score: { min: 0, max: 100 },
      experience: [],
      skills: [],
      location: [],
      status: [],
    };
    this.onFilterChange();
  }

  /**
   * Sets sort option.
   * @param sortValue - The sort value.
   * @returns The result of the operation.
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
   * @returns The string value.
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
   * @returns The boolean value.
   */
  public isSelected(candidate: CandidateResult): boolean {
    return this.selectedCandidates.some((c) => c.id === candidate.id);
  }

  /**
   * Performs the toggle selection operation.
   * @param candidate - The candidate.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public toggleSelection(candidate: CandidateResult, event: Event): void {
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

  /**
   * Performs the select all operation.
   * @returns The result of the operation.
   */
  public selectAll(): void {
    this.selectedCandidates = [...this.filteredResults];
  }

  /**
   * Performs the bulk action operation.
   * @param action - The action.
   * @returns The result of the operation.
   */
  public bulkAction(action: string): void {
    this.bulkActionTriggered.emit({
      action,
      candidates: this.selectedCandidates,
    });
    this.selectedCandidates = [];
  }

  // Event handlers
  /**
   * Performs the on candidate click operation.
   * @param candidate - The candidate.
   * @returns The result of the operation.
   */
  public onCandidateClick(candidate: CandidateResult): void {
    this.candidateSelected.emit(candidate);
  }

  /**
   * Performs the on candidate long press operation.
   * @param candidate - The candidate.
   * @returns The result of the operation.
   */
  public onCandidateLongPress(candidate: CandidateResult): void {
    this.selectedCandidate = candidate;
    this.showQuickActions = true;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  /**
   * Performs the on swipe action operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public onSwipeAction(event: SwipeEvent): void {
    this.candidateAction.emit({
      action: event.action.id,
      candidate: event.item,
    });
  }

  /**
   * Performs the on quick action operation.
   * @param action - The action.
   * @param candidate - The candidate.
   * @param event - The event.
   * @returns The result of the operation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onQuickAction(action: any, candidate: CandidateResult, event: Event): void {
    event.stopPropagation();
    this.candidateAction.emit({
      action: action.id,
      candidate,
    });
    this.showQuickActions = false;
    this.selectedCandidate = null;
  }

  /**
   * Performs the track by candidate operation.
   * @param _index - The index.
   * @param candidate - The candidate.
   * @returns The string value.
   */
  public trackByCandidate(_index: number, candidate: CandidateResult): string {
    return candidate.id;
  }
}
