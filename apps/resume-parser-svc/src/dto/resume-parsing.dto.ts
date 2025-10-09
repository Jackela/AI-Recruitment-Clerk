/**
 * Defines the shape of the vision llm request.
 */
export interface VisionLlmRequest {
  pdfBuffer: Buffer;
  filename: string;
  options?: {
    language?: string;
    extractionPrompt?: string;
  };
}

/**
 * Defines the shape of the vision llm response.
 */
export interface VisionLlmResponse {
  extractedData: any; // Raw LLM output
  confidence: number;
  processingTimeMs: number;
}

/**
 * Defines the shape of the grid fs file info.
 */
export interface GridFsFileInfo {
  id: string;
  filename: string;
  contentType: string;
  length: number;
  uploadDate: Date;
}

/**
 * Defines the shape of the field mapping result.
 */
export interface FieldMappingResult {
  resumeDto: any; // Normalized ResumeDTO
  validationErrors: string[];
  mappingConfidence: number;
}
