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

export interface SkillAnalysis {
  technical: number;
  communication: number;
  problemSolving: number;
  teamwork: number;
  leadership: number;
}

export interface ExperienceDetail {
  company: string;
  position: string;
  duration: string;
  description: string;
}

export interface EducationDetail {
  degree: string;
  major: string;
  university: string;
  graduationYear: string;
}

export interface RadarChartData {
  skill: string;
  value: number;
}

export interface SkillTagStyle {
  'background-color': string;
  color: string;
}
