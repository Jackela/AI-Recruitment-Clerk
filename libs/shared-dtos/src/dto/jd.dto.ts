/**
 * Defines the shape of the jd dto.
 */
export interface JdDTO {
  requirements: {
    technical: string[];
    soft: string[];
    experience: string;
    education: string;
  };
  responsibilities: string[];
  benefits: string[];
  company: {
    name?: string;
    industry?: string;
    size?: string;
  };
}

/**
 * Defines the shape of the llm extraction request.
 */
export interface LlmExtractionRequest {
  jobTitle: string;
  jdText: string;
}

/**
 * Defines the shape of the llm extraction response.
 */
export interface LlmExtractionResponse {
  extractedData: JdDTO;
  confidence: number;
  processingTimeMs: number;
}