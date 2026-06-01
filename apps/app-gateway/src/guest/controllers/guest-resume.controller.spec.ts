import { HttpException } from '@nestjs/common';
import { GuestResumeController } from './guest-resume.controller';
import type { GuestUsageService } from '../services/guest-usage.service';
import type { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import type { GridFsService } from '../../services/gridfs.service';
import type { RequestWithDeviceId } from '../guards/guest.guard';
import type { GuestResumeAnalysisService } from '../services/guest-resume-analysis.service';
type MulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

describe('GuestResumeController (lightweight)', () => {
  const usageService = {
    canUse: jest.fn(),
    getUsageStatus: jest.fn(),
  } as unknown as jest.Mocked<GuestUsageService>;

  const natsClient = {
    publishResumeSubmitted: jest.fn().mockResolvedValue({ success: true }),
    waitForAnalysisParsed: jest.fn(),
  } as unknown as jest.Mocked<AppGatewayNatsService>;

  const gridFsService = {
    storeResumeFile: jest.fn().mockResolvedValue(
      'gridfs://bucket/file-id',
    ),
    deleteResumeFile: jest.fn(),
  } as unknown as jest.Mocked<GridFsService>;

  const analysisRecord = {
    analysisId: 'guest-analysis-1234567890000-test',
    sessionId: 'guest-analysis-1234567890000-test',
    status: 'completed',
    progress: 100,
  };

  const analysisService = {
    createQueued: jest.fn(),
    markProcessing: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    findForRequest: jest.fn(),
    toAnalysisResults: jest.fn((record) => ({
      analysisId: record.analysisId,
      status: record.status,
      progress: record.progress,
    })),
    toDetailedResult: jest.fn((record) => ({
      sessionId: record.sessionId,
      candidateName: 'Alice',
      candidateEmail: 'alice@example.com',
      targetPosition: 'General role fit',
      analysisTime: new Date().toISOString(),
      score: 80,
      summary: 'Parsed resume summary',
      keySkills: ['TypeScript'],
      experience: '2 years',
      education: 'Computer Science',
      recommendations: ['Add quantified impact'],
      skillAnalysis: {
        technical: 80,
        communication: 70,
        problemSolving: 70,
        teamwork: 70,
        leadership: 60,
      },
      experienceDetails: [],
      educationDetails: {
        degree: 'BS',
        major: 'CS',
        university: 'University',
        graduationYear: 'Not provided',
      },
      strengths: ['Technical skills'],
      improvements: ['More detail'],
      reportUrl: `/api/reports/${record.sessionId}`,
    })),
  } as unknown as jest.Mocked<GuestResumeAnalysisService>;

  const deviceRequest = (overrides: Partial<RequestWithDeviceId> = {}) =>
    ({
      deviceId: 'device-123',
      isGuest: true,
      user: null,
      ...overrides,
    } as RequestWithDeviceId);

  const file = {
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('pdf'),
  } as unknown as MulterFile;

  const buildController = () =>
    new GuestResumeController(
      usageService,
      natsClient,
      gridFsService,
      analysisService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeResume', () => {
    it('allows guest analysis when usage available', async () => {
      usageService.canUse.mockResolvedValue(true);
      usageService.getUsageStatus.mockResolvedValue({
        canUse: true,
        remainingCount: 2,
        needsFeedbackCode: false,
      });

      const controller = buildController();
      const result = await controller.analyzeResume(
        deviceRequest(),
        file,
        { candidateName: 'Alice' },
      );

      expect(result.success).toBe(true);
      expect(result.data.analysisId).toMatch(/^guest-analysis-/);
      expect(analysisService.createQueued).toHaveBeenCalled();
      expect(gridFsService.storeResumeFile).toHaveBeenCalled();
      expect(natsClient.publishResumeSubmitted).toHaveBeenCalled();
    });

    it('throws 429 when guest limit exceeded', async () => {
      usageService.canUse.mockResolvedValue(false);
      usageService.getUsageStatus.mockResolvedValue({
        canUse: false,
        remainingCount: 0,
        needsFeedbackCode: true,
      });

      const controller = buildController();

      await expect(
        controller.analyzeResume(deviceRequest(), file, {}),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getDemoAnalysis', () => {
    it('returns demo data for guest users', async () => {
      usageService.canUse.mockResolvedValue(true);
      usageService.getUsageStatus.mockResolvedValue({
        canUse: true,
        remainingCount: 1,
        needsFeedbackCode: false,
      });

      const controller = buildController();
      const result = await controller.getDemoAnalysis(deviceRequest());

      expect(result.success).toBe(true);
      expect(result.data.isGuestMode).toBe(true);
      expect(result.data.results.skills.length).toBeGreaterThan(0);
    });
  });

  describe('getAnalysisResults', () => {
    it('returns persisted results for valid id', async () => {
      const controller = buildController();
      const analysisId = 'guest-analysis-1234567890000-test';
      analysisService.findForRequest.mockResolvedValue(
        analysisRecord as Awaited<ReturnType<GuestResumeAnalysisService['findForRequest']>>,
      );

      const result = await controller.getAnalysisResults(
        deviceRequest(),
        analysisId,
      );

      expect(result.success).toBe(true);
      expect(result.data.analysisId).toBe(analysisId);
      expect(result.data.status).toBe('completed');
    });

    it('rejects invalid analysis id', async () => {
      const controller = buildController();

      await expect(
        controller.getAnalysisResults(deviceRequest(), 'invalid'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getDetailedResults', () => {
    it('returns detailed report for completed analysis', async () => {
      const controller = buildController();
      analysisService.findForRequest.mockResolvedValue(
        analysisRecord as Awaited<ReturnType<GuestResumeAnalysisService['findForRequest']>>,
      );

      const result = await controller.getDetailedResults(
        deviceRequest(),
        analysisRecord.sessionId,
      );

      expect(result.sessionId).toBe(analysisRecord.sessionId);
      expect(analysisService.toDetailedResult).toHaveBeenCalled();
    });

    it('returns conflict while analysis is processing', async () => {
      const controller = buildController();
      analysisService.findForRequest.mockResolvedValue({
        ...analysisRecord,
        status: 'processing',
        progress: 40,
      } as Awaited<ReturnType<GuestResumeAnalysisService['findForRequest']>>);

      await expect(
        controller.getDetailedResults(deviceRequest(), analysisRecord.sessionId),
      ).rejects.toThrow(HttpException);
    });
  });
});
