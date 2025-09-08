/**
 * Test fixtures and mock data for JD Extractor Service testing
 * Based on Resume Parser Service patterns for consistency
 */

import {
  JobJdSubmittedEvent,
  AnalysisJdExtractedEvent,
} from '../dto/events.dto';
import {
  JdDTO,
  LlmExtractionRequest,
  LlmExtractionResponse,
} from '@ai-recruitment-clerk/job-management-domain';
import { NatsPublishResult } from '../nats/nats.client';

/**
 * Mock factory for JobJdSubmittedEvent
 */
export const createMockJobJdSubmittedEvent = (
  overrides?: Partial<JobJdSubmittedEvent>,
): JobJdSubmittedEvent => ({
  jobId: 'job-uuid-123',
  jobTitle: 'Senior Full Stack Developer',
  jdText: `
    We are seeking a Senior Full Stack Developer to join our dynamic technology team.
    
    Responsibilities:
    - Design and develop scalable web applications using React and Node.js
    - Collaborate with cross-functional teams to define and implement new features
    - Ensure high-quality code through testing and code reviews
    - Mentor junior developers and contribute to technical decisions
    
    Requirements:
    - 5+ years of experience in full-stack development
    - Proficiency in JavaScript, TypeScript, React, and Node.js
    - Experience with Docker, Kubernetes, and cloud platforms (AWS/Azure)
    - Strong problem-solving and communication skills
    - Bachelor's degree in Computer Science or related field
    
    Benefits:
    - Health insurance and dental coverage
    - Flexible remote work arrangements
    - Stock options and 401k matching
    - Professional development opportunities
    
    TechCorp Solutions is a fast-growing technology company in the software industry.
  `,
  timestamp: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

/**
 * Mock factory for AnalysisJdExtractedEvent
 */
export const createMockAnalysisJdExtractedEvent = (
  overrides?: Partial<AnalysisJdExtractedEvent>,
): AnalysisJdExtractedEvent => ({
  jobId: 'job-uuid-123',
  extractedData: createMockExtractedJdDTO(),
  timestamp: '2024-01-01T12:05:00.000Z',
  processingTimeMs: 4200,
  ...overrides,
});

/**
 * Mock factory for extracted JD DTO with comprehensive data
 */
export const createMockExtractedJdDTO = (
  overrides?: Partial<JdDTO>,
): JdDTO => ({
  requirements: {
    technical: [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'Docker',
      'Kubernetes',
      'AWS',
    ],
    soft: ['communication', 'problem-solving', 'teamwork', 'leadership'],
    experience: 'Senior (5+ years)',
    education: "Bachelor's degree",
  },
  responsibilities: [
    'Design and develop scalable web applications using React and Node.js',
    'Collaborate with cross-functional teams to define and implement new features',
    'Ensure high-quality code through testing and code reviews',
    'Mentor junior developers and contribute to technical decisions',
  ],
  benefits: ['health insurance', 'remote work', 'stock options', '401k'],
  company: {
    name: 'TechCorp Solutions',
    industry: 'Technology',
    size: 'Medium (51-500 employees)',
  },
  ...overrides,
});

/**
 * Mock factory for minimal JD DTO (edge case testing)
 */
export const createMockMinimalJdDTO = (overrides?: Partial<JdDTO>): JdDTO => ({
  requirements: {
    technical: ['JavaScript'],
    soft: ['communication'],
    experience: 'Not specified',
    education: 'Not specified',
  },
  responsibilities: ['Key responsibilities to be defined'],
  benefits: [],
  company: {},
  ...overrides,
});

/**
 * Mock factory for LLM extraction request
 */
export const createMockLlmExtractionRequest = (
  overrides?: Partial<LlmExtractionRequest>,
): LlmExtractionRequest => ({
  jobTitle: 'Senior Full Stack Developer',
  jdText: createMockJobJdSubmittedEvent().jdText,
  ...overrides,
});

/**
 * Mock factory for LLM extraction response
 */
export const createMockLlmExtractionResponse = (
  overrides?: Partial<LlmExtractionResponse>,
): LlmExtractionResponse => ({
  extractedData: createMockExtractedJdDTO(),
  confidence: 0.85,
  processingTimeMs: 3500,
  ...overrides,
});

/**
 * Mock factory for low confidence LLM response (edge case testing)
 */
export const createMockLowConfidenceLlmResponse = (
  overrides?: Partial<LlmExtractionResponse>,
): LlmExtractionResponse => ({
  extractedData: createMockMinimalJdDTO(),
  confidence: 0.45,
  processingTimeMs: 2800,
  ...overrides,
});

/**
 * Mock NATS publish results for different scenarios
 */
export const createMockNatsPublishResult = (
  success = true,
  messageId?: string,
  error?: string,
): NatsPublishResult => ({
  success,
  messageId: messageId || `msg_${Date.now()}_test`,
  error,
});

/**
 * Mock factory for successful NATS publish result
 */
export const createMockNatsSuccessResult = (
  messageId?: string,
): NatsPublishResult => createMockNatsPublishResult(true, messageId);

/**
 * Mock factory for failed NATS publish result
 */
export const createMockNatsFailureResult = (
  error = 'Connection timeout',
): NatsPublishResult => createMockNatsPublishResult(false, undefined, error);

/**
 * Mock factory for processing error event
 */
export const createMockProcessingErrorEvent = (overrides?: any) => ({
  jobId: 'job-uuid-123',
  error: {
    message: 'LLM processing failed after 3 retries',
    stack:
      'Error: LLM processing failed\n    at ExtractionService.processJobDescription',
    name: 'ProcessingError',
  },
  timestamp: '2024-01-01T12:10:00.000Z',
  service: 'jd-extractor-svc',
  ...overrides,
});

/**
 * Test data validation helpers (Jest-compatible)
 * These functions should only be used in test environments where Jest is available
 */

// Type guard functions for runtime validation (production-safe)
export const isValidJobJdSubmittedEvent = (
  event: any,
): event is JobJdSubmittedEvent => {
  return (
    event &&
    typeof event.jobId === 'string' &&
    typeof event.jobTitle === 'string' &&
    typeof event.jdText === 'string' &&
    event.jdText.length > 50 &&
    typeof event.timestamp === 'string'
  );
};

export const isValidAnalysisJdExtractedEvent = (
  event: any,
): event is AnalysisJdExtractedEvent => {
  return (
    event &&
    typeof event.jobId === 'string' &&
    event.extractedData &&
    isValidExtractedJdDTO(event.extractedData) &&
    typeof event.timestamp === 'string' &&
    typeof event.processingTimeMs === 'number' &&
    event.processingTimeMs > 0
  );
};

export const isValidExtractedJdDTO = (dto: any): dto is JdDTO => {
  return (
    dto &&
    dto.requirements &&
    Array.isArray(dto.requirements.technical) &&
    Array.isArray(dto.requirements.soft) &&
    typeof dto.requirements.experience === 'string' &&
    typeof dto.requirements.education === 'string' &&
    Array.isArray(dto.responsibilities) &&
    dto.responsibilities.length > 0 &&
    (!dto.benefits || Array.isArray(dto.benefits)) &&
    (!dto.company || typeof dto.company === 'object')
  );
};

export const isValidLlmExtractionRequest = (
  request: any,
): request is LlmExtractionRequest => {
  return (
    request &&
    typeof request.jobTitle === 'string' &&
    typeof request.jdText === 'string' &&
    request.jdText.length > 50
  );
};

export const isValidLlmExtractionResponse = (
  response: any,
): response is LlmExtractionResponse => {
  return (
    response &&
    response.extractedData &&
    isValidExtractedJdDTO(response.extractedData) &&
    typeof response.confidence === 'number' &&
    response.confidence >= 0 &&
    response.confidence <= 1 &&
    typeof response.processingTimeMs === 'number' &&
    response.processingTimeMs > 0
  );
};

export const isValidNatsPublishResult = (
  result: any,
): result is NatsPublishResult => {
  return (
    result &&
    typeof result.success === 'boolean' &&
    (result.success
      ? typeof result.messageId === 'string'
      : typeof result.error === 'string')
  );
};

// Jest assertion helpers - only use in test files
declare const expect: any;

export const validateJobJdSubmittedEvent = (event: any): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidJobJdSubmittedEvent(event)).toBe(true);
};

export const validateAnalysisJdExtractedEvent = (event: any): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidAnalysisJdExtractedEvent(event)).toBe(true);
};

export const validateExtractedJdDTO = (dto: any): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidExtractedJdDTO(dto)).toBe(true);
};

export const validateLlmExtractionRequest = (request: any): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidLlmExtractionRequest(request)).toBe(true);
};

export const validateLlmExtractionResponse = (response: any): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidLlmExtractionResponse(response)).toBe(true);
};

export const validateNatsPublishResult = (result: any): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidNatsPublishResult(result)).toBe(true);
};

/**
 * Utility functions for test scenarios
 */
export const createLongJdText = (): string => {
  const baseJd = createMockJobJdSubmittedEvent().jdText;
  return baseJd + '\n\n' + baseJd.repeat(5); // Create very long JD
};

export const createShortJdText = (): string => {
  return 'Short JD'; // Too short for processing
};

export const createMalformedJdText = (): string => {
  return '{"malformed": "json"'; // Invalid format
};

/**
 * Mock data collections for bulk testing
 */
export const createMultipleJobEvents = (
  count: number,
): JobJdSubmittedEvent[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockJobJdSubmittedEvent({
      jobId: `job-uuid-${index + 1}`,
      jobTitle: `Job Title ${index + 1}`,
      timestamp: new Date(Date.now() + index * 1000).toISOString(),
    }),
  );
};

export const createMultipleAnalysisEvents = (
  count: number,
): AnalysisJdExtractedEvent[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockAnalysisJdExtractedEvent({
      jobId: `job-uuid-${index + 1}`,
      timestamp: new Date(Date.now() + index * 1000).toISOString(),
      processingTimeMs: 3000 + index * 500,
    }),
  );
};

/**
 * Error scenario mocks
 */
export const createTimeoutError = (): Error => {
  const error = new Error('Request timeout after 30 seconds');
  error.name = 'TimeoutError';
  return error;
};

export const createValidationError = (): Error => {
  const error = new Error('Invalid job description format');
  error.name = 'ValidationError';
  return error;
};

export const createLlmServiceError = (): Error => {
  const error = new Error('LLM service temporarily unavailable');
  error.name = 'ServiceError';
  return error;
};

export const createNatsConnectionError = (): Error => {
  const error = new Error('NATS connection lost');
  error.name = 'ConnectionError';
  return error;
};
