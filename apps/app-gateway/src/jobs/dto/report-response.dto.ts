export class AnalysisReportDto {
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

  constructor(
    id: string,
    resumeId: string,
    jobId: string,
    candidateName: string,
    matchScore: number,
    oneSentenceSummary: string,
    strengths: string[],
    potentialGaps: string[],
    redFlags: string[],
    suggestedInterviewQuestions: string[],
    generatedAt: Date = new Date(),
  ) {
    this.id = id;
    this.resumeId = resumeId;
    this.jobId = jobId;
    this.candidateName = candidateName;
    this.matchScore = matchScore;
    this.oneSentenceSummary = oneSentenceSummary;
    this.strengths = strengths;
    this.potentialGaps = potentialGaps;
    this.redFlags = redFlags;
    this.suggestedInterviewQuestions = suggestedInterviewQuestions;
    this.generatedAt = generatedAt;
  }
}

export class ReportsListDto {
  jobId: string;
  reports: {
    id: string;
    candidateName: string;
    matchScore: number;
    oneSentenceSummary: string;
    status: 'completed' | 'processing' | 'failed';
    generatedAt: Date;
  }[];

  constructor(
    jobId: string,
    reports: {
      id: string;
      candidateName: string;
      matchScore: number;
      oneSentenceSummary: string;
      status: 'completed' | 'processing' | 'failed';
      generatedAt: Date;
    }[],
  ) {
    this.jobId = jobId;
    this.reports = reports.sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending
  }
}
