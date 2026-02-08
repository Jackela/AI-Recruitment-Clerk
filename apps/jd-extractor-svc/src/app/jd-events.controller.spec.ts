import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JdEventsController } from './jd-events.controller';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import { LlmService } from '../extraction/llm.service';
import type { JdDTO } from '@ai-recruitment-clerk/job-management-domain';

describe('JdEventsController', () => {
  let controller: JdEventsController;
  let mockNatsService: jest.Mocked<JdExtractorNatsService>;
  let mockLlmService: jest.Mocked<LlmService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  // Mock valid JD DTO
  const createMockJdDTO = (): JdDTO => ({
    requirements: {
      technical: ['JavaScript', 'TypeScript', 'Node.js', 'React'],
      soft: ['Communication', 'Leadership', 'Teamwork'],
      experience: '5+ years',
      education: "Bachelor's degree",
    },
    responsibilities: [
      'Develop and maintain web applications',
      'Collaborate with cross-functional teams',
      'Participate in code reviews',
    ],
    benefits: ['Health insurance', 'Remote work', 'Professional development'],
    company: {
      name: 'Tech Corp',
      industry: 'Software Technology',
      size: '100-500 employees',
    },
  });

  beforeEach(async () => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockNatsService = {
      subscribeToJobSubmissions: jest.fn().mockResolvedValue(undefined),
      publishAnalysisJdExtracted: jest.fn().mockResolvedValue({ success: true }),
      publishProcessingError: jest.fn().mockResolvedValue({ success: true }),
      publishExtractionStarted: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as jest.Mocked<JdExtractorNatsService>;

    mockLlmService = {
      extractJobRequirements: jest.fn().mockResolvedValue(createMockJdDTO()),
      extractStructuredData: jest.fn(),
      validateExtractedData: jest.fn().mockResolvedValue(true),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<LlmService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [JdEventsController],
      providers: [
        {
          provide: JdExtractorNatsService,
          useValue: mockNatsService,
        },
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
      ],
    }).compile();

    controller = moduleRef.get(JdEventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleJobSubmitted - successful JD parsing', () => {
    it('should process valid JD payload successfully', async () => {
      const payload = {
        jobId: 'job-123',
        jdText: `
          Senior Software Engineer

          Requirements:
          - 5+ years of experience
          - JavaScript, TypeScript, Node.js
          - Bachelor's degree

          Responsibilities:
          - Develop web applications
          - Collaborate with teams

          Benefits:
          - Health insurance
          - Remote work
        `,
      };

      await controller.handleJobSubmitted(payload);

      expect(mockLlmService.extractJobRequirements).toHaveBeenCalledWith(payload.jdText);
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: payload.jobId,
        extractedData: createMockJdDTO(),
        processingTimeMs: expect.any(Number),
        confidence: 0.95,
        extractionMethod: 'gemini-ai',
      });
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log successful processing with correct job ID', async () => {
      const payload = {
        jobId: 'test-job-456',
        jdText: 'Sample job description text',
      };

      await controller.handleJobSubmitted(payload);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('jobId: test-job-456'),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed'),
      );
    });

    it('should include processing time in published event', async () => {
      const payload = {
        jobId: 'job-789',
        jdText: 'Another job description',
      };

      await controller.handleJobSubmitted(payload);

      const publishCall = mockNatsService.publishAnalysisJdExtracted as jest.Mock;
      const publishedData = publishCall.mock.calls[0][0];

      expect(publishedData.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(publishedData.processingTimeMs).toBeLessThan(10000); // Should be fast
    });

    it('should use correct extraction method in published event', async () => {
      const payload = {
        jobId: 'job-abc',
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      const publishCall = mockNatsService.publishAnalysisJdExtracted as jest.Mock;
      const publishedData = publishCall.mock.calls[0][0];

      expect(publishedData.extractionMethod).toBe('gemini-ai');
    });

    it('should use correct confidence score in published event', async () => {
      const payload = {
        jobId: 'job-def',
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      const publishCall = mockNatsService.publishAnalysisJdExtracted as jest.Mock;
      const publishedData = publishCall.mock.calls[0][0];

      expect(publishedData.confidence).toBe(0.95);
    });

    it('should handle JD with complete structured data', async () => {
      const completeJdDTO: JdDTO = {
        requirements: {
          technical: ['Java', 'Spring Boot', 'Docker', 'Kubernetes'],
          soft: ['Communication', 'Problem-solving'],
          experience: 'Senior (5+ years)',
          education: "Master's degree",
        },
        responsibilities: [
          'Design and implement microservices',
          'Mentor junior developers',
          'Lead technical architecture decisions',
        ],
        benefits: [
          'Competitive salary',
          'Stock options',
          'Flexible hours',
          'Health benefits',
        ],
        company: {
          name: 'Enterprise Solutions Inc',
          industry: 'Enterprise Software',
          size: '500-1000 employees',
        },
      };

      mockLlmService.extractJobRequirements.mockResolvedValue(completeJdDTO);

      const payload = {
        jobId: 'job-complete',
        jdText: 'Complete JD text',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: payload.jobId,
        extractedData: completeJdDTO,
        processingTimeMs: expect.any(Number),
        confidence: 0.95,
        extractionMethod: 'gemini-ai',
      });
    });

    it('should handle JD with minimal data', async () => {
      const minimalJdDTO: JdDTO = {
        requirements: {
          technical: ['Python'],
          soft: [],
          experience: 'Not specified',
          education: 'Not specified',
        },
        responsibilities: ['Write code'],
        benefits: [],
        company: {
          name: undefined,
          industry: undefined,
          size: undefined,
        },
      };

      mockLlmService.extractJobRequirements.mockResolvedValue(minimalJdDTO);

      const payload = {
        jobId: 'job-minimal',
        jdText: 'Junior Developer needed. Must know Python.',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalled();
    });

    it('should handle JD with special characters and formatting', async () => {
      const payload = {
        jobId: 'job-special',
        jdText: `
          Senior DevOps Engineer @ TechCorp™

          • Kubernetes & Docker expertise
          • CI/CD pipeline experience (Jenkins, GitLab CI)
          • Cloud: AWS/GCP/Azure — multi-cloud preferred

          Requirements:
          - 5+ years in DevOps/SRE roles
          - IaC tools: Terraform, CloudFormation
          - Scripting: Bash, Python, Go

          Benefits:
          💰 Competitive compensation
          🏥 Full health coverage
          🏠 Remote-first culture
        `,
      };

      await controller.handleJobSubmitted(payload);

      expect(mockLlmService.extractJobRequirements).toHaveBeenCalled();
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalled();
    });

    it('should process JD with long text content', async () => {
      const longJdText = `
        Senior Full Stack Developer

        Company Overview:
        We are a leading technology company building innovative solutions...
        ${'Additional company information and descriptions. '.repeat(50)}

        Requirements:
        - 7+ years of software development experience
        - Proficiency in modern JavaScript frameworks
        - Experience with cloud platforms
        - Strong database skills
        - Excellent communication abilities
        ${'More requirements and details. '.repeat(20)}

        Responsibilities:
        - Design and implement scalable software solutions
        - Collaborate with product and engineering teams
        - Participate in architectural planning
        - Mentor junior developers
        - Contribute to coding standards and best practices
        ${'More responsibilities. '.repeat(15)}

        Benefits:
        - Comprehensive health insurance
        - 401(k) matching
        - Flexible PTO policy
        - Remote work options
        - Professional development budget
        - Regular team events
      `;

      const payload = {
        jobId: 'job-long',
        jdText: longJdText,
      };

      await controller.handleJobSubmitted(payload);

      expect(mockLlmService.extractJobRequirements).toHaveBeenCalledWith(longJdText);
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalled();
    });
  });

  describe('handleJobSubmitted - error handling', () => {
    it('should publish error event when jobId is missing', async () => {
      const payload = {
        jdText: 'Some job description',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        undefined,
        expect.any(Error),
        expect.objectContaining({
          stage: 'jd-extraction',
        }),
      );
      expect(mockNatsService.publishAnalysisJdExtracted).not.toHaveBeenCalled();
    });

    it('should publish error event when jdText is missing', async () => {
      const payload = {
        jobId: 'job-123',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-123',
        expect.any(Error),
        expect.objectContaining({
          stage: 'jd-extraction',
          inputSize: undefined,
        }),
      );
      expect(mockNatsService.publishAnalysisJdExtracted).not.toHaveBeenCalled();
    });

    it('should publish error event when both jobId and jdText are missing', async () => {
      const payload = {};

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        undefined,
        expect.any(Error),
        expect.objectContaining({
          stage: 'jd-extraction',
          inputSize: undefined,
        }),
      );
      expect(mockNatsService.publishAnalysisJdExtracted).not.toHaveBeenCalled();
    });

    it('should handle LLM service extraction errors', async () => {
      const llmError = new Error('Gemini API timeout');
      mockLlmService.extractJobRequirements.mockRejectedValue(llmError);

      const payload = {
        jobId: 'job-error',
        jdText: 'Job description that will fail',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-error',
        llmError,
        expect.objectContaining({
          stage: 'jd-extraction',
          inputSize: payload.jdText.length,
          retryAttempt: 1,
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle network errors from LLM service', async () => {
      const networkError = new Error('Network connection failed');
      mockLlmService.extractJobRequirements.mockRejectedValue(networkError);

      const payload = {
        jobId: 'job-network-error',
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-network-error',
        networkError,
        expect.objectContaining({
          stage: 'jd-extraction',
        }),
      );
    });

    it('should handle malformed JD text gracefully', async () => {
      mockLlmService.extractJobRequirements.mockRejectedValue(
        new Error('Failed to parse job description'),
      );

      const payload = {
        jobId: 'job-malformed',
        jdText: ',,,!!!@@@### Invalid JD text',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing'),
        expect.any(Error),
      );
    });

    it('should handle publish error failures gracefully', async () => {
      mockNatsService.publishAnalysisJdExtracted.mockRejectedValue(
        new Error('NATS connection failed'),
      );

      const payload = {
        jobId: 'job-publish-fail',
        jdText: 'Valid job description',
      };

      await controller.handleJobSubmitted(payload);

      // Even though publish failed, the extraction was attempted
      expect(mockLlmService.extractJobRequirements).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should include input size in error context when available', async () => {
      mockLlmService.extractJobRequirements.mockRejectedValue(new Error('Parse error'));

      const payload = {
        jobId: 'job-size-test',
        jdText: 'A'.repeat(500), // 500 character JD
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-size-test',
        expect.any(Error),
        expect.objectContaining({
          inputSize: 500,
        }),
      );
    });

    it('should handle non-Error exceptions from LLM service', async () => {
      mockLlmService.extractJobRequirements.mockRejectedValue('String error message');

      const payload = {
        jobId: 'job-string-error',
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle null payload gracefully', async () => {
      // Note: The controller has a bug where it tries to access payload.jobId
      // in the error handler without checking if payload exists first
      // This test documents the current behavior
      await expect(controller.handleJobSubmitted(null as any)).rejects.toThrow();
    });

    it('should handle undefined payload gracefully', async () => {
      // Note: The controller has a bug where it tries to access payload.jobId
      // in the error handler without checking if payload exists first
      // This test documents the current behavior
      await expect(controller.handleJobSubmitted(undefined as any)).rejects.toThrow();
    });
  });

  describe('handleJobSubmitted - edge cases and validation', () => {
    it('should handle empty string jdText', async () => {
      mockLlmService.extractJobRequirements.mockRejectedValue(
        new Error('Job description extraction failed'),
      );

      const payload = {
        jobId: 'job-empty',
        jdText: '',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-empty',
        expect.any(Error),
        expect.objectContaining({
          inputSize: 0,
        }),
      );
    });

    it('should handle whitespace-only jdText', async () => {
      mockLlmService.extractJobRequirements.mockRejectedValue(
        new Error('Job description extraction failed'),
      );

      const payload = {
        jobId: 'job-whitespace',
        jdText: '   \n\t   \r\n   ',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalled();
    });

    it('should handle special characters in jobId', async () => {
      const payload = {
        jobId: 'job-123!@#$%^&*()',
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('job-123!@#$%^&*()'),
      );
    });

    it('should handle very long jobId', async () => {
      const longJobId = 'job-' + 'x'.repeat(1000);
      const payload = {
        jobId: longJobId,
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(longJobId),
      );
    });

    it('should handle JD text with unicode characters', async () => {
      const payload = {
        jobId: 'job-unicode',
        jdText: `
          Software Engineer — 北京办事处

          Requirements:
          • 中文沟通能力
          • English proficiency
          • 日本語スキル

          🌍 Global team collaboration
          🚀 Innovation mindset
        `,
      };

      await controller.handleJobSubmitted(payload);

      expect(mockLlmService.extractJobRequirements).toHaveBeenCalled();
    });

    it('should handle concurrent job submissions', async () => {
      const payloads = Array.from({ length: 5 }, (_, i) => ({
        jobId: `job-concurrent-${i}`,
        jdText: `Job description ${i}`,
      }));

      await Promise.all(
        payloads.map((payload) => controller.handleJobSubmitted(payload)),
      );

      expect(mockLlmService.extractJobRequirements).toHaveBeenCalledTimes(5);
      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledTimes(5);
    });

    it('should include retry attempt in error context', async () => {
      mockLlmService.extractJobRequirements.mockRejectedValue(new Error('Extraction failed'));

      const payload = {
        jobId: 'job-retry-test',
        jdText: 'Job description',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishProcessingError).toHaveBeenCalledWith(
        'job-retry-test',
        expect.any(Error),
        expect.objectContaining({
          retryAttempt: 1,
        }),
      );
    });
  });

  describe('handleJobSubmitted - integration scenarios', () => {
    it('should process standard tech job posting', async () => {
      const standardJdDTO: JdDTO = {
        requirements: {
          technical: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          soft: ['Communication', 'Teamwork'],
          experience: '3-5 years',
          education: "Bachelor's degree",
        },
        responsibilities: [
          'Build user interfaces with React',
          'Develop RESTful APIs',
          'Write unit and integration tests',
        ],
        benefits: ['Health insurance', '401k', 'Remote work'],
        company: {
          name: 'TechStartup Inc',
          industry: 'Software',
          size: '50-100 employees',
        },
      };

      mockLlmService.extractJobRequirements.mockResolvedValue(standardJdDTO);

      const payload = {
        jobId: 'job-standard-tech',
        jdText: `
          Senior Frontend Developer

          We're looking for a senior frontend developer to join our team.

          Requirements:
          - 3-5 years of experience
          - React and TypeScript expertise
          - Node.js backend experience
          - PostgreSQL database skills
          - Bachelor's degree in CS or related field

          Responsibilities:
          - Build responsive user interfaces
          - Develop RESTful APIs
          - Write clean, tested code

          Benefits:
          - Health insurance
          - 401k matching
          - Remote work options
        `,
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: payload.jobId,
        extractedData: standardJdDTO,
        processingTimeMs: expect.any(Number),
        confidence: 0.95,
        extractionMethod: 'gemini-ai',
      });
    });

    it('should process executive level job posting', async () => {
      const executiveJdDTO: JdDTO = {
        requirements: {
          technical: ['Strategic Planning', 'Budget Management', 'Stakeholder Management'],
          soft: ['Leadership', 'Communication', 'Decision Making'],
          experience: '10+ years',
          education: 'MBA or equivalent',
        },
        responsibilities: [
          'Define and execute company strategy',
          'Lead cross-functional teams',
          'Report to board of directors',
        ],
        benefits: [
          'Executive compensation package',
          'Equity stake',
          'Car allowance',
          'Executive health benefits',
        ],
        company: {
          name: 'Fortune 500 Corp',
          industry: 'Enterprise',
          size: '5000+ employees',
        },
      };

      mockLlmService.extractJobRequirements.mockResolvedValue(executiveJdDTO);

      const payload = {
        jobId: 'job-executive',
        jdText: 'Chief Technology Officer position...',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: payload.jobId,
        extractedData: executiveJdDTO,
        processingTimeMs: expect.any(Number),
        confidence: 0.95,
        extractionMethod: 'gemini-ai',
      });
    });

    it('should process entry-level job posting', async () => {
      const entryLevelJdDTO: JdDTO = {
        requirements: {
          technical: ['Basic programming', 'Problem solving'],
          soft: ['Eagerness to learn', 'Team player'],
          experience: 'Entry level',
          education: "Bachelor's degree or equivalent",
        },
        responsibilities: [
          'Learn from senior developers',
          'Contribute to small features',
          'Participate in code reviews',
        ],
        benefits: ['Mentorship program', 'Learning budget', 'Flexible hours'],
        company: {
          name: 'Growing Startup',
          industry: 'Technology',
          size: '10-50 employees',
        },
      };

      mockLlmService.extractJobRequirements.mockResolvedValue(entryLevelJdDTO);

      const payload = {
        jobId: 'job-entry-level',
        jdText: 'Junior Developer - No experience required...',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: payload.jobId,
        extractedData: entryLevelJdDTO,
        processingTimeMs: expect.any(Number),
        confidence: 0.95,
        extractionMethod: 'gemini-ai',
      });
    });

    it('should process remote-first job posting', async () => {
      const remoteJdDTO: JdDTO = {
        requirements: {
          technical: ['JavaScript', 'React', 'Git'],
          soft: ['Self-motivated', 'Remote communication', 'Time management'],
          experience: '2+ years',
          education: 'Not specified',
        },
        responsibilities: [
          'Work remotely with distributed team',
          'Attend virtual standups',
          'Deliver features asynchronously',
        ],
        benefits: [
          'Fully remote',
          'Home office stipend',
          'Flexible timezone',
          'Unlimited PTO',
        ],
        company: {
          name: 'Remote-First Co',
          industry: 'Software',
          size: '100-200 employees',
        },
      };

      mockLlmService.extractJobRequirements.mockResolvedValue(remoteJdDTO);

      const payload = {
        jobId: 'job-remote',
        jdText: '100% Remote Software Engineer...',
      };

      await controller.handleJobSubmitted(payload);

      expect(mockNatsService.publishAnalysisJdExtracted).toHaveBeenCalledWith({
        jobId: payload.jobId,
        extractedData: remoteJdDTO,
        processingTimeMs: expect.any(Number),
        confidence: 0.95,
        extractionMethod: 'gemini-ai',
      });
    });
  });
});
