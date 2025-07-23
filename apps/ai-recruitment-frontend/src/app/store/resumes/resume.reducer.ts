import { createReducer, on } from '@ngrx/store';
import { ResumeState, initialResumeState } from './resume.state';
import * as ResumeActions from './resume.actions';

export const resumeReducer = createReducer(
  initialResumeState,

  // Load Resumes by Job
  on(ResumeActions.loadResumesByJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ResumeActions.loadResumesByJobSuccess, (state, { resumes }) => ({
    ...state,
    resumes,
    loading: false,
    error: null
  })),

  on(ResumeActions.loadResumesByJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Resume
  on(ResumeActions.loadResume, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ResumeActions.loadResumeSuccess, (state, { resume }) => ({
    ...state,
    selectedResume: resume,
    loading: false,
    error: null
  })),

  on(ResumeActions.loadResumeFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Upload Resumes
  on(ResumeActions.uploadResumes, (state) => ({
    ...state,
    uploading: true,
    uploadProgress: 0,
    error: null
  })),

  on(ResumeActions.uploadResumesProgress, (state, { progress }) => ({
    ...state,
    uploadProgress: progress
  })),

  on(ResumeActions.uploadResumesSuccess, (state, { response }) => ({
    ...state,
    uploading: false,
    uploadProgress: 100,
    error: null
  })),

  on(ResumeActions.uploadResumesFailure, (state, { error }) => ({
    ...state,
    uploading: false,
    uploadProgress: 0,
    error
  })),

  // Clear Selected Resume
  on(ResumeActions.clearSelectedResume, (state) => ({
    ...state,
    selectedResume: null
  })),

  // Clear Resumes
  on(ResumeActions.clearResumes, (state) => ({
    ...state,
    resumes: []
  })),

  // Clear Error
  on(ResumeActions.clearResumeError, (state) => ({
    ...state,
    error: null
  }))
);
