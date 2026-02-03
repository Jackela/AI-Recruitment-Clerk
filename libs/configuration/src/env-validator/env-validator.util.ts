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
    { name: 'FRONTEND_URL', required: false, defaultValue: 'http://localhost:4200' },
    { name: 'CORS_ORIGIN', required: false, defaultValue: 'http://localhost:4200' },
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
