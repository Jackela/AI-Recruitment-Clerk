/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable, Logger } from '@nestjs/common';
import type { RetryOriginalData } from '../../types/parsing.types';
import { ParsingEventService } from './parsing-event.service';

/**
 * Handles error handling and retry logic for the parsing service.
 * Extracted from ParsingService to improve maintainability.
 */
@Injectable()
export class ParsingRetryService {
  private readonly logger = new Logger(ParsingRetryService.name);
  private readonly retryCounts = new Map<string, number>();
  private readonly processingFiles = new Map<
    string,
    { timestamp: number; hash: string; attempts: number }
  >();

  constructor(private readonly eventService: ParsingEventService) {}

  /**
   * Handles processing errors with retry logic.
   * @param error - The error that occurred
   * @param jobId - Job identifier
   * @param resumeId - Resume identifier
   * @param originalData - Original data for retry
   * @param retryCallback - Callback to execute on retry
   */
  public async handleProcessingError(
    error: Error,
    jobId: string,
    resumeId: string,
    originalData: RetryOriginalData | undefined,
    retryCallback: (
      jobId: string,
      resumeId: string,
      originalData: RetryOriginalData,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      this.logger.error(
        `Handling processing error for resumeId: ${resumeId}`,
        error,
      );

      // Log error details
      this.logger.error({
        message: 'Resume processing error details',
        jobId,
        resumeId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });

      // Determine retry strategy
      const shouldRetry = this.shouldRetryProcessing(error);
      const retryCount = this.getRetryCount(resumeId);
      const maxRetries = 3;

      if (shouldRetry && retryCount < maxRetries && originalData) {
        this.logger.log(
          `Scheduling retry ${retryCount + 1}/${maxRetries} for resumeId: ${resumeId}`,
        );

        // Implement exponential backoff retry mechanism
        const retryDelay = this.calculateExponentialBackoffDelay(retryCount);
        this.logger.log(`Retry will be attempted in ${retryDelay}ms`);

        // Schedule retry with exponential backoff
        setTimeout(async () => {
          try {
            this.incrementRetryCount(resumeId);
            this.logger.log(
              `Executing retry ${retryCount + 1} for resumeId: ${resumeId}`,
            );

            // Retry the parsing operation via callback
            await retryCallback(jobId, resumeId, originalData);
          } catch (retryError) {
            this.logger.error(
              `Retry ${retryCount + 1} failed for resumeId: ${resumeId}`,
              retryError,
            );
            // This will trigger another call to this error handler if retries remain
            await this.handleProcessingError(
              retryError as Error,
              jobId,
              resumeId,
              originalData,
              retryCallback,
            );
          }
        }, retryDelay);
      } else {
        this.logger.log(
          `Max retries reached or error not retryable for resumeId: ${resumeId}`,
        );

        // Publish failure event
        await this.eventService.publishFailureEvent(
          jobId,
          resumeId,
          'unknown',
          error,
          retryCount,
        );
      }

      // Publish internal error event for monitoring
      await this.eventService.publishProcessingError(
        jobId,
        resumeId,
        error,
        retryCount,
      );
    } catch (handlingError) {
      this.logger.error(
        `Failed to handle processing error for resumeId: ${resumeId}`,
        handlingError,
      );
      // Don't throw here to avoid infinite loops
    }
  }

  /**
   * Determines if an error is retryable.
   * @param error - The error to check
   * @returns True if the error is retryable
   */
  public shouldRetryProcessing(error: unknown): boolean {
    // Define retryable errors
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'temporary',
      'gridfs',
      'download',
    ];

    const errorMessage = (error as Error).message.toLowerCase();
    const isRetryable = retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError),
    );

    // Don't retry validation errors or permanent failures
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('validation failed') ||
      errorMessage.includes('corrupted')
    ) {
      return false;
    }

    this.logger.log(
      `Error ${isRetryable ? 'is' : 'is not'} retryable: ${(error as Error).message}`,
    );

    return isRetryable;
  }

  /**
   * Gets the current retry count for a resume.
   * @param resumeId - Resume identifier
   * @returns Current retry count
   */
  public getRetryCount(resumeId: string): number {
    return this.retryCounts.get(resumeId) || 0;
  }

  /**
   * Increments the retry count for a resume.
   * @param resumeId - Resume identifier
   */
  public incrementRetryCount(resumeId: string): void {
    const currentCount = this.getRetryCount(resumeId);
    this.retryCounts.set(resumeId, currentCount + 1);
  }

  /**
   * Clears the retry count for a resume (on success).
   * @param resumeId - Resume identifier
   */
  public clearRetryCount(resumeId: string): void {
    this.retryCounts.delete(resumeId);
  }

  /**
   * Gets the size of the retry queue.
   * @returns Number of resumes in retry queue
   */
  public getRetryQueueSize(): number {
    return this.retryCounts.size;
  }

  /**
   * Gets all retry entries for monitoring.
   * @returns Array of [resumeId, retryCount] entries
   */
  public getRetryEntries(): [string, number][] {
    return Array.from(this.retryCounts.entries());
  }

  /**
   * Calculates exponential backoff delay with jitter.
   * @param retryCount - Current retry attempt (0-based)
   * @returns Delay in milliseconds
   */
  private calculateExponentialBackoffDelay(retryCount: number): number {
    // Base delay: 1 second
    const baseDelay = 1000;
    // Exponential factor: 2
    const exponentialFactor = 2;
    // Maximum delay: 30 seconds
    const maxDelay = 30000;

    // Calculate exponential delay: base * (factor ^ retryCount)
    let delay = baseDelay * Math.pow(exponentialFactor, retryCount);

    // Cap at maximum delay
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd (±25% random variation)
    const jitterFactor = 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterFactor;
    delay = delay * (1 + jitter);

    return Math.round(delay);
  }

  /**
   * Registers a file as being processed.
   * @param key - Processing key (resumeId-organizationId)
   * @param hash - File hash
   */
  public registerProcessingFile(key: string, hash: string): void {
    this.processingFiles.set(key, {
      timestamp: Date.now(),
      hash,
      attempts: 0,
    });
  }

  /**
   * Unregisters a file from processing.
   * @param key - Processing key
   */
  public unregisterProcessingFile(key: string): void {
    this.processingFiles.delete(key);
  }

  /**
   * Checks if a file is currently being processed.
   * @param key - Processing key
   * @returns True if file is being processed
   */
  public isProcessing(key: string): boolean {
    return this.processingFiles.has(key);
  }

  /**
   * Gets the count of active processing files.
   * @returns Number of files being processed
   */
  public getActiveProcessingCount(): number {
    return this.processingFiles.size;
  }

  /**
   * Gets processing file entries for monitoring.
   * @returns Array of processing file info
   */
  public getProcessingFileEntries(): Array<{
    key: string;
    age: number;
    attempts: number;
  }> {
    return Array.from(this.processingFiles.entries()).map(([key, info]) => ({
      key,
      age: Date.now() - info.timestamp,
      attempts: info.attempts,
    }));
  }

  /**
   * Cleans up expired processing records.
   * @param timeoutMs - Timeout in milliseconds
   */
  public cleanupExpiredProcessing(timeoutMs: number): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, info] of this.processingFiles.entries()) {
      if (now - info.timestamp > timeoutMs) {
        this.processingFiles.delete(key);
        cleanedCount++;
        this.logger.warn(`Cleaned up expired processing record: ${key}`);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Cleaned up ${cleanedCount} expired processing records`,
      );
    }

    return cleanedCount;
  }
}
