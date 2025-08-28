# AI 招聘助理 - 前端架构文档

## 1. 前端架构概览

### 1.1 技术栈

```typescript
// 核心框架
Angular 20.1          // 主框架
TypeScript 5.8        // 编程语言
RxJS 7.8             // 响应式编程
NgRx 19.2            // 状态管理

// UI框架和组件
Angular Material     // 基础UI组件
Bento Grid          // 现代网格布局系统
SCSS                // 样式预处理器

// 开发工具
Nx 21.3             // 单仓库管理工具
ESLint              // 代码检查
Prettier            // 代码格式化
Playwright          // E2E测试
Jest                // 单元测试
```

### 1.2 架构设计原则

1. **组件化设计**: 高度模块化的组件系统
2. **响应式编程**: 基于RxJS的数据流管理
3. **状态管理**: 集中化的NgRx状态管理
4. **类型安全**: 完整的TypeScript类型系统
5. **性能优化**: 懒加载和代码分割
6. **无障碍访问**: WCAG 2.1 AA标准兼容
7. **移动优先**: 响应式设计和渐进式Web应用

## 2. 项目结构

### 2.1 目录结构

```
apps/ai-recruitment-frontend/src/
├── app/
│   ├── components/           # 通用组件
│   │   ├── shared/          # 共享组件库
│   │   │   ├── bento-grid/  # Bento Grid组件
│   │   │   ├── dashboard-card/
│   │   │   ├── loading/
│   │   │   └── shared.module.ts
│   │   ├── layout/          # 布局组件
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── sidebar/
│   │   └── privacy/         # 隐私相关组件
│   ├── pages/               # 页面组件
│   │   ├── dashboard/       # 仪表板页面
│   │   │   ├── dashboard.component.ts
│   │   │   └── enhanced-dashboard.component.ts
│   │   ├── resume/          # 简历相关页面
│   │   ├── jobs/            # 职位管理页面
│   │   ├── reports/         # 报告页面
│   │   └── marketing/       # 营销页面
│   ├── services/            # 业务服务
│   │   ├── dashboard-api.service.ts
│   │   ├── guest/           # 访客相关服务
│   │   │   └── guest-api.service.ts
│   │   └── core/            # 核心服务
│   ├── store/               # NgRx状态管理
│   │   ├── actions/
│   │   ├── reducers/
│   │   ├── effects/
│   │   └── selectors/
│   ├── models/              # 数据模型
│   ├── guards/              # 路由守卫
│   ├── interceptors/        # HTTP拦截器
│   └── utils/               # 工具函数
├── assets/                  # 静态资源
│   ├── images/
│   ├── icons/
│   └── styles/
└── environments/            # 环境配置
```

### 2.2 模块设计

```typescript
// 主应用模块
@NgModule({
  imports: [
    // Angular核心模块
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(routes, {
      enableTracing: false,
      scrollPositionRestoration: 'top'
    }),
    
    // 状态管理
    StoreModule.forRoot(reducers),
    EffectsModule.forRoot(effects),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: !isDevMode()
    }),
    
    // UI组件库
    SharedModule,
    
    // 特性模块
    DashboardModule,
    ResumeModule,
    JobsModule,
    ReportsModule
  ],
  providers: [
    // HTTP拦截器
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    
    // 全局服务
    AuthService,
    ConfigService,
    LoggingService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

## 3. 核心组件设计

### 3.1 Bento Grid 组件系统

```typescript
// Bento Grid 接口定义
export interface BentoGridItem {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  value?: number | string;
  icon?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall';
  clickable?: boolean;
  badge?: string;
  trend?: {
    type: 'up' | 'down' | 'neutral';
    value: string;
    period: string;
  };
  action?: {
    text: string;
    onClick: () => void;
  };
}

// Bento Grid 组件
@Component({
  selector: 'app-bento-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bento-grid" [attr.aria-label]="ariaLabel">
      <div 
        *ngFor="let item of items; trackBy: trackByFn"
        class="bento-item"
        [class]="getItemClasses(item)"
        [attr.aria-label]="item.title + ': ' + (item.value || item.subtitle)"
        [attr.tabindex]="item.clickable ? 0 : -1"
        [attr.role]="item.clickable ? 'button' : 'gridcell'"
        (click)="onItemClick(item)"
        (keydown.enter)="onItemClick(item)"
        (keydown.space)="onItemClick(item)">
        
        <!-- 图标和徽章 -->
        <div class="bento-header">
          <div class="bento-icon" *ngIf="item.icon">
            <ng-container [ngSwitch]="item.icon">
              <!-- SVG图标 -->
            </ng-container>
          </div>
          <span class="bento-badge" *ngIf="item.badge">{{ item.badge }}</span>
        </div>
        
        <!-- 主要内容 -->
        <div class="bento-content">
          <h3 class="bento-title">{{ item.title }}</h3>
          <p class="bento-subtitle" *ngIf="item.subtitle">{{ item.subtitle }}</p>
          
          <!-- 数值显示 -->
          <div class="bento-value" *ngIf="item.value !== undefined">
            {{ formatValue(item.value) }}
          </div>
          
          <!-- 自定义内容 -->
          <div class="bento-custom-content" 
               *ngIf="item.content" 
               [innerHTML]="sanitizeHtml(item.content)">
          </div>
          
          <!-- 趋势指示器 -->
          <div class="bento-trend" *ngIf="item.trend">
            <span class="trend-indicator" [class]="'trend-' + item.trend.type">
              <span class="trend-arrow">{{ getTrendArrow(item.trend.type) }}</span>
              {{ item.trend.value }}
            </span>
            <span class="trend-period">{{ item.trend.period }}</span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="bento-action" *ngIf="item.action">
          <button type="button" 
                  class="action-button"
                  (click)="$event.stopPropagation(); item.action?.onClick()">
            {{ item.action.text }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./bento-grid.component.scss']
})
export class BentoGridComponent {
  @Input() items: BentoGridItem[] = [];
  @Input() gridSize: 'compact' | 'default' | 'large' = 'default';
  @Input() ariaLabel: string = 'Data grid';
  @Input() onItemClickHandler?: (item: BentoGridItem) => void;

  constructor(private sanitizer: DomSanitizer) {}

  trackByFn(index: number, item: BentoGridItem): string {
    return item.id;
  }

  getItemClasses(item: BentoGridItem): string {
    const classes = [
      'bento-item',
      `variant-${item.variant || 'default'}`,
      `size-${item.size || 'medium'}`
    ];
    
    if (item.clickable) {
      classes.push('clickable');
    }
    
    return classes.join(' ');
  }

  onItemClick(item: BentoGridItem): void {
    if (item.clickable && this.onItemClickHandler) {
      this.onItemClickHandler(item);
    }
  }

  formatValue(value: number | string): string {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getTrendArrow(type: string): string {
    switch (type) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  }
}
```

### 3.2 Enhanced Dashboard 组件

```typescript
// Enhanced Dashboard 组件
@Component({
  selector: 'app-enhanced-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, BentoGridComponent],
  template: `
    <div class="dashboard-container">
      <!-- 欢迎区域 -->
      <div class="welcome-section">
        <h1 class="welcome-title">AI 招聘助理 Dashboard</h1>
        <p class="welcome-subtitle">智能简历筛选，提升招聘效率</p>
        <div class="system-status" [class]="'status-' + (systemHealth$ | async)?.status">
          <span class="status-indicator"></span>
          系统状态: {{ getSystemStatusText((systemHealth$ | async)?.status) }}
        </div>
      </div>

      <!-- Bento Grid 仪表板 -->
      <app-bento-grid 
        [items]="(bentoItems$ | async) || []" 
        [gridSize]="'default'"
        [ariaLabel]="'招聘系统仪表板'"
        [onItemClickHandler]="onBentoItemClick.bind(this)">
      </app-bento-grid>

      <!-- 快速操作 -->
      <div class="quick-actions-section">
        <h2 class="section-title">快速操作</h2>
        <div class="actions-grid">
          <a routerLink="/resume" class="action-card primary">
            <div class="action-icon">...</div>
            <div class="action-content">
              <h3 class="action-title">上传简历分析</h3>
              <p class="action-description">立即上传简历进行AI智能分析</p>
            </div>
          </a>
          <!-- 其他快速操作 -->
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./enhanced-dashboard.component.scss']
})
export class EnhancedDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  stats$!: Observable<DashboardStats>;
  systemHealth$!: Observable<SystemHealth>;
  bentoItems$!: Observable<BentoGridItem[]>;
  
  constructor(
    private dashboardApi: DashboardApiService,
    private guestApi: GuestApiService
  ) {}

  ngOnInit() {
    this.initializeDataStreams();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeDataStreams() {
    // 实时数据流初始化
    this.stats$ = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.dashboardApi.getDashboardStats()),
      catchError(error => {
        console.error('Failed to load dashboard stats:', error);
        return of(this.getMockStats());
      }),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

    this.systemHealth$ = interval(10000).pipe(
      startWith(0),
      switchMap(() => this.dashboardApi.getSystemHealth()),
      catchError(error => {
        console.error('Failed to load system health:', error);
        return of(this.getMockHealth());
      }),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

    // 组合数据流创建Bento Grid项目
    this.bentoItems$ = combineLatest([
      this.stats$,
      this.systemHealth$,
      this.guestApi.getGuestStats().pipe(catchError(() => of(this.getMockGuestStats())))
    ]).pipe(
      map(([stats, health, guestStats]) => 
        this.createBentoItems(stats, health, guestStats)
      ),
      takeUntil(this.destroy$)
    );
  }

  private createBentoItems(
    stats: DashboardStats, 
    health: SystemHealth, 
    guestStats: any
  ): BentoGridItem[] {
    return [
      {
        id: 'total-jobs',
        title: '职位数量',
        subtitle: '当前活跃职位',
        value: stats.totalJobs,
        icon: 'jobs',
        variant: 'primary',
        size: 'medium',
        clickable: true
      },
      {
        id: 'total-resumes',
        title: '简历总数',
        subtitle: '已分析简历',
        value: stats.totalResumes,
        icon: 'resumes',
        variant: 'success',
        size: 'medium',
        trend: { type: 'up', value: '+12%', period: '本周' }
      },
      {
        id: 'system-health',
        title: '系统健康状态',
        subtitle: `响应时间: ${health.services.gateway.responseTime}ms`,
        content: this.getSystemHealthContent(health),
        icon: 'analytics',
        variant: 'success',
        size: 'large',
        badge: '正常'
      },
      {
        id: 'processing-metrics',
        title: '处理指标',
        subtitle: '实时处理状态',
        content: this.getProcessingMetricsContent(stats.serviceMetrics),
        icon: 'activity',
        variant: 'default',
        size: 'wide'
      },
      // 更多Bento项目...
    ];
  }

  onBentoItemClick(item: BentoGridItem): void {
    console.log('Clicked item:', item.id);
    // 处理点击事件
  }

  getSystemStatusText(status?: string): string {
    switch (status) {
      case 'healthy': return '正常';
      case 'warning': return '警告';
      case 'error': return '错误';
      default: return '未知';
    }
  }
}
```

## 4. 服务层架构

### 4.1 API服务设计

```typescript
// Dashboard API 服务
@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats`).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.baseUrl}/health`).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  getRecentActivity(limit: number = 10): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(
      `${this.baseUrl}/dashboard/activity?limit=${limit}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = '服务暂时不可用，请稍后重试';
    
    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      errorMessage = `网络错误: ${error.error.message}`;
    } else {
      // 服务器错误
      switch (error.status) {
        case 401:
          errorMessage = '未授权访问';
          break;
        case 403:
          errorMessage = '权限不足';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 429:
          errorMessage = '请求过于频繁，请稍后重试';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
```

### 4.2 访客服务设计

```typescript
// 访客API服务
@Injectable({
  providedIn: 'root'
})
export class GuestApiService {
  private readonly baseUrl = '/api/guest';

  constructor(
    private http: HttpClient,
    private deviceService: DeviceService
  ) {}

  // 开始简历分析
  analyzeResume(file: File, jobDescription?: string): Observable<AnalyzeResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deviceId', this.deviceService.getDeviceId());
    
    if (jobDescription) {
      formData.append('jobDescription', jobDescription);
    }

    return this.http.post<AnalyzeResumeResponse>(
      `${this.baseUrl}/resume/analyze`,
      formData
    ).pipe(
      catchError(this.handleUploadError)
    );
  }

  // 查询分析状态
  getAnalysisStatus(sessionId: string): Observable<AnalysisStatus> {
    return this.http.get<AnalysisStatus>(
      `${this.baseUrl}/resume/status/${sessionId}`
    );
  }

  // 获取分析结果
  getAnalysisResult(sessionId: string): Observable<AnalysisResult> {
    return this.http.get<AnalysisResult>(
      `${this.baseUrl}/resume/result/${sessionId}`
    );
  }

  // 生成反馈码
  generateFeedbackCode(sessionId: string): Observable<FeedbackCodeResponse> {
    return this.http.post<FeedbackCodeResponse>(
      `${this.baseUrl}/feedback/generate-code`,
      {
        sessionId,
        deviceId: this.deviceService.getDeviceId()
      }
    );
  }

  // 兑换反馈码
  redeemFeedbackCode(code: string): Observable<RedeemCodeResponse> {
    return this.http.post<RedeemCodeResponse>(
      `${this.baseUrl}/feedback/redeem`,
      {
        code,
        deviceId: this.deviceService.getDeviceId()
      }
    );
  }

  private handleUploadError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = '文件上传失败';
    
    if (error.status === 413) {
      errorMessage = '文件大小超过限制（最大10MB）';
    } else if (error.status === 415) {
      errorMessage = '不支持的文件格式（仅支持PDF、DOC、DOCX）';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
```

### 4.3 设备识别服务

```typescript
// 设备识别服务
@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private deviceId: string;

  constructor() {
    this.deviceId = this.generateOrRetrieveDeviceId();
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  private generateOrRetrieveDeviceId(): string {
    // 尝试从localStorage获取现有设备ID
    let deviceId = localStorage.getItem('ai-recruitment-device-id');
    
    if (!deviceId) {
      // 生成新的设备指纹
      deviceId = this.generateDeviceFingerprint();
      localStorage.setItem('ai-recruitment-device-id', deviceId);
    }
    
    return deviceId;
  }

  private generateDeviceFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '',
      navigator.platform
    ];
    
    const fingerprint = this.hashCode(components.join('|'));
    return `guest_${fingerprint.toString(36)}_${Date.now().toString(36)}`;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }
}
```

## 5. 状态管理

### 5.1 NgRx Store 设计

```typescript
// 应用状态接口
export interface AppState {
  dashboard: DashboardState;
  guest: GuestState;
  ui: UiState;
}

// 仪表板状态
export interface DashboardState {
  stats: DashboardStats | null;
  systemHealth: SystemHealth | null;
  recentActivity: ActivityItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// 访客状态
export interface GuestState {
  currentSession: GuestSession | null;
  analysisStatus: AnalysisStatus | null;
  analysisResult: AnalysisResult | null;
  feedbackCode: string | null;
  uploading: boolean;
  error: string | null;
}

// UI状态
export interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: Set<string>;
  notifications: Notification[];
}
```

### 5.2 Actions 定义

```typescript
// 仪表板Actions
export const DashboardActions = createActionGroup({
  source: 'Dashboard',
  events: {
    'Load Stats': emptyProps(),
    'Load Stats Success': props<{ stats: DashboardStats }>(),
    'Load Stats Failure': props<{ error: string }>(),
    
    'Load System Health': emptyProps(),
    'Load System Health Success': props<{ health: SystemHealth }>(),
    'Load System Health Failure': props<{ error: string }>(),
    
    'Load Recent Activity': props<{ limit?: number }>(),
    'Load Recent Activity Success': props<{ activities: ActivityItem[] }>(),
    'Load Recent Activity Failure': props<{ error: string }>(),
    
    'Refresh Dashboard': emptyProps()
  }
});

// 访客Actions
export const GuestActions = createActionGroup({
  source: 'Guest',
  events: {
    'Start Analysis': props<{ file: File; jobDescription?: string }>(),
    'Start Analysis Success': props<{ sessionId: string }>(),
    'Start Analysis Failure': props<{ error: string }>(),
    
    'Poll Status': props<{ sessionId: string }>(),
    'Poll Status Success': props<{ status: AnalysisStatus }>(),
    'Poll Status Failure': props<{ error: string }>(),
    
    'Load Result': props<{ sessionId: string }>(),
    'Load Result Success': props<{ result: AnalysisResult }>(),
    'Load Result Failure': props<{ error: string }>(),
    
    'Generate Feedback Code': props<{ sessionId: string }>(),
    'Generate Feedback Code Success': props<{ response: FeedbackCodeResponse }>(),
    'Generate Feedback Code Failure': props<{ error: string }>(),
    
    'Clear Session': emptyProps()
  }
});
```

### 5.3 Effects 实现

```typescript
// 仪表板Effects
@Injectable()
export class DashboardEffects {
  
  // 加载仪表板统计数据
  loadStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadStats),
      switchMap(() =>
        this.dashboardApi.getDashboardStats().pipe(
          map(stats => DashboardActions.loadStatsSuccess({ stats })),
          catchError(error => 
            of(DashboardActions.loadStatsFailure({ 
              error: error.message || '加载统计数据失败' 
            }))
          )
        )
      )
    )
  );

  // 自动刷新仪表板
  refreshDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.refreshDashboard),
      switchMap(() => [
        DashboardActions.loadStats(),
        DashboardActions.loadSystemHealth(),
        DashboardActions.loadRecentActivity()
      ])
    )
  );

  // 定期刷新系统健康状态
  autoRefreshHealth$ = createEffect(() =>
    timer(0, 30000).pipe(
      map(() => DashboardActions.loadSystemHealth())
    )
  );

  constructor(
    private actions$: Actions,
    private dashboardApi: DashboardApiService
  ) {}
}

// 访客Effects
@Injectable()
export class GuestEffects {
  
  // 开始分析
  startAnalysis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.startAnalysis),
      switchMap(({ file, jobDescription }) =>
        this.guestApi.analyzeResume(file, jobDescription).pipe(
          map(response => GuestActions.startAnalysisSuccess({ 
            sessionId: response.sessionId 
          })),
          catchError(error =>
            of(GuestActions.startAnalysisFailure({ 
              error: error.message || '分析启动失败' 
            }))
          )
        )
      )
    )
  );

  // 轮询状态
  pollStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.pollStatus),
      switchMap(({ sessionId }) =>
        timer(0, 2000).pipe(
          switchMap(() => this.guestApi.getAnalysisStatus(sessionId)),
          map(status => GuestActions.pollStatusSuccess({ status })),
          takeWhile(status => 
            status.status === 'pending' || status.status === 'processing'
          ),
          catchError(error =>
            of(GuestActions.pollStatusFailure({ 
              error: error.message || '状态查询失败' 
            }))
          )
        )
      )
    )
  );

  // 分析完成后自动加载结果
  loadResultOnComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GuestActions.pollStatusSuccess),
      filter(({ status }) => status.status === 'completed'),
      map(({ status }) => GuestActions.loadResult({ 
        sessionId: status.sessionId 
      }))
    )
  );

  constructor(
    private actions$: Actions,
    private guestApi: GuestApiService
  ) {}
}
```

### 5.4 Selectors 定义

```typescript
// 仪表板Selectors
export const selectDashboardState = createFeatureSelector<DashboardState>('dashboard');

export const selectDashboardStats = createSelector(
  selectDashboardState,
  state => state.stats
);

export const selectSystemHealth = createSelector(
  selectDashboardState,
  state => state.systemHealth
);

export const selectDashboardLoading = createSelector(
  selectDashboardState,
  state => state.loading
);

export const selectDashboardError = createSelector(
  selectDashboardState,
  state => state.error
);

// 组合选择器
export const selectDashboardViewModel = createSelector(
  selectDashboardStats,
  selectSystemHealth,
  selectDashboardLoading,
  selectDashboardError,
  (stats, health, loading, error) => ({
    stats,
    health,
    loading,
    error,
    hasData: stats !== null && health !== null
  })
);

// 访客Selectors
export const selectGuestState = createFeatureSelector<GuestState>('guest');

export const selectCurrentSession = createSelector(
  selectGuestState,
  state => state.currentSession
);

export const selectAnalysisStatus = createSelector(
  selectGuestState,
  state => state.analysisStatus
);

export const selectAnalysisResult = createSelector(
  selectGuestState,
  state => state.analysisResult
);

export const selectGuestUploading = createSelector(
  selectGuestState,
  state => state.uploading
);
```

## 6. 路由和导航

### 6.1 路由配置

```typescript
// 主路由配置
const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./pages/dashboard/enhanced-dashboard.component')
        .then(m => m.EnhancedDashboardComponent),
    title: 'AI 招聘助理 - 仪表板'
  },
  {
    path: 'resume',
    loadChildren: () => 
      import('./pages/resume/resume.routes')
        .then(m => m.resumeRoutes),
    title: 'AI 招聘助理 - 简历分析'
  },
  {
    path: 'jobs',
    loadChildren: () => 
      import('./pages/jobs/jobs.routes')
        .then(m => m.jobsRoutes),
    canActivate: [AuthGuard],
    title: 'AI 招聘助理 - 职位管理'
  },
  {
    path: 'reports',
    loadChildren: () => 
      import('./pages/reports/reports.routes')
        .then(m => m.reportsRoutes),
    title: 'AI 招聘助理 - 分析报告'
  },
  {
    path: '**',
    loadComponent: () => 
      import('./pages/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
    title: 'AI 招聘助理 - 页面未找到'
  }
];

// 简历分析子路由
export const resumeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./upload-resume.component')
        .then(m => m.UploadResumeComponent)
  },
  {
    path: 'analysis/:sessionId',
    loadComponent: () => 
      import('./analysis-progress.component')
        .then(m => m.AnalysisProgressComponent)
  },
  {
    path: 'result/:sessionId',
    loadComponent: () => 
      import('./analysis-result.component')
        .then(m => m.AnalysisResultComponent)
  }
];
```

### 6.2 路由守卫

```typescript
// 认证守卫
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    this.router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}

// 访客会话守卫
@Injectable({
  providedIn: 'root'
})
export class GuestSessionGuard implements CanActivate {
  constructor(
    private store: Store,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const sessionId = route.paramMap.get('sessionId');
    
    if (!sessionId) {
      this.router.navigate(['/resume']);
      return of(false);
    }

    return this.store.select(selectCurrentSession).pipe(
      map(session => {
        if (session?.sessionId === sessionId) {
          return true;
        }
        this.router.navigate(['/resume']);
        return false;
      })
    );
  }
}
```

## 7. 样式系统

### 7.1 SCSS 架构

```scss
// styles/main.scss - 主样式文件
@import 'variables';
@import 'mixins';
@import 'base';
@import 'components';
@import 'utilities';

// styles/_variables.scss - 设计令牌
:root {
  // 颜色系统
  --color-primary: #667eea;
  --color-primary-dark: #5a6fd8;
  --color-secondary: #764ba2;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  // 中性色
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  // 间距系统
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  
  // 字体系统
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  
  // 边框圆角
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  --border-radius-xl: 1rem;
  --border-radius-2xl: 1.5rem;
  
  // 阴影
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  // 动画时长
  --transition-fast: 150ms;
  --transition-normal: 250ms;
  --transition-slow: 350ms;
}

// 暗色主题
[data-theme="dark"] {
  --color-primary: #818cf8;
  --color-background: var(--color-gray-900);
  --color-surface: var(--color-gray-800);
  --color-text: var(--color-gray-100);
  --color-text-secondary: var(--color-gray-300);
}
```

### 7.2 Bento Grid 样式

```scss
// bento-grid.component.scss
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(12, 1fr);
    gap: var(--spacing-xl);
  }
}

.bento-item {
  background: white;
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  transition: all var(--transition-normal) cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  // 尺寸变体
  &.size-small {
    grid-column: span 3;
    grid-row: span 1;
  }
  
  &.size-medium {
    grid-column: span 4;
    grid-row: span 1;
  }
  
  &.size-large {
    grid-column: span 6;
    grid-row: span 2;
  }
  
  &.size-wide {
    grid-column: span 8;
    grid-row: span 1;
  }
  
  &.size-tall {
    grid-column: span 4;
    grid-row: span 3;
  }
  
  // 可点击状态
  &.clickable {
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    
    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: var(--shadow-md);
    }
  }
  
  // 颜色变体
  &.variant-primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white;
    
    .bento-title, .bento-subtitle {
      color: white;
    }
  }
  
  &.variant-success {
    border-left: 4px solid var(--color-success);
    
    .bento-value {
      color: var(--color-success);
    }
  }
  
  &.variant-warning {
    border-left: 4px solid var(--color-warning);
    
    .bento-value {
      color: var(--color-warning);
    }
  }
  
  &.variant-error {
    border-left: 4px solid var(--color-error);
    
    .bento-value {
      color: var(--color-error);
    }
  }
  
  // 响应式布局
  @media (max-width: 767px) {
    &[class*="size-"] {
      grid-column: span 1;
      grid-row: span 1;
    }
  }
}

.bento-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.bento-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  background: var(--color-gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-600);
  
  svg {
    width: 24px;
    height: 24px;
  }
}

.bento-badge {
  background: var(--color-success);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bento-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0 0 var(--spacing-xs) 0;
}

.bento-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
  margin: 0 0 var(--spacing-md) 0;
}

.bento-value {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-sm);
}

.bento-trend {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  
  .trend-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 600;
    
    &.trend-up {
      color: var(--color-success);
    }
    
    &.trend-down {
      color: var(--color-error);
    }
    
    &.trend-neutral {
      color: var(--color-gray-500);
    }
  }
  
  .trend-period {
    color: var(--color-gray-500);
  }
}

.bento-action {
  margin-top: var(--spacing-md);
  
  .action-button {
    background: var(--color-primary);
    color: white;
    border: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--transition-fast);
    
    &:hover {
      background: var(--color-primary-dark);
    }
    
    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }
}
```

## 8. 性能优化策略

### 8.1 懒加载和代码分割

```typescript
// 路由级懒加载
const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./pages/dashboard/enhanced-dashboard.component')
        .then(m => m.EnhancedDashboardComponent)
  },
  {
    path: 'resume',
    loadChildren: () => 
      import('./pages/resume/resume.routes')
        .then(m => m.resumeRoutes)
  }
];

// 组件级懒加载
@Component({
  template: `
    <div>
      <ng-container *ngIf="showChart">
        <app-chart [data]="chartData"></app-chart>
      </ng-container>
    </div>
  `
})
export class DashboardComponent {
  private chartComponent$ = defer(() => 
    import('./chart/chart.component').then(m => m.ChartComponent)
  );
  
  async loadChart() {
    const { ChartComponent } = await import('./chart/chart.component');
    // 动态加载组件
  }
}
```

### 8.2 数据缓存和优化

```typescript
// HTTP拦截器缓存
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, HttpResponse<any>>();
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next.handle(req);
    }
    
    const cachedResponse = this.cache.get(req.url);
    if (cachedResponse) {
      return of(cachedResponse);
    }
    
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cache.set(req.url, event);
          
          // 5分钟后清除缓存
          setTimeout(() => {
            this.cache.delete(req.url);
          }, 5 * 60 * 1000);
        }
      })
    );
  }
}

// 组件级缓存
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  // 使用信号进行细粒度响应式更新
  stats = signal<DashboardStats | null>(null);
  loading = signal(false);
  
  // 计算属性
  totalItems = computed(() => {
    const currentStats = this.stats();
    return currentStats 
      ? currentStats.totalJobs + currentStats.totalResumes 
      : 0;
  });
  
  // 使用OnPush策略和TrackBy函数
  trackByItemId(index: number, item: BentoGridItem): string {
    return item.id;
  }
}
```

### 8.3 虚拟滚动和分页

```typescript
// 虚拟滚动组件
@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="80" class="viewport">
      <div *cdkVirtualFor="let item of items; trackBy: trackByFn" class="item">
        {{ item.title }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
export class VirtualScrollComponent {
  items = signal<any[]>([]);
  
  trackByFn(index: number, item: any): string {
    return item.id;
  }
}

// 分页服务
@Injectable()
export class PaginationService {
  getPage<T>(items: T[], page: number, pageSize: number): T[] {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }
  
  getTotalPages(totalItems: number, pageSize: number): number {
    return Math.ceil(totalItems / pageSize);
  }
}
```

## 9. 测试策略

### 9.1 单元测试

```typescript
// Bento Grid 组件测试
describe('BentoGridComponent', () => {
  let component: BentoGridComponent;
  let fixture: ComponentFixture<BentoGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoGridComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BentoGridComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render items correctly', () => {
    const mockItems: BentoGridItem[] = [
      {
        id: 'test-1',
        title: 'Test Item',
        subtitle: 'Test Subtitle',
        value: 100,
        variant: 'primary',
        size: 'medium'
      }
    ];

    component.items = mockItems;
    fixture.detectChanges();

    const itemElements = fixture.debugElement.queryAll(By.css('.bento-item'));
    expect(itemElements.length).toBe(1);
    
    const titleElement = fixture.debugElement.query(By.css('.bento-title'));
    expect(titleElement.nativeElement.textContent).toBe('Test Item');
  });

  it('should handle click events', () => {
    const mockClickHandler = jasmine.createSpy('clickHandler');
    const mockItem: BentoGridItem = {
      id: 'clickable-item',
      title: 'Clickable Item',
      clickable: true
    };

    component.items = [mockItem];
    component.onItemClickHandler = mockClickHandler;
    fixture.detectChanges();

    const itemElement = fixture.debugElement.query(By.css('.bento-item'));
    itemElement.triggerEventHandler('click', null);

    expect(mockClickHandler).toHaveBeenCalledWith(mockItem);
  });
});

// 服务测试
describe('DashboardApiService', () => {
  let service: DashboardApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardApiService]
    });

    service = TestBed.inject(DashboardApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch dashboard stats', () => {
    const mockStats: DashboardStats = {
      totalJobs: 10,
      totalResumes: 50,
      totalReports: 25,
      activeMatches: 15,
      systemHealth: { status: 'healthy', uptime: '99.9%', responseTime: 120 },
      recentActivity: [],
      serviceMetrics: {
        analysisInProgress: 5,
        completedToday: 20,
        averageProcessingTime: '2.5分钟',
        successRate: 0.95
      }
    };

    service.getDashboardStats().subscribe(stats => {
      expect(stats).toEqual(mockStats);
    });

    const req = httpMock.expectOne('/api/dashboard/stats');
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });
});
```

### 9.2 E2E测试

```typescript
// Playwright E2E测试
import { test, expect } from '@playwright/test';

test.describe('Enhanced Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display welcome section', async ({ page }) => {
    await expect(page.locator('h1.welcome-title')).toHaveText('AI 招聘助理 Dashboard');
    await expect(page.locator('p.welcome-subtitle')).toHaveText('智能简历筛选，提升招聘效率');
    await expect(page.locator('.system-status')).toBeVisible();
  });

  test('should render Bento Grid items', async ({ page }) => {
    await page.waitForSelector('app-bento-grid');
    
    const bentoItems = page.locator('.bento-item');
    await expect(bentoItems).toHaveCount(8);
    
    // 检查特定卡片
    await expect(page.locator('[aria-label*="职位数量"]')).toBeVisible();
    await expect(page.locator('[aria-label*="简历总数"]')).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    await expect(page.locator('.quick-actions-section h2')).toHaveText('快速操作');
    
    const actionCards = page.locator('.action-card');
    await expect(actionCards).toHaveCountGreaterThan(3);
    
    // 测试主要操作按钮
    const uploadButton = page.locator('a[routerLink="/resume"].primary');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton.locator('.action-title')).toHaveText('上传简历分析');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('.dashboard-container')).toBeVisible();
    await expect(page.locator('.welcome-section')).toBeVisible();
    
    // 检查移动端布局
    const actionsGrid = page.locator('.actions-grid');
    await expect(actionsGrid).toBeVisible();
  });

  test('should handle Bento item interactions', async ({ page }) => {
    await page.waitForSelector('app-bento-grid');
    
    const clickableItem = page.locator('.bento-item.clickable').first();
    if (await clickableItem.count() > 0) {
      await clickableItem.click();
      // 验证点击不会导致错误
      await page.waitForTimeout(500);
    }
  });
});
```

## 10. 无障碍访问

### 10.1 ARIA标签和语义化

```typescript
// 无障碍访问组件示例
@Component({
  template: `
    <div class="dashboard" 
         role="main" 
         aria-label="招聘助理仪表板">
      
      <!-- 跳转链接 -->
      <a class="skip-link" href="#main-content">跳转到主要内容</a>
      
      <!-- 页面标题 -->
      <h1 id="page-title">AI 招聘助理 Dashboard</h1>
      
      <!-- 实时状态更新 -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        {{ statusAnnouncement }}
      </div>
      
      <!-- Bento Grid -->
      <app-bento-grid 
        [items]="items"
        [ariaLabel]="'数据概览网格'"
        role="grid">
      </app-bento-grid>
    </div>
  `
})
export class AccessibleDashboardComponent {
  statusAnnouncement = '';
  
  announceStatusChange(message: string) {
    this.statusAnnouncement = message;
    // 清除消息以便下次更新
    setTimeout(() => {
      this.statusAnnouncement = '';
    }, 1000);
  }
}
```

### 10.2 键盘导航

```typescript
// 键盘导航指令
@Directive({
  selector: '[appKeyboardNav]'
})
export class KeyboardNavigationDirective {
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        this.moveFocus('up');
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.moveFocus('down');
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.moveFocus('left');
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.moveFocus('right');
        event.preventDefault();
        break;
      case 'Home':
        this.moveFocus('first');
        event.preventDefault();
        break;
      case 'End':
        this.moveFocus('last');
        event.preventDefault();
        break;
    }
  }
  
  private moveFocus(direction: string) {
    // 实现焦点移动逻辑
  }
}
```

---

*该前端架构文档将随着系统发展持续更新和完善。*

*最后更新: 2025-08-17*
*版本: v1.0*