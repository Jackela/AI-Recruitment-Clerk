import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Router } from '@angular/router';
import type { Observable} from 'rxjs';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { Action } from '@ngrx/store';
import { JobEffects } from './job.effects';
import { ApiService } from '../../services/api.service';
import * as JobActions from './job.actions';
import type {
  Job,
  JobListItem,
  CreateJobRequest,
  CreateJobResponse,
} from './job.model';

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
      resumeCount: 5,
    },
  ];

  const mockJob: Job = {
    id: '1',
    title: '软件工程师',
    jdText: '招聘软件工程师...',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    resumeCount: 5,
  };

  const mockCreateJobRequest: CreateJobRequest = {
    jobTitle: '新岗位',
    jdText: '新岗位描述',
  };

  const mockCreateJobResponse: CreateJobResponse = {
    jobId: 'new-job-id',
  };

  beforeEach(() => {
    const apiServiceSpy = {
      getAllJobs: jest.fn(),
      getJobById: jest.fn(),
      createJob: jest.fn(),
    };
    const routerSpy = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        JobEffects,
        provideMockActions(() => actions$),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    effects = TestBed.inject(JobEffects);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  describe('loadJobs$', () => {
    it('should return loadJobsSuccess action on successful API call', (done) => {
      apiService.getAllJobs.mockReturnValue(of(mockJobListItems));

      actions$ = of(JobActions.loadJobs());

      effects.loadJobs$.subscribe((action) => {
        expect(action).toEqual(
          JobActions.loadJobsSuccess({ jobs: mockJobListItems }),
        );
        expect(apiService.getAllJobs).toHaveBeenCalled();
        done();
      });
    });

    it('should return loadJobsFailure action on API error', (done) => {
      const error = new Error('Network error');
      apiService.getAllJobs.mockReturnValue(throwError(() => error));

      actions$ = of(JobActions.loadJobs());

      effects.loadJobs$.subscribe((action) => {
        expect(action).toEqual(
          JobActions.loadJobsFailure({
            error: 'Network error',
          }),
        );
        done();
      });
    });

    it('should handle API error with custom message', (done) => {
      const error = { message: 'Custom error message' };
      apiService.getAllJobs.mockReturnValue(throwError(() => error));

      actions$ = of(JobActions.loadJobs());

      effects.loadJobs$.subscribe((action) => {
        expect(action).toEqual(
          JobActions.loadJobsFailure({
            error: 'Custom error message',
          }),
        );
        done();
      });
    });
  });

  describe('loadJob$', () => {
    it('should return loadJobSuccess action on successful API call', (done) => {
      apiService.getJobById.mockReturnValue(of(mockJob));

      actions$ = of(JobActions.loadJob({ jobId: '1' }));

      effects.loadJob$.subscribe((action) => {
        expect(action).toEqual(JobActions.loadJobSuccess({ job: mockJob }));
        expect(apiService.getJobById).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should return loadJobFailure action on API error', (done) => {
      const error = new Error('Job not found');
      apiService.getJobById.mockReturnValue(throwError(() => error));

      actions$ = of(JobActions.loadJob({ jobId: 'nonexistent' }));

      effects.loadJob$.subscribe((action) => {
        expect(action).toEqual(
          JobActions.loadJobFailure({
            error: 'Job not found',
          }),
        );
        done();
      });
    });
  });

  describe('createJob$', () => {
    it('should return createJobSuccess action on successful API call', (done) => {
      apiService.createJob.mockReturnValue(of(mockCreateJobResponse));

      actions$ = of(JobActions.createJob({ request: mockCreateJobRequest }));

      effects.createJob$.subscribe((action) => {
        expect(action).toEqual(
          JobActions.createJobSuccess({
            response: mockCreateJobResponse,
          }),
        );
        expect(apiService.createJob).toHaveBeenCalledWith(mockCreateJobRequest);
        done();
      });
    });

    it('should return createJobFailure action on API error', (done) => {
      const error = new Error('Validation failed');
      apiService.createJob.mockReturnValue(throwError(() => error));

      actions$ = of(JobActions.createJob({ request: mockCreateJobRequest }));

      effects.createJob$.subscribe((action) => {
        expect(action).toEqual(
          JobActions.createJobFailure({
            error: 'Validation failed',
          }),
        );
        done();
      });
    });
  });

  describe('createJobSuccess$', () => {
    it('should dispatch loadJobs without triggering navigation', async () => {
      actions$ = of(
        JobActions.createJobSuccess({ response: mockCreateJobResponse }),
      );

      const action = await firstValueFrom(effects.createJobSuccess$);

      expect(action).toEqual(JobActions.loadJobs());
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle different job ids without navigation', async () => {
      const differentResponse: CreateJobResponse = {
        jobId: 'different-job-id',
      };
      actions$ = of(
        JobActions.createJobSuccess({ response: differentResponse }),
      );

      const action = await firstValueFrom(effects.createJobSuccess$);

      expect(action).toEqual(JobActions.loadJobs());
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Effect Integration', () => {
    it('should chain loadJobs and loadJobsSuccess effects', async () => {
      apiService.getAllJobs.mockReturnValue(of(mockJobListItems));

      actions$ = of(JobActions.loadJobs());

      const successAction = await firstValueFrom(effects.loadJobs$);
      expect(successAction.type).toBe('[Job] Load Jobs Success');
      expect(apiService.getAllJobs).toHaveBeenCalled();
    });

    it('should handle multiple effect calls in sequence', async () => {
      apiService.createJob.mockReturnValue(of(mockCreateJobResponse));

      actions$ = of(JobActions.createJob({ request: mockCreateJobRequest }));

      const successAction = await firstValueFrom(effects.createJob$);
      expect(successAction.type).toBe('[Job] Create Job Success');

      actions$ = of(successAction);
      const loadAction = await firstValueFrom(effects.createJobSuccess$);

      expect(loadAction.type).toBe('[Job] Load Jobs');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
