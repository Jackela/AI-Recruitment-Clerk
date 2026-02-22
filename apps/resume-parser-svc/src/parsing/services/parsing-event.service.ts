/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable, Logger } from '@nestjs/common';
import { ResumeParserNatsService } from '../../services/resume-parser-nats.service';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';

/**
 * Result of a successful resume parse operation
 */
export interface ResumeParseSuccessResult {
  jobId: string;
  resumeId: string;
  resumeDto: ResumeDTO | Record<string, unknown>;
  timestamp: string;
  processingTimeMs?: number;
}

/**
 * Result of publishing an event
 */
export interface PublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Handles NATS event publishing for the parsing service.
 * Extracted from ParsingService to improve maintainability.
 */
@Injectable()
export class ParsingEventService {
  private readonly logger = new Logger(ParsingEventService.name);

  constructor(private readonly natsService: ResumeParserNatsService) {}

  /**
   * Publishes a success event for a completed resume parse.
   * @param result - The parse result containing resume data
   */
  public async publishSuccessEvent(result: ResumeParseSuccessResult): Promise<void> {
    try {
      this.logger.log(
        `Publishing success event for resumeId: ${result.resumeId}`,
      );

      // Validate result before publishing
      if (
        !result.jobId ||
        !result.resumeId ||
        !result.resumeDto ||
        !result.timestamp
      ) {
        throw new Error('Invalid success result: missing required fields');
      }

      // Validate resume DTO structure
      if (!this.validateResumeDto(result.resumeDto)) {
        this.logger.warn(
          `Resume DTO validation failed for resumeId: ${result.resumeId}, publishing anyway`,
        );
      }

      // Create event payload
      const event = {
        jobId: result.jobId,
        resumeId: result.resumeId,
        resumeDto: result.resumeDto,
        timestamp: result.timestamp,
        processingTimeMs: result.processingTimeMs || 0,
      };

      // Publish through shared NATS service
      const publishResult = await this.natsService.publishAnalysisResumeParsed({
        jobId: event.jobId,
        resumeId: event.resumeId,
        resumeDto: event.resumeDto,
        processingTimeMs: event.processingTimeMs || 0,
        confidence: 0.85, // Default confidence
        parsingMethod: 'standard-parsing',
      });

      if (!publishResult.success) {
        throw new Error(
          `Failed to publish success event: ${publishResult.error}`,
        );
      }

      this.logger.log(
        `Success event published successfully for resumeId: ${result.resumeId}, messageId: ${publishResult.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish success event for resumeId: ${result.resumeId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Publishes a failure event for a failed resume parse.
   * @param jobId - Job identifier
   * @param resumeId - Resume identifier
   * @param filename - Original filename
   * @param error - The error that occurred
   * @param retryCount - Number of retry attempts made
   */
  public async publishFailureEvent(
    jobId: string,
    resumeId: string,
    filename: string,
    error: Error,
    retryCount: number,
  ): Promise<void> {
    try {
      this.logger.log(
        `Publishing failure event for resumeId: ${resumeId}, retryCount: ${retryCount}`,
      );

      // Validate inputs
      if (!jobId || !resumeId || !filename) {
        throw new Error(
          `Invalid failure event parameters: jobId=${jobId}, resumeId=${resumeId}, filename=${filename}`,
        );
      }

      // Create failure event payload
      const event = {
        jobId,
        resumeId,
        originalFilename: filename,
        error: error.message,
        retryCount: retryCount || 0,
        timestamp: new Date().toISOString(),
        errorDetails: {
          name: error.name,
          stack: error.stack,
        },
      };

      // Publish through shared NATS service
      const publishResult = await this.natsService.publishJobResumeFailed({
        jobId: event.jobId,
        resumeId: event.resumeId,
        error: new Error(event.error),
        stage: 'parsing-failure',
        retryAttempt: event.retryCount || 0,
      });

      if (!publishResult.success) {
        this.logger.error(
          `Failed to publish failure event for resumeId: ${resumeId}: ${publishResult.error}`,
        );
        // Don't throw here as it could cause infinite loops
        return;
      }

      this.logger.log(
        `Failure event published successfully for resumeId: ${resumeId}, messageId: ${publishResult.messageId}`,
      );
    } catch (publishError) {
      this.logger.error(
        `Error publishing failure event for resumeId: ${resumeId}`,
        publishError,
      );
      // Don't throw here to avoid infinite error loops
    }
  }

  /**
   * Publishes a processing error event for monitoring.
   * @param jobId - Job identifier
   * @param resumeId - Resume identifier
   * @param error - The error that occurred
   * @param retryAttempt - Number of retry attempts made
   */
  public async publishProcessingError(
    jobId: string,
    resumeId: string,
    error: Error,
    retryAttempt: number,
  ): Promise<void> {
    await this.natsService.publishProcessingError(jobId, resumeId, error, {
      stage: 'error-handling',
      retryAttempt,
    });
  }

  /**
   * Validates the structure of a ResumeDTO.
   * @param resumeDto - The resume DTO to validate
   * @returns True if valid, false otherwise
   */
  private validateResumeDto(resumeDto: ResumeDTO | Record<string, unknown>): boolean {
    try {
      const dto = resumeDto as ResumeDTO;

      // Check required fields
      if (!dto.contactInfo) {
        return false;
      }

      // Check contact info structure
      const { contactInfo } = dto;
      if (typeof contactInfo !== 'object') {
        return false;
      }

      // Check skills array
      if (!dto.skills || !Array.isArray(dto.skills)) {
        return false;
      }

      // Check work experience array
      if (
        !dto.workExperience ||
        !Array.isArray(dto.workExperience)
      ) {
        return false;
      }

      // Check education array
      if (!dto.education || !Array.isArray(dto.education)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating resume DTO', error);
      return false;
    }
  }
}
