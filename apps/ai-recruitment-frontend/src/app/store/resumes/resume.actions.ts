import { createAction, props } from '@ngrx/store';
import type {
  ResumeListItem,
  ResumeDetail,
  ResumeUploadResponse,
} from './resume.model';

// Load Resumes for Job
export const loadResumesByJob = createAction(
  '[Resume] Load Resumes By Job',
  props<{ jobId: string }>(),
);

export const loadResumesByJobSuccess = createAction(
  '[Resume] Load Resumes By Job Success',
  props<{ resumes: ResumeListItem[] }>(),
);

export const loadResumesByJobFailure = createAction(
  '[Resume] Load Resumes By Job Failure',
  props<{ error: string }>(),
);

// Load Single Resume
export const loadResume = createAction(
  '[Resume] Load Resume',
  props<{ resumeId: string }>(),
);

export const loadResumeSuccess = createAction(
  '[Resume] Load Resume Success',
  props<{ resume: ResumeDetail }>(),
);

export const loadResumeFailure = createAction(
  '[Resume] Load Resume Failure',
  props<{ error: string }>(),
);

// Upload Resumes
export const uploadResumes = createAction(
  '[Resume] Upload Resumes',
  props<{ jobId: string; files: File[] }>(),
);

export const uploadResumesProgress = createAction(
  '[Resume] Upload Resumes Progress',
  props<{ progress: number }>(),
);

export const uploadResumesSuccess = createAction(
  '[Resume] Upload Resumes Success',
  props<{ response: ResumeUploadResponse }>(),
);

export const uploadResumesFailure = createAction(
  '[Resume] Upload Resumes Failure',
  props<{ error: string }>(),
);

// Clear Selected Resume
export const clearSelectedResume = createAction(
  '[Resume] Clear Selected Resume',
);

// Clear Resumes
export const clearResumes = createAction('[Resume] Clear Resumes');

// Clear Error
export const clearResumeError = createAction('[Resume] Clear Error');
