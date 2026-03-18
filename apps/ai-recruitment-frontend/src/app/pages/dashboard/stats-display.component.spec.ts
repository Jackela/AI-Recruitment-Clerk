import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { StatsDisplayComponent } from './stats-display.component';
import type { SystemHealth } from '../../services/dashboard-api.service';
import type { GuestStats } from './dashboard.service';

describe('StatsDisplayComponent', () => {
  let component: StatsDisplayComponent;
  let fixture: ComponentFixture<StatsDisplayComponent>;

  const mockSystemHealth: SystemHealth = {
    status: 'healthy',
    uptime: '99.9%',
  };

  const mockGuestStats: GuestStats = {
    totalAnalyses: 1000,
    todayAnalyses: 42,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with null values', () => {
      expect(component.systemHealth).toBeNull();
      expect(component.guestStats).toBeNull();
    });
  });

  describe('输入属性测试', () => {
    it('should accept systemHealth input', () => {
      component.systemHealth = mockSystemHealth;
      expect(component.systemHealth).toEqual(mockSystemHealth);
    });

    it('should accept guestStats input', () => {
      component.guestStats = mockGuestStats;
      expect(component.guestStats).toEqual(mockGuestStats);
    });
  });

  describe('渲染测试', () => {
    it('should render system health status', () => {
      component.systemHealth = mockSystemHealth;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('healthy');
      expect(compiled.textContent).toContain('99.9%');
    });

    it('should render guest stats', () => {
      component.guestStats = mockGuestStats;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('1000');
      expect(compiled.textContent).toContain('42');
    });

    it('should show placeholder when no data', () => {
      component.systemHealth = null;
      component.guestStats = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('加载中');
    });
  });
});
