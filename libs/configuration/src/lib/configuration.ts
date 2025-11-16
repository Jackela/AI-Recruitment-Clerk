import { z } from 'zod';

type NodeEnvironment = 'development' | 'test' | 'production';

const DEFAULT_JWT_SECRET = 'dev-jwt-secret-change-me';
const DEFAULT_JWT_REFRESH_SECRET = 'dev-jwt-refresh-secret-change-me';
const DEFAULT_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const truthy = new Set(['true', '1', 'yes', 'y', 'on']);
const falsy = new Set(['false', '0', 'no', 'n', 'off']);

const boolFromEnv = () =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (truthy.has(normalized)) {
        return true;
      }
      if (falsy.has(normalized)) {
        return false;
      }
    }
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  }, z.boolean());

const numberFromEnv = (schema: z.ZodNumber = z.number()) =>
  z.preprocess((value) => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  }, schema);

const integerFromEnv = (constraints?: { min?: number; max?: number }) => {
  let schema: z.ZodNumber = z.number().int();
  if (typeof constraints?.min === 'number') {
    schema = schema.min(constraints.min);
  }
  if (typeof constraints?.max === 'number') {
    schema = schema.max(constraints.max);
  }
  return numberFromEnv(schema);
};

const floatFromEnv = (constraints?: { min?: number; max?: number }) => {
  let schema: z.ZodNumber = z.number();
  if (typeof constraints?.min === 'number') {
    schema = schema.min(constraints.min);
  }
  if (typeof constraints?.max === 'number') {
    schema = schema.max(constraints.max);
  }
  return numberFromEnv(schema);
};

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default(
      'development',
    ),
    CI: boolFromEnv().default(false),
    JEST_WORKER_ID: z.string().optional(),
    NODE_NAME: z.string().optional(),
    TEST_NOW: z.string().optional(),
    TEST_USE_DOCKER: boolFromEnv().optional(),
    MAX_REPORT_GENERATION_TIME_MS: integerFromEnv({ min: 1 }).optional(),
    MIN_REPORT_SUCCESS_RATE: floatFromEnv({ min: 0, max: 1 }).optional(),
    MIN_REPORT_QUALITY_SCORE: floatFromEnv({ min: 0 }).optional(),
    METRICS_RETENTION_DAYS: integerFromEnv({ min: 1 }).optional(),
    PORT: integerFromEnv({ min: 0 }).default(3000),
    API_PREFIX: z.string().trim().min(1).default('api'),
    CORS_ORIGIN: z.string().default('http://localhost:4200'),
    CORS_CREDENTIALS: boolFromEnv().default(true),
    JWT_SECRET: z.string().min(16).default(DEFAULT_JWT_SECRET),
    JWT_REFRESH_SECRET: z.string().min(16).default(DEFAULT_JWT_REFRESH_SECRET),
    JWT_EXPIRES_IN: z.string().default('1h'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    JWT_EXPIRES_IN_SECONDS: integerFromEnv({ min: 60 }).default(3600),
    ENCRYPTION_MASTER_KEY: z
      .string()
      .min(32)
      .default(DEFAULT_ENCRYPTION_KEY),
    MONGODB_URL: z.string().optional(),
    MONGO_URL: z.string().optional(),
    MONGODB_DATABASE: z.string().default('ai-recruitment'),
    MONGODB_ROOT_PASSWORD: z.string().optional(),
    NATS_URL: z.string().default('nats://localhost:4222'),
    NATS_CLUSTER_ID: z.string().default('ai-recruitment-cluster'),
    NATS_CLIENT_ID: z.string().default('ai-recruitment-client'),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    OPENAI_EMBEDDING_API_URL: z
      .string()
      .default('https://api.openai.com/v1/embeddings'),
    OPENAI_EMBEDDING_TIMEOUT_MS: integerFromEnv({ min: 100 }).default(10000),
    OPENAI_EMBEDDING_MAX_RETRIES: integerFromEnv({ min: 0 }).default(3),
    OPENAI_EMBEDDING_RETRY_DELAY_MS: integerFromEnv({ min: 0 }).default(250),
    MAX_FILE_SIZE: integerFromEnv({ min: 1 }).default(10_485_760),
    MAX_FILES_PER_UPLOAD: integerFromEnv({ min: 1 }).default(10),
    UPLOAD_DIR: z.string().default('./uploads'),
    ALLOWED_FILE_TYPES: z.string().default('.pdf,.doc,.docx'),
    LOG_LEVEL: z.string().default('info'),
    LOG_FORMAT: z.string().default('json'),
    ENABLE_METRICS: boolFromEnv().default(true),
    METRICS_PORT: integerFromEnv({ min: 0 }).default(9090),
    ENABLE_SWAGGER: boolFromEnv().default(true),
    ENABLE_DEBUG_ROUTES: boolFromEnv().default(false),
    MOCK_EXTERNAL_SERVICES: boolFromEnv().default(false),
    ENABLE_EMAIL_NOTIFICATIONS: boolFromEnv().default(false),
    ENABLE_AUDIT_LOGGING: boolFromEnv().default(true),
    ENABLE_PERFORMANCE_MONITORING: boolFromEnv().default(true),
    ENABLE_HELMET: boolFromEnv().default(true),
    ENABLE_CSRF: boolFromEnv().default(false),
    RATE_LIMIT_WINDOW_MS: integerFromEnv({ min: 1 }).default(900000),
    RATE_LIMIT_MAX_REQUESTS: integerFromEnv({ min: 1 }).default(100),
    USE_REDIS_CACHE: boolFromEnv().default(true),
    DISABLE_REDIS: boolFromEnv().default(false),
    REDIS_URL: z.string().optional(),
    REDIS_PRIVATE_URL: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    REDISHOST: z.string().optional(),
    REDIS_PORT: integerFromEnv({ min: 1 }).optional(),
    REDISPORT: integerFromEnv({ min: 1 }).optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: integerFromEnv({ min: 0 }).optional(),
    CACHE_TTL: integerFromEnv({ min: 0 }).default(300),
    CACHE_MAX_ITEMS: integerFromEnv({ min: 1 }).default(1000),
    SEMANTIC_CACHE_ENABLED: boolFromEnv().default(true),
    SEMANTIC_CACHE_SIMILARITY_THRESHOLD: floatFromEnv({
      min: 0,
      max: 1,
    }).default(0.92),
    SEMANTIC_CACHE_TTL_MS: integerFromEnv({ min: 0 }).default(86_400_000),
    SEMANTIC_CACHE_MAX_RESULTS: integerFromEnv({ min: 1 }).default(5),
    SEMANTIC_CACHE_INDEX_NAME: z.string().default('idx:semantic_cache'),
    SEMANTIC_CACHE_KEY_PREFIX: z.string().default('semantic:cache:'),
    SEMANTIC_CACHE_VECTOR_FIELD: z.string().default('embedding'),
    SEMANTIC_CACHE_VECTOR_DIMS: integerFromEnv({ min: 1 }).default(1536),
    SEMANTIC_CACHE_DISTANCE_METRIC: z.string().default('COSINE'),
    SCORING_ENGINE_URL: z.string().optional(),
    SCORING_ENGINE_URL_ALT: z.string().optional(),
    MATCH_SVC_URL: z.string().optional(),
    RESUME_PARSER_URL: z.string().optional(),
    JD_EXTRACTOR_URL: z.string().optional(),
    REPORT_GENERATOR_URL: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    ENABLE_COMPRESSION: boolFromEnv().default(false),
    DOWNLOAD_URL_SECRET: z.string().optional(),
    OPS_API_KEY: z.string().optional(),
    ALLOW_INSECURE_LOCAL: boolFromEnv().default(false),
    FORCE_RATE_LIMIT: boolFromEnv().default(false),
    BCRYPT_ROUNDS: integerFromEnv({ min: 4 }).optional(),
    BCRYPT_TEST_ROUNDS: integerFromEnv({ min: 1 }).default(4),
    GDPR_ENCRYPTION_KEY: z.string().optional(),
    GUEST_FEEDBACK_URL: z.string().optional(),
    APP_BASE_URL: z.string().default('https://localhost:8080'),
    APP_VERSION: z.string().optional(),
  });

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  expiresInSeconds: number;
}

export interface BcryptConfig {
  rounds: number;
  testRounds: number;
}

export interface CacheConfig {
  ttlSeconds: number;
  maxItems: number;
  redis: {
    enabled: boolean;
    disabled: boolean;
    url?: string;
    privateUrl?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  semantic: {
    enabled: boolean;
    similarityThreshold: number;
    ttlMs: number;
    maxResults: number;
    indexName: string;
    keyPrefix: string;
    vectorField: string;
    vectorDimensions: number;
    distanceMetric: string;
  };
}

export interface PerformanceMonitoringConfig {
  maxGenerationTime?: number;
  minSuccessRate?: number;
  minQualityScore?: number;
  maxRetentionDays?: number;
}

export interface AppConfig {
  env: {
    mode: NodeEnvironment;
    isDevelopment: boolean;
    isTest: boolean;
    isProduction: boolean;
    isCi: boolean;
    jestWorkerId?: string;
    nodeName?: string;
    testNowTimestamp?: string;
  };
  server: {
    port: number;
    apiPrefix: string;
    baseUrl: string;
  };
  cors: {
    origins: string[];
    allowCredentials: boolean;
  };
  security: {
    enableHelmet: boolean;
    enableCsrf: boolean;
    encryptionKey: string;
    downloadUrlSecret?: string;
    gdprEncryptionKey?: string;
    opsApiKey?: string;
    allowInsecureLocal: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
  auth: {
    jwt: JwtConfig;
    bcrypt: BcryptConfig;
  };
  uploads: {
    maxFileSize: number;
    maxFilesPerUpload: number;
    uploadDir: string;
    allowedTypes: string[];
  };
  database: {
    url: string;
    name: string;
    rootPassword?: string;
  };
  messaging: {
    nats: {
      url: string;
      clusterId: string;
      clientId: string;
    };
  };
  cache: CacheConfig;
  integrations: {
    gemini: {
      apiKey?: string;
      model: string;
    };
    openai: {
      apiKey?: string;
      model: string;
      apiUrl: string;
      timeoutMs: number;
      maxRetries: number;
      retryDelayMs: number;
    };
    scoring: {
      baseUrl: string;
      altBaseUrl?: string;
    };
    resumeParser: {
      baseUrl: string;
    };
    jdExtractor: {
      baseUrl: string;
    };
    reportGenerator: {
      baseUrl: string;
    };
  };
  monitoring: {
    enableMetrics: boolean;
    metricsPort: number;
    performance?: PerformanceMonitoringConfig;
  };
  features: {
    emailNotifications: boolean;
    auditLogging: boolean;
    performanceMonitoring: boolean;
    swagger: boolean;
    debugRoutes: boolean;
    mockExternalServices: boolean;
    enableCompression: boolean;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    forceEnabled: boolean;
  };
  metadata: {
    version: string;
  };
  guestExperience: {
    feedbackSurveyUrl: string;
  };
  testing?: {
    useDocker?: boolean;
  };
}

export class ConfigValidationError extends Error {
  constructor(message: string, public readonly issues: z.ZodIssue[]) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const csv = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const coalesce = <T>(...values: Array<T | undefined>): T | undefined =>
  values.find((value) => value !== undefined);

const buildRedisHost = (env: z.infer<typeof EnvSchema>): string | undefined =>
  coalesce(env.REDIS_HOST, env.REDISHOST);

const buildRedisPort = (env: z.infer<typeof EnvSchema>): number | undefined =>
  coalesce(env.REDIS_PORT, env.REDISPORT);

const buildDatabaseUrl = (env: z.infer<typeof EnvSchema>): string =>
  env.MONGODB_URL ||
  env.MONGO_URL ||
  `mongodb://localhost:27017/${env.MONGODB_DATABASE}`;

const ensureProductionSecrets = (config: AppConfig) => {
  if (!config.env.isProduction) {
    return;
  }

  if (config.auth.jwt.secret === DEFAULT_JWT_SECRET) {
    throw new ConfigValidationError('JWT_SECRET must be set in production.', []);
  }

  if (config.auth.jwt.refreshSecret === DEFAULT_JWT_REFRESH_SECRET) {
    throw new ConfigValidationError(
      'JWT_REFRESH_SECRET must be set in production.',
      [],
    );
  }

  if (config.security.encryptionKey === DEFAULT_ENCRYPTION_KEY) {
    throw new ConfigValidationError(
      'ENCRYPTION_MASTER_KEY must be set in production.',
      [],
    );
  }
};

const buildConfig = (env: z.infer<typeof EnvSchema>): AppConfig => {
  const mode = env.NODE_ENV as NodeEnvironment;
  const defaultBcryptRounds = env.BCRYPT_ROUNDS ?? 12;
  const testBcryptRounds = env.BCRYPT_TEST_ROUNDS ?? 4;
  const config: AppConfig = {
    env: {
      mode,
      isDevelopment: mode === 'development',
      isTest: mode === 'test',
      isProduction: mode === 'production',
      isCi: env.CI,
      jestWorkerId: env.JEST_WORKER_ID,
      nodeName: env.NODE_NAME,
      testNowTimestamp: env.TEST_NOW,
    },
    server: {
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      baseUrl: env.APP_BASE_URL,
    },
    cors: {
      origins:
        env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.trim().length > 0
          ? csv(env.ALLOWED_ORIGINS)
          : csv(env.CORS_ORIGIN),
      allowCredentials: env.CORS_CREDENTIALS,
    },
    security: {
      enableHelmet: env.ENABLE_HELMET,
      enableCsrf: env.ENABLE_CSRF,
      encryptionKey: env.ENCRYPTION_MASTER_KEY,
      downloadUrlSecret: env.DOWNLOAD_URL_SECRET,
      gdprEncryptionKey: env.GDPR_ENCRYPTION_KEY,
      opsApiKey: env.OPS_API_KEY,
      allowInsecureLocal: env.ALLOW_INSECURE_LOCAL,
    },
    logging: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
    },
    auth: {
      jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
        expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
      },
      bcrypt: {
        rounds: defaultBcryptRounds,
        testRounds: testBcryptRounds,
      },
    },
    uploads: {
      maxFileSize: env.MAX_FILE_SIZE,
      maxFilesPerUpload: env.MAX_FILES_PER_UPLOAD,
      uploadDir: env.UPLOAD_DIR,
      allowedTypes: csv(env.ALLOWED_FILE_TYPES),
    },
    database: {
      url: buildDatabaseUrl(env),
      name: env.MONGODB_DATABASE,
      rootPassword: env.MONGODB_ROOT_PASSWORD,
    },
    messaging: {
      nats: {
        url: env.NATS_URL,
        clusterId: env.NATS_CLUSTER_ID,
        clientId: env.NATS_CLIENT_ID,
      },
    },
    cache: {
      ttlSeconds: env.CACHE_TTL,
      maxItems: env.CACHE_MAX_ITEMS,
      redis: {
        enabled: env.USE_REDIS_CACHE,
        disabled: env.DISABLE_REDIS,
        url: env.REDIS_URL,
        privateUrl: env.REDIS_PRIVATE_URL,
        host: buildRedisHost(env),
        port: buildRedisPort(env),
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB,
      },
      semantic: {
        enabled: env.SEMANTIC_CACHE_ENABLED,
        similarityThreshold: env.SEMANTIC_CACHE_SIMILARITY_THRESHOLD,
        ttlMs: env.SEMANTIC_CACHE_TTL_MS,
        maxResults: env.SEMANTIC_CACHE_MAX_RESULTS,
        indexName: env.SEMANTIC_CACHE_INDEX_NAME,
        keyPrefix: env.SEMANTIC_CACHE_KEY_PREFIX,
        vectorField: env.SEMANTIC_CACHE_VECTOR_FIELD,
        vectorDimensions: env.SEMANTIC_CACHE_VECTOR_DIMS,
        distanceMetric: env.SEMANTIC_CACHE_DISTANCE_METRIC,
      },
    },
    integrations: {
      gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
      },
      openai: {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_EMBEDDING_MODEL,
        apiUrl: env.OPENAI_EMBEDDING_API_URL,
        timeoutMs: env.OPENAI_EMBEDDING_TIMEOUT_MS,
        maxRetries: env.OPENAI_EMBEDDING_MAX_RETRIES,
        retryDelayMs: env.OPENAI_EMBEDDING_RETRY_DELAY_MS,
      },
      scoring: {
        baseUrl: env.SCORING_ENGINE_URL ?? 'http://scoring-engine-svc:3000',
        altBaseUrl: coalesce(env.SCORING_ENGINE_URL_ALT, env.MATCH_SVC_URL),
      },
      resumeParser: {
        baseUrl: env.RESUME_PARSER_URL ?? 'http://resume-parser-svc:3000',
      },
      jdExtractor: {
        baseUrl: env.JD_EXTRACTOR_URL ?? 'http://jd-extractor-svc:3000',
      },
      reportGenerator: {
        baseUrl: env.REPORT_GENERATOR_URL ?? 'http://report-generator-svc:3000',
      },
    },
    monitoring: {
      enableMetrics: env.ENABLE_METRICS,
      metricsPort: env.METRICS_PORT,
      performance: {
        maxGenerationTime: env.MAX_REPORT_GENERATION_TIME_MS,
        minSuccessRate: env.MIN_REPORT_SUCCESS_RATE,
        minQualityScore: env.MIN_REPORT_QUALITY_SCORE,
        maxRetentionDays: env.METRICS_RETENTION_DAYS,
      },
    },
    features: {
      emailNotifications: env.ENABLE_EMAIL_NOTIFICATIONS,
      auditLogging: env.ENABLE_AUDIT_LOGGING,
      performanceMonitoring: env.ENABLE_PERFORMANCE_MONITORING,
      swagger: env.ENABLE_SWAGGER,
      debugRoutes: env.ENABLE_DEBUG_ROUTES,
      mockExternalServices: env.MOCK_EXTERNAL_SERVICES,
      enableCompression: env.ENABLE_COMPRESSION,
    },
    rateLimiting: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      forceEnabled: env.FORCE_RATE_LIMIT,
    },
    metadata: {
      version: env.APP_VERSION ?? '1.0.0',
    },
    guestExperience: {
      feedbackSurveyUrl:
        env.GUEST_FEEDBACK_URL ?? 'https://wj.qq.com/s2/default',
    },
    testing: {
      useDocker: env.TEST_USE_DOCKER,
    },
  };

  ensureProductionSecrets(config);

  return config;
};

export interface GetConfigOptions {
  forceReload?: boolean;
  overrides?: Record<string, string | undefined>;
}

let cachedConfig: AppConfig | null = null;

/**
 * Loads the strongly typed application configuration.
 */
export const getConfig = (options?: GetConfigOptions): AppConfig => {
  const shouldReload = Boolean(options?.forceReload || options?.overrides);
  if (!shouldReload && cachedConfig) {
    return cachedConfig;
  }

  const envSource: Record<string, string | undefined> = {
    ...process.env,
    ...(options?.overrides ?? {}),
  };
  if (!envSource['APP_VERSION'] && envSource['npm_package_version']) {
    envSource['APP_VERSION'] = envSource['npm_package_version'];
  }

  const parsed = EnvSchema.safeParse(envSource);
  if (!parsed.success) {
    throw new ConfigValidationError(
      'Invalid environment configuration.',
      parsed.error.issues,
    );
  }

  const config = buildConfig(parsed.data);
  cachedConfig = config;
  return config;
};

/**
 * Builds configuration from a provided environment snapshot.
 * Helpful for tests to validate specific scenarios.
 */
export const buildConfigFromEnv = (
  env: Record<string, string | undefined>,
): AppConfig => {
  const envInput: Record<string, string | undefined> = { ...env };
  if (!envInput['APP_VERSION'] && envInput['npm_package_version']) {
    envInput['APP_VERSION'] = envInput['npm_package_version'];
  }
  const parsed = EnvSchema.safeParse(envInput);
  if (!parsed.success) {
    throw new ConfigValidationError(
      'Invalid environment configuration.',
      parsed.error.issues,
    );
  }

  return buildConfig(parsed.data);
};

export const resetConfigCache = () => {
  cachedConfig = null;
};
