import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize stats$ observable', () => {
      expect(component.stats$).toBeDefined();
    });
  });

  describe('数据加载测试', () => {
    it('should load dashboard data on init', () => {
      component.ngOnInit();

      component.stats$.subscribe((stats) => {
        expect(stats).toBeDefined();
        expect(stats.totalJobs).toBeGreaterThanOrEqual(0);
        expect(stats.totalResumes).toBeGreaterThanOrEqual(0);
        expect(stats.totalReports).toBeGreaterThanOrEqual(0);
        expect(stats.activeMatches).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have recent activity list', (done) => {
      component.stats$.subscribe((stats) => {
        expect(stats.recentActivity).toBeDefined();
        expect(Array.isArray(stats.recentActivity)).toBe(true);
        done();
      });
    });
  });

  describe('trackBy方法测试', () => {
    it('should track activities by id', () => {
      const activity = {
        id: 'test-123',
        type: 'job-created' as const,
        title: '创建新职位',
        description: '测试描述',
        timestamp: new Date(),
      };

      expect(component.trackByActivityId(0, activity)).toBe('test-123');
    });
  });

  describe('状态文本转换测试', () => {
    it('should return correct status text for processing', () => {
      expect(component.getStatusText('processing')).toBe('处理中');
    });

    it('should return correct status text for completed', () => {
      expect(component.getStatusText('completed')).toBe('已完成');
    });

    it('should return correct status text for failed', () => {
      expect(component.getStatusText('failed')).toBe('失败');
    });

    it('should return original status for unknown values', () => {
      expect(component.getStatusText('unknown')).toBe('unknown');
    });
  });

  describe('渲染测试', () => {
    it('should render dashboard title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('欢迎使用 AI 招聘助理');
    });

    it('should render stats section', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.stats-section')).toBeTruthy();
    });

    it('should render quick actions section', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.quick-actions-section')).toBeTruthy();
    });

    it('should render recent activity section', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.recent-activity-section')).toBeTruthy();
    });

    it('should render correct number of action cards', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const actionCards = compiled.querySelectorAll('.action-card');
      expect(actionCards.length).toBe(3);
    });
  });
});
