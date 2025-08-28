import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit, inject, ChangeDetectionStrategy, OnDestroy, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibleCardDirective } from '../../../directives/accessibility/accessible-card.directive';
import { AccessibilityService } from '../../../services/accessibility/accessibility.service';
import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators'; // Reserved for future use

export interface BentoGridItem {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  value?: string | number;
  icon?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'error';
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'feature';
  clickable?: boolean;
  badge?: string;
  trend?: {
    type: 'up' | 'down' | 'neutral';
    value: string;
    period?: string;
  };
  action?: {
    text: string;
    onClick: () => void;
  };
  customTemplate?: any;
}

@Component({
  selector: 'app-bento-grid',
  standalone: true,
  imports: [CommonModule, AccessibleCardDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="bento-grid" 
      [class]="'bento-grid-' + gridSize"
      [attr.role]="'grid'"
      [attr.aria-label]="ariaLabel">
      <div 
        *ngFor="let item of items; trackBy: trackByItemId"
        class="bento-item"
        [class]="getItemClasses(item)"
        arcAccessibleCard
        [cardTitle]="item.title"
        [cardDescription]="item.subtitle"
        [cardValue]="item.value"
        [cardType]="'dashboard-card'"
        [cardState]="getCardState(item)"
        [cardClickable]="item.clickable || false"
        [cardShortcuts]="getCardShortcuts(item)"
        [cardInstructions]="getCardInstructions(item)"
        [attr.role]="'gridcell'"
        [attr.aria-label]="getItemAriaLabel(item)"
        [attr.tabindex]="item.clickable ? '0' : null"
        [attr.aria-describedby]="item.subtitle ? 'desc-' + item.id : null"
        [attr.aria-live]="item.value !== undefined ? 'polite' : null"
        (click)="onItemClick(item)"
        (keydown.enter)="onItemClick(item)"
        (keydown.space)="onItemClick(item)"
        (focus)="onItemFocus(item)"
        (blur)="onItemBlur(item)">
        
        <!-- Default Card Layout -->
        <ng-container *ngIf="!item.customTemplate">
          <!-- Header with Icon and Badge -->
          <div class="bento-header" *ngIf="item.icon || item.badge">
            <div class="bento-icon" *ngIf="item.icon" [attr.aria-hidden]="'true'">
              <ng-container [ngSwitch]="item.icon">
                <!-- Dashboard Icons -->
                <svg *ngSwitchCase="'dashboard'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                
                <!-- Jobs Icon -->
                <svg *ngSwitchCase="'jobs'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                
                <!-- Resumes Icon -->
                <svg *ngSwitchCase="'resumes'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                
                <!-- Reports Icon -->
                <svg *ngSwitchCase="'reports'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                
                <!-- Matches Icon -->
                <svg *ngSwitchCase="'matches'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                
                <!-- Analytics Icon -->
                <svg *ngSwitchCase="'analytics'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 21v-7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7h18z"></path>
                  <path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"></path>
                </svg>
                
                <!-- Activity Icon -->
                <svg *ngSwitchCase="'activity'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                
                <!-- Settings Icon -->
                <svg *ngSwitchCase="'settings'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </ng-container>
            </div>
            
            <div class="bento-badge" *ngIf="item.badge" [attr.aria-label]="'Status: ' + item.badge">
              {{ item.badge }}
            </div>
          </div>
          
          <!-- Content Area -->
          <div class="bento-content">
            <!-- Value Display for Stats Cards -->
            <div class="bento-value" *ngIf="item.value" [attr.aria-live]="'polite'">
              {{ item.value }}
            </div>
            
            <!-- Title -->
            <h3 class="bento-title" *ngIf="item.title">{{ item.title }}</h3>
            
            <!-- Subtitle -->
            <p class="bento-subtitle" *ngIf="item.subtitle" [id]="'desc-' + item.id">
              {{ item.subtitle }}
            </p>
            
            <!-- Additional Content -->
            <div class="bento-text" *ngIf="item.content" [innerHTML]="item.content"></div>
          </div>
          
          <!-- Footer with Trend and Action -->
          <div class="bento-footer" *ngIf="item.trend || item.action">
            <!-- Trend Indicator -->
            <div class="bento-trend" *ngIf="item.trend" [attr.aria-label]="getTrendAriaLabel(item.trend)">
              <span class="trend-indicator" [class]="'trend-' + item.trend.type">
                <svg *ngIf="item.trend.type === 'up'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                <svg *ngIf="item.trend.type === 'down'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
                <svg *ngIf="item.trend.type === 'neutral'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {{ item.trend.value }}
              </span>
              <span class="trend-period" *ngIf="item.trend.period">{{ item.trend.period }}</span>
            </div>
            
            <!-- Action Button -->
            <button 
              class="bento-action" 
              *ngIf="item.action"
              (click)="onActionClick(item, $event)"
              [attr.aria-label]="item.action.text">
              {{ item.action.text }}
            </button>
          </div>
        </ng-container>
        
        <!-- Custom Template -->
        <ng-container *ngIf="item.customTemplate">
          <ng-container *ngTemplateOutlet="item.customTemplate; context: { $implicit: item }"></ng-container>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .bento-grid {
      display: grid;
      gap: 1rem;
      width: 100%;
      padding: 0;
      
      /* Default Grid - 4 columns */
      &.bento-grid-default {
        grid-template-columns: repeat(4, 1fr);
        
        @media (max-width: 1200px) {
          grid-template-columns: repeat(3, 1fr);
        }
        
        @media (max-width: 768px) {
          grid-template-columns: repeat(2, 1fr);
        }
        
        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }
      }
      
      /* Compact Grid - 6 columns */
      &.bento-grid-compact {
        grid-template-columns: repeat(6, 1fr);
        gap: 0.75rem;
        
        @media (max-width: 1200px) {
          grid-template-columns: repeat(4, 1fr);
        }
        
        @media (max-width: 768px) {
          grid-template-columns: repeat(3, 1fr);
        }
        
        @media (max-width: 480px) {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      
      /* Wide Grid - 3 columns */
      &.bento-grid-wide {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        
        @media (max-width: 768px) {
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }
      }
    }
    
    .bento-item {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      
      /* Size Variants */
      &.size-small {
        grid-column: span 1;
        grid-row: span 1;
        min-height: 120px;
      }
      
      &.size-medium {
        grid-column: span 1;
        grid-row: span 1;
        min-height: 160px;
      }
      
      &.size-large {
        grid-column: span 2;
        grid-row: span 1;
        min-height: 160px;
      }
      
      &.size-wide {
        grid-column: span 2;
        grid-row: span 1;
        min-height: 200px;
      }
      
      &.size-tall {
        grid-column: span 1;
        grid-row: span 2;
        min-height: 300px;
      }
      
      &.size-feature {
        grid-column: span 2;
        grid-row: span 2;
        min-height: 300px;
      }
      
      /* Responsive Size Adjustments */
      @media (max-width: 768px) {
        &.size-large,
        &.size-wide,
        &.size-feature {
          grid-column: span 1;
        }
        
        &.size-tall,
        &.size-feature {
          grid-row: span 1;
          min-height: 160px;
        }
      }
      
      /* Variant Colors */
      &.variant-default {
        background: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        
        &:hover {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
      }
      
      &.variant-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.25);
        
        .bento-icon {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        &:hover {
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.35);
          transform: translateY(-4px);
        }
      }
      
      &.variant-success {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
        box-shadow: 0 4px 20px rgba(79, 172, 254, 0.25);
        
        .bento-icon {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        &:hover {
          box-shadow: 0 8px 30px rgba(79, 172, 254, 0.35);
          transform: translateY(-4px);
        }
      }
      
      &.variant-warning {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        color: white;
        box-shadow: 0 4px 20px rgba(250, 112, 154, 0.25);
        
        .bento-icon {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        &:hover {
          box-shadow: 0 8px 30px rgba(250, 112, 154, 0.35);
          transform: translateY(-4px);
        }
      }
      
      &.variant-info {
        background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        color: #2c3e50;
        box-shadow: 0 4px 20px rgba(168, 237, 234, 0.25);
        
        .bento-icon {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
        }
        
        &:hover {
          box-shadow: 0 8px 30px rgba(168, 237, 234, 0.35);
          transform: translateY(-4px);
        }
      }
      
      &.variant-error {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        box-shadow: 0 4px 20px rgba(255, 107, 107, 0.25);
        
        .bento-icon {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        &:hover {
          box-shadow: 0 8px 30px rgba(255, 107, 107, 0.35);
          transform: translateY(-4px);
        }
      }
      
      /* Clickable State */
      &.clickable {
        cursor: pointer;
        
        &:focus {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }
        
        &:active {
          transform: translateY(1px);
        }
      }
    }
    
    .bento-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    
    .bento-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
      flex-shrink: 0;
    }
    
    .bento-badge {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .bento-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .bento-value {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 0.25rem;
      
      .size-small & {
        font-size: 1.75rem;
      }
      
      .size-feature & {
        font-size: 3.5rem;
      }
    }
    
    .bento-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.4;
      
      .size-small & {
        font-size: 1rem;
      }
      
      .size-feature & {
        font-size: 1.5rem;
      }
    }
    
    .bento-subtitle {
      font-size: 0.875rem;
      opacity: 0.8;
      margin: 0;
      line-height: 1.5;
      
      .size-feature & {
        font-size: 1rem;
      }
    }
    
    .bento-text {
      font-size: 0.875rem;
      line-height: 1.6;
      opacity: 0.9;
    }
    
    .bento-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      gap: 1rem;
    }
    
    .bento-trend {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    
    .trend-indicator {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
      
      &.trend-up {
        color: #10b981;
      }
      
      &.trend-down {
        color: #ef4444;
      }
      
      &.trend-neutral {
        color: #6b7280;
      }
    }
    
    .trend-period {
      opacity: 0.7;
      font-size: 0.75rem;
    }
    
    .bento-action {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: inherit;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
      }
      
      .variant-default & {
        background: #f8f9fa;
        border-color: #e9ecef;
        color: #495057;
        
        &:hover {
          background: #e9ecef;
        }
      }
    }
    
    /* Animation for data updates */
    .bento-value,
    .bento-title,
    .bento-subtitle {
      animation: fadeInUp 0.5s ease-out;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class BentoGridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridElement', { static: false }) gridElement!: ElementRef;
  
  private accessibilityService = inject(AccessibilityService);
  private destroy$ = new Subject<void>();
  private intersectionObserver?: IntersectionObserver;
  
  @Input() items: BentoGridItem[] = [];
  @Input() gridSize: 'compact' | 'default' | 'wide' = 'default';
  @Input() ariaLabel = 'Dashboard grid';
  @Input() onItemClickHandler?: (item: BentoGridItem) => void;

  // Optimized trackBy function
  readonly trackByItemId: TrackByFunction<BentoGridItem> = (_index: number, item: BentoGridItem): string => {
    return item.id;
  };

  ngOnInit() {
    // Initialize any necessary data
  }

  ngAfterViewInit() {
    // Setup intersection observer for animations with debouncing
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cleanup intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  getItemClasses(item: BentoGridItem): string {
    const classes = [
      `size-${item.size || 'medium'}`,
      `variant-${item.variant || 'default'}`
    ];
    
    if (item.clickable) {
      classes.push('clickable');
    }
    
    return classes.join(' ');
  }

  getItemAriaLabel(item: BentoGridItem): string {
    let label = item.title;
    
    if (item.value) {
      label += `, value: ${item.value}`;
    }
    
    if (item.subtitle) {
      label += `, ${item.subtitle}`;
    }
    
    if (item.trend) {
      label += `, trend: ${item.trend.type} ${item.trend.value}`;
    }
    
    if (item.clickable) {
      label += ', clickable';
    }
    
    return label;
  }

  getTrendAriaLabel(trend: BentoGridItem['trend']): string {
    if (!trend) return '';
    
    const direction = trend.type === 'up' ? 'increased' : 
                     trend.type === 'down' ? 'decreased' : 'remained stable';
    
    return `Trend: ${direction} by ${trend.value}${trend.period ? ' ' + trend.period : ''}`;
  }

  onItemClick(item: BentoGridItem): void {
    if (item.clickable && this.onItemClickHandler) {
      this.onItemClickHandler(item);
      
      // Announce click action
      this.accessibilityService.announce(
        `Activated ${item.title}${item.subtitle ? ': ' + item.subtitle : ''}`,
        'polite'
      );
    }
  }

  onActionClick(item: BentoGridItem, event: Event): void {
    event.stopPropagation();
    if (item.action?.onClick) {
      item.action.onClick();
      
      // Announce action
      this.accessibilityService.announce(
        `${item.action.text} action completed`,
        'polite'
      );
    }
  }

  onItemFocus(item: BentoGridItem): void {
    // Announce focus for complex items
    if (item.trend || item.badge) {
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

  onItemBlur(_item: BentoGridItem): void {
    // Optional: Handle blur events if needed
  }

  getCardState(item: BentoGridItem): string {
    if (item.badge) return item.badge;
    if (item.trend?.type) return item.trend.type;
    return 'normal';
  }

  getCardShortcuts(item: BentoGridItem): string[] {
    const shortcuts: string[] = [];
    
    if (item.clickable) {
      shortcuts.push('Enter or Space to activate');
    }
    
    if (item.action) {
      shortcuts.push(`${item.action.text} available`);
    }
    
    return shortcuts;
  }

  getCardInstructions(item: BentoGridItem): string {
    if (item.clickable && item.action) {
      return `Card is clickable. Press Enter or Space to activate. ${item.action.text} action is available.`;
    } else if (item.clickable) {
      return 'Card is clickable. Press Enter or Space to activate.';
    } else if (item.action) {
      return `${item.action.text} action is available.`;
    }
    
    return '';
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    // Use requestIdleCallback for better performance
    const scheduleAnimation = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
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
              // Unobserve after animation starts for performance
              this.intersectionObserver?.unobserve(entry.target);
            }
          });
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px'
      }
    );

    // Use RAF to avoid blocking main thread
    requestAnimationFrame(() => {
      const items = this.gridElement?.nativeElement?.querySelectorAll('.bento-item');
      items?.forEach((item: Element) => this.intersectionObserver?.observe(item));
    });
  }
}