import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { JobEffects } from './job.effects';
import { ApiService } from '../../services/api.service';
import * as JobActions from './job.actions';
import { Job, JobListItem, CreateJobRequest, CreateJobResponse } from './job.model';

describe('JobEffects', () => {
  let actions$: Observable<Action>;
  let effects: JobEffects;
  let apiService: jest.Mocked<ApiService>;
  let router: jest.Mocked<Router>;

  const mockJobListItems: JobListItem[] = [
    {
      id: '1',
      title: '软件工程师',
      status: 'completed',
      createdAt: new Date('2024-01-01'),
      resumeCount: 5
    }
  ];

  const mockJob: Job = {
    id: '1',
    title: '软件工程师',
    jdText: '招聘软件工程师...',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5
  };

  const mockCreateJobRequest: CreateJobRequest = {
    jobTitle: '新岗位',
    jdText: '新岗位描述'
  };

  const mockCreateJobResponse: CreateJobResponse = {
    jobId: 'new-job-id'
  };

  beforeEach(() => {
    const apiServiceSpy = {
      getAllJobs: jest.fn(),
      getJobById: jest.fn(),
      createJob: jest.fn()
    };
    const routerSpy = {
      navigate: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        JobEffects,
        provideMockActions(() => actions$),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    effects = TestBed.inject(JobEffects);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  describe('loadJobs$', () => {
    it('should return loadJobsSuccess action on successful API call', (done) => {
      apiService.getAllJobs.mockReturnValue(of(mockJobListItems));
      
      actions$ = of(JobActions.loadJobs());
      
      effects.loadJobs$.subscribe(action => {
        expect(action).toEqual(JobActions.loadJobsSuccess({ jobs: mockJobListItems }));
        expect(apiService.getAllJobs).toHaveBeenCalled();
        done();
      });
    });

    it('should return loadJobsFailure action on API error', (done) => {
      const error = new Error('Network error');
      apiService.getAllJobs.mockReturnValue(throwError(() => error));
      
      actions$ = of(JobActions.loadJobs());
      
      effects.loadJobs$.subscribe(action => {
        expect(action).toEqual(JobActions.loadJobsFailure({ 
          error: 'Network error' 
        }));
        done();
      });
    });

    it('should handle API error with custom message', (done) => {
      const error = { message: 'Custom error message' };
      apiService.getAllJobs.mockReturnValue(throwError(() => error));
      
      actions$ = of(JobActions.loadJobs());
      
      effects.loadJobs$.subscribe(action => {
        expect(action).toEqual(JobActions.loadJobsFailure({ 
          error: 'Custom error message' 
        }));
        done();
      });
    });
  });

  describe('loadJob$', () => {
    it('should return loadJobSuccess action on successful API call', (done) => {
      apiService.getJobById.mockReturnValue(of(mockJob));
      
      actions$ = of(JobActions.loadJob({ jobId: '1' }));
      
      effects.loadJob$.subscribe(action => {
        expect(action).toEqual(JobActions.loadJobSuccess({ job: mockJob }));
        expect(apiService.getJobById).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should return loadJobFailure action on API error', (done) => {
      const error = new Error('Job not found');
      apiService.getJobById.mockReturnValue(throwError(() => error));
      
      actions$ = of(JobActions.loadJob({ jobId: 'nonexistent' }));
      
      effects.loadJob$.subscribe(action => {
        expect(action).toEqual(JobActions.loadJobFailure({ 
          error: 'Job not found' 
        }));
        done();
      });
    });
  });

  describe('createJob$', () => {
    it('should return createJobSuccess action on successful API call', (done) => {
      apiService.createJob.mockReturnValue(of(mockCreateJobResponse));
      
      actions$ = of(JobActions.createJob({ request: mockCreateJobRequest }));
      
      effects.createJob$.subscribe(action => {
        expect(action).toEqual(JobActions.createJobSuccess({ 
          response: mockCreateJobResponse 
        }));
        expect(apiService.createJob).toHaveBeenCalledWith(mockCreateJobRequest);
        done();
      });
    });

    it('should return createJobFailure action on API error', (done) => {
      const error = new Error('Validation failed');
      apiService.createJob.mockReturnValue(throwError(() => error));
      
      actions$ = of(JobActions.createJob({ request: mockCreateJobRequest }));
      
      effects.createJob$.subscribe(action => {
        expect(action).toEqual(JobActions.createJobFailure({ 
          error: 'Validation failed' 
        }));
        done();
      });
    });
  });

  describe('createJobSuccess$', () => {
    it('should navigate to job details and trigger loadJobs action', (done) => {
      actions$ = of(JobActions.createJobSuccess({ response: mockCreateJobResponse }));
      
      const results: Action[] = [];
      effects.createJobSuccess$.subscribe(action => {
        results.push(action);
        
        if (results.length === 1) {
          expect(router.navigate).toHaveBeenCalledWith(['/jobs', 'new-job-id']);
          expect(action).toEqual(JobActions.loadJobs());
          done();
        }
      });
    });

    it('should handle navigation with different job id', (done) => {
      const differentResponse: CreateJobResponse = { jobId: 'different-job-id' };
      actions$ = of(JobActions.createJobSuccess({ response: differentResponse }));
      
      effects.createJobSuccess$.subscribe(action => {
        expect(router.navigate).toHaveBeenCalledWith(['/jobs', 'different-job-id']);
        expect(action).toEqual(JobActions.loadJobs());
        done();
      });
    });
  });

  describe('Effect Integration', () => {
    it('should chain loadJobs and loadJobsSuccess effects', (done) => {
      apiService.getAllJobs.mockReturnValue(of(mockJobListItems));
      
      actions$ = of(JobActions.loadJobs());
      
      effects.loadJobs$.subscribe(successAction => {
        expect(successAction.type).toBe('[Job] Load Jobs Success');
        expect(apiService.getAllJobs).toHaveBeenCalled();
        done();
      });
    });

    it('should handle multiple effect calls in sequence', (done) => {
      apiService.createJob.mockReturnValue(of(mockCreateJobResponse));
      
      actions$ = of(JobActions.createJob({ request: mockCreateJobRequest }));
      
      // First verify createJob effect produces createJobSuccess action
      effects.createJob$.subscribe(successAction => {
        expect(successAction.type).toBe('[Job] Create Job Success');
        
        // Then verify createJobSuccess effect produces loadJobs action
        actions$ = of(successAction);
        effects.createJobSuccess$.subscribe(loadAction => {
          expect(loadAction.type).toBe('[Job] Load Jobs');
          expect(router.navigate).toHaveBeenCalledWith(['/jobs', 'new-job-id']);
          done();
        });
      });
    });
  });
});
