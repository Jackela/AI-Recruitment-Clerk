/**
 * Defines the shape of the gap analysis request dto.
 */
export interface GapAnalysisRequestDto {
  jdText?: string;
  resumeText?: string;
  jdSkills?: string[];
  resumeSkills?: string[];
}

/**
 * Defines the shape of the gap analysis result dto.
 */
export interface GapAnalysisResultDto {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedSkills?: string[];
}
