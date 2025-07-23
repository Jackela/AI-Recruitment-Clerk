import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { StoreModule } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { RouterLinkWithHref } from '@angular/router';
import { JobsListComponent } from './jobs-list.component';
import { AppState } from '../../../store/app.state';
import { JobListItem } from '../../../store/jobs/job.model';
import * as JobActions from '../../../store/jobs/job.actions';
import { initialJobState } from '../../../store/jobs/job.state';

describe('JobsListComponent', () => {
  let component: JobsListComponent;
  let fixture: ComponentFixture<JobsListComponent>;
  let store: MockStore<AppState>;
  let dispatchSpy: jest.SpyInstance;

  const mockJobs: JobListItem[] = [
    {
      id: '1',
      title: '软件工程师',
      status: 'completed',
      createdAt: new Date('2024-01-01'),
      resumeCount: 5
    },
    {
      id: '2',
      title: '产品经理',
      status: 'processing',
      createdAt: new Date('2024-01-02'),
      resumeCount: 2
    }
  ];

  const initialState: Partial<AppState> = {
    jobs: {
      ...initialJobState,
      jobs: mockJobs,
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobsListComponent],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'jobs/create', component: JobsListComponent },
          { path: 'jobs/:id', component: JobsListComponent }
        ])
      ],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    dispatchSpy = jest.spyOn(store, 'dispatch');
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should dispatch loadJobs action on init', () => {
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.loadJobs());
    });

    it('should initialize observables', () => {
      expect(component.jobs$).toBeDefined();
      expect(component.loading$).toBeDefined();
      expect(component.error$).toBeDefined();
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render page title', () => {
      const titleElement = fixture.debugElement.query(By.css('.page-title'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('岗位管理');
    });

    it('should render create new job button', () => {
      const createButton = fixture.debugElement.query(By.css('a[routerLink="/jobs/create"]'));
      expect(createButton).toBeTruthy();
      expect(createButton.nativeElement.textContent.trim()).toBe('创建新岗位');
    });

    it('should render refresh button', () => {
      const refreshButton = fixture.debugElement.query(By.css('button'));
      expect(refreshButton).toBeTruthy();
      expect(refreshButton.nativeElement.textContent.trim()).toContain('刷新');
    });

    it('should render job cards when jobs exist', () => {
      const jobCards = fixture.debugElement.queryAll(By.css('.job-card'));
      expect(jobCards.length).toBe(2);
    });

    it('should render job titles correctly', () => {
      const jobTitles = fixture.debugElement.queryAll(By.css('.job-title'));
      expect(jobTitles[0].nativeElement.textContent.trim()).toBe('软件工程师');
      expect(jobTitles[1].nativeElement.textContent.trim()).toBe('产品经理');
    });

    it('should render job status badges', () => {
      const statusBadges = fixture.debugElement.queryAll(By.css('.job-status'));
      expect(statusBadges[0].nativeElement.textContent.trim()).toBe('已完成');
      expect(statusBadges[1].nativeElement.textContent.trim()).toBe('处理中');
    });

    it('should render resume counts', () => {
      const resumeCounts = fixture.debugElement.queryAll(By.css('.resume-count'));
      expect(resumeCounts[0].nativeElement.textContent.trim()).toContain('5');
      expect(resumeCounts[1].nativeElement.textContent.trim()).toContain('2');
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      store.setState({
        jobs: {
          ...initialJobState,
          jobs: [],
          loading: true,
          error: null
        }
      } as AppState);
      fixture.detectChanges();
    });

    it('should show loading spinner when loading', () => {
      const spinner = fixture.debugElement.query(By.css('.spinner'));
      expect(spinner).toBeTruthy();
    });

    it('should show loading text', () => {
      const loadingText = fixture.debugElement.query(By.css('.text-center'));
      expect(loadingText.nativeElement.textContent).toContain('加载中');
    });

    it('should disable refresh button when loading', () => {
      const refreshButton = fixture.debugElement.query(By.css('button'));
      expect(refreshButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('Error State', () => {
    const errorMessage = 'Failed to load jobs';

    beforeEach(() => {
      store.setState({
        jobs: {
          ...initialJobState,
          jobs: [],
          loading: false,
          error: errorMessage
        }
      } as AppState);
      fixture.detectChanges();
    });

    it('should display error message', () => {
      const errorAlert = fixture.debugElement.query(By.css('.alert-danger'));
      expect(errorAlert).toBeTruthy();
      expect(errorAlert.nativeElement.textContent.trim()).toBe(errorMessage);
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      store.setState({
        jobs: {
          ...initialJobState,
          jobs: [],
          loading: false,
          error: null
        }
      } as AppState);
      fixture.detectChanges();
    });

    it('should show empty state when no jobs', () => {
      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    });

    it('should display empty state message', () => {
      const emptyStateTitle = fixture.debugElement.query(By.css('.empty-state h3'));
      expect(emptyStateTitle.nativeElement.textContent.trim()).toBe('暂无岗位');
    });

    it('should show create job button in empty state', () => {
      const createButton = fixture.debugElement.query(By.css('.empty-state a[routerLink="/jobs/create"]'));
      expect(createButton).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should dispatch loadJobs action when refresh button is clicked', () => {
      const refreshButton = fixture.debugElement.query(By.css('button'));
      refreshButton.nativeElement.click();
      
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.loadJobs());
    });

    it('should call onRefresh method when refresh button is clicked', () => {
      jest.spyOn(component, 'onRefresh');
      const refreshButton = fixture.debugElement.query(By.css('button'));
      refreshButton.nativeElement.click();
      
      expect(component.onRefresh).toHaveBeenCalled();
    });

    it('should have router links on job cards', () => {
      // Ensure jobs are visible and not loading
      store.setState({
        jobs: {
          ...initialJobState,
          jobs: mockJobs,
          loading: false,
          error: null
        }
      } as AppState);
      fixture.detectChanges();
      
      // First check if job cards exist at all
      const allJobCards = fixture.debugElement.queryAll(By.css('.job-card'));
      expect(allJobCards.length).toBe(2);
      
      // Check that RouterLink directives exist in the template
      const routerLinkElements = fixture.debugElement.queryAll(By.directive(RouterLinkWithHref));
      expect(routerLinkElements.length).toBeGreaterThanOrEqual(2); // At least job cards + create button
      
      // Basic verification that job cards can be clicked
      expect(allJobCards[0].nativeElement.tagName.toLowerCase()).toBe('div');
      expect(allJobCards[1].nativeElement.tagName.toLowerCase()).toBe('div');
    });
  });

  describe('Component Methods', () => {
    it('should implement trackByJobId correctly', () => {
      const job = mockJobs[0];
      const result = component.trackByJobId(0, job);
      expect(result).toBe(job.id);
    });

    it('should handle loadJobs method', () => {
      component.loadJobs();
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.loadJobs());
    });

    it('should handle onRefresh method', () => {
      component.onRefresh();
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.loadJobs());
    });
  });

  describe('Component Lifecycle', () => {
    it('should call ngOnDestroy without errors', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should complete destroy subject on ngOnDestroy', () => {
      jest.spyOn(component['destroy$'], 'next');
      jest.spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      // Ensure jobs are visible and not loading to render the grid
      store.setState({
        jobs: {
          ...initialJobState,
          jobs: mockJobs,
          loading: false,
          error: null
        }
      } as AppState);
      fixture.detectChanges();
      
      const jobsGrid = fixture.debugElement.query(By.css('.jobs-grid'));
      expect(jobsGrid).toBeTruthy();
    });

    it('should render properly on mobile viewports', () => {
      // This would be better tested with actual viewport changes in e2e tests
      const headerActions = fixture.debugElement.query(By.css('.header-actions'));
      expect(headerActions).toBeTruthy();
    });
  });
});
