/**
 * Environment Variable Validator
 *
 * Provides type-safe environment variable access with validation on startup.
 * Ensures required environment variables are present and provides clear error messages.
 *
 * @module env-validator
 */

/**
 * Validation result for a single environment variable
 */
export interface EnvVarValidationResult {
  name: string;
  isSet: boolean;
  isRequired: boolean;
  defaultValue?: string;
  currentValue?: string;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Configuration for environment variable validation
 */
export interface EnvVarConfig {
  /** Name of the environment variable */
  name: string;
  /** Whether this variable is required (default: true) */
  required?: boolean;
  /** Default value if not set (only for optional vars) */
  defaultValue?: string;
  /** Custom validator function */
  validator?: (value: string) => boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Description of what this variable is used for */
  description?: string;
}

/**
 * Validation schema for a service
 */
export interface EnvValidationSchema {
  /** Service name (e.g., 'app-gateway', 'resume-parser-svc') */
  serviceName: string;
  /** Environment variable configurations */
  variables: EnvVarConfig[];
}

/**
 * Validation error thrown when required environment variables are missing
 */
export class EnvValidationError extends Error {
  public readonly missingVars: string[];
  public readonly invalidVars: Array<{ name: string; reason: string }>;

  constructor(
    missingVars: string[],
    invalidVars: Array<{ name: string; reason: string }>,
    serviceName: string,
  ) {
    const messages: string[] = [`[EnvValidationError] ${serviceName} - Environment validation failed:`];

    if (missingVars.length > 0) {
      messages.push(`\n  Missing required environment variables:`);
      missingVars.forEach((v) => messages.push(`    - ${v}`));
    }

    if (invalidVars.length > 0) {
      messages.push(`\n  Invalid environment variables:`);
      invalidVars.forEach(({ name, reason }) => messages.push(`    - ${name}: ${reason}`));
    }

    messages.push(
      `\n  Please check your .env.local file or set these environment variables before starting the service.`,
    );
    messages.push(`\n  Reference: See .env.example for all required variables.\n`);

    super(messages.join('\n'));
    this.name = 'EnvValidationError';
    this.missingVars = missingVars;
    this.invalidVars = invalidVars;
  }
}

/**
 * Environment variable access with type safety
 */
export class EnvAccess {
  private validatedVars = new Map<string, string>();
  private schema: EnvValidationSchema;

  constructor(schema: EnvValidationSchema) {
    this.schema = schema;
  }

  /**
   * Get a string environment variable
   */
  public getString(key: string, required = true): string | undefined {
    const value = this.getValidatedValue(key, required);
    return value;
  }

  /**
   * Get a number environment variable
   */
  public getNumber(key: string, defaultValue?: number): number | undefined {
    const value = this.getValidatedValue(key, defaultValue === undefined);
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new TypeError(
        `Environment variable ${key} must be a number, got: "${value}"`,
      );
    }
    return parsed;
  }

  /**
   * Get a boolean environment variable
   * Accepts: true, 1, yes, on (case-insensitive)
   */
  public getBoolean(key: string, defaultValue = false): boolean {
    const value = this.getValidatedValue(key, false);
    if (value === undefined) {
      return defaultValue;
    }
    const normalized = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  /**
   * Get an array environment variable (comma-separated)
   */
  public getArray(key: string, defaultValue: string[] = []): string[] {
    const value = this.getValidatedValue(key, false);
    if (value === undefined || value.trim() === '') {
      return defaultValue;
    }
    return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Get a URL environment variable with validation
   */
  public getUrl(key: string): URL | undefined {
    const value = this.getValidatedValue(key, false);
    if (value === undefined) {
      return undefined;
    }
    try {
      return new URL(value);
    } catch {
      throw new TypeError(
        `Environment variable ${key} must be a valid URL, got: "${value}"`,
      );
    }
  }

  /**
   * Check if an environment variable is set
   */
  public isSet(key: string): boolean {
    return process.env[key] !== undefined && process.env[key] !== '';
  }

  /**
   * Get the raw value from process.env
   */
  private getRaw(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Get validated value or throw if required and missing
   */
  private getValidatedValue(key: string, required: boolean): string | undefined {
    const config = this.schema.variables.find((v) => v.name === key);
    const rawValue = this.getRaw(key);

    if (rawValue === undefined || rawValue === '') {
      if (config?.defaultValue !== undefined) {
        return config.defaultValue;
      }
      if (required || (config?.required ?? true)) {
        throw new ReferenceError(
          `Required environment variable "${key}" is not set`,
        );
      }
      return undefined;
    }

    // Apply custom validator if present
    if (config?.validator && !config.validator(rawValue)) {
      throw new Error(
        config.errorMessage || `Environment variable "${key}" has an invalid value`,
      );
    }

    return rawValue;
  }
}

/**
 * Environment validator service
 */
export class EnvValidator {
  private schema: EnvValidationSchema;
  private access: EnvAccess;
  private validated = false;

  constructor(schema: EnvValidationSchema) {
    this.schema = schema;
    this.access = new EnvAccess(schema);
  }

  /**
   * Validate all environment variables in the schema
   * Throws EnvValidationError if validation fails
   */
  public validate(): void {
    const results: EnvVarValidationResult[] = [];
    const missingVars: string[] = [];
    const invalidVars: Array<{ name: string; reason: string }> = [];

    for (const config of this.schema.variables) {
      const result = this.validateVar(config);
      results.push(result);

      if (result.hasError) {
        if (!result.isSet && config.required !== false) {
          missingVars.push(config.name);
        } else if (result.errorMessage) {
          invalidVars.push({
            name: config.name,
            reason: result.errorMessage,
          });
        }
      }
    }

    if (missingVars.length > 0 || invalidVars.length > 0) {
      throw new EnvValidationError(
        missingVars,
        invalidVars,
        this.schema.serviceName,
      );
    }

    this.validated = true;
  }

  /**
   * Validate a single environment variable
   */
  private validateVar(config: EnvVarConfig): EnvVarValidationResult {
    const value = process.env[config.name];
    const isRequired = config.required !== false;
    const result: EnvVarValidationResult = {
      name: config.name,
      isSet: value !== undefined && value !== '',
      isRequired,
      defaultValue: config.defaultValue,
      currentValue: value,
      hasError: false,
    };

    // Check if variable is set
    if (!result.isSet) {
      if (isRequired && config.defaultValue === undefined) {
        result.hasError = true;
        result.errorMessage = 'Required variable is not set';
      }
      return result;
    }

    // Apply custom validator
    if (config.validator && value !== undefined && !config.validator(value)) {
      result.hasError = true;
      result.errorMessage = config.errorMessage || 'Validation failed';
    }

    return result;
  }

  /**
   * Get the EnvAccess instance for type-safe environment variable access
   */
  public get env(): EnvAccess {
    if (!this.validated) {
      throw new Error(
        'Environment variables must be validated before access. Call validate() first.',
      );
    }
    return this.access;
  }

  /**
   * Get all environment variables as an object
   */
  public getAll(): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    for (const config of this.schema.variables) {
      result[config.name] = process.env[config.name];
    }
    return result;
  }

  /**
   * Print validation summary (useful for debugging)
   */
  public printSummary(): void {
    console.log(`\n[EnvValidator] ${this.schema.serviceName} - Environment Summary:`);
    console.log('='.repeat(60));

    for (const config of this.schema.variables) {
      const value = process.env[config.name];
      const isSet = value !== undefined && value !== '';
      const status = isSet ? '✓' : '✗';
      const displayValue = isSet && value !== undefined ? this.maskSensitive(config.name, value) : '(not set)';

      console.log(`  ${status} ${config.name}: ${displayValue}`);
      if (config.description) {
        console.log(`      ${config.description}`);
      }
    }

    console.log('='.repeat(60));
  }

  /**
   * Mask sensitive values for logging
   */
  private maskSensitive(key: string, value: string): string {
    const sensitiveKeys = [
      'SECRET',
      'PASSWORD',
      'KEY',
      'TOKEN',
      'ENCRYPTION',
      'PRIVATE',
    ];

    const isSensitive = sensitiveKeys.some((sensitive) =>
      key.toUpperCase().includes(sensitive),
    );

    if (isSensitive) {
      return value.length > 8
        ? `${value.slice(0, 4)}****${value.slice(-4)}`
        : '****';
    }

    return value;
  }
}

/**
 * Helper function to create a validator schema
 */
export function createSchema(
  serviceName: string,
  variables: EnvVarConfig[],
): EnvValidationSchema {
  return { serviceName, variables };
}

/**
 * Common environment variable configurations
 */
export const CommonEnvVars = {
  /** Node environment (development, production, test) */
  nodeEnv: (): EnvVarConfig => ({
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    validator: (v) =>
      ['development', 'production', 'test'].includes(v.toLowerCase()),
    errorMessage:
      'NODE_ENV must be one of: development, production, test',
    description: 'Application environment',
  }),

  /** Server port */
  port: (): EnvVarConfig => ({
    name: 'PORT',
    required: false,
    defaultValue: '3000',
    validator: (v) => !isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536,
    errorMessage: 'PORT must be a valid port number (1-65535)',
    description: 'Server listening port',
  }),

  /** MongoDB URL */
  mongoUrl: (): EnvVarConfig => ({
    name: 'MONGODB_URL',
    required: true,
    description: 'MongoDB connection URL',
  }),

  /** NATS URL */
  natsUrl: (): EnvVarConfig => ({
    name: 'NATS_URL',
    required: false,
    defaultValue: 'nats://localhost:4222',
    description: 'NATS message broker URL',
  }),

  /** JWT secret */
  jwtSecret: (): EnvVarConfig => ({
    name: 'JWT_SECRET',
    required: true,
    validator: (v) => v.length >= 32,
    errorMessage: 'JWT_SECRET must be at least 32 characters long',
    description: 'JWT signing secret (min 32 chars)',
  }),

  /** Encryption master key */
  encryptionKey: (): EnvVarConfig => ({
    name: 'ENCRYPTION_MASTER_KEY',
    required: false,
    validator: (v) => v.length >= 64,
    errorMessage:
      'ENCRYPTION_MASTER_KEY must be a 64-character hex string (AES-256)',
    description: 'AES-256 encryption key (64 hex chars)',
  }),
};

/**
 * Service-specific environment variable schemas
 */
export const ServiceSchemas = {
  /** API Gateway required environment variables */
  appGateway: (): EnvVarConfig[] => [
    CommonEnvVars.nodeEnv(),
    CommonEnvVars.port(),
    CommonEnvVars.mongoUrl(),
    CommonEnvVars.jwtSecret(),
    { name: 'JWT_AUDIENCE', required: false, defaultValue: 'ai-recruitment-clerk' },
    { name: 'JWT_ISSUER', required: false, defaultValue: 'ai-recruitment-clerk-auth' },
    { name: 'JWT_EXPIRATION', required: false, defaultValue: '24h', description: 'JWT token expiration time' },
    { name: 'FRONTEND_URL', required: false, defaultValue: 'http://localhost:4200' },
    { name: 'CORS_ORIGIN', required: false, defaultValue: 'http://localhost:4200' },
    { name: 'ALLOWED_ORIGINS', required: false, description: 'Comma-separated list of allowed CORS origins' },
    { name: 'ALLOW_INSECURE_LOCAL', required: false, defaultValue: 'false', description: 'Allow running in production mode without security checks' },
    { name: 'ENABLE_COMPRESSION', required: false, defaultValue: 'false', description: 'Enable HTTP response compression' },
    { name: 'ENABLE_CORS', required: false, defaultValue: 'true', description: 'Enable CORS' },
    { name: 'OPS_API_KEY', required: false, description: 'API key for ops endpoints' },
    // Microservice URLs
    { name: 'RESUME_PARSER_URL', required: false, defaultValue: 'http://resume-parser-svc:3000', description: 'Resume parser service URL' },
    { name: 'JD_EXTRACTOR_URL', required: false, defaultValue: 'http://jd-extractor-svc:3000', description: 'JD extractor service URL' },
    { name: 'SCORING_ENGINE_URL', required: false, defaultValue: 'http://scoring-engine-svc:3000', description: 'Scoring engine service URL' },
    { name: 'SCORING_ENGINE_URL_ALT', required: false, description: 'Alternative scoring engine URL for dual-run' },
    { name: 'MATCH_SVC_URL', required: false, description: 'Match service URL (legacy)' },
    { name: 'REPORT_GENERATOR_URL', required: false, defaultValue: 'http://report-generator-svc:3000', description: 'Report generator service URL' },
    // Redis configuration
    { name: 'REDIS_URL', required: false, description: 'Redis connection URL' },
    { name: 'REDIS_HOST', required: false, description: 'Redis host' },
    { name: 'REDIS_PORT', required: false, defaultValue: '6379', description: 'Redis port' },
    { name: 'REDIS_PASSWORD', required: false, description: 'Redis password' },
    { name: 'USE_REDIS_CACHE', required: false, defaultValue: 'true', description: 'Use Redis for caching' },
    { name: 'DISABLE_REDIS', required: false, defaultValue: 'false', description: 'Disable Redis completely' },
    // Cache configuration
    { name: 'CACHE_TTL', required: false, defaultValue: '300', description: 'Cache TTL in seconds' },
    { name: 'CACHE_MAX', required: false, defaultValue: '1000', description: 'Maximum cache entries' },
    // Rate limiting
    { name: 'RATE_LIMIT_REQUESTS', required: false, defaultValue: '100', description: 'Rate limit requests per window' },
    { name: 'RATE_LIMIT_WINDOW_MS', required: false, defaultValue: '60000', description: 'Rate limit window in milliseconds' },
    { name: 'RATE_LIMIT_MAX', required: false, defaultValue: '100', description: 'Rate limit max (alternative)' },
    { name: 'FORCE_RATE_LIMIT', required: false, defaultValue: 'false', description: 'Force rate limiting in test mode' },
    // File upload
    { name: 'MAX_FILE_SIZE', required: false, defaultValue: '10485760', description: 'Maximum file size in bytes' },
    { name: 'ALLOWED_FILE_TYPES', required: false, defaultValue: 'pdf,doc,docx', description: 'Allowed file types' },
    // Session
    { name: 'SESSION_TIMEOUT', required: false, defaultValue: '3600', description: 'Session timeout in seconds' },
    // Logging
    { name: 'LOG_LEVEL', required: false, defaultValue: 'info', description: 'Logging level' },
    { name: 'SUPPRESS_TEST_LOGS', required: false, defaultValue: 'false', description: 'Suppress logs during tests' },
    // Test configuration
    { name: 'SKIP_DB', required: false, defaultValue: 'false', description: 'Skip database setup in tests' },
    { name: 'MONGODB_TEST_URL', required: false, description: 'MongoDB test URL' },
    { name: 'MONGO_URL', required: true, description: 'MongoDB connection URL (primary)' },
    { name: 'BCRYPT_ROUNDS', required: false, defaultValue: '12', description: 'Bcrypt hashing rounds' },
    { name: 'CI', required: false, description: 'Running in CI environment' },
    { name: 'JEST_WORKER_ID', required: false, description: 'Jest worker ID' },
    // Guest feedback
    { name: 'GUEST_FEEDBACK_URL', required: false, defaultValue: 'https://wj.qq.com/s2/default', description: 'Guest feedback survey URL' },
    // Privacy/Security
    { name: 'GDPR_ENCRYPTION_KEY', required: false, description: 'GDPR encryption key' },
    { name: 'DOWNLOAD_URL_SECRET', required: false, defaultValue: 'default-secret-key', description: 'Download URL signing secret' },
    { name: 'APP_BASE_URL', required: false, defaultValue: 'https://localhost:8080', description: 'Application base URL' },
    { name: 'ENCRYPTION_MASTER_KEY', required: false, description: 'Master encryption key' },
    // Performance testing
    { name: 'PERFORMANCE_TEST_TIMEOUT', required: false, defaultValue: '60000', description: 'Performance test timeout' },
    { name: 'LOAD_TEST_CONCURRENCY', required: false, defaultValue: '10', description: 'Load test concurrency' },
    // Semantic cache
    { name: 'SEMANTIC_CACHE_ENABLED', required: false, defaultValue: 'false', description: 'Enable semantic caching' },
    { name: 'SEMANTIC_CACHE_SIMILARITY_THRESHOLD', required: false, defaultValue: '0.9', description: 'Semantic cache similarity threshold' },
    { name: 'SEMANTIC_CACHE_TTL_MS', required: false, defaultValue: '86400000', description: 'Semantic cache TTL in ms' },
    { name: 'SEMANTIC_CACHE_MAX_RESULTS', required: false, defaultValue: '5', description: 'Semantic cache max results' },
    // MongoMS for testing
    { name: 'MONGOMS_VERSION', required: false, defaultValue: '7.0.5', description: 'MongoDB Memory Server version' },
    { name: 'MONGOMS_DISABLE_MD5_CHECK', required: false, defaultValue: '1', description: 'Disable MongoMS MD5 check' },
    // Test API keys/tokens
    { name: 'TEST_API_KEY', required: false, description: 'Test API key for e2e tests' },
    { name: 'TEST_JWT_TOKEN', required: false, description: 'Test JWT token for e2e tests' },
  ],

  /** Resume Parser Service required environment variables */
  resumeParser: (): EnvVarConfig[] => [
    CommonEnvVars.nodeEnv(),
    CommonEnvVars.natsUrl(),
    { name: 'GEMINI_API_KEY', required: true, description: 'Google Gemini API key for AI processing' },
  ],

  /** JD Extractor Service required environment variables */
  jdExtractor: (): EnvVarConfig[] => [
    CommonEnvVars.nodeEnv(),
    CommonEnvVars.natsUrl(),
    { name: 'GEMINI_API_KEY', required: true, description: 'Google Gemini API key for AI processing' },
  ],

  /** Scoring Engine Service required environment variables */
  scoringEngine: (): EnvVarConfig[] => [
    CommonEnvVars.nodeEnv(),
    CommonEnvVars.natsUrl(),
  ],

  /** Report Generator Service required environment variables */
  reportGenerator: (): EnvVarConfig[] => [
    CommonEnvVars.nodeEnv(),
    CommonEnvVars.natsUrl(),
  ],

  /** Frontend required environment variables */
  frontend: (): EnvVarConfig[] => [
    CommonEnvVars.nodeEnv(),
    { name: 'API_BASE_URL', required: true, description: 'Backend API base URL' },
  ],
};

/**
 * Factory function to create a validator for a specific service
 */
export function createValidator(serviceName: string): EnvValidator {
  const schemaFn = ServiceSchemas[serviceName as keyof typeof ServiceSchemas];
  if (!schemaFn) {
    throw new Error(`Unknown service: ${serviceName}. Available services: ${Object.keys(ServiceSchemas).join(', ')}`);
  }

  return new EnvValidator({
    serviceName,
    variables: schemaFn(),
  });
}

/**
 * Validate and return environment variables (convenience function)
 * Throws on validation failure
 */
export function validateEnv(serviceName: string): EnvAccess {
  const validator = createValidator(serviceName);
  validator.validate();
  return validator.env;
}
