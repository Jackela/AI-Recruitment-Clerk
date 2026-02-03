import type {
  SwipeAction,
  SwipeEvent} from './mobile-swipe.component';
import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MobileSwipeComponent
} from './mobile-swipe.component';

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
 * Defines the shape of the quick action.
 */
interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'danger';
}

/**
 * Represents the mobile results display component.
 * Displays individual candidate cards with avatar, info, skills, and actions.
 *
 * This component is responsible for rendering candidate cards and handling
 * candidate-specific interactions like selection, viewing, and quick actions.
 * Parent component handles filtering, sorting, and bulk operations.
 */
@Component({
  selector: 'arc-mobile-results-display',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSwipeComponent],
  template: `
    <div class="results-list" [class]="'view-' + viewMode">
      <div
        *ngFor="let candidate of candidates; trackBy: trackByCandidate"
        class="result-item-wrapper"
      >
        <app-mobile-swipe
          [actions]="getSwipeActions()"
          [item]="candidate"
          (swipeAction)="onSwipeAction($event)"
        >
          <div
            class="result-item"
            [class.selected]="isSelected(candidate)"
            [class]="'match-' + candidate.match"
            (click)="onCandidateClick(candidate)"
            (keydown.enter)="onCandidateClick(candidate)"
            (keydown.space)="onCandidateClick(candidate)"
            (longpress)="onCandidateLongPress(candidate)"
            tabindex="0"
            role="button"
            [attr.aria-label]="'View candidate ' + candidate.name"
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
      *ngIf="candidates.length === 0 && !isLoading"
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
      <button class="empty-action" (click)="clearFilters.emit()">
        Clear Filters
      </button>
    </div>

    <!-- Loading State -->
    <div class="loading-state" *ngIf="isLoading">
      <div class="loading-spinner"></div>
      <p>Loading candidates...</p>
    </div>
  `,
  styles: [
    `
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
      }
    `,
  ],
})
export class MobileResultsDisplayComponent {
  @Input() public candidates: CandidateResult[] = [];
  @Input() public isLoading = false;
  @Input() public viewMode: 'card' | 'detailed' = 'card';
  @Input() public selectedCandidates: CandidateResult[] = [];

  @Output() public candidateSelected = new EventEmitter<CandidateResult>();
  @Output() public candidateAction = new EventEmitter<{
    action: string;
    candidate: CandidateResult;
  }>();
  @Output() public selectionToggled = new EventEmitter<{
    candidate: CandidateResult;
    event: Event;
  }>();
  @Output() public clearFilters = new EventEmitter<void>();

  // Quick actions state
  public showQuickActions = false;
  public selectedCandidate: CandidateResult | null = null;

  // Quick actions menu
  public readonly quickActions: QuickAction[] = [
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
   * Retrieves swipe actions.
   * @returns The an array of SwipeAction.
   */
  public getSwipeActions(): SwipeAction[] {
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
    this.selectionToggled.emit({ candidate, event });
  }

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
  public onQuickAction(action: QuickAction, candidate: CandidateResult, event: Event): void {
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

// Re-export CandidateResult for use in other components
export type { CandidateResult };
