/**
 * Resume Processing API Contracts
 * Shared contract definitions for resume data between frontend and backend
 */

export namespace ResumeContracts {
  /**
   * Resume processing status
   */
  export type ResumeStatus = 'pending' | 'processing' | 'completed' | 'failed';

  /**
   * Detailed resume information
   */
  export interface ResumeDetail {
    id: string;
    jobId: string;
    filename: string;
    candidateName: string;
    uploadedAt: Date;
    status: ResumeStatus;
    fileSize: number;
    summary?: string;
    skills?: string[];
    experience?: {
      totalYears: number;
      positions: Array<{
        title: string;
        company: string;
        duration: string;
      }>;
    };
  }

  /**
   * Resume list item for table displays
   */
  export interface ResumeListItem {
    id: string;
    jobId: string;
    filename: string;
    candidateName: string;
    uploadedAt: Date;
    status: ResumeStatus;
    fileSize: number;
  }

  /**
   * Response after resume upload
   */
  export interface ResumeUploadResponse {
    success: boolean;
    uploadedCount: number;
    failedCount: number;
    resumes: Array<{
      filename: string;
      status: 'success' | 'failed';
      resumeId?: string;
      error?: string;
    }>;
  }
}