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

export interface ReportListItem {
  id: string;
  candidateName: string;
  matchScore: number;
  oneSentenceSummary: string;
  status: 'completed' | 'processing' | 'failed';
  generatedAt: Date;
}

export interface ReportsList {
  jobId: string;
  reports: ReportListItem[];
}
