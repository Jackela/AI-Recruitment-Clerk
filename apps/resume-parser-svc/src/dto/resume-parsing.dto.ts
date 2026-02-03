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
  extractedData: Record<string, unknown>; // Raw LLM output
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

import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

/**
 * Defines the shape of the field mapping result.
 */
export interface FieldMappingResult {
  resumeDto: ResumeDTO;
  validationErrors: string[];
  mappingConfidence: number;
}
