import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ResumeState } from './resume.state';
import { ResumeListItem, ResumeDetail } from './resume.model';

// Feature selector for the resume state
export const selectResumeState = createFeatureSelector<ResumeState>('resumes');

// Basic state selectors
export const selectAllResumes = createSelector(
  selectResumeState,
  (state: ResumeState): ResumeListItem[] => state.resumes
);

export const selectSelectedResume = createSelector(
  selectResumeState,
  (state: ResumeState): ResumeDetail | null => state.selectedResume
);

export const selectResumesLoading = createSelector(
  selectResumeState,
  (state: ResumeState): boolean => state.loading
);

export const selectResumesError = createSelector(
  selectResumeState,
  (state: ResumeState): string | null => state.error
);

export const selectResumeUploading = createSelector(
  selectResumeState,
  (state: ResumeState): boolean => state.uploading
);

export const selectResumeUploadProgress = createSelector(
  selectResumeState,
  (state: ResumeState): number => state.uploadProgress
);

// Derived selectors
export const selectResumesCount = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): number => resumes.length
);

export const selectResumeById = (resumeId: string) => createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem | undefined =>
    resumes.find(resume => resume.id === resumeId)
);

export const selectResumesByStatus = (status: string) => createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter(resume => resume.status === status)
);

export const selectProcessedResumes = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter(resume => resume.status === 'completed')
);

export const selectPendingResumes = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter(resume => resume.status === 'pending' || resume.status === 'parsing' || resume.status === 'scoring')
);

// Recent resumes selector
export const selectRecentResumes = (limit: number = 10) => createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes
      .slice() // Create shallow copy for sorting
      .sort((a, b) => {
        const dateA = a.uploadedAt || a.createdAt;
        const dateB = b.uploadedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, limit)
);

// High-scoring resumes selector
export const selectHighScoringResumes = (threshold: number = 75) => createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter(resume => 
      resume.analysis && resume.analysis.overallScore >= threshold
    )
);

// UI state selectors
export const selectResumeLoadingState = createSelector(
  selectResumesLoading,
  selectResumeUploading,
  (loading: boolean, uploading: boolean) => ({
    loading,
    uploading,
    isLoading: loading || uploading
  })
);

export const selectResumeUploadState = createSelector(
  selectResumeUploading,
  selectResumeUploadProgress,
  selectResumesError,
  (uploading: boolean, progress: number, error: string | null) => ({
    uploading,
    progress,
    error,
    hasError: !!error,
    canUpload: !uploading
  })
);

export const selectResumesWithError = createSelector(
  selectResumesError,
  selectResumesLoading,
  (error: string | null, loading: boolean) => ({
    error,
    hasError: !!error && !loading
  })
);

// Complex derived selectors
export const selectResumeStatistics = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]) => {
    const total = resumes.length;
    const completed = resumes.filter(resume => resume.status === 'completed').length;
    const processing = resumes.filter(resume => 
      resume.status === 'parsing' || resume.status === 'scoring' || resume.status === 'pending'
    ).length;
    const failed = resumes.filter(resume => resume.status === 'failed').length;
    
    // Calculate average score for completed resumes
    const completedWithScores = resumes.filter(resume => 
      resume.status === 'completed' && resume.analysis?.overallScore !== undefined
    );
    const averageScore = completedWithScores.length > 0 
      ? completedWithScores.reduce((sum, resume) => 
          sum + (resume.analysis?.overallScore || 0), 0
        ) / completedWithScores.length 
      : 0;

    // Skills analysis - placeholder for future implementation
    // Note: ResumeListItem analysis doesn't currently include skills array
    const topSkills: { skill: string; count: number }[] = [];

    return {
      total,
      completed,
      processing,
      failed,
      averageScore: Math.round(averageScore * 100) / 100,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      topSkills
    };
  }
);

// Resumes by score range
export const selectResumesByScoreRange = (minScore: number, maxScore: number) => createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter(resume => {
      const score = resume.analysis?.overallScore;
      return score !== undefined && score >= minScore && score <= maxScore;
    })
);

// Resume search functionality
export const selectResumesBySkill = (skillQuery: string) => createSelector(
  selectAllResumes,
  (_resumes: ResumeListItem[]): ResumeListItem[] => {
    if (!skillQuery.trim()) return [];
    
    // Note: Skills search not implemented - ResumeListItem doesn't include skills array
    // This is a placeholder for future implementation when skills are available
    return [];
  }
);

// Feature selector for resume management
export const selectResumeManagementState = createSelector(
  selectResumeState,
  (state: ResumeState) => ({
    resumes: state.resumes,
    selectedResume: state.selectedResume,
    loading: state.loading,
    uploading: state.uploading,
    uploadProgress: state.uploadProgress,
    error: state.error,
    hasResumes: state.resumes.length > 0,
    canUpload: !state.uploading && !state.loading,
    isProcessing: state.uploading || state.loading
  })
);