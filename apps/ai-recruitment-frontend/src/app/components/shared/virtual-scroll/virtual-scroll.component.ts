import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, fromEvent, animationFrameScheduler } from 'rxjs';
import { takeUntil, throttleTime, distinctUntilChanged } from 'rxjs/operators';
// import { debounceTime } from 'rxjs/operators'; // Reserved for future use

export interface VirtualScrollConfig {
  itemHeight: number;
  bufferSize?: number;
  trackBy?: (index: number, item: any) => any;
  enableSmoothScroll?: boolean;
  enableInfiniteScroll?: boolean;
  infiniteScrollThreshold?: number;
  enableDynamicHeight?: boolean;
  estimatedItemHeight?: number;
}

interface ScrollState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

@Component({
  selector: 'arc-virtual-scroll',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="virtual-scroll-container" 
         #scrollContainer
         [style.height.px]="containerHeight"
         (scroll)="onScroll($event)"
         [class.smooth-scroll]="config.enableSmoothScroll"
         role="region"
         [attr.aria-label]="ariaLabel"
         [attr.aria-busy]="isLoading()">
      
      <!-- Top Spacer -->
      <div class="virtual-scroll-spacer-top" 
           [style.height.px]="topSpacerHeight()"
           aria-hidden="true">
      </div>
      
      <!-- Visible Items -->
      <div class="virtual-scroll-content"
           [style.transform]="'translateY(' + contentOffset() + 'px)'"
           role="list">
        <ng-container *ngFor="let item of visibleItems(); let i = index; trackBy: trackByFn">
          <div class="virtual-scroll-item"
               [style.height.px]="getItemHeight(item, i)"
               [attr.data-index]="startIndex() + i"
               role="listitem"
               [attr.aria-posinset]="startIndex() + i + 1"
               [attr.aria-setsize]="items.length">
            <ng-content *ngTemplateOutlet="itemTemplate; context: { 
              $implicit: item, 
              index: startIndex() + i,
              first: startIndex() + i === 0,
              last: startIndex() + i === items.length - 1,
              even: (startIndex() + i) % 2 === 0,
              odd: (startIndex() + i) % 2 === 1
            }"></ng-content>
          </div>
        </ng-container>
      </div>
      
      <!-- Bottom Spacer -->
      <div class="virtual-scroll-spacer-bottom" 
           [style.height.px]="bottomSpacerHeight()"
           aria-hidden="true">
      </div>
      
      <!-- Loading Indicator -->
      <div class="virtual-scroll-loading" 
           *ngIf="isLoading()"
           role="status"
           aria-live="polite">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
      
      <!-- Empty State -->
      <div class="virtual-scroll-empty" 
           *ngIf="items.length === 0 && !isLoading()"
           role="status">
        <ng-content select="[empty-state]">
          <p>暂无数据</p>
        </ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      width: 100%;
    }

    .virtual-scroll-container {
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
      width: 100%;
      
      /* Performance optimizations */
      transform: translateZ(0);
      backface-visibility: hidden;
      -webkit-overflow-scrolling: touch;
    }

    .virtual-scroll-container.smooth-scroll {
      scroll-behavior: smooth;
    }

    .virtual-scroll-content {
      position: relative;
      will-change: transform;
    }

    .virtual-scroll-spacer-top,
    .virtual-scroll-spacer-bottom {
      position: relative;
      width: 100%;
      pointer-events: none;
    }

    .virtual-scroll-item {
      position: relative;
      width: 100%;
      overflow: hidden;
    }

    .virtual-scroll-loading {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: linear-gradient(to top, 
        var(--color-surface, white) 0%, 
        transparent 100%);
      color: var(--color-text-secondary, #6b7280);
      font-size: 0.875rem;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border, #e5e7eb);
      border-top-color: var(--color-primary, #667eea);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .virtual-scroll-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--color-text-secondary, #6b7280);
      text-align: center;
    }

    /* Scrollbar styling */
    .virtual-scroll-container::-webkit-scrollbar {
      width: 8px;
    }

    .virtual-scroll-container::-webkit-scrollbar-track {
      background: var(--color-background, #f9fafb);
      border-radius: 4px;
    }

    .virtual-scroll-container::-webkit-scrollbar-thumb {
      background: var(--color-border, #d1d5db);
      border-radius: 4px;
      transition: background 0.2s;
    }

    .virtual-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--color-text-secondary, #9ca3af);
    }

    /* Dark mode adjustments */
    :host-context([data-theme="dark"]) {
      .virtual-scroll-container::-webkit-scrollbar-track {
        background: var(--color-surface, #1e293b);
      }

      .virtual-scroll-container::-webkit-scrollbar-thumb {
        background: var(--color-border, #475569);
      }

      .virtual-scroll-container::-webkit-scrollbar-thumb:hover {
        background: var(--color-text-secondary, #64748b);
      }
    }

    /* Performance hints */
    .virtual-scroll-item > * {
      contain: layout style paint;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .virtual-scroll-container.smooth-scroll {
        scroll-behavior: auto;
      }

      .loading-spinner {
        animation: none;
        opacity: 0.5;
      }
    }
  `]
})
export class VirtualScrollComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLDivElement>;
  
  @Input() items: any[] = [];
  @Input() itemTemplate: any;
  @Input() containerHeight = 600;
  @Input() config: VirtualScrollConfig = {
    itemHeight: 50,
    bufferSize: 5,
    enableSmoothScroll: false,
    enableInfiniteScroll: false,
    infiniteScrollThreshold: 80,
    enableDynamicHeight: false,
    estimatedItemHeight: 50
  };
  @Input() ariaLabel = '虚拟滚动列表';
  
  @Output() scrollEnd = new EventEmitter<void>();
  @Output() scrollToTop = new EventEmitter<void>();
  @Output() loadMore = new EventEmitter<void>();
  
  // State
  private destroy$ = new Subject<void>();
  private itemHeightCache = new Map<any, number>();
  
  scrollState = signal<ScrollState>({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0
  });
  
  isLoading = signal(false);
  
  // Computed values
  startIndex = computed(() => {
    const scrollTop = this.scrollState().scrollTop;
    const bufferSize = this.config.bufferSize || 5;
    const index = Math.floor(scrollTop / this.getAverageItemHeight()) - bufferSize;
    return Math.max(0, index);
  });
  
  endIndex = computed(() => {
    const scrollTop = this.scrollState().scrollTop;
    const clientHeight = this.scrollState().clientHeight;
    const bufferSize = this.config.bufferSize || 5;
    const itemHeight = this.getAverageItemHeight();
    const index = Math.ceil((scrollTop + clientHeight) / itemHeight) + bufferSize;
    return Math.min(this.items.length, index);
  });
  
  visibleItems = computed(() => {
    const start = this.startIndex();
    const end = this.endIndex();
    return this.items.slice(start, end);
  });
  
  topSpacerHeight = computed(() => {
    const start = this.startIndex();
    if (this.config.enableDynamicHeight) {
      let height = 0;
      for (let i = 0; i < start; i++) {
        height += this.getItemHeight(this.items[i], i);
      }
      return height;
    }
    return start * this.config.itemHeight;
  });
  
  bottomSpacerHeight = computed(() => {
    const end = this.endIndex();
    const total = this.items.length;
    if (this.config.enableDynamicHeight) {
      let height = 0;
      for (let i = end; i < total; i++) {
        height += this.getItemHeight(this.items[i], i);
      }
      return height;
    }
    return (total - end) * this.config.itemHeight;
  });
  
  contentOffset = computed(() => {
    // For smooth rendering
    return 0;
  });
  
  scrollPercentage = computed(() => {
    const { scrollTop, scrollHeight, clientHeight } = this.scrollState();
    if (scrollHeight <= clientHeight) return 0;
    return (scrollTop / (scrollHeight - clientHeight)) * 100;
  });
  
  ngOnInit(): void {
    this.setupScrollListener();
    this.setupResizeObserver();
    
    // Initial measurement
    this.updateScrollState();
    
    // Setup infinite scroll if enabled
    if (this.config.enableInfiniteScroll) {
      this.setupInfiniteScroll();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupScrollListener(): void {
    fromEvent(this.scrollContainer.nativeElement, 'scroll')
      .pipe(
        takeUntil(this.destroy$),
        throttleTime(16, animationFrameScheduler, { leading: true, trailing: true }),
        distinctUntilChanged()
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
  
  private setupInfiniteScroll(): void {
    effect(() => {
      const percentage = this.scrollPercentage();
      const threshold = this.config.infiniteScrollThreshold || 80;
      
      if (percentage >= threshold && !this.isLoading()) {
        this.loadMore.emit();
      }
    });
  }
  
  private updateScrollState(): void {
    const element = this.scrollContainer.nativeElement;
    this.scrollState.set({
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight
    });
    
    // Emit events
    if (element.scrollTop === 0) {
      this.scrollToTop.emit();
    } else if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) {
      this.scrollEnd.emit();
    }
  }
  
  onScroll(_event: Event): void {
    // Handled by scroll listener
  }
  
  trackByFn(index: number, item: any): any {
    if (this.config.trackBy) {
      return this.config.trackBy(this.startIndex() + index, item);
    }
    return item.id || index;
  }
  
  getItemHeight(item: any, _index: number): number {
    if (!this.config.enableDynamicHeight) {
      return this.config.itemHeight;
    }
    
    // Check cache
    const cached = this.itemHeightCache.get(item);
    if (cached) {
      return cached;
    }
    
    // Return estimated height for unmeasured items
    return this.config.estimatedItemHeight || this.config.itemHeight;
  }
  
  private getAverageItemHeight(): number {
    if (!this.config.enableDynamicHeight) {
      return this.config.itemHeight;
    }
    
    if (this.itemHeightCache.size === 0) {
      return this.config.estimatedItemHeight || this.config.itemHeight;
    }
    
    const total = Array.from(this.itemHeightCache.values()).reduce((sum, h) => sum + h, 0);
    return total / this.itemHeightCache.size;
  }
  
  // Public API
  
  scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
    const itemHeight = this.getAverageItemHeight();
    const scrollTop = index * itemHeight;
    
    this.scrollContainer.nativeElement.scrollTo({
      top: scrollTop,
      behavior
    });
  }
  
  scrollToItem(item: any, behavior: ScrollBehavior = 'auto'): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.scrollToIndex(index, behavior);
    }
  }
  
  refresh(): void {
    this.updateScrollState();
    this.itemHeightCache.clear();
  }
  
  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }
}