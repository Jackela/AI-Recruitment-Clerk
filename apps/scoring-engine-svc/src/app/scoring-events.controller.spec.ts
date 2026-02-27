import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ScoringEventsController } from './scoring-events.controller';
import { ScoringEngineService } from '../scoring.service';
import { ScoringEngineNatsService } from '../services/scoring-engine-nats.service';
import type { AnalysisJdExtractedEvent } from '@ai-recruitment-clerk/job-management-domain';
import type { AnalysisResumeParsedEvent } from '@ai-recruitment-clerk/resume-processing-domain';
import {
  ErrorCorrelationManager,
  ScoringEngineException,
} from '@app/shared-dtos';

// Mock ErrorCorrelationManager before any tests run
jest.mock('@app/shared-dtos', () => ({
  ...jest.requireActual('@app/shared-dtos'),
  ErrorCorrelationManager: {
    getContext: jest.fn().mockReturnValue({ traceId: 'test-trace-id' }),
  },
  ScoringEngineException: jest.requireActual('@app/shared-dtos').ScoringEngineException,
  ScoringEngineErrorCode: jest.requireActual('@app/shared-dtos').ScoringEngineErrorCode,
}));

describe('ScoringEventsController', () => {
  let controller: ScoringEventsController;
  let scoringEngine: jest.Mocked<ScoringEngineService>;
  let natsService: jest.Mocked<ScoringEngineNatsService>;

  const mockScoringEngine = {
    handleJdExtractedEvent: jest.fn(),
    handleResumeParsedEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockNatsService = {
    subscribeToJdExtracted: jest.fn().mockResolvedValue(undefined),
    subscribeToResumeParsed: jest.fn().mockResolvedValue(undefined),
    publishScoringError: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset the mock for each test
    (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
      traceId: 'test-trace-id',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [ScoringEventsController],
      providers: [
        {
          provide: ScoringEngineService,
          useValue: mockScoringEngine,
        },
        {
          provide: ScoringEngineNatsService,
          useValue: mockNatsService,
        },
      ],
    }).compile();

    controller = moduleRef.get(ScoringEventsController);
    scoringEngine = moduleRef.get(ScoringEngineService);
    natsService = moduleRef.get(ScoringEngineNatsService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should subscribe to events on module init', async () => {
      await controller.onModuleInit();

      expect(natsService.subscribeToJdExtracted).toHaveBeenCalled();
      expect(natsService.subscribeToResumeParsed).toHaveBeenCalled();
    });

    it('should handle missing NATS service gracefully on init', async () => {
      const controllerWithoutNats = new ScoringEventsController(undefined, scoringEngine);

      // Should not throw
      await expect(controllerWithoutNats.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('handleJdExtracted', () => {
    const validJdPayload: AnalysisJdExtractedEvent = {
      jobId: 'job-1',
      extractedData: {
        requirements: {
          technical: ['JavaScript', 'React', 'Node.js'],
          soft: ['communication', 'teamwork'],
          experience: '3-5 years',
          education: 'bachelor',
        },
        responsibilities: ['Build web applications', 'Lead development'],
        benefits: ['Health insurance', 'Remote work'],
        company: {
          industry: 'Technology',
          size: 'scaleup',
        },
      } as any,
      timestamp: new Date().toISOString(),
      processingTimeMs: 100,
    };

    it('logs jobId on jd extracted', async () => {
      const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await controller.handleJdExtracted(validJdPayload);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('job-1'),
      );
      expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
        }),
      );
      spy.mockRestore();
    });

    it('should call scoring engine with converted JD DTO', async () => {
      await controller.handleJdExtracted(validJdPayload);

      expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          jdDto: expect.objectContaining({
            requiredSkills: expect.arrayContaining([
              expect.objectContaining({ name: 'JavaScript', required: true }),
            ]),
            experienceYears: { min: 3, max: 5 },
            educationLevel: 'bachelor',
            seniority: 'mid',
            industryContext: 'Technology',
          }),
        }),
      );
    });

    it('should throw ScoringEngineException for missing jobId', async () => {
      const invalidPayload = {
        ...validJdPayload,
        jobId: undefined,
      } as any;

      await expect(controller.handleJdExtracted(invalidPayload)).rejects.toThrow(
        ScoringEngineException,
      );
    });

    it('should throw ScoringEngineException for missing extractedData', async () => {
      const invalidPayload = {
        ...validJdPayload,
        extractedData: undefined,
      } as any;

      await expect(controller.handleJdExtracted(invalidPayload)).rejects.toThrow(
        ScoringEngineException,
      );
    });

    it('should handle scoring engine being undefined', async () => {
      const controllerWithoutEngine = new ScoringEventsController(natsService, undefined);

      // Should not throw
      await expect(controllerWithoutEngine.handleJdExtracted(validJdPayload)).resolves.not.toThrow();
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalPayload: AnalysisJdExtractedEvent = {
        jobId: 'job-2',
        extractedData: {
          requirements: {
            technical: [],
            soft: [],
            experience: '',
            education: '',
          },
          responsibilities: [],
          benefits: [],
          company: {},
        } as any,
        timestamp: new Date().toISOString(),
        processingTimeMs: 1,
      };

      await controller.handleJdExtracted(minimalPayload);

      expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-2',
          jdDto: expect.objectContaining({
            requiredSkills: [],
            experienceYears: { min: 0, max: 10 }, // Default
            educationLevel: 'any', // Default
          }),
        }),
      );
    });

    it('should handle scoring engine being undefined', async () => {
      const controllerWithoutEngine = new ScoringEventsController(natsService, undefined);

      // Should not throw
      await expect(controllerWithoutEngine.handleJdExtracted(validJdPayload)).resolves.not.toThrow();
    });
  });

  describe('handleResumeParsed', () => {
    const validResumePayload: AnalysisResumeParsedEvent = {
      jobId: 'job-1',
      resumeId: 'resume-1',
      resumeDto: {
        contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '555-0123' },
        skills: ['JavaScript', 'React', 'Node.js'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Full stack development',
          },
        ],
        education: [
          {
            school: 'University',
            degree: 'Bachelor',
            major: 'Computer Science',
          },
        ],
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: 100,
    };

    it('logs resumeId on resume parsed', async () => {
      const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await controller.handleResumeParsed(validResumePayload);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('resume-1'),
      );
      expect(scoringEngine.handleResumeParsedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          resumeId: 'resume-1',
        }),
      );
      spy.mockRestore();
    });

    it('should throw ScoringEngineException for missing jobId', async () => {
      const invalidPayload = {
        ...validResumePayload,
        jobId: undefined,
      } as any;

      await expect(controller.handleResumeParsed(invalidPayload)).rejects.toThrow(
        ScoringEngineException,
      );
    });

    it('should throw ScoringEngineException for missing resumeId', async () => {
      const invalidPayload = {
        ...validResumePayload,
        resumeId: undefined,
      } as any;

      await expect(controller.handleResumeParsed(invalidPayload)).rejects.toThrow(
        ScoringEngineException,
      );
    });

    it('should throw ScoringEngineException for missing resumeDto', async () => {
      const invalidPayload = {
        ...validResumePayload,
        resumeDto: undefined,
      } as any;

      await expect(controller.handleResumeParsed(invalidPayload)).rejects.toThrow(
        ScoringEngineException,
      );
    });

    it('should handle scoring engine being undefined', async () => {
      const controllerWithoutEngine = new ScoringEventsController(natsService, undefined);

      // Should not throw since scoringEngine is optional
      await expect(controllerWithoutEngine.handleResumeParsed(validResumePayload)).resolves.not.toThrow();
    });
  });

  describe('JD Conversion Methods', () => {
    describe('parseExperienceYears', () => {
      it('should parse range format "3-5 years"', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: '3-5 years',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              experienceYears: { min: 3, max: 5 },
            }),
          }),
        );
      });

      it('should parse plus format "5+ years"', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: '5+ years',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              experienceYears: { min: 5, max: 7 },
            }),
          }),
        );
      });

      it('should return default for unparseable string', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: 'experienced',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              experienceYears: { min: 0, max: 10 },
            }),
          }),
        );
      });
    });

    describe('parseEducationLevel', () => {
      it('should detect PhD', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              education: 'PhD in Computer Science',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              educationLevel: 'phd',
            }),
          }),
        );
      });

      it('should detect Master', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              education: 'Master degree required',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              educationLevel: 'master',
            }),
          }),
        );
      });

      it('should detect Bachelor', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              education: "Bachelor's degree",
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              educationLevel: 'bachelor',
            }),
          }),
        );
      });

      it('should return any for unrecognized', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              education: 'High school diploma',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              educationLevel: 'any',
            }),
          }),
        );
      });
    });

    describe('parseSeniority', () => {
      it('should detect lead from title', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: 'Tech Lead position',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              seniority: 'lead',
            }),
          }),
        );
      });

      it('should detect principal as lead', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: 'Principal Engineer',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              seniority: 'lead',
            }),
          }),
        );
      });

      it('should detect senior from years', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: '7+ years experience',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              seniority: 'senior',
            }),
          }),
        );
      });

      it('should detect junior', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: 'Entry level position',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              seniority: 'junior',
            }),
          }),
        );
      });

      it('should return mid as default', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            requirements: {
              experience: '',
            },
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              seniority: 'mid',
            }),
          }),
        );
      });
    });

    describe('parseCompanySize', () => {
      it('should detect startup', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            company: { size: 'startup' },
            requirements: {},
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              companyProfile: expect.objectContaining({
                size: 'startup',
              }),
            }),
          }),
        );
      });

      it('should detect enterprise', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            company: { size: 'large enterprise' },
            requirements: {},
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              companyProfile: expect.objectContaining({
                size: 'enterprise',
              }),
            }),
          }),
        );
      });

      it('should default to scaleup for medium', () => {
        const payload: AnalysisJdExtractedEvent = {
          jobId: 'job-1',
          extractedData: {
            company: { size: 'medium' },
            requirements: {},
          } as any,
          timestamp: new Date().toISOString(),
          processingTimeMs: 1,
        };

        controller.handleJdExtracted(payload);

        expect(scoringEngine.handleJdExtractedEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            jdDto: expect.objectContaining({
              companyProfile: expect.objectContaining({
                size: 'scaleup',
              }),
            }),
          }),
        );
      });
    });
  });

  describe('Error Correlation', () => {
    it('should include correlation context in exceptions', async () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue({
        traceId: 'correlation-123',
      });

      const invalidPayload = {
        jobId: undefined,
        extractedData: undefined,
      } as any;

      try {
        await controller.handleJdExtracted(invalidPayload);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScoringEngineException);
        // Verify the error details contain correlation context
        expect((error as ScoringEngineException).errorDetails.details).toBeDefined();
      }
    });

    it('should handle undefined correlation context', async () => {
      (ErrorCorrelationManager.getContext as jest.Mock).mockReturnValue(undefined);

      const invalidPayload = {
        jobId: undefined,
        extractedData: undefined,
      } as any;

      try {
        await controller.handleJdExtracted(invalidPayload);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScoringEngineException);
        // Error should still be thrown even without correlation context
        expect((error as ScoringEngineException).errorDetails).toBeDefined();
      }
    });
  });
});
