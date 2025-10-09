/**
 * Defines the shape of the gap analysis result.
 */
export interface GapAnalysisResult {
  matchedSkills: string[];
  missingSkills: string[];
  suggestedSkills?: string[];
}

/**
 * Defines the shape of the gap analysis request.
 */
export interface GapAnalysisRequest {
  jdText: string;
  resumeText: string;
}

