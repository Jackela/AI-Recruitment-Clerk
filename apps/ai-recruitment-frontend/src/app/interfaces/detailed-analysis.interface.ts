/**
 * Defines the shape of the detailed analysis result.
 */
export interface DetailedAnalysisResult {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  targetPosition: string;
  analysisTime: string;
  score: number;
  summary: string;
  keySkills: string[];
  experience: string;
  education: string;
  recommendations: string[];
  skillAnalysis: SkillAnalysis;
  experienceDetails: ExperienceDetail[];
  educationDetails: EducationDetail;
  strengths: string[];
  improvements: string[];
  reportUrl: string;
}

/**
 * Defines the shape of the skill analysis.
 */
export interface SkillAnalysis {
  technical: number;
  communication: number;
  problemSolving: number;
  teamwork: number;
  leadership: number;
}

/**
 * Defines the shape of the experience detail.
 */
export interface ExperienceDetail {
  company: string;
  position: string;
  duration: string;
  description: string;
}

/**
 * Defines the shape of the education detail.
 */
export interface EducationDetail {
  degree: string;
  major: string;
  university: string;
  graduationYear: string;
}

/**
 * Defines the shape of the radar chart data.
 */
export interface RadarChartData {
  skill: string;
  value: number;
}

/**
 * Defines the shape of the skill tag style.
 */
export interface SkillTagStyle {
  'background-color': string;
  color: string;
}
