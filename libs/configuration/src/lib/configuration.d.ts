import { z } from 'zod';
type NodeEnvironment = 'development' | 'test' | 'production';
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
export declare class ConfigValidationError extends Error {
    readonly issues: z.ZodIssue[];
    constructor(message: string, issues: z.ZodIssue[]);
}
export interface GetConfigOptions {
    forceReload?: boolean;
    overrides?: Record<string, string | undefined>;
}
/**
 * Loads the strongly typed application configuration.
 */
export declare const getConfig: (options?: GetConfigOptions) => AppConfig;
/**
 * Builds configuration from a provided environment snapshot.
 * Helpful for tests to validate specific scenarios.
 */
export declare const buildConfigFromEnv: (env: Record<string, string | undefined>) => AppConfig;
export declare const resetConfigCache: () => void;
export {};
