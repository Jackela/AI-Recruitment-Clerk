import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BentoIconComponent } from '../icons/bento-icon.component';
import { BentoIconName, BentoStatus } from '../types/bento-card.types';

@Component({
  selector: 'arc-bento-card-header',
  standalone: true,
  imports: [CommonModule, BentoIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card-header" *ngIf="icon || badge || title">
      <div class="header-left">
        <div class="card-icon" *ngIf="icon" [attr.aria-hidden]="'true'">
          <arc-bento-icon [icon]="icon" [size]="24"></arc-bento-icon>
        </div>

        <div class="header-text" *ngIf="title">
          <h3 class="card-title">{{ title }}</h3>
          <p class="card-subtitle" *ngIf="subtitle">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <div
        class="card-badge"
        *ngIf="badge"
        [class]="'badge-' + (status || 'default')"
      >
        {{ badge }}
      </div>
    </div>
  `,
  styles: [
    `
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .header-left {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        flex: 1;
      }

      .card-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
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
        transition: all 0.3s var(--ease-out);
      }

      .header-text {
        flex: 1;
        min-width: 0;
      }

      .card-title {
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-fantasy-large);
        margin: 0 0 var(--space-1) 0;
        line-height: var(--line-height-tight);
        color: var(--color-text-fantasy);
        letter-spacing: -0.01em;
      }

      .card-subtitle {
        font-family: var(--font-family-body);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-fantasy-small);
        margin: 0;
        color: var(--color-text-secondary);
        line-height: var(--line-height-normal);
      }

      .card-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        flex-shrink: 0;

        &.badge-active {
          background: var(--color-success-100);
          color: var(--color-success-700);
          border: 1px solid var(--color-success-200);
        }

        &.badge-inactive {
          background: var(--color-neutral-100);
          color: var(--color-neutral-700);
          border: 1px solid var(--color-neutral-200);
        }

        &.badge-warning {
          background: var(--color-warning-100);
          color: var(--color-warning-700);
          border: 1px solid var(--color-warning-200);
        }

        &.badge-error {
          background: var(--color-error-100);
          color: var(--color-error-700);
          border: 1px solid var(--color-error-200);
        }

        &.badge-success {
          background: var(--color-success-100);
          color: var(--color-success-700);
          border: 1px solid var(--color-success-200);
        }

        &.badge-default {
          background: var(--color-moonlight-100);
          color: var(--color-moonlight-700);
          border: 1px solid var(--color-moonlight-200);
        }
      }

      @media (max-width: 640px) {
        .card-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
        }
      }
    `,
  ],
})
export class BentoCardHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon?: BentoIconName;
  @Input() badge = '';
  @Input() status?: BentoStatus;
}
