import { ScoringProxyController } from './scoring-proxy.controller';
import { MetricsService } from '../ops/metrics.service';
import { resetConfigCache } from '@ai-recruitment-clerk/configuration';

describe('ScoringProxyController', () => {
  let controller: ScoringProxyController;
  let metrics: jest.Mocked<MetricsService>;

  beforeEach(() => {
    resetConfigCache();
    process.env.SCORING_ENGINE_URL = 'http://scoring.test';
    metrics = {
      incExposure: jest.fn(),
      incSuccess: jest.fn(),
      incError: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;
    controller = new ScoringProxyController(metrics);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.SCORING_ENGINE_URL;
  });

  it('forwards gap analysis requests to the configured scoring engine', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ score: 88 }),
    });

    const payload = { resumeId: 'abc', jobId: '123' };
    const result = await controller.gapAnalysis(payload);

    expect(result).toEqual({ score: 88 });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://scoring.test/gap-analysis',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(metrics.incExposure).toHaveBeenCalled();
    expect(metrics.incSuccess).toHaveBeenCalled();
  });

  it('falls back to local tokenization when scoring engine is unreachable', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network failure'));

    const resumeBuffer = Buffer.from('Experienced with AWS, Kubernetes, and Node.js');
    const result = await controller.gapAnalysisFile(
      {
        buffer: resumeBuffer,
        originalname: 'resume.txt',
        mimetype: 'text/plain',
      } as any,
      { jdText: 'Looking for AWS and Kubernetes engineers' },
    );

    expect(result.matchedSkills).toEqual(expect.arrayContaining(['aws', 'kubernetes']));
    expect(metrics.incError).toHaveBeenCalled();
  });
});
