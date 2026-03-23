import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import type { BentoCardData } from './types/bento-card.types';
import { BentoCardHeaderComponent } from './header/bento-card-header.component';
import { BentoStatDisplayComponent } from './content/bento-stat-display.component';
import { BentoProgressBarComponent } from './content/bento-progress-bar.component';
import { BentoMetricItemComponent } from './content/bento-metric-item.component';
import { BentoCardActionsComponent } from './actions/bento-card-actions.component';

@Component({
  selector: 'arc-bento-card',
  standalone: true,
  imports: [
    CommonModule,
    BentoCardHeaderComponent,
    BentoStatDisplayComponent,
    BentoProgressBarComponent,
    BentoMetricItemComponent,
    BentoCardActionsComponent,
  ],
  template: `
    <div class="bento-card" [class]="getCardClasses()">
      <arc-bento-card-header
        [title]="data.title"
        [subtitle]="data.subtitle"
        [icon]="data.icon"
        [badge]="data.badge"
        [status]="data.status"
      ></arc-bento-card-header>

      <arc-bento-stat-display [value]="data.value"></arc-bento-stat-display>

      <arc-bento-progress-bar
        [progress]="data.progress"
      ></arc-bento-progress-bar>

      <div class="card-metrics" *ngIf="data.metrics && data.metrics.length > 0">
        <arc-bento-metric-item
          *ngFor="let metric of data.metrics; trackBy: trackByMetricLabel"
          [metric]="metric"
        ></arc-bento-metric-item>
      </div>

      <arc-bento-card-actions
        [actions]="data.actions"
        (actionClick)="onActionClick($event)"
      ></arc-bento-card-actions>
    </div>
  `,
  styles: [
    `
      .bento-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .card-metrics {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoCardComponent {
  @Input() data!: BentoCardData;
  @Output() actionClick = new EventEmitter<BentoCardData['actions']>();

  getCardClasses(): string {
    const classes = ['bento-card'];
    if (this.data.status) {
      classes.push(`status-${this.data.status}`);
    }
    return classes.join(' ');
  }

  onActionClick(action: NonNullable<BentoCardData['actions']>[0]): void {
    this.actionClick.emit([action]);
  }

  trackByMetricLabel(
    _index: number,
    metric: NonNullable<BentoCardData['metrics']>[0],
  ): string {
    return metric.label;
  }
}
