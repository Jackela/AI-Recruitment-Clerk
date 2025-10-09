/**
 * Defines the shape of the analysis report.
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
 * Defines the shape of the report list item.
 */
export interface ReportListItem {
  id: string;
  jobId: string;
  candidateName: string;
  matchScore: number;
  oneSentenceSummary: string;
  summary?: string;
  status: 'completed' | 'processing' | 'failed';
  generatedAt: Date;
  createdAt?: Date;
}

/**
 * Defines the shape of the reports list.
 */
export interface ReportsList {
  jobId: string;
  reports: ReportListItem[];
}
