/**
 * Configuration Service for Resume Parser
 *
 * Provides type-safe environment variable access using the centralized
 * @ai-recruitment-clerk/configuration library. Replaces direct process.env usage.
 */

import { Injectable } from '@nestjs/common';
import { validateEnv, EnvAccess } from '@ai-recruitment-clerk/configuration';

/**
 * Resume Parser Configuration Service
 *
 * Centralizes all environment variable access for the resume parser service.
 * Uses @ai-recruitment-clerk/configuration for validation and type-safe access.
 */
@Injectable()
export class ResumeParserConfigService {
  private readonly env: EnvAccess;

  constructor() {
    // Validate environment on initialization (fail-fast)
    this.env = validateEnv('resumeParser');
  }

  /**
   * Get the Node environment (development, production, test)
   */
  get nodeEnv(): string {
    return this.env.getString('NODE_ENV', false) || 'development';
  }

  /**
   * Check if running in test mode
   */
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  /**
   * Get NATS connection URL
   */
  get natsUrl(): string {
    return this.env.getString('NATS_URL', false) || 'nats://localhost:4222';
  }

  /**
   * Get MongoDB connection URL
   * Supports multiple env var aliases for backward compatibility
   */
  get mongoUrl(): string {
    return (
      this.env.getString('MONGODB_URL', false) ||
      this.env.getString('MONGO_URL', false) ||
      this.env.getString('MONGODB_URI', false) ||
      (() => {
        throw new Error(
          'MONGODB_URL, MONGO_URL, or MONGODB_URI environment variable is required',
        );
      })()
    );
  }

  /**
   * Get GridFS bucket name for resume storage
   */
  get gridfsBucketName(): string {
    return this.env.getString('GRIDFS_BUCKET_NAME', false) || 'resumes';
  }

  /**
   * Get node name for distributed processing
   */
  get nodeName(): string {
    return this.env.getString('NODE_NAME', false) || 'unknown';
  }

  /**
   * Get service name identification
   */
  get serviceName(): string {
    return this.env.getString('SERVICE_NAME', false) || 'resume-parser-svc';
  }

  /**
   * Get Gemini API key for AI processing
   */
  get geminiApiKey(): string {
    const key = this.env.getString('GEMINI_API_KEY');
    if (!key) {
      throw new Error('GEMINI_API_KEY is required');
    }
    return key;
  }

  /**
   * Check if Docker should be used for test infrastructure
   */
  get useDocker(): boolean {
    return this.env.getBoolean('USE_DOCKER', false);
  }

  /**
   * Get NATS server connection string (alternative format)
   */
  get natsServers(): string | undefined {
    return this.env.getString('NATS_SERVERS', false);
  }

  /**
   * Get all configuration values as an object (useful for debugging)
   */
  getConfigSnapshot(): Record<string, unknown> {
    return {
      nodeEnv: this.nodeEnv,
      isTest: this.isTest,
      natsUrl: this.natsUrl,
      mongoUrl: this.mongoUrl.replace(/:([^:@]{1,10})@/, ':****@'), // Mask password
      gridfsBucketName: this.gridfsBucketName,
      nodeName: this.nodeName,
      serviceName: this.serviceName,
      hasGeminiApiKey: !!this.env.getString('GEMINI_API_KEY', false),
      useDocker: this.useDocker,
    };
  }
}
