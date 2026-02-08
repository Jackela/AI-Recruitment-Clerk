import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Represents the bento icon component.
 * Displays SVG icons for bento grid items.
 */
@Component({
  selector: 'arc-bento-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bento-icon" [attr.aria-hidden]="'true'">
      <ng-container [ngSwitch]="icon">
        <!-- Dashboard Icons -->
        <svg
          *ngSwitchCase="'dashboard'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>

        <!-- Jobs Icon -->
        <svg
          *ngSwitchCase="'jobs'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>

        <!-- Resumes Icon -->
        <svg
          *ngSwitchCase="'resumes'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>

        <!-- Reports Icon -->
        <svg
          *ngSwitchCase="'reports'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>

        <!-- Matches Icon -->
        <svg
          *ngSwitchCase="'matches'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>

        <!-- Analytics Icon -->
        <svg
          *ngSwitchCase="'analytics'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M21 21v-7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7h18z"></path>
          <path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"></path>
        </svg>

        <!-- Activity Icon -->
        <svg
          *ngSwitchCase="'activity'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>

        <!-- Settings Icon -->
        <svg
          *ngSwitchCase="'settings'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </ng-container>
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
  @Input({ required: true })
  public icon!: string;
}
