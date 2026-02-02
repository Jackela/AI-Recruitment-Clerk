import type { MemoizedSelector } from '@ngrx/store';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { ResumeState } from './resume.state';
import type { ResumeListItem, ResumeDetail } from './resume.model';

// Extended analysis type for runtime data that may include skills
interface ExtendedAnalysis {
  overallScore: number;
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  skills?: string[];
}

// Feature selector for the resume state
export const selectResumeState = createFeatureSelector<ResumeState>('resumes');

// Basic state selectors
export const selectAllResumes = createSelector(
  selectResumeState,
  (state: ResumeState): ResumeListItem[] => state.resumes,
);

export const selectSelectedResume = createSelector(
  selectResumeState,
  (state: ResumeState): ResumeDetail | null => state.selectedResume,
);

export const selectResumesLoading = createSelector(
  selectResumeState,
  (state: ResumeState): boolean => state.loading,
);

export const selectResumesError = createSelector(
  selectResumeState,
  (state: ResumeState): string | null => state.error,
);

export const selectResumeUploading = createSelector(
  selectResumeState,
  (state: ResumeState): boolean => state.uploading,
);

export const selectResumeUploadProgress = createSelector(
  selectResumeState,
  (state: ResumeState): number => state.uploadProgress,
);

// Derived selectors
export const selectResumesCount = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): number => resumes.length,
);

export const selectResumeById = (resumeId: string): MemoizedSelector<object, ResumeListItem | undefined> =>
  createSelector(
    selectAllResumes,
    (resumes: ResumeListItem[]): ResumeListItem | undefined =>
      resumes.find((resume) => resume.id === resumeId),
  );

export const selectResumesByStatus = (status: string): MemoizedSelector<object, ResumeListItem[]> =>
  createSelector(
    selectAllResumes,
    (resumes: ResumeListItem[]): ResumeListItem[] =>
      resumes.filter((resume) => resume.status === status),
  );

const isProcessedStatus = (status: string | undefined) =>
  status === 'completed' || status === 'processed';
const isProcessingStatus = (status: string | undefined) =>
  status === 'pending' ||
  status === 'parsing' ||
  status === 'scoring' ||
  status === 'processing';

export const selectProcessedResumes = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter((resume) => isProcessedStatus(resume.status)),
);

export const selectPendingResumes = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]): ResumeListItem[] =>
    resumes.filter((resume) => isProcessingStatus(resume.status)),
);

// Recent resumes selector
export const selectRecentResumes = (limit = 10): MemoizedSelector<object, ResumeListItem[]> =>
  createSelector(
    selectAllResumes,
    (resumes: ResumeListItem[]): ResumeListItem[] =>
      resumes
        .slice() // Create shallow copy for sorting
        .sort((a, b) => {
          const dateA = a.uploadedAt || a.createdAt;
          const dateB = b.uploadedAt || b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, limit),
  );

// High-scoring resumes selector
export const selectHighScoringResumes = (threshold = 80): MemoizedSelector<object, ResumeListItem[]> =>
  createSelector(
    selectAllResumes,
    (resumes: ResumeListItem[]): ResumeListItem[] =>
      resumes.filter(
        (resume) =>
          !!resume.analysis && resume.analysis.overallScore >= threshold,
      ),
  );

// UI state selectors
export const selectResumeLoadingState = createSelector(
  selectResumesLoading,
  selectResumeUploading,
  (loading: boolean, uploading: boolean) => ({
    loading,
    uploading,
    isLoading: loading || uploading,
  }),
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
    canUpload: !uploading,
  }),
);

export const selectResumesWithError = createSelector(
  selectResumesError,
  selectResumesLoading,
  (error: string | null, loading: boolean) => ({
    error,
    hasError: !!error && !loading,
  }),
);

// Complex derived selectors
export const selectResumeStatistics = createSelector(
  selectAllResumes,
  (resumes: ResumeListItem[]) => {
    const total = resumes.length;
    const processed = resumes.filter((r) =>
      isProcessedStatus(r.status),
    ).length;
    const processing = resumes.filter((r) =>
      isProcessingStatus(r.status),
    ).length;
    const failed = resumes.filter(
      (resume) => resume.status === 'failed',
    ).length;

    // Calculate average score for processed resumes only
    const processedWithScores = resumes.filter(
      (resume) =>
        isProcessedStatus(resume.status) &&
        resume.analysis?.overallScore !== undefined,
    );
    const averageScore =
      processedWithScores.length > 0
        ? processedWithScores.reduce(
            (sum, resume) => sum + (resume.analysis?.overallScore || 0),
            0,
          ) / processedWithScores.length
        : 0;

    // Build top skills from processed resumes, preserving first-seen order across resumes
    const skillCountMap = new Map<string, number>();
    const orderedSkills: string[] = [];
    for (const resume of resumes) {
      if (!isProcessedStatus(resume.status)) continue;
      const analysis = resume.analysis as ExtendedAnalysis | undefined;
      const skills = analysis?.skills;
      if (!Array.isArray(skills)) continue;
      for (const raw of skills) {
        const key = String(raw);
        if (!skillCountMap.has(key)) {
          orderedSkills.push(key);
        }
        skillCountMap.set(key, (skillCountMap.get(key) || 0) + 1);
      }
    }
    const topSkills: { skill: string; count: number }[] = orderedSkills.map(
      (skill) => ({ skill, count: skillCountMap.get(skill) || 0 }),
    );

    return {
      total,
      processed,
      processing,
      failed,
      averageScore: Math.round(averageScore * 100) / 100,
      processingRate: total > 0 ? Math.round((processed / total) * 100) : 0,
      topSkills,
    };
  },
);

// Resumes by score range
export const selectResumesByScoreRange = (minScore: number, maxScore: number): MemoizedSelector<object, ResumeListItem[]> =>
  createSelector(
    selectAllResumes,
    (resumes: ResumeListItem[]): ResumeListItem[] =>
      resumes.filter((resume) => {
        const score = resume.analysis?.overallScore;
        return score !== undefined && score >= minScore && score <= maxScore;
      }),
  );

// Resume search functionality
export const selectResumesBySkill = (skillQuery: string): MemoizedSelector<object, ResumeListItem[]> =>
  createSelector(
    selectAllResumes,
    (resumes: ResumeListItem[]): ResumeListItem[] => {
      if (!skillQuery || !skillQuery.trim()) return [];
      const q = skillQuery.toLowerCase();
      return resumes.filter((resume) => {
        const analysis = resume.analysis as ExtendedAnalysis | undefined;
        const skills = analysis?.skills;
        if (!Array.isArray(skills)) return false;
        return skills.some((s) => s?.toLowerCase().includes(q));
      });
    },
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
    isProcessing: state.uploading || state.loading,
  }),
);
