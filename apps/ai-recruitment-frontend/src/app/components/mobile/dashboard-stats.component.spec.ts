import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DashboardStatsComponent,
  DashboardStat,
  StatChange,
} from './dashboard-stats.component';

describe('DashboardStatsComponent', () => {
  let component: DashboardStatsComponent;
  let fixture: ComponentFixture<DashboardStatsComponent>;

  const mockChange: StatChange = {
    value: 15,
    type: 'increase',
    period: 'vs last month',
  };

  const mockStats: DashboardStat[] = [
    {
      id: '1',
      title: 'Total Candidates',
      value: 150,
      icon: 'M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20Z',
      color: 'primary',
      change: mockChange,
    },
    {
      id: '2',
      title: 'Shortlisted',
      value: '45',
      icon: 'M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z',
      color: 'success',
    },
    {
      id: '3',
      title: 'Pending',
      value: 23,
      icon: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z',
      color: 'warning',
    },
    {
      id: '4',
      title: 'Rejected',
      value: 12,
      icon: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
      color: 'danger',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardStatsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardStatsComponent);
    component = fixture.componentInstance;
    component.stats = mockStats;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept stats input', () => {
      expect(component.stats).toBe(mockStats);
    });

    it('should have Math object available in template', () => {
      expect(component['Math']).toBe(Math);
    });

    it('should handle empty stats array', () => {
      component.stats = [];
      fixture.detectChanges();
      expect(component.stats.length).toBe(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render stats overview container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.stats-overview')).toBeTruthy();
    });

    it('should render section title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.section-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain('Overview');
    });

    it('should render stat cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cards = compiled.querySelectorAll('.stat-card');
      expect(cards.length).toBe(4);
    });

    it('should render stat values', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const values = compiled.querySelectorAll('.stat-value');
      expect(values.length).toBe(4);
      expect(values[0].textContent).toContain('150');
    });

    it('should render stat labels', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const labels = compiled.querySelectorAll('.stat-label');
      expect(labels.length).toBe(4);
      expect(labels[0].textContent).toContain('Total Candidates');
    });

    it('should render change indicators when present', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const changes = compiled.querySelectorAll('.stat-change');
      expect(changes.length).toBeGreaterThan(0);
    });

    it('should apply correct color classes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cards = compiled.querySelectorAll('.stat-card');
      expect(cards[0].classList.contains('stat-card--primary')).toBe(true);
      expect(cards[1].classList.contains('stat-card--success')).toBe(true);
      expect(cards[2].classList.contains('stat-card--warning')).toBe(true);
      expect(cards[3].classList.contains('stat-card--danger')).toBe(true);
    });

    it('should hide container when stats array is empty', () => {
      component.stats = [];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.stats-overview')).toBeFalsy();
    });

    it('should render stat icons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icons = compiled.querySelectorAll('.stat-icon');
      expect(icons.length).toBe(4);
    });
  });
});
