/**
 * Mock Data Factory
 *
 * Factory functions for generating test data across all domains.
 * Provides consistent, type-safe mock data generation for repository tests.
 *
 * @module MockDataFactory
 * @since v1.0.0
 */

import {
  UserRole,
  UserStatus,
  Permission,
} from '@ai-recruitment-clerk/user-management-domain';

/**
 * Job status values for recruitment lifecycle.
 */
export type JobStatus =
  | 'draft'
  | 'active'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'archived'
  | 'closed';

/**
 * Resume processing status values.
 */
export type ResumeStatus =
  | 'pending'
  | 'parsing'
  | 'scoring'
  | 'completed'
  | 'failed';

/**
 * User entity structure for repository testing.
 */
export interface MockUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job entity structure for repository testing.
 */
export interface MockJob {
  id: string;
  title: string;
  jdText: string;
  status: JobStatus;
  organizationId: string;
  createdBy: string;
  resumeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resume entity structure for repository testing.
 */
export interface MockResume {
  id: string;
  jobId: string;
  originalFilename: string;
  filePath?: string;
  status: ResumeStatus;
  candidateName?: string;
  matchScore?: number;
  contactInfo?: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  skills?: string[];
  workExperience?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    summary: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    major: string | null;
  }>;
  extractedData?: {
    name?: string;
    email?: string;
    skills?: string[];
    experience?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  uploadedAt?: Date;
}

/**
 * Analysis result structure for repository testing.
 */
export interface MockAnalysis {
  id: string;
  resumeId: string;
  jobId: string;
  overallScore: number;
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  summary: string;
  recommendations?: string[];
  skillGaps?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Counter for generating unique IDs
let idCounter = 0;

/**
 * Generates a unique ID string.
 * @param prefix - The prefix for the ID
 * @returns Unique ID string
 */
const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${++idCounter}`;

/**
 * Factory for creating mock User entities.
 *
 * @param overrides - Partial user data to override defaults
 * @returns Complete mock User object
 *
 * @example
 * ```typescript
 * const admin = createUser({ role: UserRole.ADMIN });
 * const recruiter = createUser({
 *   firstName: 'Jane',
 *   lastName: 'Doe'
 * });
 * ```
 */
export const createUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: generateId('user'),
  email: `user${idCounter}@example.com`,
  username: `user${idCounter}`,
  firstName: 'Test',
  lastName: 'User',
  name: 'Test User',
  role: UserRole.RECRUITER,
  status: UserStatus.ACTIVE,
  organizationId: generateId('org'),
  permissions: [Permission.READ_JOB, Permission.UPLOAD_RESUME],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Factory for creating multiple mock User entities.
 *
 * @param count - Number of users to create
 * @param overrides - Partial user data applied to all
 * @returns Array of mock User objects
 */
export const createUsers = (
  count: number,
  overrides: Partial<MockUser> = {},
): MockUser[] =>
  Array.from({ length: count }, (_, i) =>
    createUser({ ...overrides, email: `user${i}@example.com` }),
  );

/**
 * Factory for creating mock Job entities.
 *
 * @param overrides - Partial job data to override defaults
 * @returns Complete mock Job object
 *
 * @example
 * ```typescript
 * const job = createJob({
 *   title: 'Senior Developer',
 *   status: 'active'
 * });
 * ```
 */
export const createJob = (overrides: Partial<MockJob> = {}): MockJob => ({
  id: generateId('job'),
  title: `Software Engineer ${idCounter}`,
  jdText:
    'We are looking for a skilled software engineer with experience in TypeScript and Node.js.',
  status: 'active',
  organizationId: generateId('org'),
  createdBy: generateId('user'),
  resumeCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Factory for creating multiple mock Job entities.
 *
 * @param count - Number of jobs to create
 * @param overrides - Partial job data applied to all
 * @returns Array of mock Job objects
 */
export const createJobs = (
  count: number,
  overrides: Partial<MockJob> = {},
): MockJob[] =>
  Array.from({ length: count }, (_, i) =>
    createJob({ ...overrides, title: `Job ${i}` }),
  );

/**
 * Factory for creating mock Resume entities.
 *
 * @param overrides - Partial resume data to override defaults
 * @returns Complete mock Resume object
 *
 * @example
 * ```typescript
 * const resume = createResume({
 *   jobId: job.id,
 *   candidateName: 'John Smith'
 * });
 * ```
 */
export const createResume = (
  overrides: Partial<MockResume> = {},
): MockResume => ({
  id: generateId('resume'),
  jobId: generateId('job'),
  originalFilename: `resume-${idCounter}.pdf`,
  filePath: `/uploads/resume-${idCounter}.pdf`,
  status: 'completed',
  candidateName: `Candidate ${idCounter}`,
  matchScore: 85,
  contactInfo: {
    name: `Candidate ${idCounter}`,
    email: `candidate${idCounter}@example.com`,
    phone: '+1-555-0123',
  },
  skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
  workExperience: [
    {
      company: 'Tech Corp',
      position: 'Senior Developer',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      summary: 'Led development of microservices architecture',
    },
  ],
  education: [
    {
      school: 'University of Technology',
      degree: 'Bachelor of Science',
      major: 'Computer Science',
    },
  ],
  extractedData: {
    name: `Candidate ${idCounter}`,
    email: `candidate${idCounter}@example.com`,
    skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
    experience: '5 years of software development experience',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  uploadedAt: new Date(),
  ...overrides,
});

/**
 * Factory for creating multiple mock Resume entities.
 *
 * @param count - Number of resumes to create
 * @param overrides - Partial resume data applied to all
 * @returns Array of mock Resume objects
 */
export const createResumes = (
  count: number,
  overrides: Partial<MockResume> = {},
): MockResume[] =>
  Array.from({ length: count }, (_, i) =>
    createResume({ ...overrides, originalFilename: `resume-${i}.pdf` }),
  );

/**
 * Factory for creating mock Analysis entities.
 *
 * @param overrides - Partial analysis data to override defaults
 * @returns Complete mock Analysis object
 *
 * @example
 * ```typescript
 * const analysis = createAnalysis({
 *   resumeId: resume.id,
 *   jobId: job.id,
 *   overallScore: 92
 * });
 * ```
 */
export const createAnalysis = (
  overrides: Partial<MockAnalysis> = {},
): MockAnalysis => ({
  id: generateId('analysis'),
  resumeId: generateId('resume'),
  jobId: generateId('job'),
  overallScore: 85,
  skillsMatch: 90,
  experienceMatch: 80,
  educationMatch: 85,
  summary:
    'Strong candidate with relevant experience in TypeScript and Node.js development.',
  recommendations: [
    'Consider for technical interview',
    'Strong match for backend role',
  ],
  skillGaps: ['GraphQL', 'Docker'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Factory for creating multiple mock Analysis entities.
 *
 * @param count - Number of analyses to create
 * @param overrides - Partial analysis data applied to all
 * @returns Array of mock Analysis objects
 */
export const createAnalyses = (
  count: number,
  overrides: Partial<MockAnalysis> = {},
): MockAnalysis[] =>
  Array.from({ length: count }, (_, i) =>
    createAnalysis({ ...overrides, overallScore: 70 + i * 5 }),
  );

/**
 * Resets the ID counter. Call this between test suites for deterministic IDs.
 */
export const resetIdCounter = (): void => {
  idCounter = 0;
};

/**
 * Utility to create a complete test scenario with all related entities.
 *
 * @returns Object containing user, job, resume, and analysis
 */
export const createTestScenario = (): {
  user: MockUser;
  job: MockJob;
  resume: MockResume;
  analysis: MockAnalysis;
} => {
  const user = createUser();
  const job = createJob({
    createdBy: user.id,
    organizationId: user.organizationId,
  });
  const resume = createResume({
    jobId: job.id,
    uploadedAt: new Date(),
  });
  const analysis = createAnalysis({
    resumeId: resume.id,
    jobId: job.id,
  });

  return { user, job, resume, analysis };
};
