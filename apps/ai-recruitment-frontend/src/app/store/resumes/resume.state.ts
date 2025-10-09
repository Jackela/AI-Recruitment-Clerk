import { ResumeListItem, ResumeDetail } from './resume.model';

/**
 * Defines the shape of the resume state.
 */
export interface ResumeState {
  resumes: ResumeListItem[];
  selectedResume: ResumeDetail | null;
  loading: boolean;
  error: string | null;
  uploading: boolean;
  uploadProgress: number;
}

export const initialResumeState: ResumeState = {
  resumes: [],
  selectedResume: null,
  loading: false,
  error: null,
  uploading: false,
  uploadProgress: 0,
};
