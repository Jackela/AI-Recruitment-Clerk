/**
 * Test fixtures and mock data for Resume Parser Service testing
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockResumeSubmittedEvent = (overrides?: any): Record<string, unknown> => ({
  jobId: 'job-uuid-123',
  resumeId: 'resume-uuid-456',
  originalFilename: 'john-doe-resume.pdf',
  tempGridFsUrl: 'gridfs://temp/resume-uuid-456',
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockAnalysisResumeParsedEvent = (overrides?: any): Record<string, unknown> => ({
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
  timestamp: '2024-01-01T12:05:00.000Z',
  processingTimeMs: 3500,
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockJobResumeFailedEvent = (overrides?: any): Record<string, unknown> => ({
  jobId: 'job-uuid-123',
  resumeId: 'resume-uuid-456',
  originalFilename: 'john-doe-resume.pdf',
  error: 'Vision LLM processing failed after 3 retries',
  timestamp: '2024-01-01T12:10:00.000Z',
  processingTimeMs: 8000,
  retryAttempts: 3,
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockParsedResumeDto = (overrides?: any): Record<string, unknown> => ({
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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateEventStructure = (event: any, expectedType: string): void => {
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
