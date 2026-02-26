/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable } from '@nestjs/common';
import { ResumeParserNatsService } from '../../services/resume-parser-nats.service';
import { ParsingRetryService } from './parsing-retry.service';
import type { HealthCheckDetails } from '../../types/parsing.types';

/**
 * Handles health checks and security metrics for the parsing service.
 * Extracted from ParsingService to improve maintainability.
 */
@Injectable()
export class ParsingHealthService {

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    private readonly natsService: ResumeParserNatsService,
    private readonly retryService: ParsingRetryService,
  ) {}

  /**
   * Performs a health check of the parsing service.
   * @returns Health status and details
   */
  public async healthCheck(): Promise<{
    status: string;
    details: HealthCheckDetails;
  }> {
    try {
      const natsHealth = await this.natsService.getHealthStatus();
      const retryQueueSize = this.retryService.getRetryQueueSize();
      const activeProcessingCount = this.retryService.getActiveProcessingCount();

      return {
        status: natsHealth.connected ? 'healthy' : 'degraded',
        details: {
          natsConnected: natsHealth.connected,
          natsConnectionInfo: natsHealth,
          retryQueueSize,
          activeProcessingCount,
          activeRetries: this.retryService.getRetryEntries(),
          processingFiles: this.retryService.getProcessingFileEntries(),
          securityStatus: {
            encryptionEnabled: true,
            maxFileSize: this.MAX_FILE_SIZE,
            allowedTypes: this.ALLOWED_MIME_TYPES,
          },
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
        },
      };
    } catch (error: unknown) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error)?.message || 'Unknown error',
        },
      };
    }
  }

  /**
   * Gets security metrics for monitoring.
   * @returns Security metrics
   */
  public getSecurityMetrics(): {
    activeProcessingFiles: number;
    totalProcessedToday: number;
    encryptionFailures: number;
    validationFailures: number;
  } {
    // In production, these would be tracked in proper metrics
    return {
      activeProcessingFiles: this.retryService.getActiveProcessingCount(),
      totalProcessedToday: 0, // Would be tracked in database
      encryptionFailures: 0, // Would be tracked in metrics
      validationFailures: 0, // Would be tracked in metrics
    };
  }

  /**
   * Gets processing statistics.
   * @returns Processing stats
   */
  public getProcessingStats(): {
    activeJobs: number;
    totalCapacity: number;
    isHealthy: boolean;
  } {
    const activeJobs = this.retryService.getActiveProcessingCount();
    const totalCapacity = 10;
    return {
      activeJobs,
      totalCapacity,
      isHealthy: activeJobs <= totalCapacity,
    };
  }

  /**
   * Gets the maximum file size allowed.
   * @returns Max file size in bytes
   */
  public getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Gets the allowed MIME types.
   * @returns Array of allowed MIME types
   */
  public getAllowedMimeTypes(): string[] {
    return [...this.ALLOWED_MIME_TYPES];
  }
}
