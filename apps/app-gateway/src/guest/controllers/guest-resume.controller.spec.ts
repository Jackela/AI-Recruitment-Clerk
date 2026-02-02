import { HttpException } from '@nestjs/common';
import { GuestResumeController } from './guest-resume.controller';
import type { GuestUsageService } from '../services/guest-usage.service';
import type { AppGatewayNatsService } from '../../nats/app-gateway-nats.service';
import type { GridFsService } from '../../services/gridfs.service';
import type { RequestWithDeviceId } from '../guards/guest.guard';

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
  } as unknown as jest.Mocked<GridFsService>;

  const deviceRequest = (overrides: Partial<RequestWithDeviceId> = {}) =>
    ({
      deviceId: 'device-123',
      isGuest: true,
      user: null,
      ...overrides,
    } as RequestWithDeviceId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const file = {
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('pdf'),
  } as unknown as Express.Multer.File;

  const buildController = () =>
    new GuestResumeController(usageService, natsClient, gridFsService);

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
    it('returns mock results for valid id', async () => {
      const controller = buildController();
      const analysisId = 'guest-analysis-1234567890000-test';

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
});
