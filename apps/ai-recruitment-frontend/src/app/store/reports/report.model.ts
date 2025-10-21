/**
 * Defines the shape of the analysis report.
 */
export interface AnalysisReport {
  id: string;
  resumeId: string;
  jobId: string;
  candidateName: string;
  matchScore: number; // 0-100
  jobTitle?: string;
  status?: 'completed' | 'processing' | 'failed';
  createdAt?: Date;
  resumeCount?: number;
  oneSentenceSummary: string;
  strengths: string[];
  potentialGaps: string[];
  redFlags: string[];
  suggestedInterviewQuestions: string[];
  generatedAt: Date;
  analysisData?: {
    totalCandidates?: number;
    topCandidates: Array<{
      resumeId: string;
      candidateName: string;
      matchScore: number;
      summary: string;
    }>;
  };
}

/**
 * Defines the shape of the report list item.
 */
export interface ReportListItem {
  id: string;
  jobId: string;
  candidateName: string;
  jobTitle?: string;
  matchScore: number;
  oneSentenceSummary: string;
  summary?: string;
  status: 'completed' | 'processing' | 'failed';
  generatedAt: Date;
  createdAt?: Date;
  resumeCount?: number;
}

/**
 * Defines the shape of the reports list.
 */
export interface ReportsList {
  jobId: string;
  reports: ReportListItem[];
}
