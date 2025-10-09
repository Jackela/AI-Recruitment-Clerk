/**
 * Describes the analysis report data transfer object.
 */
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

  /**
   * Initializes a new instance of the Analysis Report DTO.
   * @param id - The id.
   * @param resumeId - The resume id.
   * @param jobId - The job id.
   * @param candidateName - The candidate name.
   * @param matchScore - The match score.
   * @param oneSentenceSummary - The one sentence summary.
   * @param strengths - The strengths.
   * @param potentialGaps - The potential gaps.
   * @param redFlags - The red flags.
   * @param suggestedInterviewQuestions - The suggested interview questions.
   * @param generatedAt - The generated at.
   */
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

/**
 * Describes the reports list data transfer object.
 */
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

  /**
   * Initializes a new instance of the Reports List DTO.
   * @param jobId - The job id.
   * @param reports - The reports.
   */
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
