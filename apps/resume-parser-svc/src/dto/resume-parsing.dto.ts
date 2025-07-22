export interface VisionLlmRequest {
  pdfBuffer: Buffer;
  filename: string;
  options?: {
    language?: string;
    extractionPrompt?: string;
  };
}

export interface VisionLlmResponse {
  extractedData: any; // Raw LLM output
  confidence: number;
  processingTimeMs: number;
}

export interface GridFsFileInfo {
  id: string;
  filename: string;
  contentType: string;
  length: number;
  uploadDate: Date;
}

export interface FieldMappingResult {
  resumeDto: any; // Normalized ResumeDTO
  validationErrors: string[];
  mappingConfidence: number;
}