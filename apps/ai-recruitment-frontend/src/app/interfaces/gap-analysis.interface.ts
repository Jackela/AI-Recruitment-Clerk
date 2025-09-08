export interface GapAnalysisResult {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedSkills?: string[];
}

export interface GapAnalysisRequest {
  jdText: string;
  resumeText: string;
}

