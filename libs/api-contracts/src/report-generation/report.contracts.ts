/**
 * Report Generation API Contracts
 * Shared contract definitions for analysis reports between frontend and backend
 */

export namespace ReportContracts {
  /**
   * Report status enum
   */
  export type ReportStatus = 'processing' | 'completed' | 'failed';

  /**
   * Complete analysis report with all details
   */
  export interface AnalysisReport {
    id: string;
    resumeId: string;
    jobId: string;
    candidateName: string;
    matchScore: number; // 0-100
    oneSentenceSummary: string;
    strengths: string[];
    potentialGaps: string[];
    redFlags: string[];
    suggestedInterviewQuestions: string[];
    generatedAt: Date;
  }

  /**
   * Report list item for table displays
   */
  export interface ReportListItem {
    id: string;
    jobId: string;
    candidateName: string;
    matchScore: number;
    oneSentenceSummary: string;
    summary?: string;
    status: ReportStatus;
    generatedAt: Date;
    createdAt?: Date;
  }

  /**
   * Collection of reports for a job
   */
  export interface ReportsList {
    jobId: string;
    reports: ReportListItem[];
  }
}