import { HealthCheckService } from './health-check.service';

const mockConfig: any = {
  metadata: { version: '9.9.9' },
  env: {
    mode: 'test',
    isTest: true,
    isDevelopment: false,
    isProduction: false,
  },
  cache: {
    redis: {
      enabled: true,
      disabled: false,
      url: 'redis://localhost:6379',
      privateUrl: undefined,
      host: undefined,
      port: undefined,
      password: undefined,
    },
    semantic: {
      enabled: false,
      similarityThreshold: 0.9,
      ttlMs: 0,
      maxResults: 5,
      indexName: '',
      keyPrefix: '',
      vectorField: '',
      vectorDimensions: 0,
      distanceMetric: '',
    },
    ttlSeconds: 300,
    maxItems: 1000,
  },
  integrations: {
    resumeParser: { baseUrl: 'http://resume-parser.test' },
    jdExtractor: { baseUrl: 'http://jd-extractor.test' },
    scoring: { baseUrl: 'http://scoring.test', altBaseUrl: undefined },
    reportGenerator: { baseUrl: 'http://report-generator.test' },
    gemini: { apiKey: undefined },
    openai: {
      apiKey: undefined,
      model: '',
      apiUrl: '',
      timeoutMs: 0,
      maxRetries: 0,
      retryDelayMs: 0,
    },
  },
};

jest.mock('@ai-recruitment-clerk/configuration', () => ({
  getConfig: () => mockConfig,
}));

describe('HealthCheckService', () => {
  beforeEach(() => {
    mockConfig.cache.redis.enabled = true;
    mockConfig.cache.redis.disabled = false;
    mockConfig.cache.redis.url = 'redis://localhost:6379';
    mockConfig.metadata.version = '9.9.9';
  });

  it('exposes system version from configuration', async () => {
    const service = new HealthCheckService();
    (service as any).serviceHealths.set('app-gateway', {
      name: 'app-gateway',
      status: 'healthy',
      lastCheck: new Date(),
    });

    const health = await service.getSystemHealth();

    expect(health.version).toBe('9.9.9');
  });

  it('registers default external services using SSOT URLs', async () => {
    const service = new HealthCheckService();
    (service as any).performAllHealthChecks = jest.fn();

    await service.onModuleInit();

    const configs: any[] = (service as any).healthCheckConfigs;
    const resumeCheck = configs.find((c) => c.name === 'resume-parser-svc');
    expect(resumeCheck?.url).toBe('http://resume-parser.test/health');
    const scoringCheck = configs.find((c) => c.name === 'scoring-engine-svc');
    expect(scoringCheck?.url).toBe('http://scoring.test/health');
  });

  it('falls back to memory cache metadata when Redis is disabled', async () => {
    const service = new HealthCheckService();
    (service as any).performAllHealthChecks = jest.fn();
    await service.onModuleInit();

    const configs: any[] = (service as any).healthCheckConfigs;
    const redisCheck = configs.find((c) => c.name === 'redis');

    mockConfig.cache.redis.enabled = false;
    mockConfig.cache.redis.url = undefined;

    const result = await redisCheck.healthCheck();

    expect(result.metadata).toMatchObject({
      mode: 'memory-cache',
      redis_enabled: false,
    });
    expect(result.healthy).toBe(true);
  });
});
