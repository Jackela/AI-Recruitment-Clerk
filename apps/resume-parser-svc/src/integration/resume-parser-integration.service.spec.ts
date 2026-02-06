import { ResumeParserIntegrationService } from './resume-parser-integration.service';
import type {
  FieldMappingResult,
  VisionLlmResponse,
} from '../dto/resume-parsing.dto';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';

// Mock VisionLlmService
const mockVisionLlmService = {
  parseResumePdfAdvanced: jest.fn(),
  healthCheck: jest.fn(),
};

// Mock FieldMapperService
const mockFieldMapperService = {
  normalizeWithValidation: jest.fn(),
  normalizeToResumeDto: jest.fn(),
  normalizeSkills: jest.fn(),
  calculateExperience: jest.fn(),
};

describe('ResumeParserIntegrationService', () => {
  let service: ResumeParserIntegrationService;

  const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');
  const mockFilename = 'test-resume.pdf';

  // Mock valid Vision LLM response
  const createMockVisionResponse = (
    confidence: number = 0.9,
    processingTimeMs: number = 2000,
  ): VisionLlmResponse => ({
    extractedData: {
      contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
      skills: ['JavaScript', 'TypeScript', 'Node.js', 'Angular', 'NestJS'],
      workExperience: [
        {
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: '2020-01-01',
          endDate: '2023-12-31',
          summary: 'Full-stack development',
        },
        {
          company: 'StartUp Inc',
          position: 'Developer',
          startDate: '2018-01-01',
          endDate: '2019-12-31',
          summary: 'Web development',
        },
      ],
      education: [
        {
          school: 'State University',
          degree: "Bachelor's Degree",
          major: 'Computer Science',
        },
      ],
    },
    confidence,
    processingTimeMs,
  });

  // Mock valid field mapping result
  const createMockMappingResult = (
    validationErrors: string[] = [],
    mappingConfidence: number = 0.95,
  ): FieldMappingResult => ({
    resumeDto: {
      contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
      skills: ['JavaScript', 'TypeScript', 'Node.js', 'Angular', 'NestJS'],
      workExperience: [
        {
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: '2020-01',
          endDate: '2023-12',
          summary: 'Full-stack development',
        },
        {
          company: 'StartUp Inc',
          position: 'Developer',
          startDate: '2018-01',
          endDate: '2019-12',
          summary: 'Web development',
        },
      ],
      education: [
        {
          school: 'State University',
          degree: "Bachelor's Degree",
          major: 'Computer Science',
        },
      ],
    },
    validationErrors,
    mappingConfidence,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockVisionLlmService.parseResumePdfAdvanced.mockResolvedValue(createMockVisionResponse());
    mockVisionLlmService.healthCheck.mockResolvedValue(true);
    mockFieldMapperService.normalizeWithValidation.mockResolvedValue(createMockMappingResult());
    mockFieldMapperService.normalizeToResumeDto.mockResolvedValue(
      createMockMappingResult().resumeDto,
    );
    mockFieldMapperService.normalizeSkills.mockResolvedValue(['JavaScript', 'TypeScript']);
    mockFieldMapperService.calculateExperience.mockResolvedValue({
      totalYears: 5,
      relevantYears: 4,
      seniorityLevel: 'Senior',
      confidenceScore: 0.85,
    });

    service = new ResumeParserIntegrationService(
      mockVisionLlmService as any,
      mockFieldMapperService as any,
    );
  });

  describe('parseResume', () => {
    describe('successful parsing with valid data', () => {
      it('should parse resume with complete valid data', async () => {
        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result).toBeDefined();
        expect(result.resumeDto.contactInfo.name).toBe('John Doe');
        expect(result.resumeDto.contactInfo.email).toBe('john@example.com');
        expect(result.resumeDto.contactInfo.phone).toBe('+1234567890');
        expect(result.resumeDto.skills).toHaveLength(5);
        expect(result.resumeDto.workExperience).toHaveLength(2);
        expect(result.resumeDto.education).toHaveLength(1);
      });

      it('should call Vision LLM service with correct parameters', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename);

        expect(mockVisionLlmService.parseResumePdfAdvanced).toHaveBeenCalledWith({
          pdfBuffer: mockPdfBuffer,
          filename: mockFilename,
          options: expect.objectContaining({
            language: 'en',
          }),
        });
      });

      it('should call field mapper service for normalization', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename);

        expect(mockFieldMapperService.normalizeWithValidation).toHaveBeenCalled();
      });

      it('should calculate experience when enabled', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename, {
          enableExperienceCalculation: true,
        });

        expect(mockFieldMapperService.calculateExperience).toHaveBeenCalledWith(
          expect.any(Array),
          undefined,
        );
      });

      it('should calculate experience with target skills', async () => {
        const targetSkills = ['JavaScript', 'Python'];
        await service.parseResume(mockPdfBuffer, mockFilename, {
          enableExperienceCalculation: true,
          targetSkills,
        });

        expect(mockFieldMapperService.calculateExperience).toHaveBeenCalledWith(
          expect.any(Array),
          targetSkills,
        );
      });

      it('should skip experience calculation when disabled', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename, {
          enableExperienceCalculation: false,
        });

        expect(mockFieldMapperService.calculateExperience).not.toHaveBeenCalled();
      });

      it('should calculate quality metrics', async () => {
        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics).toBeDefined();
        expect(result.qualityMetrics.dataCompleteness).toBeGreaterThanOrEqual(0);
        expect(result.qualityMetrics.dataCompleteness).toBeLessThanOrEqual(1);
        expect(result.qualityMetrics.accuracyScore).toBeGreaterThanOrEqual(0);
        expect(result.qualityMetrics.accuracyScore).toBeLessThanOrEqual(1);
        expect(result.qualityMetrics.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(result.qualityMetrics.consistencyScore).toBeLessThanOrEqual(1);
        expect(result.qualityMetrics.reliabilityScore).toBeGreaterThanOrEqual(0);
        expect(result.qualityMetrics.reliabilityScore).toBeLessThanOrEqual(1);
      });

      it('should calculate total confidence', async () => {
        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.totalConfidence).toBeDefined();
        expect(result.totalConfidence).toBeGreaterThan(0);
        expect(result.totalConfidence).toBeLessThanOrEqual(1);
      });

      it('should return processing time', async () => {
        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.processingTimeMs).toBeGreaterThan(0);
      });

      it('should return extraction confidence from Vision LLM', async () => {
        const mockResponse = createMockVisionResponse(0.85);
        mockVisionLlmService.parseResumePdfAdvanced.mockResolvedValue(mockResponse);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.extractionConfidence).toBe(0.85);
      });

      it('should return mapping confidence from field mapper', async () => {
        const mockMapping = createMockMappingResult([], 0.92);
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(mockMapping);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.mappingConfidence).toBe(0.92);
      });

      it('should use default options when none provided', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename);

        const callArgs = mockVisionLlmService.parseResumePdfAdvanced.mock.calls[0];
        expect(callArgs).toBeDefined();
      });

      it('should merge custom options with defaults', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename, {
          qualityThreshold: 0.8,
          enableValidation: false,
        });

        expect(mockFieldMapperService.normalizeWithValidation).not.toHaveBeenCalled();
        expect(mockFieldMapperService.normalizeToResumeDto).toHaveBeenCalled();
      });
    });

    describe('quality metrics calculation', () => {
      it('should calculate high data completeness for complete resume', async () => {
        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics.dataCompleteness).toBeGreaterThan(0.8);
      });

      it('should calculate low data completeness for incomplete resume', async () => {
        const incompleteMapping: FieldMappingResult = {
          resumeDto: {
            contactInfo: { name: null, email: null, phone: null },
            skills: [],
            workExperience: [],
            education: [],
          },
          validationErrors: [],
          mappingConfidence: 0,
        };
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(incompleteMapping);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics.dataCompleteness).toBe(0);
      });

      it('should reduce accuracy score with validation errors', async () => {
        const errorMapping: FieldMappingResult = {
          ...createMockMappingResult(),
          validationErrors: ['Invalid email', 'Missing phone'],
        };
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(errorMapping);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics.accuracyScore).toBeLessThan(1);
      });

      it('should detect date consistency issues', async () => {
        const inconsistentMapping: FieldMappingResult = {
          resumeDto: {
            ...createMockMappingResult().resumeDto,
            workExperience: [
              {
                company: 'Test Corp',
                position: 'Developer',
                startDate: '2023-01-01',
                endDate: '2020-01-01', // End before start
                summary: 'Test',
              },
            ],
          },
          validationErrors: [],
          mappingConfidence: 0.9,
        };
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(inconsistentMapping);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics.consistencyScore).toBeLessThan(1);
      });

      it('should calculate reliability score based on confidence and time', async () => {
        const fastVisionResponse = createMockVisionResponse(0.9, 500); // Fast processing
        mockVisionLlmService.parseResumePdfAdvanced.mockResolvedValue(fastVisionResponse);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics.reliabilityScore).toBeGreaterThan(0);
      });
    });

    describe('total confidence calculation', () => {
      it('should calculate weighted confidence from all sources', async () => {
        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.totalConfidence).toBeGreaterThan(0);
        expect(result.totalConfidence).toBeLessThanOrEqual(1);
      });

      it('should clamp total confidence when data completeness is low', async () => {
        const incompleteMapping: FieldMappingResult = {
          resumeDto: {
            contactInfo: { name: 'Test', email: null, phone: null },
            skills: [],
            workExperience: [],
            education: [],
          },
          validationErrors: [],
          mappingConfidence: 1.0,
        };
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(incompleteMapping);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.qualityMetrics.dataCompleteness).toBeLessThan(0.6);
        expect(result.totalConfidence).toBeLessThanOrEqual(0.75);
      });
    });

    describe('error handling', () => {
      it('should return error result when Vision LLM throws', async () => {
        mockVisionLlmService.parseResumePdfAdvanced.mockRejectedValue(
          new Error('LLM service unavailable'),
        );

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.totalConfidence).toBe(0);
        expect(result.extractionConfidence).toBe(0);
        expect(result.mappingConfidence).toBe(0);
        expect(result.validationErrors).toContain('Processing failed');
      });

      it('should return error result when field mapper throws', async () => {
        mockFieldMapperService.normalizeWithValidation.mockRejectedValue(
          new Error('Normalization failed'),
        );

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.totalConfidence).toBe(0);
        expect(result.validationErrors).toContain('Processing failed');
      });

      it('should return error result with error message', async () => {
        mockVisionLlmService.parseResumePdfAdvanced.mockRejectedValue(
          new Error('Network timeout'),
        );

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.validationErrors).toHaveLength(2);
        expect(result.validationErrors[0]).toBe('Processing failed');
        expect(result.validationErrors[1]).toContain('Network timeout');
      });

      it('should handle non-Error exceptions', async () => {
        mockVisionLlmService.parseResumePdfAdvanced.mockRejectedValue('String error');

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.totalConfidence).toBe(0);
        // When a string is thrown, the error handling converts it but the message may be 'undefined'
        expect(result.validationErrors).toHaveLength(2);
        expect(result.validationErrors[0]).toBe('Processing failed');
      });

      it('should include processing time in error result', async () => {
        mockVisionLlmService.parseResumePdfAdvanced.mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100),
            ),
        );

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.processingTimeMs).toBeGreaterThanOrEqual(100);
      });
    });

    describe('retry logic', () => {
      it('should retry on Vision LLM failure', async () => {
        mockVisionLlmService.parseResumePdfAdvanced
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValueOnce(createMockVisionResponse());

        const result = await service.parseResume(mockPdfBuffer, mockFilename, {
          retryAttempts: 2,
        });

        expect(result.totalConfidence).toBeGreaterThan(0);
        expect(mockVisionLlmService.parseResumePdfAdvanced).toHaveBeenCalledTimes(2);
      });

      it('should use default retry attempts when not specified', async () => {
        mockVisionLlmService.parseResumePdfAdvanced.mockResolvedValue(
          createMockVisionResponse(),
        );

        await service.parseResume(mockPdfBuffer, mockFilename);

        expect(mockVisionLlmService.parseResumePdfAdvanced).toHaveBeenCalledTimes(1);
      });

      it('should throw after max retries exhausted', async () => {
        mockVisionLlmService.parseResumePdfAdvanced.mockRejectedValue(
          new Error('Persistent failure'),
        );

        const result = await service.parseResume(mockPdfBuffer, mockFilename, {
          retryAttempts: 2,
        });

        expect(result.totalConfidence).toBe(0);
        expect(result.validationErrors).toContain('Processing failed');
      });
    });

    describe('validation options', () => {
      it('should use normalizeWithValidation when enableValidation is true', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename, {
          enableValidation: true,
        });

        expect(mockFieldMapperService.normalizeWithValidation).toHaveBeenCalled();
        expect(mockFieldMapperService.normalizeToResumeDto).not.toHaveBeenCalled();
      });

      it('should use normalizeToResumeDto when enableValidation is false', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename, {
          enableValidation: false,
        });

        expect(mockFieldMapperService.normalizeWithValidation).not.toHaveBeenCalled();
        expect(mockFieldMapperService.normalizeToResumeDto).toHaveBeenCalled();
      });

      it('should have validation enabled by default', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename);

        expect(mockFieldMapperService.normalizeWithValidation).toHaveBeenCalled();
      });

      it('should return validation errors from field mapper', async () => {
        const errors = ['Missing email', 'Invalid phone'];
        const errorMapping: FieldMappingResult = {
          ...createMockMappingResult(),
          validationErrors: errors,
        };
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(errorMapping);

        const result = await service.parseResume(mockPdfBuffer, mockFilename);

        expect(result.validationErrors).toEqual(errors);
      });
    });

    describe('quality threshold', () => {
      it('should use default quality threshold of 0.7', async () => {
        const lowConfidenceMapping: FieldMappingResult = {
          ...createMockMappingResult(),
          mappingConfidence: 0.5,
        };
        mockFieldMapperService.normalizeWithValidation.mockResolvedValue(
          lowConfidenceMapping,
        );
        const lowVisionResponse = createMockVisionResponse(0.5);
        mockVisionLlmService.parseResumePdfAdvanced.mockResolvedValue(lowVisionResponse);

        await service.parseResume(mockPdfBuffer, mockFilename);

        // Should not throw, just log warning
        expect(mockFieldMapperService.normalizeWithValidation).toHaveBeenCalled();
      });

      it('should accept custom quality threshold', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename, {
          qualityThreshold: 0.5,
        });

        // Should complete without error
        expect(mockFieldMapperService.normalizeWithValidation).toHaveBeenCalled();
      });
    });

    describe('target skills in extraction prompt', () => {
      it('should include target skills in extraction request', async () => {
        const targetSkills = ['JavaScript', 'React', 'Node.js'];
        await service.parseResume(mockPdfBuffer, mockFilename, {
          targetSkills,
        });

        const callArgs = mockVisionLlmService.parseResumePdfAdvanced.mock.calls[0];
        expect(callArgs[0].options.extractionPrompt).toContain('JavaScript');
        expect(callArgs[0].options.extractionPrompt).toContain('React');
        expect(callArgs[0].options.extractionPrompt).toContain('Node.js');
      });

      it('should not include target skills when not provided', async () => {
        await service.parseResume(mockPdfBuffer, mockFilename);

        const callArgs = mockVisionLlmService.parseResumePdfAdvanced.mock.calls[0];
        expect(callArgs[0].options.extractionPrompt).not.toContain('Target Skills');
      });
    });
  });

  describe('parseResumesBatch', () => {
    it('should process multiple resumes', async () => {
      const resumes = [
        { pdfBuffer: mockPdfBuffer, filename: 'resume1.pdf' },
        { pdfBuffer: mockPdfBuffer, filename: 'resume2.pdf' },
        { pdfBuffer: mockPdfBuffer, filename: 'resume3.pdf' },
      ];

      const results = await service.parseResumesBatch(resumes);

      expect(results).toHaveLength(3);
      expect(results[0].filename).toBe('resume1.pdf');
      expect(results[1].filename).toBe('resume2.pdf');
      expect(results[2].filename).toBe('resume3.pdf');
    });

    it('should set error field for failed parsing', async () => {
      const resumes = [
        { pdfBuffer: mockPdfBuffer, filename: 'resume1.pdf' },
        { pdfBuffer: mockPdfBuffer, filename: 'resume2.pdf' },
      ];
      mockVisionLlmService.parseResumePdfAdvanced
        .mockResolvedValueOnce(createMockVisionResponse())
        .mockRejectedValueOnce(new Error('Parse failed'));

      const results = await service.parseResumesBatch(resumes);

      expect(results[0].error).toBeUndefined();
      expect(results[1].error).toBeDefined();
      // parseResume catches the error and returns an error result with validationErrors
      // The batch processing then uses the first validation error as the error message
      expect(results[1].error).toBe('Processing failed');
    });

    it('should reduce retry attempts for batch processing', async () => {
      const resumes = [{ pdfBuffer: mockPdfBuffer, filename: 'resume1.pdf' }];
      await service.parseResumesBatch(resumes, { retryAttempts: 3 });

      // Uses retryAttempts from options, defaults to 1 for batch
      expect(mockVisionLlmService.parseResumePdfAdvanced).toHaveBeenCalledTimes(1);
    });

    it('should handle empty batch', async () => {
      const results = await service.parseResumesBatch([]);

      expect(results).toHaveLength(0);
    });

    it('should include processing stats for each resume', async () => {
      const resumes = [{ pdfBuffer: mockPdfBuffer, filename: 'resume1.pdf' }];

      const results = await service.parseResumesBatch(resumes);

      expect(results[0].result.processingTimeMs).toBeGreaterThan(0);
      expect(results[0].result.totalConfidence).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when all components are available', async () => {
      mockVisionLlmService.healthCheck.mockResolvedValue(true);

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.components.visionLlm).toBe(true);
      expect(result.components.fieldMapper).toBe(true);
      expect(result.components.integration).toBe(true);
    });

    it('should return degraded when Vision LLM is unavailable', async () => {
      mockVisionLlmService.healthCheck.mockResolvedValue(false);

      const result = await service.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.components.visionLlm).toBe(false);
    });

    it('should return unhealthy when most components fail', async () => {
      mockFieldMapperService.normalizeSkills.mockResolvedValue([]);
      mockVisionLlmService.healthCheck.mockResolvedValue(false);

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
    });

    it('should include lastChecked timestamp', async () => {
      const beforeCheck = new Date();
      const result = await service.healthCheck();
      const afterCheck = new Date();

      expect(result.lastChecked).toBeInstanceOf(Date);
      expect(result.lastChecked.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
      expect(result.lastChecked.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    });

    it('should handle health check exceptions gracefully', async () => {
      mockVisionLlmService.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.components.visionLlm).toBe(false);
    });
  });

  describe('getProcessingStats', () => {
    it('should return default processing statistics', async () => {
      const stats = await service.getProcessingStats();

      expect(stats).toBeDefined();
      expect(stats.avgProcessingTime).toBe(3500);
      expect(stats.avgConfidence).toBe(0.85);
      expect(stats.successRate).toBe(0.95);
      expect(stats.qualityDistribution).toBeDefined();
    });

    it('should include quality distribution breakdown', async () => {
      const stats = await service.getProcessingStats();

      expect(stats.qualityDistribution.excellent).toBe(0.3);
      expect(stats.qualityDistribution.good).toBe(0.5);
      expect(stats.qualityDistribution.fair).toBe(0.15);
      expect(stats.qualityDistribution.poor).toBe(0.05);
    });
  });

  describe('edge cases', () => {
    it('should handle empty PDF buffer', async () => {
      // The mock Vision LLM doesn't validate PDF, so empty buffer still succeeds
      // In a real scenario, Vision LLM would fail on empty buffer
      const result = await service.parseResume(Buffer.from(''), 'empty.pdf');

      expect(result).toBeDefined();
      // Result is returned with the mock data
      expect(result.resumeDto).toBeDefined();
    });

    it('should handle special characters in filename', async () => {
      const specialFilename = 'resume-test-file@#$%.pdf';

      const result = await service.parseResume(mockPdfBuffer, specialFilename);

      expect(result).toBeDefined();
    });

    it('should handle very long filename', async () => {
      const longFilename = 'a'.repeat(300) + '.pdf';

      const result = await service.parseResume(mockPdfBuffer, longFilename);

      expect(result).toBeDefined();
    });

    it('should handle minimum processing time of 1ms', async () => {
      // Mock a very fast response
      mockVisionLlmService.parseResumePdfAdvanced.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolve(createMockVisionResponse(0.9, 0));
          }),
      );

      const result = await service.parseResume(mockPdfBuffer, mockFilename);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(1);
    });
  });
});
