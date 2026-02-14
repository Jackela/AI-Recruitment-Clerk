import type {
  OnInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { Subject, fromEvent, animationFrameScheduler } from 'rxjs';
import { takeUntil, throttleTime, distinctUntilChanged } from 'rxjs/operators';

import type { VirtualScrollConfig, ScrollState } from './virtual-scroll.types';
import { DEFAULT_VIRTUAL_SCROLL_CONFIG } from './virtual-scroll.types';
import { VirtualScrollViewportService } from './virtual-scroll-viewport.service';
import { VirtualScrollContentComponent } from './virtual-scroll-content.component';
import { VirtualScrollLoadingComponent } from './virtual-scroll-loading.component';
import { VirtualScrollEmptyComponent } from './virtual-scroll-empty.component';

/**
 * Virtual scroll component for efficient rendering of large lists.
 * Only renders visible items plus a buffer, improving performance with thousands of items.
 *
 * @template T - The type of items in the scroll list.
 */
@Component({
  selector: 'arc-virtual-scroll',
  standalone: true,
  imports: [
    CommonModule,
    VirtualScrollContentComponent,
    VirtualScrollLoadingComponent,
    VirtualScrollEmptyComponent,
  ],
  template: `
    <div
      class="virtual-scroll-container"
      #scrollContainer
      [style.height.px]="containerHeight"
      (scroll)="onScroll($event)"
      [class.smooth-scroll]="config.enableSmoothScroll"
      role="region"
      [attr.aria-label]="ariaLabel"
      [attr.aria-busy]="viewport.isLoading()"
    >
      <!-- Top Spacer -->
      <div
        class="virtual-scroll-spacer-top"
        [style.height.px]="viewport.topSpacerHeight()"
        aria-hidden="true"
      ></div>

      <!-- Visible Items -->
      <arc-virtual-scroll-content
        [itemTemplate]="itemTemplate"
        [items]="viewport.visibleItems()"
        [config]="config"
        [startIndex]="viewport.startIndex()"
        [contentOffset]="viewport.contentOffset()"
        [getItemHeight]="viewport.getItemHeight.bind(viewport)"
        [totalItems]="items.length"
      />

      <!-- Bottom Spacer -->
      <div
        class="virtual-scroll-spacer-bottom"
        [style.height.px]="viewport.bottomSpacerHeight()"
        aria-hidden="true"
      ></div>

      <!-- Loading Indicator -->
      <arc-virtual-scroll-loading *ngIf="viewport.isLoading()" />

      <!-- Empty State -->
      <arc-virtual-scroll-empty *ngIf="items.length === 0 && !viewport.isLoading()">
        <ng-content select="[empty-state]">
          <p>暂无数据</p>
        </ng-content>
      </arc-virtual-scroll-empty>
    </div>
  `,
  styleUrls: ['./virtual-scroll.component.scss'],
})
export class VirtualScrollComponent<T = unknown> implements OnInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true })
  public scrollContainer!: ElementRef<HTMLDivElement>;

  @Input() public items: T[] = [];
  @Input() public itemTemplate!: TemplateRef<unknown>;
  @Input() public containerHeight = 600;
  @Input() public config: VirtualScrollConfig<T> = {
    ...DEFAULT_VIRTUAL_SCROLL_CONFIG,
  };
  @Input() public ariaLabel = '虚拟滚动列表';

  @Output() public scrollEnd = new EventEmitter<void>();
  @Output() public scrollToTop = new EventEmitter<void>();
  @Output() public loadMore = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  /** Viewport service for calculations. */
  public viewport = new VirtualScrollViewportService<T>();

  constructor() {
    // Setup infinite scroll effect if enabled
    effect(() => {
      if (this.config.enableInfiniteScroll && this.viewport.shouldTriggerLoadMore()) {
        this.loadMore.emit();
      }
    });
  }

  public ngOnInit(): void {
    this.viewport.initialize(this.config, this.items);
    this.setupScrollListener();
    this.setupResizeObserver();

    // Initial measurement
    this.updateScrollState();

    // Sync items changes
    effect(() => {
      this.viewport.updateItems(this.items);
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupScrollListener(): void {
    fromEvent(this.scrollContainer.nativeElement, 'scroll')
      .pipe(
        takeUntil(this.destroy$),
        throttleTime(16, animationFrameScheduler, {
          leading: true,
          trailing: true,
        }),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.updateScrollState();
      });
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        this.updateScrollState();
      });

      resizeObserver.observe(this.scrollContainer.nativeElement);

      this.destroy$.subscribe(() => {
        resizeObserver.disconnect();
      });
    }
  }

  private updateScrollState(): void {
    const element = this.scrollContainer.nativeElement;
    const state: ScrollState = {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
    this.viewport.updateScrollState(state);

    // Emit events
    if (element.scrollTop === 0) {
      this.scrollToTop.emit();
    } else if (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - 1
    ) {
      this.scrollEnd.emit();
    }
  }

  /**
   * Called on scroll event (handled by listener).
   */
  public onScroll(_event: Event): void {
    // Scroll is handled by the scroll listener subscription
  }

  // Public API

  /**
   * Scroll to a specific index.
   */
  public scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
    const itemHeight = this.viewport.getAverageItemHeight();
    const scrollTop = index * itemHeight;

    this.scrollContainer.nativeElement.scrollTo({
      top: scrollTop,
      behavior,
    });
  }

  /**
   * Scroll to a specific item.
   */
  public scrollToItem(item: T, behavior: ScrollBehavior = 'auto'): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.scrollToIndex(index, behavior);
    }
  }

  /**
   * Refresh the scroll state and clear height cache.
   */
  public refresh(): void {
    this.updateScrollState();
    this.viewport.clearHeightCache();
  }

  /**
   * Set the loading state.
   */
  public setLoading(loading: boolean): void {
    this.viewport.isLoading.set(loading);
  }
}
