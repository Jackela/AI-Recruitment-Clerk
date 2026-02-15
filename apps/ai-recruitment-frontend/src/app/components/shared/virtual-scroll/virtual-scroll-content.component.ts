import type { OnInit, TemplateRef } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { VirtualScrollConfig } from './virtual-scroll.types';

/**
 * Component for rendering the visible items in a virtual scroll list.
 * Handles the actual item rendering with template projection.
 *
 * @template T - The type of items being rendered.
 */
@Component({
  selector: 'arc-virtual-scroll-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="virtual-scroll-content"
      [style.transform]="'translateY(' + contentOffset() + 'px)'"
      role="list"
    >
      <ng-container *ngFor="let item of visibleItems(); let i = index; trackBy: trackByFn">
        <div
          class="virtual-scroll-item"
          [style.height.px]="getItemHeight(item, i)"
          [attr.data-index]="startIndex() + i"
          role="listitem"
          [attr.aria-posinset]="startIndex() + i + 1"
          [attr.aria-setsize]="totalItems"
        >
          <ng-content
            *ngTemplateOutlet="
              itemTemplate;
              context: {
                $implicit: item,
                index: startIndex() + i,
                first: startIndex() + i === 0,
                last: startIndex() + i === totalItems - 1,
                even: (startIndex() + i) % 2 === 0,
                odd: (startIndex() + i) % 2 === 1
              }
            "
          ></ng-content>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .virtual-scroll-content {
        position: relative;
        will-change: transform;
      }

      .virtual-scroll-item {
        position: relative;
        width: 100%;
        overflow: hidden;
      }

      /* Performance hints */
      .virtual-scroll-item > * {
        contain: layout style paint;
      }
    `,
  ],
})
export class VirtualScrollContentComponent<T = unknown> implements OnInit {
  @Input() public itemTemplate!: TemplateRef<unknown>;
  @Input() public items: T[] = [];
  @Input() public config!: VirtualScrollConfig<T>;
  @Input() public startIndex = signal(0);
  @Input() public contentOffset = signal(0);
  @Input() public getItemHeight!: (item: T, index: number) => number;
  @Input() public totalItems = 0;

  @Output() public itemRendered = new EventEmitter<{
    item: T;
    height: number;
  }>();

  public visibleItems = computed(() => this.items);

  public ngOnInit(): void {
    this.visibleItems = computed(() => this.items);
  }

  /**
   * Track items by unique key for change detection.
   */
  public trackByFn(index: number, item: T): unknown {
    if (this.config.trackBy) {
      return this.config.trackBy(this.startIndex() + index, item);
    }
    return (item as Record<string, unknown>)?.['id'] || index;
  }
}
