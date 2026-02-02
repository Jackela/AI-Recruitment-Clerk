/**
 * Test fixtures and mock data for JD Extractor Service testing
 * Based on Resume Parser Service patterns for consistency
 */

import type {
  JobJdSubmittedEvent,
  AnalysisJdExtractedEvent,
} from '../dto/events.dto';
import type {
  JdDTO,
  LlmExtractionRequest,
  LlmExtractionResponse,
} from '@ai-recruitment-clerk/job-management-domain';
import type { NatsPublishResult } from '../nats/nats.client';

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
export const createMockProcessingErrorEvent = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
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
  event: unknown,
): event is JobJdSubmittedEvent => {
  const e = event as Record<string, unknown>;
  return (
    e !== null &&
    typeof e === 'object' &&
    typeof e.jobId === 'string' &&
    typeof e.jobTitle === 'string' &&
    typeof e.jdText === 'string' &&
    (e.jdText as string).length > 50 &&
    typeof e.timestamp === 'string'
  );
};

export const isValidAnalysisJdExtractedEvent = (
  event: unknown,
): event is AnalysisJdExtractedEvent => {
  const e = event as Record<string, unknown>;
  return (
    e !== null &&
    typeof e === 'object' &&
    typeof e.jobId === 'string' &&
    e.extractedData !== null &&
    e.extractedData !== undefined &&
    isValidExtractedJdDTO(e.extractedData) &&
    typeof e.timestamp === 'string' &&
    typeof e.processingTimeMs === 'number' &&
    (e.processingTimeMs as number) > 0
  );
};

export const isValidExtractedJdDTO = (dto: unknown): dto is JdDTO => {
  const d = dto as Record<string, unknown>;
  const requirements = d?.requirements as Record<string, unknown> | undefined;
  return (
    d !== null &&
    typeof d === 'object' &&
    requirements !== null &&
    requirements !== undefined &&
    Array.isArray(requirements.technical) &&
    Array.isArray(requirements.soft) &&
    typeof requirements.experience === 'string' &&
    typeof requirements.education === 'string' &&
    Array.isArray(d.responsibilities) &&
    (d.responsibilities as unknown[]).length > 0 &&
    (!d.benefits || Array.isArray(d.benefits)) &&
    (!d.company || typeof d.company === 'object')
  );
};

export const isValidLlmExtractionRequest = (
  request: unknown,
): request is LlmExtractionRequest => {
  const r = request as Record<string, unknown>;
  return (
    r !== null &&
    typeof r === 'object' &&
    typeof r.jobTitle === 'string' &&
    typeof r.jdText === 'string' &&
    (r.jdText as string).length > 50
  );
};

export const isValidLlmExtractionResponse = (
  response: unknown,
): response is LlmExtractionResponse => {
  const r = response as Record<string, unknown>;
  return (
    r !== null &&
    typeof r === 'object' &&
    r.extractedData !== null &&
    r.extractedData !== undefined &&
    isValidExtractedJdDTO(r.extractedData) &&
    typeof r.confidence === 'number' &&
    (r.confidence as number) >= 0 &&
    (r.confidence as number) <= 1 &&
    typeof r.processingTimeMs === 'number' &&
    (r.processingTimeMs as number) > 0
  );
};

export const isValidNatsPublishResult = (
  result: unknown,
): result is NatsPublishResult => {
  const r = result as Record<string, unknown>;
  return (
    r !== null &&
    typeof r === 'object' &&
    typeof r.success === 'boolean' &&
    (r.success
      ? typeof r.messageId === 'string'
      : typeof r.error === 'string')
  );
};

// Jest assertion helpers - only use in test files
declare const expect: {
  (value: unknown): { toBe(expected: unknown): void };
};

export const validateJobJdSubmittedEvent = (event: unknown): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidJobJdSubmittedEvent(event)).toBe(true);
};

export const validateAnalysisJdExtractedEvent = (event: unknown): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidAnalysisJdExtractedEvent(event)).toBe(true);
};

export const validateExtractedJdDTO = (dto: unknown): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidExtractedJdDTO(dto)).toBe(true);
};

export const validateLlmExtractionRequest = (request: unknown): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidLlmExtractionRequest(request)).toBe(true);
};

export const validateLlmExtractionResponse = (response: unknown): void => {
  if (typeof expect === 'undefined') {
    throw new Error(
      'This validation helper can only be used in Jest test environment',
    );
  }
  expect(isValidLlmExtractionResponse(response)).toBe(true);
};

export const validateNatsPublishResult = (result: unknown): void => {
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
