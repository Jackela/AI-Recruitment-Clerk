/**
 * @fileoverview Typed Mock Factory Functions for Test Fixtures
 * @description Standardized factory functions for creating test data across all test files.
 * Provides type-safe mock data generation with sensible defaults and override capabilities.
 * @module testing/mock-factories
 *
 * @example
 * // Create mock resume with defaults
 * const resume = createMockResume();
 *
 * // Create mock resume with custom values
 * const resume = createMockResume({
 *   contactInfo: { name: 'Jane Doe', email: 'jane@example.com', phone: '+1-555-9999' }
 * });
 *
 * // Create mock user with specific role
 * const admin = createMockUser({ role: 'admin' as UserRole });
 */

/// <reference types="jest" />

import type { ResumeDTO, ResumeAnalysisDto } from '@ai-recruitment-clerk/resume-dto';
import type { JdDTO } from '../dto/jd.dto';
import type { UserRole, UserStatus } from '../auth/user.dto';
import type { MessagePattern } from '../common/nats-client.pattern';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Report status enum (mirrors ReportContracts.ReportStatus).
 * Represents the current state of a report generation process.
 */
export type ReportStatus = 'processing' | 'completed' | 'failed';

/**
 * Complete analysis report with all details (mirrors ReportContracts.AnalysisReport).
 * Contains the full analysis output for a candidate evaluation.
 *
 * @example
 * const report: AnalysisReport = {
 *   id: 'report-123',
 *   resumeId: 'resume-456',
 *   jobId: 'job-789',
 *   candidateName: 'John Doe',
 *   matchScore: 85,
 *   oneSentenceSummary: 'Strong candidate with excellent technical skills.',
 *   strengths: ['Technical expertise', 'Communication'],
 *   potentialGaps: ['Leadership experience'],
 *   redFlags: [],
 *   suggestedInterviewQuestions: ['Tell me about...'],
 *   generatedAt: new Date()
 * };
 */
export interface AnalysisReport {
  /** Unique report identifier */
  id: string;
  /** Associated resume ID */
  resumeId: string;
  /** Associated job ID */
  jobId: string;
  /** Candidate's full name */
  candidateName: string;
  /** Overall match score (0-100) */
  matchScore: number;
  /** Brief summary of the candidate evaluation */
  oneSentenceSummary: string;
  /** List of candidate's strengths */
  strengths: string[];
  /** Areas where the candidate may have gaps */
  potentialGaps: string[];
  /** Concerns or red flags identified */
  redFlags: string[];
  /** Suggested questions for the interview */
  suggestedInterviewQuestions: string[];
  /** Timestamp when report was generated */
  generatedAt: Date;
}

/**
 * Report list item for table displays (mirrors ReportContracts.ReportListItem).
 * Lightweight representation used in list views and summaries.
 *
 * @example
 * const item: ReportListItem = {
 *   id: 'report-123',
 *   jobId: 'job-456',
 *   candidateName: 'Jane Smith',
 *   matchScore: 78,
 *   oneSentenceSummary: 'Good candidate with solid foundation.',
 *   status: 'completed',
 *   generatedAt: new Date()
 * };
 */
export interface ReportListItem {
  /** Unique report identifier */
  id: string;
  /** Associated job ID */
  jobId: string;
  /** Candidate's full name */
  candidateName: string;
  /** Overall match score (0-100) */
  matchScore: number;
  /** Brief summary for list display */
  oneSentenceSummary: string;
  /** Optional extended summary */
  summary?: string;
  /** Current report status */
  status: ReportStatus;
  /** Timestamp when report was generated */
  generatedAt: Date;
  /** Optional creation timestamp */
  createdAt?: Date;
}

/**
 * Scoring result DTO for candidate evaluation.
 * Contains detailed score breakdowns across skill, experience, and education dimensions.
 *
 * @example
 * const score: ScoringResultDTO = {
 *   resumeId: 'resume-123',
 *   jobId: 'job-456',
 *   overallScore: 85,
 *   skillScore: { score: 90, details: 'Strong technical skills match' },
 *   experienceScore: { score: 80, details: '5 years relevant experience' },
 *   educationScore: { score: 85, details: 'Bachelor degree matches requirement' },
 *   analyzedAt: new Date()
 * };
 */
export interface ScoringResultDTO {
  /** Resume being scored */
  resumeId: string;
  /** Job being matched against */
  jobId: string;
  /** Overall score (0-100) */
  overallScore: number;
  /** Skill dimension score with explanation */
  skillScore: {
    score: number;
    details: string;
  };
  /** Experience dimension score with explanation */
  experienceScore: {
    score: number;
    details: string;
  };
  /** Education dimension score with explanation */
  educationScore: {
    score: number;
    details: string;
  };
  /** Timestamp when scoring was performed */
  analyzedAt: Date;
}

/**
 * NATS message mock for testing message handlers.
 * Provides a complete mock of NATS message structure with jest mock functions.
 *
 * @example
 * const message = createMockNatsMessage({
 *   subject: 'job.resume.submitted',
 *   data: { resumeId: 'test-123' }
 * });
 *
 * // Verify ack was called
 * expect(message.ack).toHaveBeenCalled();
 */
export interface NatsMessageMock<T = unknown> {
  /** NATS subject the message was received on */
  subject: string;
  /** Parsed message payload */
  data: T;
  /** Message headers */
  headers: Record<string, string>;
  /** ISO timestamp when message was received */
  timestamp: string;
  /** Reply subject for request-response patterns */
  reply?: string;
  /** Acknowledge successful processing */
  ack: jest.Mock;
  /** Negative acknowledgment (requeue) */
  nak: jest.Mock;
  /** Terminate message (don't requeue) */
  term: jest.Mock;
}

// ============================================================================
// Deep Partial Type Helper
// ============================================================================

/**
 * Helper type to allow partial overrides at any depth level.
 * Excludes Date and function types from deep partial transformation
 * to preserve their original types.
 * @internal
 */
type DeepPartial<T> = T extends Date
  ? T
  : T extends (...args: unknown[]) => unknown
    ? T
    : {
        [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
      };

// ============================================================================
// User Mock Interface (plain object version without getter)
// ============================================================================

/**
 * Plain object representation of UserDto for mock creation.
 * This allows creating mock users without class instantiation issues.
 * Compatible with UserDto for use in tests.
 *
 * @example
 * const mockUser: MockUserDto = {
 *   id: 'user-123',
 *   email: 'hr.manager@company.com',
 *   firstName: 'Sarah',
 *   lastName: 'Johnson',
 *   role: 'hr_manager' as UserRole,
 *   organizationId: 'org-456',
 *   status: 'active' as UserStatus,
 *   createdAt: new Date('2023-06-15'),
 *   updatedAt: new Date('2024-01-10')
 * };
 */
export interface MockUserDto {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** User first name */
  firstName: string;
  /** User last name */
  lastName: string;
  /** User role (admin, hr_manager, recruiter, etc.) */
  role: UserRole;
  /** Organization ID for multi-tenant scenarios */
  organizationId?: string;
  /** Account status (active, inactive, suspended) */
  status: UserStatus;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ============================================================================
// Resume Mock Factory
// ============================================================================

/**
 * Default resume data for testing
 */
const DEFAULT_RESUME: ResumeDTO = {
  contactInfo: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
  },
  summary: 'Experienced software developer with 5+ years in full-stack development.',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL'],
  workExperience: [
    {
      company: 'Tech Solutions Inc.',
      position: 'Senior Software Developer',
      startDate: '2020-01-15',
      endDate: 'present',
      summary: 'Led development of customer-facing applications using React and Node.js.',
    },
    {
      company: 'StartupXYZ',
      position: 'Software Developer',
      startDate: '2018-06-01',
      endDate: '2019-12-31',
      summary: 'Built and maintained microservices architecture using Python and Docker.',
    },
  ],
  education: [
    {
      school: 'University of Technology',
      degree: 'Bachelor',
      major: 'Computer Science',
    },
  ],
  certifications: ['AWS Certified Developer - Associate'],
  languages: ['English', 'Spanish'],
};

/**
 * Creates a mock ResumeDTO for testing
 * @param overrides - Partial overrides to apply to the default resume
 * @returns A complete ResumeDTO object
 * @example
 * const resume = createMockResume({
 *   contactInfo: { name: 'Jane Doe', email: 'jane@example.com', phone: null }
 * });
 */
export function createMockResume(
  overrides?: DeepPartial<ResumeDTO>,
): ResumeDTO {
  if (!overrides) {
    return { ...DEFAULT_RESUME };
  }

  return {
    ...DEFAULT_RESUME,
    ...overrides,
    contactInfo: {
      ...DEFAULT_RESUME.contactInfo,
      ...overrides.contactInfo,
    },
    workExperience: overrides.workExperience ?? DEFAULT_RESUME.workExperience,
    education: overrides.education ?? DEFAULT_RESUME.education,
  } as ResumeDTO;
}

// ============================================================================
// Job Description Mock Factory
// ============================================================================

/**
 * Default job description data for testing
 */
const DEFAULT_JOB_DESCRIPTION: JdDTO = {
  requirements: {
    technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL'],
    soft: ['Communication', 'Problem-solving', 'Team collaboration'],
    experience: '3-5 years of professional software development experience',
    education: "Bachelor's degree in Computer Science or related field",
  },
  responsibilities: [
    'Design and implement web applications using React and Node.js',
    'Write clean, maintainable, and well-documented code',
    'Collaborate with cross-functional teams to deliver features',
    'Participate in code reviews and provide constructive feedback',
  ],
  benefits: [
    'Competitive salary and equity package',
    'Health, dental, and vision insurance',
    'Flexible work arrangements',
    'Professional development budget',
  ],
  company: {
    name: 'Innovative Tech Corp',
    industry: 'Technology',
    size: '100-500 employees',
  },
};

/**
 * Creates a mock JdDTO for testing
 * @param overrides - Partial overrides to apply to the default job description
 * @returns A complete JdDTO object
 * @example
 * const jd = createMockJobDescription({
 *   company: { name: 'Different Company' }
 * });
 */
export function createMockJobDescription(
  overrides?: DeepPartial<JdDTO>,
): JdDTO {
  if (!overrides) {
    return { ...DEFAULT_JOB_DESCRIPTION };
  }

  return {
    ...DEFAULT_JOB_DESCRIPTION,
    ...overrides,
    requirements: {
      ...DEFAULT_JOB_DESCRIPTION.requirements,
      ...overrides.requirements,
    },
    company: {
      ...DEFAULT_JOB_DESCRIPTION.company,
      ...overrides.company,
    },
  } as JdDTO;
}

// ============================================================================
// Scoring Result Mock Factory
// ============================================================================

/**
 * Default scoring result data for testing
 */
const DEFAULT_SCORING_RESULT: ScoringResultDTO = {
  resumeId: 'resume-123-abc',
  jobId: 'job-456-xyz',
  overallScore: 85,
  skillScore: {
    score: 90,
    details: 'Strong technical skills match. 5 out of 5 required skills present.',
  },
  experienceScore: {
    score: 80,
    details: '5 years of relevant experience meets the 3-5 year requirement.',
  },
  educationScore: {
    score: 85,
    details: "Bachelor's degree in Computer Science matches the requirement.",
  },
  analyzedAt: new Date('2024-01-15T10:30:00.000Z'),
};

/**
 * Creates a mock ScoringResultDTO for testing
 * @param overrides - Partial overrides to apply to the default scoring result
 * @returns A complete ScoringResultDTO object
 * @example
 * const score = createMockScoringResult({
 *   overallScore: 95,
 *   skillScore: { score: 100, details: 'Perfect match' }
 * });
 */
export function createMockScoringResult(
  overrides?: DeepPartial<ScoringResultDTO>,
): ScoringResultDTO {
  if (!overrides) {
    return {
      ...DEFAULT_SCORING_RESULT,
      analyzedAt: new Date(DEFAULT_SCORING_RESULT.analyzedAt),
    };
  }

  const analyzedAt = overrides.analyzedAt
    ? (overrides.analyzedAt instanceof Date
        ? overrides.analyzedAt
        : new Date(overrides.analyzedAt as Date))
    : new Date(DEFAULT_SCORING_RESULT.analyzedAt);

  return {
    ...DEFAULT_SCORING_RESULT,
    ...overrides,
    skillScore: {
      ...DEFAULT_SCORING_RESULT.skillScore,
      ...overrides.skillScore,
    },
    experienceScore: {
      ...DEFAULT_SCORING_RESULT.experienceScore,
      ...overrides.experienceScore,
    },
    educationScore: {
      ...DEFAULT_SCORING_RESULT.educationScore,
      ...overrides.educationScore,
    },
    analyzedAt,
  } as ScoringResultDTO;
}

// ============================================================================
// Report Mock Factory
// ============================================================================

/**
 * Default analysis report data for testing
 */
const DEFAULT_REPORT: AnalysisReport = {
  id: 'report-789-def',
  resumeId: 'resume-123-abc',
  jobId: 'job-456-xyz',
  candidateName: 'John Doe',
  matchScore: 85,
  oneSentenceSummary: 'Strong candidate with excellent technical skills and relevant experience.',
  strengths: [
    'Strong technical background in required technologies',
    'Good communication and teamwork skills',
    'Relevant industry experience',
  ],
  potentialGaps: [
    'Limited experience with cloud infrastructure',
    'No formal leadership experience documented',
  ],
  redFlags: [],
  suggestedInterviewQuestions: [
    'Can you describe a challenging project you led and how you overcame obstacles?',
    'How do you stay current with emerging technologies?',
    'Tell me about a time you had to collaborate with a difficult team member.',
  ],
  generatedAt: new Date('2024-01-15T10:30:00.000Z'),
};

/**
 * Creates a mock AnalysisReport for testing
 * @param overrides - Partial overrides to apply to the default report
 * @returns A complete AnalysisReport object
 * @example
 * const report = createMockReport({
 *   matchScore: 95,
 *   redFlags: ['Employment gap in 2022']
 * });
 */
export function createMockReport(
  overrides?: DeepPartial<AnalysisReport>,
): AnalysisReport {
  if (!overrides) {
    return {
      ...DEFAULT_REPORT,
      generatedAt: new Date(DEFAULT_REPORT.generatedAt),
    };
  }

  const generatedAt = overrides.generatedAt
    ? (overrides.generatedAt instanceof Date
        ? overrides.generatedAt
        : new Date(overrides.generatedAt as Date))
    : new Date(DEFAULT_REPORT.generatedAt);

  return {
    ...DEFAULT_REPORT,
    ...overrides,
    generatedAt,
  } as AnalysisReport;
}

// ============================================================================
// User Mock Factory
// ============================================================================

/**
 * Default user data for testing
 */
const DEFAULT_USER: MockUserDto = {
  id: 'user-123-xyz',
  email: 'hr.manager@company.com',
  firstName: 'Sarah',
  lastName: 'Johnson',
  role: 'hr_manager' as UserRole,
  organizationId: 'org-456-abc',
  status: 'active' as UserStatus,
  createdAt: new Date('2023-06-15T09:00:00.000Z'),
  updatedAt: new Date('2024-01-10T14:30:00.000Z'),
};

/**
 * Creates a mock UserDto for testing
 * @param overrides - Partial overrides to apply to the default user
 * @returns A complete MockUserDto object (plain object compatible with UserDto)
 * @example
 * const user = createMockUser({
 *   role: 'admin' as UserRole,
 *   email: 'admin@company.com'
 * });
 */
export function createMockUser(
  overrides?: DeepPartial<MockUserDto>,
): MockUserDto {
  if (!overrides) {
    return {
      ...DEFAULT_USER,
      createdAt: new Date(DEFAULT_USER.createdAt),
      updatedAt: new Date(DEFAULT_USER.updatedAt),
    };
  }

  const createdAt = overrides.createdAt
    ? (overrides.createdAt instanceof Date
        ? overrides.createdAt
        : new Date(overrides.createdAt as Date))
    : new Date(DEFAULT_USER.createdAt);

  const updatedAt = overrides.updatedAt
    ? (overrides.updatedAt instanceof Date
        ? overrides.updatedAt
        : new Date(overrides.updatedAt as Date))
    : new Date(DEFAULT_USER.updatedAt);

  return {
    ...DEFAULT_USER,
    ...overrides,
    createdAt,
    updatedAt,
  } as MockUserDto;
}

// ============================================================================
// NATS Message Mock Factory
// ============================================================================

/**
 * Creates a mock function that works in both test and non-test environments.
 * In test environments (when jest is available), returns jest.fn().
 * In non-test environments, returns a simple no-op function.
 * @internal
 */
function createMockFunction(): jest.Mock {
  // Check if Jest is available at runtime
  if (typeof jest !== 'undefined' && typeof jest.fn === 'function') {
    return jest.fn();
  }
  // Fallback for non-test environments: return a no-op function cast as jest.Mock
  const noop = (() => undefined) as jest.Mock;
  return noop;
}

/**
 * Creates a mock NATS message for testing message handlers
 * @param overrides - Partial overrides to apply to the default message
 * @returns A complete NatsMessageMock object with jest mock functions
 * @example
 * const message = createMockNatsMessage({
 *   subject: 'job.resume.submitted',
 *   data: { resumeId: 'test-123' }
 * });
 */
export function createMockNatsMessage<T = unknown>(
  overrides?: DeepPartial<NatsMessageMock<T>>,
): NatsMessageMock<T> {
  const defaultMessage: NatsMessageMock<T> = {
    subject: 'test.subject',
    data: {} as T,
    headers: {
      'x-request-id': 'req-123-abc',
      'x-source': 'test-service',
    },
    timestamp: new Date().toISOString(),
    reply: undefined,
    ack: createMockFunction(),
    nak: createMockFunction(),
    term: createMockFunction(),
  };

  if (!overrides) {
    return defaultMessage;
  }

  return {
    ...defaultMessage,
    ...overrides,
    headers: {
      ...defaultMessage.headers,
      ...overrides.headers,
    },
  } as NatsMessageMock<T>;
}

// ============================================================================
// Resume Analysis Mock Factory
// ============================================================================

/**
 * Creates a mock ResumeAnalysisDto for testing
 * @param overrides - Partial overrides to apply to the default analysis
 * @returns A complete ResumeAnalysisDto object
 * @example
 * const analysis = createMockResumeAnalysis({
 *   matchScore: 92
 * });
 */
export function createMockResumeAnalysis(
  overrides?: DeepPartial<ResumeAnalysisDto>,
): ResumeAnalysisDto {
  const defaultAnalysis: ResumeAnalysisDto = {
    resumeId: 'resume-123-abc',
    matchScore: 85,
    skillsMatch: {
      matched: ['JavaScript', 'TypeScript', 'React'],
      missing: ['Kubernetes'],
      additional: ['Python', 'Docker'],
    },
    experienceAnalysis: {
      totalYears: 5,
      relevantYears: 4,
      industries: ['Technology', 'Finance'],
    },
    recommendations: [
      'Consider assessing cloud infrastructure experience',
      'Evaluate leadership potential during interview',
    ],
    analysisDate: '2024-01-15T10:30:00.000Z',
  };

  if (!overrides) {
    return { ...defaultAnalysis };
  }

  return {
    ...defaultAnalysis,
    ...overrides,
    skillsMatch: {
      ...defaultAnalysis.skillsMatch,
      ...overrides.skillsMatch,
    },
    experienceAnalysis: {
      ...defaultAnalysis.experienceAnalysis,
      ...overrides.experienceAnalysis,
    },
  } as ResumeAnalysisDto;
}

// ============================================================================
// Message Pattern Mock Factory
// ============================================================================

/**
 * Creates a mock MessagePattern for testing NATS publishing
 * @param overrides - Partial overrides to apply to the default pattern
 * @returns A complete MessagePattern object
 * @example
 * const pattern = createMockMessagePattern({
 *   subject: 'analysis.resume.completed',
 *   data: { resumeId: 'test-123', score: 90 }
 * });
 */
export function createMockMessagePattern(
  overrides?: DeepPartial<MessagePattern>,
): MessagePattern {
  const defaultPattern: MessagePattern = {
    subject: 'test.event',
    data: { test: true },
    headers: {
      'x-correlation-id': 'corr-123-xyz',
    },
  };

  if (!overrides) {
    return { ...defaultPattern };
  }

  return {
    ...defaultPattern,
    ...overrides,
    headers: {
      ...defaultPattern.headers,
      ...overrides.headers,
    },
  } as MessagePattern;
}

// ============================================================================
// Report List Item Mock Factory
// ============================================================================

/**
 * Creates a mock ReportListItem for testing list views
 * @param overrides - Partial overrides to apply to the default item
 * @returns A complete ReportListItem object
 * @example
 * const item = createMockReportListItem({
 *   status: 'completed',
 *   matchScore: 78
 * });
 */
export function createMockReportListItem(
  overrides?: DeepPartial<ReportListItem>,
): ReportListItem {
  const defaultItem: ReportListItem = {
    id: 'report-123-abc',
    jobId: 'job-456-xyz',
    candidateName: 'Jane Smith',
    matchScore: 75,
    oneSentenceSummary: 'Good candidate with solid technical foundation.',
    status: 'completed',
    generatedAt: new Date('2024-01-15T10:30:00.000Z'),
    createdAt: new Date('2024-01-15T09:00:00.000Z'),
  };

  if (!overrides) {
    return {
      ...defaultItem,
      generatedAt: new Date(defaultItem.generatedAt),
      createdAt: defaultItem.createdAt ? new Date(defaultItem.createdAt) : undefined,
    };
  }

  const generatedAt = overrides.generatedAt
    ? (overrides.generatedAt instanceof Date
        ? overrides.generatedAt
        : new Date(overrides.generatedAt as Date))
    : new Date(defaultItem.generatedAt);

  const createdAt = overrides.createdAt !== undefined
    ? (overrides.createdAt instanceof Date
        ? overrides.createdAt
        : overrides.createdAt
          ? new Date(overrides.createdAt as Date)
          : undefined)
    : (defaultItem.createdAt ? new Date(defaultItem.createdAt) : undefined);

  return {
    ...defaultItem,
    ...overrides,
    generatedAt,
    createdAt,
  } as ReportListItem;
}
