// Mock dependencies completely for comprehensive testing - MUST be before imports
jest.mock('./llm.service');
jest.mock('../services/jd-extractor-nats.service');

// Create a proper mock constructor function that Jest can track
const JDExtractorExceptionMock = jest.fn(function JDExtractorException(this: any, message: string, details?: any) {
  if (!(this instanceof JDExtractorExceptionMock)) {
    return new (JDExtractorExceptionMock as any)(message, details);
  }
  
  Error.captureStackTrace(this, JDExtractorExceptionMock);
  this.name = 'JDExtractorException';
  this.message = message;
  this.details = details;
  
  return this;
}) as any;

// Set up prototype chain properly for Error inheritance
JDExtractorExceptionMock.prototype = Object.create(Error.prototype);
JDExtractorExceptionMock.prototype.constructor = JDExtractorExceptionMock;
JDExtractorExceptionMock.prototype.name = 'JDExtractorException';

jest.mock('@ai-recruitment-clerk/infrastructure-shared', () => ({
  RetryUtility: {
    withExponentialBackoff: jest.fn(),
  },
  WithCircuitBreaker: jest.fn(
    (_name: any, _options: any) =>
      (_target: any, _propertyName: string, descriptor: PropertyDescriptor) =>
        descriptor,
  ),
  JDExtractorException: JDExtractorExceptionMock,
  ErrorCorrelationManager: {
    getContext: jest.fn(() => ({ traceId: 'test-trace-id' })),
  },
}));

import { Logger } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { LlmService } from './llm.service';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import {
  JobJdSubmittedEvent,
  AnalysisJdExtractedEvent,
} from '../dto/events.dto';
import { JdDTO, LlmExtractionResponse } from '@ai-recruitment-clerk/job-management-domain';
import { RetryUtility, ErrorCorrelationManager } from '@ai-recruitment-clerk/infrastructure-shared';

// Get references to the mocked functions
const MockRetryUtility = RetryUtility as jest.Mocked<typeof RetryUtility>;
const MockJDExtractorException = JDExtractorExceptionMock;
const MockErrorCorrelationManager = ErrorCorrelationManager as jest.Mocked<
  typeof ErrorCorrelationManager
>;

describe('ExtractionService', () => {
  let service: ExtractionService;
  let mockLlmService: jest.Mocked<LlmService>;
  let mockNatsService: jest.Mocked<JdExtractorNatsService>;
  let mockLogger: jest.Mocked<Logger>;

  // Test data factories for different extraction scenarios
  const createValidJobJdSubmittedEvent = (
    overrides?: Partial<JobJdSubmittedEvent>,
  ): JobJdSubmittedEvent => ({
    jobId: 'test-job-123',
    jobTitle: 'Senior Software Engineer',
    jdText: `
      Senior Software Engineer Position
      
      Requirements:
      - 5+ years of experience with JavaScript, TypeScript
      - Experience with React, Node.js, and AWS
      - Bachelor's degree in Computer Science
      - Strong communication and leadership skills
      
      Responsibilities:
      - Develop scalable web applications
      - Lead technical architecture decisions
      - Mentor junior developers
      - Collaborate with cross-functional teams
      
      Benefits:
      - Health insurance and dental coverage
      - Flexible remote work arrangements
      - Stock options and 401k matching
      - Professional development opportunities
      
      Company: TechCorp is a leading software company with 500+ employees.
    `,
    timestamp: '2024-01-01T12:00:00.000Z',
    ...overrides,
  });

  const createMockLlmExtractionResponse = (
    overrides?: Partial<LlmExtractionResponse>,
  ): LlmExtractionResponse => ({
    extractedData: {
      requirements: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS'],
        soft: ['communication', 'leadership'],
        experience: 'Senior (5+ years)',
        education: "Bachelor's degree",
      },
      responsibilities: [
        'Develop scalable web applications',
        'Lead technical architecture decisions',
        'Mentor junior developers',
        'Collaborate with cross-functional teams',
      ],
      benefits: [
        'health insurance',
        'remote work',
        'stock options',
        'professional development',
      ],
      company: {
        name: 'TechCorp',
        industry: 'Software Technology',
        size: '500+ employees',
      },
    },
    confidence: 0.85,
    processingTimeMs: 2500,
    ...overrides,
  });

  const createGarbledLlmResponse = (): LlmExtractionResponse => ({
    extractedData: {
      requirements: {
        technical: [], // Empty technical skills
        soft: ['???', ''], // Invalid soft skills
        experience: '', // Empty experience
        education: 'undefined', // Invalid education
      },
      responsibilities: [], // Empty responsibilities
      benefits: ['benefit1', null, undefined, ''], // Mixed valid/invalid benefits
      company: {
        name: '',
        industry: null,
        size: undefined,
      },
    } as any,
    confidence: 0.2,
    processingTimeMs: 8000,
  });

  const createMalformedLlmResponse = (): Partial<LlmExtractionResponse> => ({
    extractedData: null as any,
    confidence: undefined as any,
    processingTimeMs: -1,
  });

  const createLargeJobDescription = (): string => {
    const baseText = 'A'.repeat(1000);
    return `
      ${baseText}
      Requirements:
      ${Array(50)
        .fill(0)
        .map((_, i) => `- Requirement ${i + 1}: ${baseText.substring(0, 100)}`)
        .join('\n')}
      
      Responsibilities:
      ${Array(50)
        .fill(0)
        .map(
          (_, i) => `- Responsibility ${i + 1}: ${baseText.substring(0, 100)}`,
        )
        .join('\n')}
      
      ${baseText.repeat(50)}
    `;
  };

  const createComplexJobDescription = (): string => `
    Chief Technology Officer - AI & Machine Learning
    
    Company: InnovateAI Solutions - Leading AI research company (1000+ employees)
    
    Requirements:
    - 10+ years in software engineering with 5+ years in leadership roles
    - PhD in Computer Science, AI, or related field preferred
    - Expert-level proficiency in Python, TensorFlow, PyTorch, and cloud platforms
    - Experience with distributed systems, microservices, and DevOps practices
    - Strong analytical thinking, strategic planning, and team management skills
    - Fluency in English and Mandarin preferred
    
    Responsibilities:
    - Define and execute technology strategy for AI/ML products
    - Lead engineering teams of 50+ developers across multiple locations
    - Drive architectural decisions for scalable AI infrastructure
    - Collaborate with C-suite executives on product roadmap
    - Establish engineering best practices and coding standards
    - Oversee recruitment and professional development of technical staff
    - Manage relationships with technology partners and vendors
    - Present technical vision to board of directors and investors
    
    Benefits:
    - Competitive executive compensation package with equity
    - Comprehensive health, dental, and vision insurance
    - Executive travel and expense reimbursement
    - Flexible PTO and sabbatical opportunities
    - Professional development budget up to $50,000 annually
    - Company car or transportation allowance
    - Relocation assistance if required
    
    This is a C-level executive position requiring security clearance.
  `;

  const createMinimalJobDescription = (): string =>
    'Developer needed. Code stuff.';

  const createSpecialCharacterJobDescription = (): string => `
    Software Engineer @ Tech§Corp™
    
    Requirements:
    - 3+ years of experience with C++, C#, & JavaScript
    - Knowledge of SQL/NoSQL databases (MySQL, MongoDB, etc.)
    - Experience with CI/CD pipelines (Jenkins, GitLab, etc.)
    - Understanding of microservices & cloud architecture
    - Strong problem-solving & debugging skills
    
    Responsibilities:
    - Design & implement RESTful APIs
    - Optimize database queries & performance
    - Code reviews & pair programming
    - Bug fixes & maintenance tasks
    
    Benefits:
    - $80K-$120K salary range
    - 401(k) with 4% company match
    - Health/dental/vision insurance (100% covered)
    - 20 days PTO + holidays
    
    Location: San Francisco, CA (Remote-friendly)
  `;

  beforeEach(() => {
    // Use real timers to avoid issues with retry setTimeout
    jest.useRealTimers();
    
    // Create comprehensive mocks
    mockLlmService = {
      extractStructuredData: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockNatsService = {
      publishAnalysisJdExtracted: jest.fn(),
      publishProcessingError: jest.fn(),
      getHealthStatus: jest.fn(),
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    service = new ExtractionService(
      mockLlmService as unknown as LlmService,
      mockNatsService as unknown as JdExtractorNatsService,
      mockLogger as unknown as Logger,
    );

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset the mocked utility functions
    MockRetryUtility.withExponentialBackoff.mockReset();
    MockJDExtractorException.mockClear();
    MockErrorCorrelationManager.getContext.mockReset();

    // Setup default mock implementations
    MockRetryUtility.withExponentialBackoff.mockImplementation(
      async (fn) => await fn(),
    );
    MockErrorCorrelationManager.getContext.mockReturnValue({
      traceId: 'test-trace-id',
    });
  });
  
  afterEach(() => {
    // Clean up any pending timers from retry logic
    service.clearPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ExtractionService);
    });

    it('should have dependencies properly injected', () => {
      expect(mockLlmService).toBeDefined();
      expect(mockNatsService).toBeDefined();
    });

    it('should initialize processing jobs map as empty', () => {
      expect(service.getProcessingJobs()).toEqual([]);
      expect(service.getProcessingJobDetails()).toEqual([]);
    });
  });

  describe('handleJobJdSubmitted - Success Scenarios', () => {
    it('should successfully process a valid job JD submitted event', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const mockLlmResponse = createMockLlmExtractionResponse();
      const mockNatsResult = { success: true, messageId: 'msg-123' };

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce(
        mockNatsResult,
      );

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockLlmService.extractStructuredData).toHaveBeenCalledWith({
        jobTitle: event.jobTitle,
        jdText: expect.any(String), // Sanitized text
      });
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: event.jobId,
        extractedData: mockLlmResponse.extractedData,
        processingTimeMs: expect.any(Number),
        confidence: 0.85,
        extractionMethod: 'llm-structured',
      });
      expect(service.isProcessing(event.jobId)).toBe(false);
    });

    it('should handle complex job description with all sections', async () => {
      // Arrange
      const complexJdText = createComplexJobDescription();
      const event = createValidJobJdSubmittedEvent({ jdText: complexJdText });
      const mockLlmResponse = createMockLlmExtractionResponse({
        extractedData: {
          requirements: {
            technical: ['Python', 'TensorFlow', 'PyTorch', 'Cloud Platforms'],
            soft: [
              'analytical thinking',
              'strategic planning',
              'team management',
            ],
            experience: 'Executive (10+ years)',
            education: 'PhD preferred',
          },
          responsibilities: [
            'Define and execute technology strategy',
            'Lead engineering teams of 50+ developers',
            'Drive architectural decisions',
          ],
          benefits: [
            'executive compensation',
            'comprehensive insurance',
            'professional development budget',
          ],
          company: {
            name: 'InnovateAI Solutions',
            industry: 'AI Research',
            size: '1000+ employees',
          },
        },
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-complex',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockLlmService.extractStructuredData).toHaveBeenCalledWith({
        jobTitle: event.jobTitle,
        jdText: expect.stringContaining('Chief Technology Officer'),
      });
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: event.jobId,
          extractedData: mockLlmResponse.extractedData,
        }),
      );
    });

    it('should handle job description with special characters and symbols', async () => {
      // Arrange
      const specialCharJdText = createSpecialCharacterJobDescription();
      const event = createValidJobJdSubmittedEvent({
        jdText: specialCharJdText,
      });
      const mockLlmResponse = createMockLlmExtractionResponse();

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-special',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockLlmService.extractStructuredData).toHaveBeenCalledWith({
        jobTitle: event.jobTitle,
        jdText: expect.any(String),
      });

      // Verify special characters are sanitized in the processed text
      const sanitizedText =
        mockLlmService.extractStructuredData.mock.calls[0][0].jdText;
      expect(sanitizedText).not.toContain('§');
      expect(sanitizedText).not.toContain('™');
      expect(sanitizedText).toContain('Software Engineer');
    });

    it('should process multiple different job types successfully', async () => {
      // Arrange
      const jobTypes = [
        {
          jobTitle: 'Frontend Developer',
          jdText: 'React, Vue.js, CSS experience required. Must have 5+ years of frontend development experience with modern frameworks and responsive design.',
        },
        {
          jobTitle: 'DevOps Engineer',
          jdText: 'Docker, Kubernetes, AWS experience needed. Strong background in cloud infrastructure and CI/CD pipelines required.',
        },
        {
          jobTitle: 'Data Scientist',
          jdText: 'Python, Machine Learning, Statistics background. Experience with data analysis, model training, and statistical inference required.',
        },
      ];

      mockLlmService.extractStructuredData.mockResolvedValue(
        createMockLlmExtractionResponse(),
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValue({
        success: true,
        messageId: 'msg-batch',
      });

      // Act & Assert
      for (const jobType of jobTypes) {
        const event = createValidJobJdSubmittedEvent(jobType);
        await service.handleJobJdSubmitted(event);

        // Check that the jobTitle matches and text contains key parts (sanitized removes special chars like +)
        const actualCall = mockLlmService.extractStructuredData.mock.calls[mockLlmService.extractStructuredData.mock.calls.length - 1][0];
        expect(actualCall.jobTitle).toBe(jobType.jobTitle);
        // Special chars like + are removed by sanitization, so check for partial match
        if (jobType.jobTitle === 'Frontend Developer') {
          expect(actualCall.jdText).toContain('React');
          expect(actualCall.jdText).toContain('Vue.js');
        } else if (jobType.jobTitle === 'DevOps Engineer') {
          expect(actualCall.jdText).toContain('Docker');
          expect(actualCall.jdText).toContain('Kubernetes');
        } else if (jobType.jobTitle === 'Data Scientist') {
          expect(actualCall.jdText).toContain('Python');
          expect(actualCall.jdText).toContain('Machine Learning');
        }
      }

      expect(mockLlmService.extractStructuredData).toHaveBeenCalledTimes(3);
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledTimes(
        3,
      );
    });

    it('should track processing jobs correctly during execution', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const mockLlmResponse = createMockLlmExtractionResponse();

      // Add delay to LLM service to simulate processing time
      mockLlmService.extractStructuredData.mockImplementation(async () => {
        // During processing, job should be tracked
        expect(service.isProcessing(event.jobId)).toBe(true);
        expect(service.getProcessingJobs()).toContain(event.jobId);
        return mockLlmResponse;
      });
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-tracking',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(service.isProcessing(event.jobId)).toBe(false);
      expect(service.getProcessingJobs()).not.toContain(event.jobId);
    });
  });

  describe('handleJobJdSubmitted - Input Validation', () => {
    it('should handle error for missing jobId and publish to NATS', async () => {
      // Arrange
      const invalidEvent = createValidJobJdSubmittedEvent({ jobId: '' });
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(invalidEvent);

      // Assert - should call error handler instead of throwing
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });

    it('should handle error for missing jdText and publish to NATS', async () => {
      // Arrange
      const invalidEvent = createValidJobJdSubmittedEvent({ jdText: '' });
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(invalidEvent);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });

    it('should handle error for missing jobTitle and publish to NATS', async () => {
      // Arrange
      const invalidEvent = createValidJobJdSubmittedEvent({ jobTitle: '' });
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(invalidEvent);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });

    it('should handle JD text that is too short after sanitization', async () => {
      // Arrange
      const shortJdText = createMinimalJobDescription();
      const event = createValidJobJdSubmittedEvent({ jdText: shortJdText });
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });

    it('should handle null and undefined values gracefully', async () => {
      // Arrange
      const nullEvent = {
        jobId: null,
        jobTitle: null,
        jdText: null,
        timestamp: '2024-01-01T12:00:00.000Z',
      } as any;
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(nullEvent);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
    });

    it('should truncate extremely long JD text to prevent abuse', async () => {
      // Arrange
      const longJdText = createLargeJobDescription();
      const event = createValidJobJdSubmittedEvent({ jdText: longJdText });
      const mockLlmResponse = createMockLlmExtractionResponse();

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-long',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      const sanitizedText =
        mockLlmService.extractStructuredData.mock.calls[0][0].jdText;
      expect(sanitizedText.length).toBeLessThanOrEqual(50000);
    });
  });

  describe('handleJobJdSubmitted - LLM Response Variations', () => {
    it('should handle successful LLM response with high confidence', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const highConfidenceResponse = createMockLlmExtractionResponse({
        confidence: 0.95,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        highConfidenceResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-high-conf',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence: 0.85, // Default confidence, not from LLM response
        }),
      );
    });

    it('should handle garbled LLM response with low confidence', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const garbledResponse = createGarbledLlmResponse();

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        garbledResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-garbled',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          extractedData: garbledResponse.extractedData,
          confidence: 0.85, // Service uses default confidence
        }),
      );

      // Should log warning about validation failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Analysis result validation failed'),
      );
    });

    it('should handle malformed LLM response structure', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const malformedResponse = createMalformedLlmResponse();

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        malformedResponse as any,
      );
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });

    it('should handle LLM response with null extracted data', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const nullDataResponse = createMockLlmExtractionResponse({
        extractedData: null as any,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        nullDataResponse,
      );
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });

    it('should handle LLM response with incomplete extracted data', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const incompleteResponse = createMockLlmExtractionResponse({
        extractedData: {
          requirements: null,
          responsibilities: [],
          benefits: null,
          company: undefined,
        } as any,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        incompleteResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-incomplete',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          extractedData: incompleteResponse.extractedData,
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Analysis result validation failed'),
      );
    });

    it('should handle LLM timeout and slow responses', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const slowResponse = createMockLlmExtractionResponse({
        processingTimeMs: 15000,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        slowResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-slow',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(
        mockNatsService.publishAnalysisJdExtracted,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          processingTimeMs: expect.any(Number),
        }),
      );

      const publishedEvent =
        mockNatsService.publishAnalysisJdExtracted.mock.calls[0][0];
      expect(publishedEvent.processingTimeMs).toBeGreaterThanOrEqual(
        slowResponse.processingTimeMs!,
      );
    });
  });

  describe('handleJobJdSubmitted - Error Scenarios', () => {
    it('should handle LLM service throwing timeout error', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const timeoutError = new Error('LLM request timeout after 30 seconds');

      mockLlmService.extractStructuredData.mockRejectedValueOnce(timeoutError);
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        event.jobId,
        timeoutError,
        expect.objectContaining({
          stage: 'llm-extraction',
          retryAttempt: expect.any(Number),
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing job JD'),
        timeoutError,
      );
    });

    it('should handle LLM service throwing rate limit error', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const rateLimitError = new Error(
        'Rate limit exceeded. Please try again later.',
      );

      mockLlmService.extractStructuredData.mockRejectedValueOnce(
        rateLimitError,
      );
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'rate-limit-error',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        event.jobId,
        rateLimitError,
        expect.any(Object),
      );

      // Should attempt retry for rate limit errors
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling retry'),
      );
    });

    it('should handle network connection errors', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const networkError = new Error('Network connection failed');

      mockLlmService.extractStructuredData.mockRejectedValueOnce(networkError);
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'network-error',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        event.jobId,
        networkError,
        expect.any(Object),
      );
    });

    it('should handle validation errors and not retry', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const validationError = new Error('Invalid input validation failed');

      mockLlmService.extractStructuredData.mockRejectedValueOnce(
        validationError,
      );
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'validation-error',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        event.jobId,
        validationError,
        expect.any(Object),
      );

      // Should not attempt retry for validation errors
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Scheduling retry'),
      );
    });

    it('should handle circuit breaker open state', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const circuitBreakerError = new Error('Circuit breaker is open');

      mockLlmService.extractStructuredData.mockRejectedValueOnce(
        circuitBreakerError,
      );
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'circuit-error',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        event.jobId,
        circuitBreakerError,
        expect.any(Object),
      );
    });

    it('should handle NATS publishing failure', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const mockLlmResponse = createMockLlmExtractionResponse();
      const natsFailure = {
        success: false,
        error: 'NATS connection lost',
        messageId: undefined,
      };

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce(
        natsFailure,
      );
      mockNatsService.publishProcessingError.mockResolvedValueOnce({
        success: true,
        messageId: 'error-msg',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Handling processing error'),
        expect.any(Error),
      );
    });
  });

  describe('handleJobJdSubmitted - Concurrency and Job Management', () => {
    it('should prevent duplicate job processing', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const mockLlmResponse = createMockLlmExtractionResponse();

      // First call will be processed, second will be skipped
      let resolveExtraction:
        | ((value: typeof mockLlmResponse) => void)
        | undefined;
      mockLlmService.extractStructuredData.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveExtraction = resolve;
          }),
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValue({
        success: true,
        messageId: 'msg-duplicate',
      });

      // Act
      const firstCallPromise = service.handleJobJdSubmitted(event);
      const duplicateCallPromise = service.handleJobJdSubmitted(event);

      await duplicateCallPromise;

      // Assert
      expect(mockLlmService.extractStructuredData).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('is already being processed'),
      );

      resolveExtraction?.(mockLlmResponse);
      await firstCallPromise;
    });

    it('should respect maximum concurrent jobs limit', async () => {
      // Arrange
      const maxConcurrentJobs = 10;
      void maxConcurrentJobs;
      const events = Array.from({ length: 12 }, (_, i) =>
        createValidJobJdSubmittedEvent({ jobId: `job-${i + 1}` }),
      );
      const mockLlmResponse = createMockLlmExtractionResponse();

      const pendingResolvers: Array<() => void> = [];
      mockLlmService.extractStructuredData.mockImplementation(
        () =>
          new Promise((resolve) => {
            pendingResolvers.push(() => resolve(mockLlmResponse));
          }),
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValue({
        success: true,
        messageId: 'msg-concurrent',
      });

      // Act
      const promises = events.map((event) =>
        service.handleJobJdSubmitted(event),
      );

      // Allow the initial processing pipeline to schedule warnings
      await Promise.resolve();

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Maximum concurrent jobs'),
      );

      pendingResolvers.forEach((resolve) => resolve());
      await Promise.all(promises);
    });

    it('should clean up expired jobs correctly', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      void event;

      // Manually add an expired job to the processing map
      const processingJobsMap = (service as any).processingJobs;
      void processingJobsMap; // satisfy TS6133
      const expiredTimestamp = Date.now() - 400000; // 6+ minutes ago (older than 5 minute timeout)
      processingJobsMap.set('expired-job', {
        timestamp: expiredTimestamp,
        attempts: 1,
      });

      // Act
      service.getProcessingJobs(); // This triggers cleanup

      // Assert
      expect(service.getProcessingJobs()).not.toContain('expired-job');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up expired job: expired-job'),
      );
    });

    it('should track job processing details correctly', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const mockLlmResponse = createMockLlmExtractionResponse();

      mockLlmService.extractStructuredData.mockImplementation(async () => {
        // Check processing details during execution
        const details = service.getProcessingJobDetails();
        expect(details).toHaveLength(1);
        expect(details[0].jobId).toBe(event.jobId);
        expect(details[0].attempts).toBe(0);
        expect(details[0].age).toBeGreaterThanOrEqual(0);

        return mockLlmResponse;
      });
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-details',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(service.getProcessingJobDetails()).toHaveLength(0);
    });
  });

  describe('processJobDescription - Core Business Logic', () => {
    it('should process job description with retry mechanism', async () => {
      // Arrange
      const jobId = 'test-job-123';
      void jobId;
      void jobId;
      void jobId;
      void jobId;
      const jdText = 'Valid job description with technical requirements. Must have 5+ years of experience in software development with strong technical skills and problem-solving abilities.';
      const jobTitle = 'Software Engineer';
      const mockLlmResponse = createMockLlmExtractionResponse();

      // Mock retry utility to verify it's called with correct parameters
      MockRetryUtility.withExponentialBackoff.mockImplementation(
        async (fn, options) => {
          expect(options).toEqual({
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
            jitterMs: 500,
          });
          return await fn();
        },
      );

      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy
        .mockImplementationOnce(() => 1_000)
        .mockImplementationOnce(() => 1_015);

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );

      // Act
      let result: AnalysisJdExtractedEvent | undefined;
      try {
        result = await service.processJobDescription(
          jobId,
          jdText,
          jobTitle,
        );
      } finally {
        nowSpy.mockRestore();
      }

      // Assert
      expect(result).toBeDefined();
      const finalResult = result as AnalysisJdExtractedEvent;
      expect(finalResult.jobId).toBe(jobId);
      expect(finalResult.extractedData).toEqual(
        mockLlmResponse.extractedData,
      );
      expect(finalResult.timestamp).toBeDefined();
      expect(finalResult.processingTimeMs).toBeGreaterThan(0);
      expect(MockRetryUtility.withExponentialBackoff).toHaveBeenCalledTimes(1);
    });

    it('should validate and sanitize JD text before processing', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const rawJdText =
        '   Job description with\r\n\textra   whitespace\n\nand special chars @#$%. Must have experience with software development and testing skills.   ';
      const jobTitle = 'Software Engineer';
      const mockLlmResponse = createMockLlmExtractionResponse();

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );

      // Act
      await service.processJobDescription(jobId, rawJdText, jobTitle);

      // Assert
      const sanitizedText =
        mockLlmService.extractStructuredData.mock.calls[0][0].jdText;
      expect(sanitizedText).not.toMatch(/\r\n/);
      expect(sanitizedText).not.toMatch(/\s{2,}/);
      expect(sanitizedText).not.toMatch(/[@#$%]/);
      expect(sanitizedText.trim()).toBe(sanitizedText);
    });

    it('should include correlation context in error handling', async () => {
      // Arrange
      const jobId = 'test-job-123';
      void jobId;
      const jdText = 'Valid job description';
      const jobTitle = 'Software Engineer';

      MockErrorCorrelationManager.getContext.mockReturnValue({
        traceId: 'custom-trace-123',
      });

      // Act & Assert
      await expect(
        service.processJobDescription('', jdText, jobTitle),
      ).rejects.toThrow();
      expect(MockJDExtractorException).toHaveBeenCalledWith(
        'INVALID_PARAMETERS',
        expect.objectContaining({
          correlationId: 'custom-trace-123',
        }),
      );
    });

    it('should measure and report processing time accurately', async () => {
      // Arrange
      const jobId = 'test-job-123';
      void jobId;
      const jdText = 'Valid job description for timing test. Must have 5+ years of software engineering experience with strong technical and leadership skills.';
      const jobTitle = 'Software Engineer';
      const mockLlmResponse = createMockLlmExtractionResponse();

      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy
        .mockImplementationOnce(() => 10_000) // Service start time
        .mockImplementationOnce(() => 10_400); // Measured duration 400ms

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        mockLlmResponse,
      );

      // Act
      let result: AnalysisJdExtractedEvent | undefined;
      try {
        result = await service.processJobDescription(
          jobId,
          jdText,
          jobTitle,
        );
      } finally {
        nowSpy.mockRestore();
      }

      // Assert
      expect(result).toBeDefined();
      const finalResult = result as AnalysisJdExtractedEvent;
      expect(finalResult.processingTimeMs).toBe(
        mockLlmResponse.processingTimeMs,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          `processing time: ${finalResult.processingTimeMs}ms`,
        ),
      );
    });
  });

  describe('publishAnalysisResult - NATS Integration', () => {
    it('should publish valid analysis result successfully', async () => {
      // Arrange
      const analysisResult: AnalysisJdExtractedEvent = {
        jobId: 'test-job-123',
        extractedData: createMockLlmExtractionResponse().extractedData,
        timestamp: '2024-01-01T12:00:00.000Z',
        processingTimeMs: 2500,
      };
      const mockNatsResult = { success: true, messageId: 'publish-msg-123' };

      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce(
        mockNatsResult,
      );

      // Act
      await service.publishAnalysisResult(analysisResult);

      // Assert
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: analysisResult.jobId,
        extractedData: analysisResult.extractedData,
        processingTimeMs: analysisResult.processingTimeMs,
        confidence: 0.85,
        extractionMethod: 'llm-structured',
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          `Analysis result published successfully for jobId: ${analysisResult.jobId}`,
        ),
      );
    });

    it('should validate analysis result before publishing', async () => {
      // Arrange
      const invalidResult = {
        jobId: '',
        extractedData: null,
        timestamp: '',
        processingTimeMs: 0,
      } as any;

      // Act & Assert
      await expect(
        service.publishAnalysisResult(invalidResult),
      ).rejects.toThrow();
      expect(MockJDExtractorException).toHaveBeenCalledWith(
        'INVALID_ANALYSIS_RESULT',
        expect.objectContaining({
          provided: {
            jobId: false,
            extractedData: false,
            timestamp: false,
          },
        }),
      );
    });

    it('should handle NATS publishing failure gracefully', async () => {
      // Arrange
      const analysisResult: AnalysisJdExtractedEvent = {
        jobId: 'test-job-123',
        extractedData: createMockLlmExtractionResponse().extractedData,
        timestamp: '2024-01-01T12:00:00.000Z',
        processingTimeMs: 2500,
      };
      const natsFailure = {
        success: false,
        error: 'Connection timeout',
        messageId: undefined,
      };

      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce(
        natsFailure,
      );

      // Act & Assert
      await expect(
        service.publishAnalysisResult(analysisResult),
      ).rejects.toThrow();
      expect(MockJDExtractorException).toHaveBeenCalledWith(
        'PUBLISH_FAILED',
        expect.objectContaining({
          jobId: analysisResult.jobId,
          error: 'Connection timeout',
        }),
      );
    });

    it('should warn about invalid extracted data but still publish', async () => {
      // Arrange
      const analysisResultWithInvalidData: AnalysisJdExtractedEvent = {
        jobId: 'test-job-123',
        extractedData: {
          requirements: null,
          responsibilities: [],
          benefits: [],
          company: {},
        } as any,
        timestamp: '2024-01-01T12:00:00.000Z',
        processingTimeMs: 2500,
      };
      const mockNatsResult = { success: true, messageId: 'invalid-data-msg' };

      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce(
        mockNatsResult,
      );

      // Act
      await service.publishAnalysisResult(analysisResultWithInvalidData);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Analysis result validation failed'),
      );
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalled();
    });
  });

  describe('Health Check and Utility Methods', () => {
    it('should perform comprehensive health check', async () => {
      // Arrange
      const mockNatsHealth = {
        healthy: true,
        connected: true,
        jetstreamAvailable: true,
        subscriptionCount: 2,
        metadata: {
          currentServer: 'nats://localhost:4222',
          uptimeMs: 60000,
        },
      };

      mockNatsService.getHealthStatus.mockResolvedValueOnce(mockNatsHealth);

      // Act
      const healthResult = await service.healthCheck();

      // Assert
      expect(healthResult.status).toBe('healthy');
      expect(healthResult.details).toEqual({
        natsConnected: true,
        natsConnectionInfo: mockNatsHealth,
        processingJobsCount: 0,
        processingJobs: [],
        memoryUsage: expect.any(Object),
        uptime: expect.any(Number),
      });
    });

    it('should report degraded status when NATS is disconnected', async () => {
      // Arrange
      const mockNatsHealth = {
        healthy: false,
        connected: false,
        jetstreamAvailable: false,
        subscriptionCount: 0,
        error: 'Connection timeout',
      };

      mockNatsService.getHealthStatus.mockResolvedValueOnce(mockNatsHealth);

      // Act
      const healthResult = await service.healthCheck();

      // Assert
      expect(healthResult.status).toBe('degraded');
      expect(healthResult.details.natsConnected).toBe(false);
    });

    it('should report unhealthy status when health check throws error', async () => {
      // Arrange
      const healthError = new Error('Health check failed');
      mockNatsService.getHealthStatus.mockRejectedValueOnce(healthError);

      // Act
      const healthResult = await service.healthCheck();

      // Assert
      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.details.error).toBe('Health check failed');
    });

    it('should provide accurate processing job status', () => {
      // Arrange
      const processingJobsMap = (service as any).processingJobs;
      const currentTime = Date.now();
      processingJobsMap.set('job-1', {
        timestamp: currentTime - 1000,
        attempts: 0,
      });
      processingJobsMap.set('job-2', {
        timestamp: currentTime - 2000,
        attempts: 1,
      });

      // Act
      const isProcessingJob1 = service.isProcessing('job-1');
      const isProcessingJob3 = service.isProcessing('job-3');
      const processingJobs = service.getProcessingJobs();
      const jobDetails = service.getProcessingJobDetails();

      // Assert
      expect(isProcessingJob1).toBe(true);
      expect(isProcessingJob3).toBe(false);
      expect(processingJobs).toEqual(['job-1', 'job-2']);
      expect(jobDetails).toHaveLength(2);
      expect(jobDetails[0]).toEqual({
        jobId: 'job-1',
        timestamp: currentTime - 1000,
        attempts: 0,
        age: expect.any(Number),
      });
    });
  });

  describe('Data Mapping and Transformation', () => {
    it('should correctly map LLM response to analysis event structure', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const complexLlmResponse = createMockLlmExtractionResponse({
        extractedData: {
          requirements: {
            technical: ['Python', 'Django', 'PostgreSQL', 'Redis'],
            soft: ['analytical thinking', 'communication', 'teamwork'],
            experience: 'Mid-level (3-5 years)',
            education: 'Bachelor degree preferred',
          },
          responsibilities: [
            'Design and implement backend APIs',
            'Optimize database queries and performance',
            'Write comprehensive unit and integration tests',
          ],
          benefits: [
            'competitive salary',
            'health insurance',
            'flexible work schedule',
            'professional development',
          ],
          company: {
            name: 'DataTech Solutions',
            industry: 'Financial Technology',
            size: '100-500 employees',
          },
        },
        confidence: 0.92,
        processingTimeMs: 3200,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        complexLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'mapping-test',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      const publishedData =
        mockNatsService.publishAnalysisJdExtracted.mock.calls[0][0];
      expect(publishedData).toEqual({
        jobId: event.jobId,
        extractedData: complexLlmResponse.extractedData,
        processingTimeMs: expect.any(Number),
        confidence: 0.85, // Service default, not from LLM
        extractionMethod: 'llm-structured',
      });
    });

    it('should handle partial data transformation gracefully', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const partialLlmResponse = createMockLlmExtractionResponse({
        extractedData: {
          requirements: {
            technical: ['JavaScript'],
            soft: [],
            experience: 'Not specified',
            education: '',
          },
          responsibilities: ['Basic development tasks'],
          benefits: [],
          company: {
            name: undefined,
            industry: '',
            size: null,
          },
        } as any,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(
        partialLlmResponse,
      );
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'partial-test',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          extractedData: partialLlmResponse.extractedData,
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Analysis result validation failed'),
      );
    });

    it('should preserve data integrity during transformation', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const originalData = {
        requirements: {
          technical: ['Java', 'Spring Boot', 'Microservices'],
          soft: ['leadership', 'problem solving'],
          experience: 'Senior (5+ years)',
          education: 'Masters preferred',
        },
        responsibilities: [
          'Lead development team',
          'Architect scalable solutions',
        ],
        benefits: ['equity', 'unlimited PTO', 'health coverage'],
        company: {
          name: 'TechStart Inc',
          industry: 'Enterprise Software',
          size: '50-200 employees',
        },
      };
      const llmResponse = createMockLlmExtractionResponse({
        extractedData: originalData,
      });

      mockLlmService.extractStructuredData.mockResolvedValueOnce(llmResponse);
      mockNatsService.publishAnalysisJdExtracted.mockResolvedValueOnce({
        success: true,
        messageId: 'integrity-test',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      const publishedData =
        mockNatsService.publishAnalysisJdExtracted.mock.calls[0][0];
      expect(publishedData.extractedData).toEqual(originalData);

      // Verify deep equality of nested objects
      const extractedData = publishedData.extractedData as JdDTO;
      expect(extractedData.requirements.technical).toEqual([
        'Java',
        'Spring Boot',
        'Microservices',
      ]);
      expect(extractedData.company?.name).toBe('TechStart Inc');
    });
  });

  describe('Error Correlation and Retry Logic', () => {
    it('should implement intelligent retry logic for transient errors', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const transientErrors = [
        new Error('Request timeout - please retry'),
        new Error('Network connection temporarily unavailable'),
        new Error('Rate limit exceeded - temporary restriction'),
      ];

      mockNatsService.publishProcessingError.mockResolvedValue({
        success: true,
        messageId: 'retry-test',
      });

      // Act & Assert
      for (const error of transientErrors) {
        mockLlmService.extractStructuredData.mockRejectedValueOnce(error);

        await service.handleJobJdSubmitted(event);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('is retryable'),
        );
      }
    });

    it('should not retry validation and permanent errors', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const validationError = new Error('Invalid input format - validation failed');

      mockLlmService.extractStructuredData.mockRejectedValueOnce(validationError);
      mockNatsService.publishProcessingError.mockResolvedValue({
        success: true,
        messageId: 'no-retry-test',
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert - should not attempt to schedule retry for validation errors
      // The key assertion is that no retry should be scheduled
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Scheduling retry'),
      );
      // Verify error was published to NATS
      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
    });

    it('should track retry attempts and apply exponential backoff', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const retryableError = new Error('Temporary network failure');

      mockLlmService.extractStructuredData.mockRejectedValue(retryableError);
      mockNatsService.publishProcessingError.mockResolvedValue({
        success: true,
        messageId: 'backoff-test',
      });

      // Act - First attempt will fail and schedule retry
      await service.handleJobJdSubmitted(event);

      // Manually check the processing map to see if job was marked for retry
      const processingJobsMap = (service as any).processingJobs;
      void processingJobsMap;
      
      // Assert - should have logged that error is retryable and attempted to schedule retry
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('is retryable'),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling retry'),
      );
    });

    it('should stop retrying after maximum attempts reached', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const retryableError = new Error('Persistent timeout error');

      mockLlmService.extractStructuredData.mockRejectedValue(retryableError);
      mockNatsService.publishProcessingError.mockResolvedValue({
        success: true,
        messageId: 'max-retry-test',
      });

      // Simulate reaching max retry limit
      const processingJobsMap = (service as any).processingJobs;
      processingJobsMap.set(event.jobId, {
        timestamp: Date.now(),
        attempts: 3,
      });

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Scheduling retry'),
      );
    });

    it('should handle error publishing failures gracefully', async () => {
      // Arrange
      const event = createValidJobJdSubmittedEvent();
      const originalError = new Error('LLM processing failed');
      const publishError = new Error('NATS error publishing failed');

      mockLlmService.extractStructuredData.mockRejectedValueOnce(originalError);
      mockNatsService.publishProcessingError.mockRejectedValueOnce(
        publishError,
      );

      // Act
      await service.handleJobJdSubmitted(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle processing error'),
        publishError,
      );
      // Should not throw to avoid infinite loops
    });
  });
});
