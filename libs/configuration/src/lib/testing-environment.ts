import { getConfig } from './configuration';

export interface TestingEnvironmentConfig {
  host: string;
  port: number;
  gatewayPort: number;
  gatewayHealthUrl: string;
  devServerPort: number;
  mockApiPort: number;
  mockApiUrl: string;
  playwrightBaseUrl: string;
  externalBaseUrl: string;
  useDocker: boolean;
  useRealApi: boolean;
  skipWebServer: boolean;
  skipDb: boolean;
  suppressTestLogs: boolean;
  natsUrl: string;
  mongoUri: string;
  serviceName: string;
  gridFsBucket: string;
  gridFsChunkSize: number;
  jestForceExit: boolean;
  jwtSecret: string;
  opsApiKey: string;
  testApiKey: string;
  testJwtToken: string;
  mongoVersion: string;
  sessionTimeoutSeconds: number;
  maxFileSize: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: string;
  enableCors: boolean;
  redisCacheEnabled: boolean;
  redisCacheDisabled: boolean;
  semanticCacheEnabled: boolean;
  semanticCacheSimilarityThreshold: number;
  semanticCacheTtlMs: number;
  semanticCacheMaxResults: number;
  forcePortSweep: boolean;
  forceGatewayCleanup: boolean;
  forceDevServerCleanup: boolean;
  protectedPorts: number[];
  isCi: boolean;
  enableFirefoxProject: boolean;
  chromeHeaded: boolean;
  firefoxHeaded: boolean;
  webkitHeaded: boolean;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true';
};

const parseNumberList = (value: string | undefined): number[] => {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((num) => Number.isFinite(num));
};

export const getTestingEnvironment = (
  overrides: Partial<TestingEnvironmentConfig> = {},
): TestingEnvironmentConfig => {
  const config = getConfig({ forceReload: true });
  const env = process.env;

  const host = overrides.host ?? env.HOST ?? 'localhost';
  const port =
    overrides.port ??
    parseNumber(env.PORT, config.server.port ?? 3000);
  const gatewayPort =
    overrides.gatewayPort ??
    parseNumber(env.GATEWAY_PORT, config.server.port ?? 3000);
  const gatewayHealthUrl =
    overrides.gatewayHealthUrl ??
    env.GATEWAY_HEALTH_URL ??
    `http://${host}:${gatewayPort}/api/auth/health`;
  const devServerPort =
    overrides.devServerPort ?? parseNumber(env.DEV_SERVER_PORT, 4200);
  const mockApiPort =
    overrides.mockApiPort ?? parseNumber(env.MOCK_API_PORT, 4600);
  const mockApiUrl =
    overrides.mockApiUrl ??
    env.MOCK_API_URL ??
    `http://${host}:${mockApiPort}`;

  const externalBaseUrl =
    overrides.externalBaseUrl ??
    env.E2E_EXTERNAL_BASE_URL ??
    env.PLAYWRIGHT_BASE_URL ??
    `http://${host}:4200`;
  const playwrightBaseUrl =
    overrides.playwrightBaseUrl ??
    env.PLAYWRIGHT_BASE_URL ??
    env.BASE_URL ??
    (parseBoolean(env.E2E_SKIP_WEBSERVER, false)
      ? externalBaseUrl
      : `http://${host}:${devServerPort}`);

  const useDocker =
    overrides.useDocker ??
    parseBoolean(env.USE_DOCKER, config.testing?.useDocker ?? false);
  const useRealApi =
    overrides.useRealApi ?? parseBoolean(env.E2E_USE_REAL_API, false);
  const skipWebServer =
    overrides.skipWebServer ?? parseBoolean(env.E2E_SKIP_WEBSERVER, false);
  const skipDb = overrides.skipDb ?? parseBoolean(env.SKIP_DB, false);
  const suppressTestLogs =
    overrides.suppressTestLogs ?? parseBoolean(env.SUPPRESS_TEST_LOGS, false);
  const forcePortSweep =
    overrides.forcePortSweep ?? parseBoolean(env.E2E_FORCE_PORT_SWEEP, false);
  const forceGatewayCleanup =
    overrides.forceGatewayCleanup ??
    parseBoolean(env.E2E_FORCE_GATEWAY_CLEANUP, false);
  const forceDevServerCleanup =
    overrides.forceDevServerCleanup ??
    parseBoolean(env.E2E_FORCE_DEVSERVER_CLEANUP, false);
  const protectedPorts =
    overrides.protectedPorts ?? parseNumberList(env.E2E_PROTECTED_PORTS);

  const natsUrl =
    overrides.natsUrl ??
    env.NATS_SERVERS ??
    config.messaging.nats.url ??
    'nats://localhost:4222';
  const mongoUri =
    overrides.mongoUri ??
    env.MONGODB_URI ??
    config.database.url ??
    'mongodb://localhost:27017/test';

  const serviceName =
    overrides.serviceName ??
    env.SERVICE_NAME ??
    `${config.env.mode}-test-service`;

  const gridFsBucket =
    overrides.gridFsBucket ?? env.GRIDFS_BUCKET_NAME ?? 'test-resumes';
  const gridFsChunkSize =
    overrides.gridFsChunkSize ??
    parseNumber(env.GRIDFS_CHUNK_SIZE, 261120 /* 255KB */);

  const jestForceExit =
    overrides.jestForceExit ?? parseBoolean(env.JEST_FORCE_EXIT, false);
  const jwtSecret =
    overrides.jwtSecret ??
    env.JWT_SECRET ??
    'integration-test-jwt-secret';
  const opsApiKey =
    overrides.opsApiKey ?? env.OPS_API_KEY ?? 'ops-test-api-key';
  const testApiKey =
    overrides.testApiKey ?? env.TEST_API_KEY ?? 'test-api-key-placeholder';
  const testJwtToken =
    overrides.testJwtToken ??
    env.TEST_JWT_TOKEN ??
    'test-jwt-token-placeholder';
  const mongoVersion =
    overrides.mongoVersion ?? env.MONGOMS_VERSION ?? '7.0.5';
  const sessionTimeoutSeconds =
    overrides.sessionTimeoutSeconds ??
    parseNumber(env.SESSION_TIMEOUT, 3600);
  const maxFileSize =
    overrides.maxFileSize ??
    parseNumber(env.MAX_FILE_SIZE, config.uploads.maxFileSize ?? 10_485_760);
  const rateLimitWindowMs =
    overrides.rateLimitWindowMs ??
    parseNumber(
      env.RATE_LIMIT_WINDOW_MS,
      config.rateLimiting.windowMs ?? 900000,
    );
  const rateLimitMaxRequests =
    overrides.rateLimitMaxRequests ??
    parseNumber(
      env.RATE_LIMIT_MAX ?? env.RATE_LIMIT_MAX_REQUESTS,
      config.rateLimiting.maxRequests ?? 100,
    );
  const logLevel =
    overrides.logLevel ?? env.LOG_LEVEL ?? config.logging.level ?? 'info';
  const enableCors =
    overrides.enableCors ?? parseBoolean(env.ENABLE_CORS, true);
  const redisCacheEnabled =
    overrides.redisCacheEnabled ?? config.cache.redis.enabled ?? false;
  const redisCacheDisabled =
    overrides.redisCacheDisabled ?? config.cache.redis.disabled ?? false;
  const semanticCacheEnabled =
    overrides.semanticCacheEnabled ?? config.cache.semantic.enabled ?? true;
  const semanticCacheSimilarityThreshold =
    overrides.semanticCacheSimilarityThreshold ??
    config.cache.semantic.similarityThreshold ??
    0.92;
  const semanticCacheTtlMs =
    overrides.semanticCacheTtlMs ??
    config.cache.semantic.ttlMs ??
    86_400_000;
  const semanticCacheMaxResults =
    overrides.semanticCacheMaxResults ??
    config.cache.semantic.maxResults ??
    5;
  const isCi = overrides.isCi ?? config.env.isCi ?? false;
  const enableFirefoxProject =
    overrides.enableFirefoxProject ??
    parseBoolean(env.E2E_ENABLE_FIREFOX, false);
  const chromeHeaded =
    overrides.chromeHeaded ?? parseBoolean(env.CHROME_HEADED, false);
  const firefoxHeaded =
    overrides.firefoxHeaded ?? parseBoolean(env.FIREFOX_HEADED, false);
  const webkitHeaded =
    overrides.webkitHeaded ?? parseBoolean(env.WEBKIT_HEADED, false);

  return {
    host,
    port,
    gatewayPort,
    gatewayHealthUrl,
    devServerPort,
    mockApiPort,
    mockApiUrl,
    playwrightBaseUrl,
    externalBaseUrl,
    useDocker,
    useRealApi,
    skipWebServer,
    skipDb,
    suppressTestLogs,
    natsUrl,
    mongoUri,
    serviceName,
    gridFsBucket,
    gridFsChunkSize,
    jestForceExit,
    jwtSecret,
    opsApiKey,
    testApiKey,
    testJwtToken,
    mongoVersion,
    sessionTimeoutSeconds,
    maxFileSize,
    rateLimitWindowMs,
    rateLimitMaxRequests,
    logLevel,
    enableCors,
    redisCacheEnabled,
    redisCacheDisabled,
    semanticCacheEnabled,
    semanticCacheSimilarityThreshold,
    semanticCacheTtlMs,
    semanticCacheMaxResults,
    forcePortSweep,
    forceGatewayCleanup,
    forceDevServerCleanup,
    protectedPorts,
    isCi,
    enableFirefoxProject,
    chromeHeaded,
    firefoxHeaded,
    webkitHeaded,
  };
};
