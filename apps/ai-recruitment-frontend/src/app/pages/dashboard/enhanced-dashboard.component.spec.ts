import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { EnhancedDashboardComponent } from './enhanced-dashboard.component';
import { DashboardService } from './dashboard.service';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import type { BentoGridItem } from '../../components/shared/bento-grid/bento-grid-item.component';
import type {
  DashboardStats,
  SystemHealth,
} from '../../services/dashboard-api.service';
import type { GuestStats } from './dashboard.service';

describe('EnhancedDashboardComponent', () => {
  let component: EnhancedDashboardComponent;
  let fixture: ComponentFixture<EnhancedDashboardComponent>;
  let mockDashboardService: jest.Mocked<DashboardService>;

  const mockStats: DashboardStats = {
    totalJobs: 12,
    totalResumes: 156,
    totalReports: 89,
    activeMatches: 23,
  };

  const mockSystemHealth: SystemHealth = {
    status: 'healthy',
    uptime: '99.9%',
  };

  const mockGuestStats: GuestStats = {
    totalAnalyses: 1000,
    todayAnalyses: 42,
  };

  const mockBentoItems: BentoGridItem[] = [
    { id: '1', title: 'Item 1', content: 'Content 1' },
    { id: '2', title: 'Item 2', content: 'Content 2' },
  ];

  beforeEach(async () => {
    mockDashboardService = {
      initializeDataStreams: jest.fn().mockReturnValue({
        stats$: of(mockStats),
        systemHealth$: of(mockSystemHealth),
        bentoItems$: of(mockBentoItems),
        guestStats$: of(mockGuestStats),
      }),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<DashboardService>;

    await TestBed.configureTestingModule({
      imports: [EnhancedDashboardComponent],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EnhancedDashboardComponent);
    component = fixture.componentInstance;
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize data streams on init', () => {
      component.ngOnInit();
      expect(mockDashboardService.initializeDataStreams).toHaveBeenCalled();
    });

    it('should assign observables after init', () => {
      component.ngOnInit();
      expect(component.stats$).toBeDefined();
      expect(component.systemHealth$).toBeDefined();
      expect(component.bentoItems$).toBeDefined();
      expect(component.guestStats$).toBeDefined();
    });
  });

  describe('数据流测试', () => {
    it('should emit stats data', async () => {
      component.ngOnInit();
      const stats = await component.stats$.pipe(take(1)).toPromise();
      expect(stats).toEqual(mockStats);
    });

    it('should emit system health data', async () => {
      component.ngOnInit();
      const health = await component.systemHealth$.pipe(take(1)).toPromise();
      expect(health).toEqual(mockSystemHealth);
    });

    it('should emit bento items data', async () => {
      component.ngOnInit();
      const items = await component.bentoItems$.pipe(take(1)).toPromise();
      expect(items).toEqual(mockBentoItems);
    });

    it('should emit guest stats data', async () => {
      component.ngOnInit();
      const stats = await component.guestStats$.pipe(take(1)).toPromise();
      expect(stats).toEqual(mockGuestStats);
    });
  });

  describe('生命周期测试', () => {
    it('should destroy service on component destroy', () => {
      component.ngOnInit();
      component.ngOnDestroy();
      expect(mockDashboardService.destroy).toHaveBeenCalled();
    });
  });

  describe('Bento网格交互测试', () => {
    it('should handle bento item click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const item: BentoGridItem = {
        id: 'test-id',
        title: 'Test',
        content: 'Content',
      };

      component.onBentoItemClick(item);

      expect(consoleSpy).toHaveBeenCalledWith('Bento item clicked:', 'test-id');
      consoleSpy.mockRestore();
    });
  });

  describe('渲染测试', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should render dashboard title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('AI 招聘助理 Dashboard');
    });

    it('should render welcome subtitle', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('智能简历筛选，提升招聘效率');
    });

    it('should render quick actions section', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.quick-actions-section')).toBeTruthy();
    });

    it('should render correct number of action cards', () => {
      const compiled = fixture.nativeElement;
      const actionCards = compiled.querySelectorAll('.action-card');
      expect(actionCards.length).toBe(4);
    });

    it('should render bento grid component', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('arc-bento-grid')).toBeTruthy();
    });
  });
});
