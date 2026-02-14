import type {
  SwipeAction,
  SwipeEvent
} from './mobile-swipe.component';
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
import {
  MobileCandidateCardComponent,
} from './mobile-candidate-card.component';
import {
  MobileSkillTagsComponent,
} from './mobile-skill-tags.component';
import {
  MobileQuickActionsMenuComponent,
  type QuickActionMenuItem,
} from './mobile-quick-actions-menu.component';

/**
 * Defines the shape of candidate result.
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
 * Individual candidate card component.
 * Displays single candidate with avatar, info, skills, and actions.
 */
@Component({
  selector: 'arc-mobile-results-item',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MobileSwipeComponent,
    MobileCandidateCardComponent,
    MobileSkillTagsComponent,
    MobileQuickActionsMenuComponent,
  ],
  template: `
    <app-mobile-swipe
      [actions]="getSwipeActions()"
      [item]="candidate"
      (swipeAction)="onSwipeAction($event)"
    >
      <div
        class="result-item"
        [class.selected]="isSelected"
        [class]="'match-' + candidate.match"
        (click)="onCandidateClick()"
        (keydown.enter)="onCandidateClick()"
        (keydown.space)="onCandidateClick()"
        (longpress)="onCandidateLongPress()"
        tabindex="0"
        role="button"
        [attr.aria-label]="'View candidate ' + candidate.name"
      >
        <!-- Candidate Card (Avatar + Info) -->
        <arc-mobile-candidate-card [candidate]="candidate" />

        <!-- Skills Tags -->
        <arc-mobile-skill-tags [skills]="candidate.skills" />

        <!-- Match Details -->
        <div class="match-details" *ngIf="showDetailed">
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

        <!-- Selection Checkbox -->
        <div class="selection-area">
          <input
            type="checkbox"
            [checked]="isSelected"
            (change)="onToggleSelection($event)"
            class="selection-checkbox"
            [attr.aria-label]="'Select ' + candidate.name"
          />
        </div>

        <!-- Quick Actions Menu -->
        <arc-mobile-quick-actions-menu
          [visible]="showQuickActions"
          [actions]="quickActions"
          (actionClick)="onQuickAction($event)"
        />
      </div>
    </app-mobile-swipe>
  `,
  styles: [
    `
      .result-item {
        display: flex;
        flex-direction: column;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        width: 100%;

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

        arc-mobile-candidate-card {
          margin-bottom: 8px;
        }

        .match-details {
          display: none;
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 8px;
          padding-left: 60px;

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
          padding-left: 60px;

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

        .selection-area {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;

          .selection-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }
        }
      }
    `,
  ],
})
export class MobileResultsItemComponent {
  @Input() public candidate!: CandidateResult;
  @Input() public isSelected = false;
  @Input() public showDetailed = false;

  @Output() public candidateSelected = new EventEmitter<CandidateResult>();
  @Output() public candidateAction = new EventEmitter<{
    action: string;
    candidate: CandidateResult;
  }>();
  @Output() public selectionToggled = new EventEmitter<Event>();

  // Quick actions state
  public showQuickActions = false;

  // Quick actions menu
  public readonly quickActions: QuickActionMenuItem[] = [
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
   * Performs on candidate click operation.
   */
  public onCandidateClick(): void {
    this.candidateSelected.emit(this.candidate);
  }

  /**
   * Performs on candidate long press operation.
   */
  public onCandidateLongPress(): void {
    this.showQuickActions = true;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  /**
   * Performs on swipe action operation.
   */
  public onSwipeAction(event: SwipeEvent): void {
    this.candidateAction.emit({
      action: event.action.id,
      candidate: event.item,
    });
  }

  /**
   * Performs on quick action operation.
   */
  public onQuickAction(action: QuickActionMenuItem): void {
    this.candidateAction.emit({
      action: action.id,
      candidate: this.candidate,
    });
    this.showQuickActions = false;
  }

  /**
   * Performs toggle selection operation.
   */
  public onToggleSelection(event: Event): void {
    this.selectionToggled.emit(event);
  }
}
