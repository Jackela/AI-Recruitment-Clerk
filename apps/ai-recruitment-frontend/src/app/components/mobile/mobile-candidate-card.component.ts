import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Status type for candidate status indicator.
 */
export type CandidateStatus =
  | 'new'
  | 'reviewed'
  | 'shortlisted'
  | 'interviewed'
  | 'hired'
  | 'rejected';

/**
 * Match level type for candidate matching.
 */
export type CandidateMatch = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Candidate card display data interface.
 */
export interface CandidateCardData {
  name: string;
  title: string;
  experience: string;
  location: string;
  score: number;
  match: CandidateMatch;
  avatar?: string;
  status: CandidateStatus;
}

/**
 * Candidate card display component.
 * Displays candidate avatar, name, title, and score badge.
 * This is a pure display component using @Input for all data.
 */
@Component({
  selector: 'arc-mobile-candidate-card',
  standalone: true,
  imports: [CommonModule],
  template: `
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
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
        min-width: 0;
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
        }
      }
    `,
  ],
})
export class MobileCandidateCardComponent {
  @Input() public candidate!: CandidateCardData;
}
