import { buildConfigFromEnv, getConfig, resetConfigCache } from './configuration';

const baseEnv = {
  NODE_ENV: 'development',
  MONGODB_URL: 'mongodb://localhost:27017/test',
  JWT_SECRET: 'dev-jwt-secret-change-me',
  JWT_REFRESH_SECRET: 'dev-jwt-refresh-secret-change-me',
  ENCRYPTION_MASTER_KEY:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

describe('configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfigCache();
  });

  it('builds a config object with defaults applied', () => {
    const config = buildConfigFromEnv(baseEnv);

    expect(config.env.mode).toBe('development');
    expect(config.server.port).toBe(3000);
    expect(config.database.url).toBe(baseEnv.MONGODB_URL);
    expect(config.cache.redis.enabled).toBe(true);
  });

  it('splits comma separated values for CORS and uploads', () => {
    const config = buildConfigFromEnv({
      ...baseEnv,
      CORS_ORIGIN: 'http://example.com, http://localhost:4200 ',
      ALLOWED_FILE_TYPES: '.pdf,.txt,.docx',
    });

    expect(config.cors.origins).toEqual([
      'http://example.com',
      'http://localhost:4200',
    ]);
    expect(config.uploads.allowedTypes).toEqual(['.pdf', '.txt', '.docx']);
  });

  it('prefers MONGO_URL when MONGODB_URL is missing', () => {
    const config = buildConfigFromEnv({
      ...baseEnv,
      MONGODB_URL: undefined,
      MONGO_URL: 'mongodb://remote:27017/override',
    });

    expect(config.database.url).toBe('mongodb://remote:27017/override');
  });

  it('falls back to localhost Mongo URL when none is provided', () => {
    const config = buildConfigFromEnv({
      ...baseEnv,
      MONGODB_URL: undefined,
      MONGO_URL: undefined,
    });

    expect(config.database.url).toBe('mongodb://localhost:27017/ai-recruitment');
  });

  it('provides defaults for integrations, guest experience, and metadata', () => {
    const config = buildConfigFromEnv(baseEnv);

    expect(config.integrations.scoring.baseUrl).toBe(
      'http://scoring-engine-svc:3000',
    );
    expect(config.integrations.resumeParser.baseUrl).toBe(
      'http://resume-parser-svc:3000',
    );
    expect(config.guestExperience.feedbackSurveyUrl).toBe(
      'https://wj.qq.com/s2/default',
    );
    expect(config.metadata.version).toBe('1.0.0');
    expect(config.security.allowInsecureLocal).toBe(false);
    expect(config.rateLimiting.forceEnabled).toBe(false);
    expect(config.auth.bcrypt.rounds).toBe(12);
    expect(config.auth.bcrypt.testRounds).toBe(4);
    expect(config.env.isCi).toBe(false);
    expect(config.env.jestWorkerId).toBeUndefined();
    expect(config.env.nodeName).toBeUndefined();
    expect(config.env.testNowTimestamp).toBeUndefined();
    expect(config.monitoring.performance).toEqual({
      maxGenerationTime: undefined,
      minSuccessRate: undefined,
      minQualityScore: undefined,
      maxRetentionDays: undefined,
    });
    expect(config.testing?.useDocker).toBeUndefined();
  });

  it('honors overrides for scoring alt URL, guest survey, and GDPR key', () => {
    const config = buildConfigFromEnv({
      ...baseEnv,
      SCORING_ENGINE_URL: 'http://primary.test',
      MATCH_SVC_URL: 'http://alt.test',
      GUEST_FEEDBACK_URL: 'https://survey.example.com',
      APP_VERSION: '3.1.4',
      GDPR_ENCRYPTION_KEY: 'secure-gdpr-key',
      OPS_API_KEY: 'ops-key',
      ALLOW_INSECURE_LOCAL: 'true',
      FORCE_RATE_LIMIT: 'true',
      BCRYPT_ROUNDS: '10',
      BCRYPT_TEST_ROUNDS: '2',
      CI: 'true',
      JEST_WORKER_ID: '7',
      NODE_NAME: 'parser-node-1',
      TEST_NOW: '2024-01-01T00:00:00Z',
      MAX_REPORT_GENERATION_TIME_MS: '45000',
      MIN_REPORT_SUCCESS_RATE: '0.9',
      MIN_REPORT_QUALITY_SCORE: '4.5',
      METRICS_RETENTION_DAYS: '45',
      TEST_USE_DOCKER: 'true',
    });

    expect(config.integrations.scoring.baseUrl).toBe('http://primary.test');
    expect(config.integrations.scoring.altBaseUrl).toBe('http://alt.test');
    expect(config.guestExperience.feedbackSurveyUrl).toBe(
      'https://survey.example.com',
    );
    expect(config.metadata.version).toBe('3.1.4');
    expect(config.security.gdprEncryptionKey).toBe('secure-gdpr-key');
    expect(config.security.opsApiKey).toBe('ops-key');
    expect(config.security.allowInsecureLocal).toBe(true);
    expect(config.rateLimiting.forceEnabled).toBe(true);
    expect(config.auth.bcrypt.rounds).toBe(10);
    expect(config.auth.bcrypt.testRounds).toBe(2);
    expect(config.env.isCi).toBe(true);
    expect(config.env.jestWorkerId).toBe('7');
    expect(config.env.nodeName).toBe('parser-node-1');
    expect(config.env.testNowTimestamp).toBe('2024-01-01T00:00:00Z');
    expect(config.monitoring.performance).toEqual({
      maxGenerationTime: 45000,
      minSuccessRate: 0.9,
      minQualityScore: 4.5,
      maxRetentionDays: 45,
    });
    expect(config.testing?.useDocker).toBe(true);
  });

  it('falls back to npm_package_version when APP_VERSION is not provided', () => {
    const config = buildConfigFromEnv({
      ...baseEnv,
      APP_VERSION: undefined,
      npm_package_version: '9.9.9',
    });

    expect(config.metadata.version).toBe('9.9.9');
  });

  it('caches getConfig results until forceReload is used', () => {
    process.env = {
      ...process.env,
      ...baseEnv,
      PORT: '3333',
    };

    const first = getConfig({ forceReload: true });
    const second = getConfig();

    expect(second).toBe(first);

    const updated = getConfig({
      forceReload: true,
      overrides: { PORT: '4444' },
    });

    expect(updated.server.port).toBe(4444);
  });
});
