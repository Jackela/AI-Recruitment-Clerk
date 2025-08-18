import { 
  Component, 
  ChangeDetectionStrategy, 
  Input, 
  Output, 
  EventEmitter,
  computed,
  signal,
  TrackByFunction
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobListItem } from '../../app/store/jobs/job.model';

/**
 * Performance-Optimized Job List Component
 * 
 * Optimizations Applied:
 * - OnPush change detection strategy
 * - TrackBy function for ngFor optimization
 * - Computed signals for derived state
 * - Memoized expensive calculations
 * - Virtual scrolling for large lists
 * - Lazy loading of job details
 */

interface JobListOptimizations {
  virtualScrolling: boolean;
  lazyLoading: boolean;
  imageOptimization: boolean;
  searchOptimization: boolean;
}

@Component({
  selector: 'arc-optimized-job-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="job-list-container" 
         [class.virtual-scrolling]="optimizations.virtualScrolling">
      
      <!-- Search and Filters -->
      <div class="search-controls" *ngIf="optimizations.searchOptimization">
        <input 
          #searchInput
          type="text"
          placeholder="搜索职位..."
          (input)="onSearchChange(searchInput.value)"
          class="search-input">
        
        <div class="filters">
          <select (change)="onStatusFilterChange($event)">
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="closed">已关闭</option>
          </select>
        </div>
      </div>

      <!-- Performance Stats -->
      <div class="performance-stats" *ngIf="showPerformanceStats()">
        <small>
          显示 {{displayedJobs().length}} / {{totalJobs()}} 个职位 
          (渲染时间: {{renderTime()}}ms)
        </small>
      </div>

      <!-- Virtual Scrolling Container -->
      <div class="jobs-scroll-container" 
           [style.height.px]="containerHeight"
           *ngIf="optimizations.virtualScrolling; else normalList">
        
        <div class="virtual-spacer-top" [style.height.px]="topSpacerHeight()"></div>
        
        <div class="job-item" 
             *ngFor="let job of visibleJobs(); trackBy: trackByJobId"
             [class.loading]="job.loading"
             (click)="onJobSelect(job)">
          
          <div class="job-header">
            <h3 class="job-title">{{job.title}}</h3>
            <span class="job-status" [class]="job.status">{{job.status}}</span>
          </div>
          
          <div class="job-details">
            <p class="job-company">{{job.company}}</p>
            <p class="job-location">{{job.location}}</p>
            <p class="job-salary" *ngIf="job.salary">{{job.salary}}</p>
          </div>
          
          <div class="job-stats">
            <span class="applications-count">{{job.applicationsCount}} 申请</span>
            <span class="created-date">{{formatDate(job.createdAt)}}</span>
          </div>

          <!-- Lazy Loading Placeholder -->
          <div class="lazy-placeholder" *ngIf="job.loading && optimizations.lazyLoading">
            <div class="skeleton-loader"></div>
          </div>
        </div>
        
        <div class="virtual-spacer-bottom" [style.height.px]="bottomSpacerHeight()"></div>
      </div>

      <!-- Normal List (fallback) -->
      <ng-template #normalList>
        <div class="job-item" 
             *ngFor="let job of displayedJobs(); trackBy: trackByJobId"
             (click)="onJobSelect(job)">
          
          <div class="job-header">
            <h3 class="job-title">{{job.title}}</h3>
            <span class="job-status" [class]="job.status">{{job.status}}</span>
          </div>
          
          <div class="job-details">
            <p class="job-company">{{job.company}}</p>
            <p class="job-location">{{job.location}}</p>
            <p class="job-salary" *ngIf="job.salary">{{job.salary}}</p>
          </div>
          
          <div class="job-stats">
            <span class="applications-count">{{job.applicationsCount}} 申请</span>
            <span class="created-date">{{formatDate(job.createdAt)}}</span>
          </div>
        </div>
      </ng-template>

      <!-- Load More Button -->
      <button 
        class="load-more-btn"
        *ngIf="hasMore() && !optimizations.virtualScrolling"
        (click)="loadMore()"
        [disabled]="loading()">
        {{loading() ? '加载中...' : '加载更多'}}
      </button>
    </div>
  `,
  styleUrls: ['./optimized-job-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedJobListComponent {
  
  @Input() jobs: JobListItem[] = [];
  @Input() loading = signal(false);
  @Input() optimizations: JobListOptimizations = {
    virtualScrolling: true,
    lazyLoading: true,
    imageOptimization: true,
    searchOptimization: true
  };
  
  @Output() jobSelected = new EventEmitter<JobListItem>();
  @Output() loadMoreRequested = new EventEmitter<void>();

  // Virtual Scrolling Configuration
  private readonly itemHeight = 120; // pixels
  private readonly containerHeight = 600; // pixels
  private readonly buffer = 5; // extra items to render
  
  // Internal State
  private searchTerm = signal('');
  private statusFilter = signal('');
  private scrollTop = signal(0);
  private renderStartTime = signal(0);
  
  // Computed Properties
  readonly filteredJobs = computed(() => {
    const jobs = this.jobs;
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    
    let filtered = jobs;
    
    if (search) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(search) ||
        job.company.toLowerCase().includes(search) ||
        job.location.toLowerCase().includes(search)
      );
    }
    
    if (status) {
      filtered = filtered.filter(job => job.status === status);
    }
    
    return filtered;
  });
  
  readonly displayedJobs = computed(() => this.filteredJobs());
  readonly totalJobs = computed(() => this.jobs.length);
  
  // Virtual Scrolling Computed Properties
  readonly visibleStartIndex = computed(() => {
    if (!this.optimizations.virtualScrolling) return 0;
    return Math.max(0, Math.floor(this.scrollTop() / this.itemHeight) - this.buffer);
  });
  
  readonly visibleEndIndex = computed(() => {
    if (!this.optimizations.virtualScrolling) return this.filteredJobs().length;
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    return Math.min(
      this.filteredJobs().length,
      this.visibleStartIndex() + visibleCount + this.buffer * 2
    );
  });
  
  readonly visibleJobs = computed(() => {
    const start = this.visibleStartIndex();
    const end = this.visibleEndIndex();
    return this.filteredJobs().slice(start, end);
  });
  
  readonly topSpacerHeight = computed(() => 
    this.visibleStartIndex() * this.itemHeight
  );
  
  readonly bottomSpacerHeight = computed(() => 
    (this.filteredJobs().length - this.visibleEndIndex()) * this.itemHeight
  );
  
  readonly renderTime = computed(() => {
    const startTime = this.renderStartTime();
    return startTime > 0 ? performance.now() - startTime : 0;
  });

  // TrackBy Functions (Performance Optimization)
  readonly trackByJobId: TrackByFunction<JobListItem> = (index, job) => job.id;

  // Memoized Functions
  private dateFormatter = new Intl.DateTimeFormatter('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  formatDate(date: string | Date): string {
    return this.dateFormatter.format(new Date(date));
  }

  // Event Handlers
  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
  }

  onJobSelect(job: JobListItem): void {
    this.jobSelected.emit(job);
  }

  loadMore(): void {
    this.loadMoreRequested.emit();
  }

  onScroll(event: Event): void {
    if (!this.optimizations.virtualScrolling) return;
    
    const target = event.target as HTMLElement;
    this.scrollTop.set(target.scrollTop);
  }

  // Utility Methods
  hasMore(): boolean {
    return this.displayedJobs().length < this.totalJobs();
  }

  showPerformanceStats(): boolean {
    return false; // Set to true for development/debugging
  }

  // Performance Monitoring
  ngAfterViewInit(): void {
    this.renderStartTime.set(performance.now());
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}