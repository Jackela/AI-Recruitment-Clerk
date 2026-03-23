import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BentoIconName } from '../types/bento-card.types';

@Component({
  selector: 'arc-bento-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bento-icon" [attr.aria-hidden]="ariaHidden">
      <svg
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <ng-container [ngSwitch]="icon">
          <!-- Dashboard Icon -->
          <g *ngSwitchCase="'dashboard'">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </g>

          <!-- Jobs Icon -->
          <g *ngSwitchCase="'jobs'">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </g>

          <!-- Resumes Icon -->
          <g *ngSwitchCase="'resumes'">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            ></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </g>

          <!-- Reports/Stats Icon -->
          <g *ngSwitchCase="'reports'">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </g>

          <!-- Matches Icon -->
          <g *ngSwitchCase="'matches'">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </g>

          <!-- Analytics Icon -->
          <g *ngSwitchCase="'analytics'">
            <path d="M21 21v-7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7h18z"></path>
            <path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"></path>
          </g>

          <!-- Activity Icon -->
          <g *ngSwitchCase="'activity'">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </g>

          <!-- Settings Icon -->
          <g *ngSwitchCase="'settings'">
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </g>

          <!-- Stats Icon (alias for reports) -->
          <g *ngSwitchCase="'stats'">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </g>

          <!-- Users Icon -->
          <g *ngSwitchCase="'users'">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </g>

          <!-- Trend Up Icon -->
          <g *ngSwitchCase="'trend-up'">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </g>

          <!-- Clock Icon -->
          <g *ngSwitchCase="'clock'">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12,6 12,12 16,14"></polyline>
          </g>

          <!-- Target Icon -->
          <g *ngSwitchCase="'target'">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </g>

          <!-- Default Icon -->
          <g *ngSwitchDefault>
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </g>
        </ng-container>
      </svg>
    </div>
  `,
  styles: [
    `
      .bento-icon {
        width: var(--space-12);
        height: var(--space-12);
        border-radius: var(--radius-xl);
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
          135deg,
          var(--color-primary-100),
          var(--color-primary-50)
        );
        border: 1px solid var(--color-primary-200);
        color: var(--color-primary-800);
        flex-shrink: 0;
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-base);

        &:hover {
          background: linear-gradient(
            135deg,
            var(--color-primary-200),
            var(--color-primary-100)
          );
          transform: scale(1.05);
        }
      }
    `,
  ],
})
export class BentoIconComponent {
  @Input() icon: BentoIconName | string = 'dashboard';
  @Input() size = 24;
  @Input() color = 'currentColor';
  @Input() ariaHidden = true;
}
