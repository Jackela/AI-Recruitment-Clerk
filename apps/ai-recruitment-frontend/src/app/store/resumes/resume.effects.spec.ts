import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import type { Action } from '@ngrx/store';
import { ResumeEffects } from './resume.effects';
import { ApiService } from '../../services/api.service';
import * as ResumeActions from './resume.actions';
import type {
  ResumeDetail,
  ResumeListItem,
  ResumeUploadResponse,
} from './resume.model';

describe('ResumeEffects', () => {
  let actions$: Observable<Action>;
  let effects: ResumeEffects;
  let apiService: jest.Mocked<ApiService>;

  const mockResumeListItems: ResumeListItem[] = [
    {
      id: 'resume1',
      jobId: 'job1',
      fileName: 'resume1.pdf',
      status: 'processed',
      uploadedAt: new Date('2024-01-01'),
      matchScore: 85,
    },
  ];

  const mockResume: ResumeDetail = {
    id: 'resume1',
    jobId: 'job1',
    fileName: 'resume1.pdf',
    status: 'processed',
    uploadedAt: new Date('2024-01-01'),
    matchScore: 85,
    extractedData: {
      name: 'John Doe',
      email: 'john@example.com',
      skills: ['JavaScript', 'TypeScript'],
      experience: '3 years',
    },
  };

  const mockUploadResponse: ResumeUploadResponse = {
    jobId: 'job1',
    uploadedCount: 2,
    processedIds: ['resume1', 'resume2'],
  };

  beforeEach(() => {
    const apiServiceSpy = {
      getResumesByJobId: jest.fn(),
      getResumeById: jest.fn(),
      uploadResumes: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ResumeEffects,
        provideMockActions(() => actions$),
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });

    effects = TestBed.inject(ResumeEffects);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  describe('loadResumesByJob$', () => {
    it('should return loadResumesByJobSuccess action on successful API call', async () => {
      apiService.getResumesByJobId.mockReturnValue(of(mockResumeListItems));

      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));

      const action = await effects.loadResumesByJob$.toPromise();
      expect(action).toEqual(
        ResumeActions.loadResumesByJobSuccess({
          resumes: mockResumeListItems,
        }),
      );
      expect(apiService.getResumesByJobId).toHaveBeenCalledWith('job1');
    });

    it('should return loadResumesByJobFailure action on API error', async () => {
      const error = new Error('Network error');
      apiService.getResumesByJobId.mockReturnValue(throwError(() => error));

      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));

      const action = await effects.loadResumesByJob$.toPromise();
      expect(action).toEqual(
        ResumeActions.loadResumesByJobFailure({
          error: 'Network error',
        }),
      );
    });

    it('should handle API error with custom message', async () => {
      const error = { message: 'Custom error message' };
      apiService.getResumesByJobId.mockReturnValue(throwError(() => error));

      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));

      const action = await effects.loadResumesByJob$.toPromise();
      expect(action).toEqual(
        ResumeActions.loadResumesByJobFailure({
          error: 'Custom error message',
        }),
      );
    });
  });

  describe('loadResume$', () => {
    it('should return loadResumeSuccess action on successful API call', async () => {
      apiService.getResumeById.mockReturnValue(of(mockResume));

      actions$ = of(ResumeActions.loadResume({ resumeId: 'resume1' }));

      const action = await effects.loadResume$.toPromise();
      expect(action).toEqual(
        ResumeActions.loadResumeSuccess({ resume: mockResume }),
      );
      expect(apiService.getResumeById).toHaveBeenCalledWith('resume1');
    });

    it('should return loadResumeFailure action on API error', async () => {
      const error = new Error('Resume not found');
      apiService.getResumeById.mockReturnValue(throwError(() => error));

      actions$ = of(ResumeActions.loadResume({ resumeId: 'nonexistent' }));

      const action = await effects.loadResume$.toPromise();
      expect(action).toEqual(
        ResumeActions.loadResumeFailure({
          error: 'Resume not found',
        }),
      );
    });
  });

  describe('uploadResumes$', () => {
    it('should return uploadResumesSuccess action on successful API call', async () => {
      const files = [
        new File(['content'], 'resume1.pdf', { type: 'application/pdf' }),
      ];
      apiService.uploadResumes.mockReturnValue(of(mockUploadResponse));

      actions$ = of(ResumeActions.uploadResumes({ jobId: 'job1', files }));

      const action = await effects.uploadResumes$.toPromise();
      expect(action).toEqual(
        ResumeActions.uploadResumesSuccess({
          response: mockUploadResponse,
        }),
      );
      expect(apiService.uploadResumes).toHaveBeenCalledWith('job1', files);
    });

    it('should return uploadResumesFailure action on API error', async () => {
      const files = [
        new File(['content'], 'resume1.pdf', { type: 'application/pdf' }),
      ];
      const error = new Error('Upload failed');
      apiService.uploadResumes.mockReturnValue(throwError(() => error));

      actions$ = of(ResumeActions.uploadResumes({ jobId: 'job1', files }));

      const action = await effects.uploadResumes$.toPromise();
      expect(action).toEqual(
        ResumeActions.uploadResumesFailure({
          error: 'Upload failed',
        }),
      );
    });
  });

  describe('uploadResumesSuccess$', () => {
    it('should trigger loadResumesByJob action after successful upload', async () => {
      actions$ = of(
        ResumeActions.uploadResumesSuccess({ response: mockUploadResponse }),
      );

      const action = await effects.uploadResumesSuccess$.toPromise();
      expect(action).toEqual(ResumeActions.loadResumesByJob({ jobId: 'job1' }));
    });
  });

  describe('Effect Integration', () => {
    it('should chain loadResumesByJob and loadResumesByJobSuccess effects', async () => {
      apiService.getResumesByJobId.mockReturnValue(of(mockResumeListItems));

      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));

      const successAction = await effects.loadResumesByJob$.toPromise();
      expect(successAction.type).toBe('[Resume] Load Resumes By Job Success');
      expect(apiService.getResumesByJobId).toHaveBeenCalled();
    });
  });
});
