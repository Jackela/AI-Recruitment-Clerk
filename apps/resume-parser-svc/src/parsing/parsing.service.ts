import { Injectable, Logger } from '@nestjs/common';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';

@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);

  constructor(
    private readonly visionLlmService: VisionLlmService,
    private readonly gridFsService: GridFsService,
    private readonly fieldMapperService: FieldMapperService,
    private readonly natsClient: NatsClient,
  ) {}

  async handleResumeSubmitted(event: any): Promise<void> {
    const { jobId, resumeId, originalFilename, tempGridFsUrl } = event || {};
    if (!jobId || !resumeId || !originalFilename || !tempGridFsUrl) {
      throw new Error('Invalid ResumeSubmittedEvent');
    }

    const start = Date.now();

    try {
      const pdfBuffer = await this.gridFsService.downloadFile(tempGridFsUrl);
      const rawLlmOutput = await this.visionLlmService.parseResumePdf(
        pdfBuffer,
        originalFilename,
      );
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(
        rawLlmOutput,
      );

      const payload = {
        jobId,
        resumeId,
        resumeDto,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - start,
      };

      await this.natsClient.publishAnalysisResumeParsed(payload);
    } catch (error) {
      await this.natsClient.publishJobResumeFailed({
        jobId,
        resumeId,
        originalFilename,
        error: (error as Error).message,
        retryCount: 0,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async processResumeFile(jobId: string, resumeId: string, gridFsUrl: string, filename: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing resume file for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${filename}`);
      
      // Validate inputs
      if (!jobId || !resumeId || !gridFsUrl || !filename) {
        throw new Error(`Invalid parameters: jobId=${jobId}, resumeId=${resumeId}, gridFsUrl=${gridFsUrl}, filename=${filename}`);
      }

      // Download file from GridFS
      this.logger.log(`Downloading file from GridFS: ${gridFsUrl}`);
      const pdfBuffer = await this.gridFsService.downloadFile(gridFsUrl);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error(`Failed to download file or file is empty: ${filename}`);
      }

      // Parse resume using Vision LLM service
      this.logger.log(`Parsing resume with Vision LLM service: ${filename}`);
      const rawLlmOutput = await this.visionLlmService.parseResumePdf(pdfBuffer, filename);
      
      if (!rawLlmOutput) {
        throw new Error(`Vision LLM service returned empty result for: ${filename}`);
      }

      // Normalize and map fields
      this.logger.log(`Normalizing extracted data for resume: ${resumeId}`);
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(rawLlmOutput);
      
      if (!resumeDto) {
        throw new Error(`Field mapping failed for resume: ${resumeId}`);
      }

      const processingTimeMs = Date.now() - startTime;
      
      // Create success result
      const result = {
        jobId,
        resumeId,
        resumeDto,
        timestamp: new Date().toISOString(),
        processingTimeMs,
        originalFilename: filename,
      };

      this.logger.log(`Resume processing completed successfully for resumeId: ${resumeId}, processing time: ${processingTimeMs}ms`);
      
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to process resume file for resumeId: ${resumeId}`, error);
      throw error;
    }
  }

  async publishSuccessEvent(result: any): Promise<void> {
    try {
      this.logger.log(`Publishing success event for resumeId: ${result.resumeId}`);
      
      // Validate result before publishing
      if (!result.jobId || !result.resumeId || !result.resumeDto || !result.timestamp) {
        throw new Error('Invalid success result: missing required fields');
      }

      // Validate resume DTO structure
      if (!this.validateResumeDto(result.resumeDto)) {
        this.logger.warn(`Resume DTO validation failed for resumeId: ${result.resumeId}, publishing anyway`);
      }

      // Create event payload
      const event = {
        jobId: result.jobId,
        resumeId: result.resumeId,
        resumeDto: result.resumeDto,
        timestamp: result.timestamp,
        processingTimeMs: result.processingTimeMs || 0,
      };

      // Publish through NATS client
      const publishResult = await this.natsClient.publishAnalysisResumeParsed(event);
      
      if (!publishResult.success) {
        throw new Error(`Failed to publish success event: ${publishResult.error}`);
      }
      
      this.logger.log(`Success event published successfully for resumeId: ${result.resumeId}, messageId: ${publishResult.messageId}`);
      
    } catch (error) {
      this.logger.error(`Failed to publish success event for resumeId: ${result.resumeId}`, error);
      throw error;
    }
  }

  async publishFailureEvent(jobId: string, resumeId: string, filename: string, error: Error, retryCount: number): Promise<void> {
    try {
      this.logger.log(`Publishing failure event for resumeId: ${resumeId}, retryCount: ${retryCount}`);
      
      // Validate inputs
      if (!jobId || !resumeId || !filename) {
        throw new Error(`Invalid failure event parameters: jobId=${jobId}, resumeId=${resumeId}, filename=${filename}`);
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

      // Publish through NATS client
      const publishResult = await this.natsClient.publishJobResumeFailed(event);
      
      if (!publishResult.success) {
        this.logger.error(`Failed to publish failure event for resumeId: ${resumeId}: ${publishResult.error}`);
        // Don't throw here as it could cause infinite loops
        return;
      }
      
      this.logger.log(`Failure event published successfully for resumeId: ${resumeId}, messageId: ${publishResult.messageId}`);
      
    } catch (publishError) {
      this.logger.error(`Error publishing failure event for resumeId: ${resumeId}`, publishError);
      // Don't throw here to avoid infinite error loops
    }
  }

  async handleProcessingError(error: Error, jobId: string, resumeId: string): Promise<void> {
    try {
      this.logger.error(`Handling processing error for resumeId: ${resumeId}`, error);
      
      // Log error details
      this.logger.error({
        message: 'Resume processing error details',
        jobId,
        resumeId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      });

      // Determine retry strategy
      const shouldRetry = this.shouldRetryProcessing(error);
      const retryCount = this.getRetryCount(resumeId);
      const maxRetries = 3;
      
      if (shouldRetry && retryCount < maxRetries) {
        this.logger.log(`Scheduling retry ${retryCount + 1}/${maxRetries} for resumeId: ${resumeId}`);
        // TODO: Implement actual retry mechanism with exponential backoff
        // For now, just increment retry count and log
        this.incrementRetryCount(resumeId);
      } else {
        this.logger.log(`Max retries reached or error not retryable for resumeId: ${resumeId}`);
        
        // Publish failure event
        await this.publishFailureEvent(jobId, resumeId, 'unknown', error, retryCount);
      }

      // Publish internal error event for monitoring
      await this.natsClient.publishProcessingError(jobId, resumeId, error);
      
    } catch (handlingError) {
      this.logger.error(`Failed to handle processing error for resumeId: ${resumeId}`, handlingError);
      // Don't throw here to avoid infinite loops
    }
  }

  private validateResumeDto(resumeDto: any): boolean {
    try {
      // Check required fields
      if (!resumeDto.contactInfo) {
        return false;
      }

      // Check contact info structure
      const { contactInfo } = resumeDto;
      if (typeof contactInfo !== 'object') {
        return false;
      }

      // Check skills array
      if (!resumeDto.skills || !Array.isArray(resumeDto.skills)) {
        return false;
      }

      // Check work experience array
      if (!resumeDto.workExperience || !Array.isArray(resumeDto.workExperience)) {
        return false;
      }

      // Check education array
      if (!resumeDto.education || !Array.isArray(resumeDto.education)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating resume DTO', error);
      return false;
    }
  }

  private shouldRetryProcessing(error: Error): boolean {
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

    const errorMessage = error.message.toLowerCase();
    const isRetryable = retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );

    // Don't retry validation errors or permanent failures
    if (errorMessage.includes('invalid') || errorMessage.includes('validation failed') || errorMessage.includes('corrupted')) {
      return false;
    }

    this.logger.log(`Error ${isRetryable ? 'is' : 'is not'} retryable: ${error.message}`);
    
    return isRetryable;
  }

  private retryCounts = new Map<string, number>();

  private getRetryCount(resumeId: string): number {
    return this.retryCounts.get(resumeId) || 0;
  }

  private incrementRetryCount(resumeId: string): void {
    const currentCount = this.getRetryCount(resumeId);
    this.retryCounts.set(resumeId, currentCount + 1);
  }

  // Utility method for health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const natsConnected = this.natsClient.isConnected;
      const retryQueueSize = this.retryCounts.size;
      
      return {
        status: natsConnected ? 'healthy' : 'degraded',
        details: {
          natsConnected,
          retryQueueSize,
          activeRetries: Array.from(this.retryCounts.entries()),
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      };
    }
  }
}