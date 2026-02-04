/**
 * Configuration Service for JD Extractor
 *
 * Provides type-safe environment variable access using the centralized
 * @ai-recruitment-clerk/configuration library. Replaces direct process.env usage.
 */

import { Injectable } from '@nestjs/common';
import { validateEnv, EnvAccess } from '@ai-recruitment-clerk/configuration';

/**
 * JD Extractor Configuration Service
 *
 * Centralizes all environment variable access for the JD extractor service.
 * Uses @ai-recruitment-clerk/configuration for validation and type-safe access.
 */
@Injectable()
export class JdExtractorConfigService {
  private readonly env: EnvAccess;

  constructor() {
    // Validate environment on initialization (fail-fast)
    this.env = validateEnv('jdExtractor');
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
   * Get all configuration values as an object (useful for debugging)
   */
  getConfigSnapshot(): Record<string, unknown> {
    return {
      nodeEnv: this.nodeEnv,
      isTest: this.isTest,
      natsUrl: this.natsUrl,
      hasGeminiApiKey: !!this.env.getString('GEMINI_API_KEY', false),
    };
  }
}
