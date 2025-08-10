import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { NatsClient } from '../nats/nats.client';
import { JobJdSubmittedEvent, AnalysisJdExtractedEvent } from '../dto/events.dto';
import { JdDTO } from '../dto/jd.dto';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private readonly processingJobs = new Set<string>();

  constructor(
    private readonly llmService: LlmService,
    private readonly natsClient: NatsClient,
  ) {}

  async handleJobJdSubmitted(event: JobJdSubmittedEvent): Promise<void> {
    const { jobId, jobTitle, jdText, timestamp } = event;
    
    this.logger.log(`Received job JD submitted event for jobId: ${jobId}, title: ${jobTitle}`);

    // Check if we're already processing this job
    if (this.processingJobs.has(jobId)) {
      this.logger.warn(`Job ${jobId} is already being processed, skipping duplicate event`);
      return;
    }

    // Add to processing set
    this.processingJobs.add(jobId);

    try {
      // Validate input
      if (!jobId || !jdText || !jobTitle) {
        throw new Error(`Invalid event data: jobId=${jobId}, jdText length=${jdText?.length}, jobTitle=${jobTitle}`);
      }

      this.logger.log(`Starting job description processing for jobId: ${jobId}`);
      
      // Process the job description
      const analysisResult = await this.processJobDescription(jobId, jdText, jobTitle);
      
      // Publish the result
      await this.publishAnalysisResult(analysisResult);
      
      this.logger.log(`Successfully processed job JD for jobId: ${jobId}`);
      
    } catch (error) {
      this.logger.error(`Error processing job JD for jobId: ${jobId}`, error);
      await this.handleProcessingError(error, jobId);
    } finally {
      // Remove from processing set
      this.processingJobs.delete(jobId);
    }
  }

  async processJobDescription(jobId: string, jdText: string, jobTitle: string): Promise<AnalysisJdExtractedEvent> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing job description for jobId: ${jobId}, title: ${jobTitle}`);
      
      // Validate inputs
      if (!jobId || !jdText || !jobTitle) {
        throw new Error(`Invalid parameters: jobId=${jobId}, jdText length=${jdText?.length}, jobTitle=${jobTitle}`);
      }

      // Sanitize and validate JD text
      const sanitizedJdText = this.sanitizeJdText(jdText);
      if (sanitizedJdText.length < 50) {
        throw new Error(`Job description too short: ${sanitizedJdText.length} characters`);
      }

      // Use LLM service to extract structured data
      const extractionRequest = {
        jobTitle,
        jdText: sanitizedJdText,
      };

      this.logger.log(`Calling LLM service for extraction, jobId: ${jobId}`);
      const llmResponse = await this.llmService.extractStructuredData(extractionRequest);
      
      if (!llmResponse.extractedData) {
        throw new Error('LLM service returned empty extraction data');
      }

      const processingTimeMs = Date.now() - startTime;
      
      // Create analysis result event
      const analysisResult: AnalysisJdExtractedEvent = {
        jobId,
        extractedData: llmResponse.extractedData,
        timestamp: new Date().toISOString(),
        processingTimeMs,
      };

      this.logger.log(`Job description processing completed for jobId: ${jobId}, processing time: ${processingTimeMs}ms`);
      
      return analysisResult;
      
    } catch (error) {
      this.logger.error(`Failed to process job description for jobId: ${jobId}`, error);
      throw error;
    }
  }

  async publishAnalysisResult(result: AnalysisJdExtractedEvent): Promise<void> {
    try {
      this.logger.log(`Publishing analysis result for jobId: ${result.jobId}`);
      
      // Validate the result before publishing
      if (!result.jobId || !result.extractedData || !result.timestamp) {
        throw new Error('Invalid analysis result: missing required fields');
      }

      // Validate extracted data structure
      if (!this.validateExtractedData(result.extractedData)) {
        this.logger.warn(`Analysis result validation failed for jobId: ${result.jobId}, publishing anyway`);
      }

      // Publish through NATS client
      const publishResult = await this.natsClient.publishAnalysisExtracted(result);
      
      if (!publishResult.success) {
        throw new Error(`Failed to publish analysis result: ${publishResult.error}`);
      }
      
      this.logger.log(`Analysis result published successfully for jobId: ${result.jobId}, messageId: ${publishResult.messageId}`);
      
    } catch (error) {
      this.logger.error(`Failed to publish analysis result for jobId: ${result.jobId}`, error);
      throw error;
    }
  }

  async handleProcessingError(error: Error, jobId: string): Promise<void> {
    try {
      this.logger.error(`Handling processing error for jobId: ${jobId}`, error);
      
      // Log the error details
      this.logger.error({
        message: 'JD processing error details',
        jobId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      });

      // Publish error event to NATS for other services to handle
      await this.natsClient.publishProcessingError(jobId, error);
      
      // Could implement retry logic here
      const shouldRetry = this.shouldRetryProcessing(error, jobId);
      if (shouldRetry) {
        this.logger.log(`Scheduling retry for jobId: ${jobId}`);
        // TODO: Implement retry mechanism with exponential backoff
        // For now, just log the intent
      }
      
    } catch (publishError) {
      this.logger.error(`Failed to handle processing error for jobId: ${jobId}`, publishError);
      // Don't throw here to avoid infinite loops
    }
  }

  private sanitizeJdText(jdText: string): string {
    if (!jdText || typeof jdText !== 'string') {
      throw new Error('Job description text is invalid');
    }

    // Basic sanitization
    return jdText
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\n\r.,!?;:()\-'"]/g, '') // Remove special characters
      .substring(0, 50000); // Limit length to prevent abuse
  }

  private validateExtractedData(data: JdDTO): boolean {
    try {
      // Check required fields
      if (!data.requirements || !data.responsibilities) {
        return false;
      }

      // Check requirements structure
      if (!data.requirements.technical || !Array.isArray(data.requirements.technical)) {
        return false;
      }

      if (!data.requirements.soft || !Array.isArray(data.requirements.soft)) {
        return false;
      }

      if (!data.requirements.experience || typeof data.requirements.experience !== 'string') {
        return false;
      }

      if (!data.requirements.education || typeof data.requirements.education !== 'string') {
        return false;
      }

      // Check responsibilities
      if (!Array.isArray(data.responsibilities) || data.responsibilities.length === 0) {
        return false;
      }

      // Check benefits (optional)
      if (data.benefits && !Array.isArray(data.benefits)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating extracted data', error);
      return false;
    }
  }

  private shouldRetryProcessing(error: Error, jobId: string): boolean {
    // Define retry conditions
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'temporary',
    ];

    const errorMessage = error.message.toLowerCase();
    const isRetryable = retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );

    // Don't retry validation errors or permanent failures
    if (errorMessage.includes('invalid') || errorMessage.includes('validation failed')) {
      return false;
    }

    this.logger.log(`Error ${isRetryable ? 'is' : 'is not'} retryable for jobId: ${jobId}: ${error.message}`);
    
    return isRetryable;
  }

  // Utility method to get processing status
  isProcessing(jobId: string): boolean {
    return this.processingJobs.has(jobId);
  }

  // Utility method to get currently processing jobs
  getProcessingJobs(): string[] {
    return Array.from(this.processingJobs);
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const natsConnected = this.natsClient.isConnected;
      const processingJobsCount = this.processingJobs.size;
      
      return {
        status: natsConnected ? 'healthy' : 'degraded',
        details: {
          natsConnected,
          processingJobsCount,
          processingJobs: this.getProcessingJobs(),
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

