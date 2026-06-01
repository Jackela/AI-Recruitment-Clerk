import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'arc-bento-stat-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card-value-section" *ngIf="value !== undefined">
      <div class="card-value" [attr.aria-live]="'polite'">
        {{ formattedValue }}
      </div>
    </div>
  `,
  styles: [
    `
      .card-value-section {
        margin: var(--space-2) 0;
      }

      .card-value {
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        color: var(--color-primary-800);
        background: linear-gradient(
          135deg,
          var(--color-primary-800),
          var(--color-royal-700)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: valueUpdate 0.5s ease-out;
      }

      @keyframes valueUpdate {
        0% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
        }
      }

      @media (max-width: 640px) {
        .card-value {
          font-size: 1.875rem;
        }
      }
    `,
  ],
})
export class BentoStatDisplayComponent {
  @Input() value: string | number | undefined;

  get formattedValue(): string {
    return this.formatValue(this.value);
  }

  private formatValue(value: string | number | undefined): string {
    if (value === undefined) return '';
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toString();
    }
    return value;
  }
}
