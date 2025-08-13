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

export interface LlmExtractionRequest {
  jobTitle: string;
  jdText: string;
}

export interface LlmExtractionResponse {
  extractedData: JdDTO;
  confidence: number;
  processingTimeMs: number;
}