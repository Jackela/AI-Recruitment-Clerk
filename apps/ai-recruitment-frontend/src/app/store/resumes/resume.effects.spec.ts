import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { ResumeEffects } from './resume.effects';
import { ApiService } from '../../services/api.service';
import * as ResumeActions from './resume.actions';
import { ResumeDetail, ResumeListItem, ResumeUploadResponse } from './resume.model';

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
      score: 85
    }
  ];

  const mockResume: ResumeDetail = {
    id: 'resume1',
    jobId: 'job1',
    fileName: 'resume1.pdf',
    status: 'processed',
    uploadedAt: new Date('2024-01-01'),
    score: 85,
    extractedData: {
      name: 'John Doe',
      email: 'john@example.com',
      skills: ['JavaScript', 'TypeScript'],
      experience: '3 years'
    }
  };

  const mockUploadResponse: ResumeUploadResponse = {
    jobId: 'job1',
    uploadedCount: 2,
    processedIds: ['resume1', 'resume2']
  };

  beforeEach(() => {
    const apiServiceSpy = {
      getResumesByJobId: jest.fn(),
      getResumeById: jest.fn(),
      uploadResumes: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ResumeEffects,
        provideMockActions(() => actions$),
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    effects = TestBed.inject(ResumeEffects);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  describe('loadResumesByJob$', () => {
    it('should return loadResumesByJobSuccess action on successful API call', (done) => {
      apiService.getResumesByJobId.mockReturnValue(of(mockResumeListItems));
      
      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));
      
      effects.loadResumesByJob$.subscribe(action => {
        expect(action).toEqual(ResumeActions.loadResumesByJobSuccess({ resumes: mockResumeListItems }));
        expect(apiService.getResumesByJobId).toHaveBeenCalledWith('job1');
        done();
      });
    });

    it('should return loadResumesByJobFailure action on API error', (done) => {
      const error = new Error('Network error');
      apiService.getResumesByJobId.mockReturnValue(throwError(() => error));
      
      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));
      
      effects.loadResumesByJob$.subscribe(action => {
        expect(action).toEqual(ResumeActions.loadResumesByJobFailure({ 
          error: 'Network error' 
        }));
        done();
      });
    });

    it('should handle API error with custom message', (done) => {
      const error = { message: 'Custom error message' };
      apiService.getResumesByJobId.mockReturnValue(throwError(() => error));
      
      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));
      
      effects.loadResumesByJob$.subscribe(action => {
        expect(action).toEqual(ResumeActions.loadResumesByJobFailure({ 
          error: 'Custom error message' 
        }));
        done();
      });
    });
  });

  describe('loadResume$', () => {
    it('should return loadResumeSuccess action on successful API call', (done) => {
      apiService.getResumeById.mockReturnValue(of(mockResume));
      
      actions$ = of(ResumeActions.loadResume({ resumeId: 'resume1' }));
      
      effects.loadResume$.subscribe(action => {
        expect(action).toEqual(ResumeActions.loadResumeSuccess({ resume: mockResume }));
        expect(apiService.getResumeById).toHaveBeenCalledWith('resume1');
        done();
      });
    });

    it('should return loadResumeFailure action on API error', (done) => {
      const error = new Error('Resume not found');
      apiService.getResumeById.mockReturnValue(throwError(() => error));
      
      actions$ = of(ResumeActions.loadResume({ resumeId: 'nonexistent' }));
      
      effects.loadResume$.subscribe(action => {
        expect(action).toEqual(ResumeActions.loadResumeFailure({ 
          error: 'Resume not found' 
        }));
        done();
      });
    });
  });

  describe('uploadResumes$', () => {
    it('should return uploadResumesSuccess action on successful API call', (done) => {
      const files = [new File(['content'], 'resume1.pdf', { type: 'application/pdf' })];
      apiService.uploadResumes.mockReturnValue(of(mockUploadResponse));
      
      actions$ = of(ResumeActions.uploadResumes({ jobId: 'job1', files }));
      
      effects.uploadResumes$.subscribe(action => {
        expect(action).toEqual(ResumeActions.uploadResumesSuccess({ 
          response: mockUploadResponse 
        }));
        expect(apiService.uploadResumes).toHaveBeenCalledWith('job1', files);
        done();
      });
    });

    it('should return uploadResumesFailure action on API error', (done) => {
      const files = [new File(['content'], 'resume1.pdf', { type: 'application/pdf' })];
      const error = new Error('Upload failed');
      apiService.uploadResumes.mockReturnValue(throwError(() => error));
      
      actions$ = of(ResumeActions.uploadResumes({ jobId: 'job1', files }));
      
      effects.uploadResumes$.subscribe(action => {
        expect(action).toEqual(ResumeActions.uploadResumesFailure({ 
          error: 'Upload failed' 
        }));
        done();
      });
    });
  });

  describe('uploadResumesSuccess$', () => {
    it('should trigger loadResumesByJob action after successful upload', (done) => {
      actions$ = of(ResumeActions.uploadResumesSuccess({ response: mockUploadResponse }));
      
      effects.uploadResumesSuccess$.subscribe(action => {
        expect(action).toEqual(ResumeActions.loadResumesByJob({ jobId: 'job1' }));
        done();
      });
    });
  });

  describe('Effect Integration', () => {
    it('should chain loadResumesByJob and loadResumesByJobSuccess effects', (done) => {
      apiService.getResumesByJobId.mockReturnValue(of(mockResumeListItems));
      
      actions$ = of(ResumeActions.loadResumesByJob({ jobId: 'job1' }));
      
      effects.loadResumesByJob$.subscribe(successAction => {
        expect(successAction.type).toBe('[Resume] Load Resumes By Job Success');
        expect(apiService.getResumesByJobId).toHaveBeenCalled();
        done();
      });
    });
  });
});