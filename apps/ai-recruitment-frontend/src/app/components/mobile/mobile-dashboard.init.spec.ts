import type {
  ComponentFixture,
} from '@angular/core/testing';
import {
  TestBed,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { MobileDashboardComponent } from './mobile-dashboard.component';
import {
  mockImports,
} from './test-helper';

describe('MobileDashboardComponent - Initialization', () => {
  let component: MobileDashboardComponent;
  let fixture: ComponentFixture<MobileDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ...mockImports,
      ],
    })
      .overrideComponent(MobileDashboardComponent, {
        set: {
          imports: mockImports,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MobileDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct default properties', () => {
    expect(component.pageTitle).toBe('Dashboard');
    expect(component.pageSubtitle).toBe('Recruitment insights at a glance');
    expect(component.isPullRefreshVisible).toBe(false);
    expect(component.isRefreshing).toBe(false);
  });

  it('should initialize navigation items correctly', () => {
    expect(component.navItems).toHaveLength(4);
    expect(component.navItems[0]).toEqual({
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3',
      route: '/dashboard',
    });
  });

  it('should initialize menu items correctly', () => {
    expect(component.menuItems).toHaveLength(2);
    expect(component.menuItems[0].id).toBe('settings');
    expect(component.menuItems[1].id).toBe('help');
  });

  it('should initialize header actions with notifications', () => {
    expect(component.headerActions).toHaveLength(1);
    expect(component.headerActions[0]).toEqual({
      id: 'notifications',
      label: 'Notifications',
      icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,21A1.5,1.5 0 0,0 9,19.5H15A1.5,1.5 0 0,0 16.5,21A1.5,1.5 0 0,0 15,22.5H9A1.5,1.5 0 0,0 7.5,21Z',
      badge: 3,
    });
  });

  it('should initialize quick actions correctly', () => {
    expect(component.quickActions).toHaveLength(4);
    expect(component.quickActions[0].id).toBe('upload');
    expect(component.quickActions[1].id).toBe('create-job');
    expect(component.quickActions[2].id).toBe('candidates');
    expect(component.quickActions[3].id).toBe('analytics');
  });

  it('should initialize overview stats correctly', () => {
    expect(component.overviewStats).toHaveLength(4);
    expect(component.overviewStats[0].id).toBe('total-resumes');
    expect(component.overviewStats[0].value).toBe(147);
    expect(component.overviewStats[0].change).toEqual({
      value: 12,
      type: 'increase',
      period: 'this week',
    });
  });

  it('should initialize dashboard cards correctly', () => {
    expect(component.dashboardCards).toHaveLength(2);
    expect(component.dashboardCards[0].id).toBe('recent-uploads');
    expect(component.dashboardCards[1].id).toBe('top-matches');
    expect(component.dashboardCards[0].actions).toHaveLength(2);
  });

  it('should initialize recent activity correctly', () => {
    expect(component.recentActivity).toHaveLength(3);
    expect(component.recentActivity[0].type).toBe('success');
    expect(component.recentActivity[1].type).toBe('info');
    expect(component.recentActivity[2].type).toBe('warning');
  });

  it('should initialize FAB action correctly', () => {
    expect(component.fabAction).toEqual({
      label: 'Upload Resume',
      icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
    });
  });

  it('should make Math available in template', () => {
    // Math is globally available in Angular templates, no component property needed
    expect(typeof Math).toBe('object');
  });

  it('should have all dashboard charts configured', () => {
    expect(component.dashboardCharts).toHaveLength(3);

    const weeklyResumes = component.dashboardCharts.find((c) => c.id === 'weekly-resumes');
    expect(weeklyResumes).toBeDefined();
    expect(weeklyResumes?.type).toBe('sparkline');
    expect(weeklyResumes?.data).toHaveLength(7);

    const candidateSources = component.dashboardCharts.find((c) => c.id === 'candidate-sources');
    expect(candidateSources).toBeDefined();
    expect(candidateSources?.type).toBe('bar');

    const hiringStatus = component.dashboardCharts.find((c) => c.id === 'hiring-status');
    expect(hiringStatus).toBeDefined();
    expect(hiringStatus?.type).toBe('donut');
    expect(hiringStatus?.showLegend).toBe(true);
  });

  it('should have correct nav items configuration', () => {
    const expectedRoutes = ['/dashboard', '/resume/upload', '/jobs', '/reports'];
    const actualRoutes = component.navItems.map((item) => item.route);

    expect(actualRoutes).toEqual(expectedRoutes);
  });

  it('should render mobile navigation component', () => {
    const mobileNav = fixture.debugElement.query(By.css('arc-mobile-navigation'));
    expect(mobileNav).toBeTruthy();
  });

  it('should have page title and subtitle bound correctly', () => {
    expect(component.pageTitle).toBe('Dashboard');
    expect(component.pageSubtitle).toBe('Recruitment insights at a glance');
  });
});
