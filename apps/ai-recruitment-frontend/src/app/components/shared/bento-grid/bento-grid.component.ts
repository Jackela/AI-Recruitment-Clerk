import type {
  OnInit,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  TrackByFunction,
} from '@angular/core';
import {
  Component,
  Input,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibleCardDirective } from '../../../directives/accessibility/accessible-card.directive';
import { AccessibilityService } from '../../../services/accessibility/accessibility.service';
import { Subject } from 'rxjs';
import { BentoGridItemComponent, type BentoGridItem } from './bento-grid-item.component';
import {
  BentoGridLayoutService,
  type BentoGridLayoutConfig,
} from './bento-grid-layout.service';

/**
 * Represents the bento grid component.
 * A responsive grid layout component with dynamic column calculation.
 */
@Component({
  selector: 'arc-bento-grid',
  standalone: true,
  imports: [CommonModule, AccessibleCardDirective, BentoGridItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./bento-grid.component.scss'],
  template: `
    <div
      class="bento-grid"
      [class]="'bento-grid-' + gridSize"
      [style.grid-template-columns]="dynamicColumns"
      [attr.role]="'grid'"
      [attr.aria-label]="ariaLabel"
      #gridContainer
    >
      <arc-bento-grid-item
        *ngFor="let item of items; trackBy: trackByItemId"
        [item]="item"
        [isMobileSingleColumn]="shouldUseSingleColumn(item)"
        [attr.aria-describedby]="item.subtitle ? 'desc-' + item.id : null"
        arcAccessibleCard
        [cardTitle]="item.title"
        [cardDescription]="item.subtitle"
        [cardValue]="item.value"
        [cardType]="'dashboard-card'"
        [cardState]="getCardState(item)"
        [cardClickable]="item.clickable || false"
        [cardShortcuts]="getCardShortcuts(item)"
        [cardInstructions]="getCardInstructions(item)"
        (itemClick)="onItemClick($event)"
        (focus)="onItemFocus($event)"
        (blur)="onItemBlur($event)"
      />
    </div>
  `,
})
export class BentoGridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridContainer', { static: false })
  public gridContainer!: ElementRef;

  private readonly accessibilityService = inject(AccessibilityService);
  private readonly layoutService = inject(BentoGridLayoutService);
  private readonly destroy$ = new Subject<void>();
  private intersectionObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private debouncedCalculateColumns!: () => void;

  @Input() public items: BentoGridItem[] = [];
  @Input() public gridSize: 'compact' | 'default' | 'wide' = 'default';
  @Input() public ariaLabel = 'Dashboard grid';
  @Input() public onItemClickHandler?: (item: BentoGridItem) => void;
  @Input() public autoResize = true;
  @Input() public minColumnWidth = 250;
  @Input() public maxColumns?: number;

  public dynamicColumns = 'repeat(4, 1fr)';
  private _currentColumns = 4;

  public readonly trackByItemId: TrackByFunction<BentoGridItem> = (
    _index: number,
    item: BentoGridItem,
  ): string => item.id;

  public ngOnInit(): void {
    this.calculateOptimalGridColumns();
    this.debouncedCalculateColumns = this.layoutService.debounce(
      () => this.calculateOptimalGridColumns(),
      150,
    );
  }

  public ngAfterViewInit(): void {
    this.setupIntersectionObserver();
    if (this.autoResize) {
      this.setupGridResizing();
    }
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
    this.resizeObserver?.disconnect();
  }

  @HostListener('window:resize', ['$event'])
  public onWindowResize(_event: Event): void {
    if (this.autoResize) {
      this.debouncedCalculateColumns();
    }
  }

  public shouldUseSingleColumn(item: BentoGridItem): boolean {
    return (
      this.layoutService.shouldUseSingleColumn(
        this._currentColumns,
        item.size || 'medium',
      ) && (item.size === 'large' || item.size === 'wide' || item.size === 'feature')
    );
  }

  public getCardState(item: BentoGridItem): string {
    if (item.badge) return item.badge;
    if (item.trend?.type) return item.trend.type;
    return 'normal';
  }

  public getCardShortcuts(item: BentoGridItem): string[] {
    const shortcuts: string[] = [];
    if (item.clickable) {
      shortcuts.push('Enter or Space to activate');
    }
    if (item.action) {
      shortcuts.push(`${item.action.text} available`);
    }
    return shortcuts;
  }

  public getCardInstructions(item: BentoGridItem): string {
    if (item.clickable && item.action) {
      return `Card is clickable. Press Enter or Space to activate. ${item.action.text} action is available.`;
    }
    if (item.clickable) {
      return 'Card is clickable. Press Enter or Space to activate.';
    }
    if (item.action) {
      return `${item.action.text} action is available.`;
    }
    return '';
  }

  public onItemClick(item: BentoGridItem): void {
    if (item.clickable && this.onItemClickHandler) {
      this.onItemClickHandler(item);
      this.accessibilityService.announce(
        `Activated ${item.title}${item.subtitle ? ': ' + item.subtitle : ''}`,
        'polite',
      );
    }
  }

  public onItemFocus(event: Event): void {
    const item = (event as CustomEvent<BentoGridItem>).detail;
    if (item?.trend || item?.badge) {
      let announcement = `Focused on ${item.title}`;
      if (item.value) {
        announcement += `, current value ${item.value}`;
      }
      if (item.trend) {
        announcement += `, trend ${item.trend.type} ${item.trend.value}`;
      }
      if (item.badge) {
        announcement += `, status ${item.badge}`;
      }
      this.accessibilityService.announce(announcement, 'polite');
    }
  }

  public onItemBlur(_event: Event): void {
    // Optional blur handling
  }

  public recalculateGrid(): void {
    this.calculateOptimalGridColumns();
  }

  public get currentColumns(): number {
    return this._currentColumns;
  }

  private calculateOptimalGridColumns(): void {
    const config: BentoGridLayoutConfig = {
      gridSize: this.gridSize,
      minColumnWidth: this.minColumnWidth,
      maxColumns: this.maxColumns,
    };

    const result = this.gridContainer
      ? this.layoutService.calculateColumns(
          this.gridContainer.nativeElement.offsetWidth,
          config,
        )
      : this.layoutService.getDefaultLayout(config);

    if (result.columns !== this._currentColumns) {
      this._currentColumns = result.columns;
      this.dynamicColumns = result.gridTemplate;
      if (this.gridContainer) {
        this.gridContainer.nativeElement.style.gridTemplateColumns =
          result.gridTemplate;
      }
    }
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const scheduleAnimation = (callback: () => void): void => {
      if ('requestIdleCallback' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).requestIdleCallback(callback, { timeout: 100 });
      } else {
        setTimeout(callback, 0);
      }
    };

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        scheduleAnimation(() => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
              this.intersectionObserver?.unobserve(entry.target);
            }
          });
        });
      },
      { threshold: 0.1, rootMargin: '50px 0px' },
    );

    requestAnimationFrame(() => {
      const items =
        this.gridContainer?.nativeElement?.querySelectorAll('.bento-item');
      items?.forEach((item: Element) => this.intersectionObserver?.observe(item));
    });
  }

  private setupGridResizing(): void {
    if (!this.gridContainer || !('ResizeObserver' in window)) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.debouncedCalculateColumns();
    });

    this.resizeObserver.observe(this.gridContainer.nativeElement);
  }
}
