import { resumeReducer } from './resume.reducer';
import { initialResumeState, ResumeState } from './resume.state';
import * as ResumeActions from './resume.actions';
import {
  ResumeDetail,
  ResumeListItem,
  ResumeUploadResponse,
} from './resume.model';

describe('Resume Reducer', () => {
  const mockResumeListItems: ResumeListItem[] = [
    {
      id: 'resume1',
      jobId: 'job1',
      fileName: 'resume1.pdf',
      status: 'processed',
      uploadedAt: new Date('2024-01-01'),
      matchScore: 85,
    },
    {
      id: 'resume2',
      jobId: 'job1',
      fileName: 'resume2.pdf',
      status: 'processing',
      uploadedAt: new Date('2024-01-02'),
      matchScore: undefined as any,
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

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const result = resumeReducer(undefined, { type: 'Unknown' } as any);
      expect(result).toBe(initialResumeState);
    });

    it('should have correct initial values', () => {
      expect(initialResumeState.resumes).toEqual([]);
      expect(initialResumeState.selectedResume).toBeNull();
      expect(initialResumeState.loading).toBe(false);
      expect(initialResumeState.error).toBeNull();
      expect(initialResumeState.uploading).toBe(false);
    });
  });

  describe('Load Resumes Actions', () => {
    it('should handle loadResumesByJob', () => {
      const action = ResumeActions.loadResumesByJob({ jobId: 'job1' });
      const state = resumeReducer(initialResumeState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadResumesByJobSuccess', () => {
      const loadingState: ResumeState = {
        ...initialResumeState,
        loading: true,
      };
      const action = ResumeActions.loadResumesByJobSuccess({
        resumes: mockResumeListItems,
      });
      const state = resumeReducer(loadingState, action);

      expect(state.resumes).toEqual(mockResumeListItems);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadResumesByJobFailure', () => {
      const loadingState: ResumeState = {
        ...initialResumeState,
        loading: true,
      };
      const error = 'Failed to load resumes';
      const action = ResumeActions.loadResumesByJobFailure({ error });
      const state = resumeReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Load Single Resume Actions', () => {
    it('should handle loadResume', () => {
      const action = ResumeActions.loadResume({ resumeId: 'resume1' });
      const state = resumeReducer(initialResumeState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadResumeSuccess', () => {
      const loadingState: ResumeState = {
        ...initialResumeState,
        loading: true,
      };
      const action = ResumeActions.loadResumeSuccess({ resume: mockResume });
      const state = resumeReducer(loadingState, action);

      expect(state.selectedResume).toEqual(mockResume);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadResumeFailure', () => {
      const loadingState: ResumeState = {
        ...initialResumeState,
        loading: true,
      };
      const error = 'Failed to load resume';
      const action = ResumeActions.loadResumeFailure({ error });
      const state = resumeReducer(loadingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Upload Resume Actions', () => {
    it('should handle uploadResumes', () => {
      const files = [
        new File(['content'], 'resume1.pdf', { type: 'application/pdf' }),
      ];
      const action = ResumeActions.uploadResumes({ jobId: 'job1', files });
      const state = resumeReducer(initialResumeState, action);

      expect(state.uploading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle uploadResumesSuccess', () => {
      const uploadingState: ResumeState = {
        ...initialResumeState,
        uploading: true,
      };
      const action = ResumeActions.uploadResumesSuccess({
        response: mockUploadResponse,
      });
      const state = resumeReducer(uploadingState, action);

      expect(state.uploading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle uploadResumesFailure', () => {
      const uploadingState: ResumeState = {
        ...initialResumeState,
        uploading: true,
      };
      const error = 'Failed to upload resumes';
      const action = ResumeActions.uploadResumesFailure({ error });
      const state = resumeReducer(uploadingState, action);

      expect(state.uploading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Utility Actions', () => {
    it('should handle clearSelectedResume', () => {
      const stateWithSelectedResume: ResumeState = {
        ...initialResumeState,
        selectedResume: mockResume,
      };
      const action = ResumeActions.clearSelectedResume();
      const state = resumeReducer(stateWithSelectedResume, action);

      expect(state.selectedResume).toBeNull();
    });

    it('should handle clearResumeError', () => {
      const stateWithError: ResumeState = {
        ...initialResumeState,
        error: 'Some error',
      };
      const action = ResumeActions.clearResumeError();
      const state = resumeReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = { ...initialResumeState };
      const action = ResumeActions.loadResumesByJob({ jobId: 'job1' });
      const newState = resumeReducer(initialResumeState, action);

      expect(initialResumeState).toEqual(originalState);
      expect(newState).not.toBe(initialResumeState);
    });

    it('should preserve other state properties when updating specific ones', () => {
      const stateWithData: ResumeState = {
        ...initialResumeState,
        resumes: mockResumeListItems,
        selectedResume: mockResume,
      };
      const action = ResumeActions.loadResumesByJob({ jobId: 'job1' });
      const newState = resumeReducer(stateWithData, action);

      expect(newState.resumes).toEqual(mockResumeListItems);
      expect(newState.selectedResume).toEqual(mockResume);
      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });
});
