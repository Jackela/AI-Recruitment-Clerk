import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ContentChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'arc-bento-card-content',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card-content" [class]="getContentClasses()">
      <ng-container
        *ngTemplateOutlet="
          contentTemplate || defaultTemplate;
          context: { $implicit: data }
        "
      ></ng-container>
    </div>
    <ng-template #defaultTemplate let-data>
      <ng-content></ng-content>
    </ng-template>
  `,
  styles: [
    `
      .card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .content-center {
        justify-content: center;
        align-items: center;
        text-align: center;
      }
    `,
  ],
})
export class BentoCardContentComponent<T = unknown> {
  @Input() data?: T;
  @Input() centered = false;
  @ContentChild(TemplateRef) contentTemplate?: TemplateRef<{ $implicit: T }>;
  @Output() contentClick = new EventEmitter<void>();

  getContentClasses(): string {
    return this.centered ? 'card-content content-center' : 'card-content';
  }
}
