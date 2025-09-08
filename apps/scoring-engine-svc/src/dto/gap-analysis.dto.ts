export interface GapAnalysisRequestDto {
  jdText?: string;
  resumeText?: string;
  jdSkills?: string[];
  resumeSkills?: string[];
}

export interface GapAnalysisResultDto {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedSkills?: string[];
}

