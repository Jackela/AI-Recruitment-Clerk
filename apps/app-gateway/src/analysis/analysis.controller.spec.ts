import { AnalysisController } from './analysis.controller';
import type { AnalysisService } from './analysis.service';
import { ErrorUtils } from '@ai-recruitment-clerk/shared-dtos';

jest.mock('@ai-recruitment-clerk/shared-dtos', () => ({
  ErrorUtils: {
    validateAndThrow: jest.fn(),
    createNotFoundError: jest.fn(),
    withErrorHandling: jest.fn((fn) => fn()),
  },
}));

describe('AnalysisController', () => {
  let controller: AnalysisController;
  let service: jest.Mocked<AnalysisService>;

  beforeEach(() => {
    service = {
      initiateAnalysis: jest.fn(),
    } as any;
    controller = new AnalysisController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startAnalysis', () => {
    const mockResumeFile = {
      originalname: 'resume.pdf',
      size: 1024 * 1024,
      mimetype: 'application/pdf',
    } as any;

    it('should initiate analysis successfully', async () => {
      const mockResponse = {
        analysisId: 'analysis_123',
        status: 'processing',
        message: 'Analysis started',
        estimatedProcessingTime: 30,
        processingSteps: ['jd_extraction'],
        timestamp: new Date().toISOString(),
      };
      service.initiateAnalysis.mockResolvedValue(mockResponse);

      const result = await controller.startAnalysis(
        { jdText: 'Job description' },
        mockResumeFile,
      );

      expect(result).toEqual(mockResponse);
      expect(service.initiateAnalysis).toHaveBeenCalledWith(
        'Job description',
        mockResumeFile,
        undefined,
        undefined,
      );
    });

    it('should pass sessionId to service', async () => {
      service.initiateAnalysis.mockResolvedValue({
        analysisId: 'analysis_123',
        status: 'processing',
        message: 'Analysis started',
        estimatedProcessingTime: 30,
        processingSteps: [],
        timestamp: new Date().toISOString(),
      });

      await controller.startAnalysis(
        { jdText: 'JD', sessionId: 'session-456' },
        mockResumeFile,
      );

      expect(service.initiateAnalysis).toHaveBeenCalledWith(
        'JD',
        mockResumeFile,
        'session-456',
        undefined,
      );
    });

    it('should pass options to service', async () => {
      service.initiateAnalysis.mockResolvedValue({
        analysisId: 'analysis_123',
        status: 'processing',
        message: 'Analysis started',
        estimatedProcessingTime: 30,
        processingSteps: [],
        timestamp: new Date().toISOString(),
      });

      await controller.startAnalysis(
        { jdText: 'JD', options: '{"extractSkills": true}' },
        mockResumeFile,
      );

      expect(service.initiateAnalysis).toHaveBeenCalledWith(
        'JD',
        mockResumeFile,
        undefined,
        '{"extractSkills": true}',
      );
    });
  });
});
