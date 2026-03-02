/**
 * Test fixtures and mock data for Resume Parser Service testing
 */

import type { ResumeSubmittedEventData } from '../types/parsing.types';
import type { AnalysisResumeParsedEvent, JobResumeFailedEvent } from '../services/resume-parser-nats.service';

/**
 * Mock factory for ResumeSubmittedEventData
 */
export const createMockResumeSubmittedEvent = (
  overrides?: Partial<ResumeSubmittedEventData>,
): ResumeSubmittedEventData => ({
  jobId: 'job-uuid-123',
  resumeId: 'resume-uuid-456',
  originalFilename: 'john-doe-resume.pdf',
  tempGridFsUrl: 'gridfs://temp/resume-uuid-456',
  ...overrides,
});

/**
 * Mock factory for AnalysisResumeParsedEvent
 */
export const createMockAnalysisResumeParsedEvent = (
  overrides?: Partial<AnalysisResumeParsedEvent>,
): AnalysisResumeParsedEvent => ({
  jobId: 'job-uuid-123',
  resumeId: 'resume-uuid-456',
  resumeDto: {
    contactInfo: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1234567890',
    },
    skills: ['Python', 'JavaScript', 'Machine Learning'],
    workExperience: [
      {
        company: 'TechCorp Solutions',
        position: 'Senior Software Engineer',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        summary: 'Led development team for ML applications',
      },
    ],
    education: [
      {
        school: 'Stanford University',
        degree: 'Master of Science',
        major: 'Computer Science',
      },
    ],
  },
  processingTimeMs: 3500,
  confidence: 0.85,
  parsingMethod: 'ai-vision-llm',
  ...overrides,
});

/**
 * Mock factory for JobResumeFailedEvent
 */
export const createMockJobResumeFailedEvent = (
  overrides?: Partial<JobResumeFailedEvent>,
): JobResumeFailedEvent => ({
  jobId: 'job-uuid-123',
  resumeId: 'resume-uuid-456',
  error: new Error('Vision LLM processing failed after 3 retries'),
  stage: 'parsing',
  retryAttempt: 3,
  ...overrides,
});

/**
 * Parsed resume DTO type for test fixtures
 */
interface MockParsedResumeDto {
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
  };
  skills: string[];
  workExperience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    summary: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    major: string;
    graduationYear?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: string;
  }>;
}

/**
 * Mock factory for ParsedResumeDto
 */
export const createMockParsedResumeDto = (
  overrides?: Partial<MockParsedResumeDto>,
): MockParsedResumeDto => ({
  contactInfo: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1987654321',
    location: 'San Francisco, CA',
  },
  skills: ['TypeScript', 'React', 'Node.js', 'AWS'],
  workExperience: [
    {
      company: 'InnovateAI Corp',
      position: 'Full Stack Developer',
      startDate: '2021-06-01',
      endDate: '2024-01-01',
      summary: 'Built scalable web applications using modern tech stack',
    },
  ],
  education: [
    {
      school: 'UC Berkeley',
      degree: 'Bachelor of Science',
      major: 'Computer Science',
      graduationYear: '2021',
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      issueDate: '2023-08-15',
    },
  ],
  ...overrides,
});

/**
 * Mock NATS publish results for different scenarios
 */
export const createMockNatsPublishResult = (
  success = true,
  messageId?: string,
  error?: string,
): { success: boolean; messageId: string; error?: string } => ({
  success,
  messageId: messageId || `msg_${Date.now()}_test`,
  error,
});

/**
 * Test data validation helpers
 * These functions use Jest's expect and should only be called in test files
 */
export const validateEventStructure = (
  event: Record<string, unknown>,
  expectedType: 'parsed' | 'failed',
): void => {
  expect(event).toBeDefined();
  expect(event.jobId).toBeDefined();
  expect(event.resumeId).toBeDefined();
  expect(event.timestamp).toBeDefined();

  if (expectedType === 'parsed') {
    expect(event.resumeDto).toBeDefined();
    expect(event.processingTimeMs).toBeGreaterThan(0);
  }

  if (expectedType === 'failed') {
    expect(event.error).toBeDefined();
    expect(event.retryAttempts).toBeDefined();
  }
};
