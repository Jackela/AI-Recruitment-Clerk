import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { JdExtractorNatsService } from '../services/jd-extractor-nats.service';
import { JobJdSubmittedEvent, AnalysisJdExtractedEvent } from '../dto/events.dto';
import { JdDTO } from '@ai-recruitment-clerk/job-management-domain';
import { 
  RetryUtility, 
  WithCircuitBreaker,
  JDExtractorException,
  ErrorCorrelationManager
} from '@ai-recruitment-clerk/infrastructure-shared';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private readonly processingJobs = new Map<string, { timestamp: number; attempts: number }>();
  private readonly JOB_TIMEOUT_MS = 300000; // 5 minutes
  private readonly MAX_CONCURRENT_JOBS = 10;

  constructor(
    private readonly llmService: LlmService,
    private readonly natsService: JdExtractorNatsService,
  ) {}

  async handleJobJdSubmitted(event: JobJdSubmittedEvent): Promise<void> {
    const { jobId, jobTitle, jdText, timestamp } = event;
    
    this.logger.log(`Received job JD submitted event for jobId: ${jobId}, title: ${jobTitle}`);

    // Check if we're already processing this job
    if (this.processingJobs.has(jobId)) {
      this.logger.warn(`Job ${jobId} is already being processed, skipping duplicate event`);
      return;
    }

    // Check concurrent job limit
    this.cleanupExpiredJobs();
    if (this.processingJobs.size >= this.MAX_CONCURRENT_JOBS) {
      this.logger.warn(`Maximum concurrent jobs (${this.MAX_CONCURRENT_JOBS}) reached, queuing job ${jobId}`);
      // In a real implementation, you would queue this job for later processing
      setTimeout(() => this.handleJobJdSubmitted(event), 5000);
      return;
    }

    // Add to processing map with metadata
    this.processingJobs.set(jobId, { timestamp: Date.now(), attempts: 0 });

    try {
      // Validate input with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();
      
      if (!jobId || !jdText || !jobTitle) {
        throw new JDExtractorException(
          'INVALID_EVENT_DATA',
          {
            provided: { 
              jobId: !!jobId, 
              jdText: jdText?.length || 0, 
              jobTitle: !!jobTitle 
            },
            correlationId: correlationContext?.traceId
          }
        );
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
      // Remove from processing map
      this.processingJobs.delete(jobId);
    }
  }

  @WithCircuitBreaker('llm-processing', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000
  })
  async processJobDescription(jobId: string, jdText: string, jobTitle: string): Promise<AnalysisJdExtractedEvent> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing job description for jobId: ${jobId}, title: ${jobTitle}`);
      
      // Validate inputs with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();
      
      if (!jobId || !jdText || !jobTitle) {
        throw new JDExtractorException(
          'INVALID_PARAMETERS',
          {
            provided: {
              jobId: !!jobId,
              jdText: jdText?.length || 0,
              jobTitle: !!jobTitle
            },
            correlationId: correlationContext?.traceId
          }
        );
      }

      // Sanitize and validate JD text
      const sanitizedJdText = this.sanitizeJdText(jdText);
      if (sanitizedJdText.length < 50) {
        throw new JDExtractorException(
          'JD_TOO_SHORT',
          {
            actualLength: sanitizedJdText.length,
            minimumRequired: 50,
            jobId
          }
        );
      }

      // Use LLM service to extract structured data
      const extractionRequest = {
        jobTitle,
        jdText: sanitizedJdText,
      };

      this.logger.log(`Calling LLM service for extraction, jobId: ${jobId}`);
      const llmResponse = await RetryUtility.withExponentialBackoff(
        () => this.llmService.extractStructuredData(extractionRequest),
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          jitterMs: 500
        }
      );
      
      if (!llmResponse.extractedData) {
        throw new JDExtractorException(
          'LLM_EMPTY_RESULT',
          {
            jobId,
            jobTitle,
            correlationId: correlationContext?.traceId
          }
        );
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
        throw new JDExtractorException(
          'INVALID_ANALYSIS_RESULT',
          {
            provided: {
              jobId: !!result.jobId,
              extractedData: !!result.extractedData,
              timestamp: !!result.timestamp
            }
          }
        );
      }

      // Validate extracted data structure
      if (!this.validateExtractedData(result.extractedData)) {
        this.logger.warn(`Analysis result validation failed for jobId: ${result.jobId}, publishing anyway`);
      }

      // Publish through shared NATS service
      const publishResult = await this.natsService.publishAnalysisJdExtracted({
        jobId: result.jobId,
        extractedData: result.extractedData,
        processingTimeMs: result.processingTimeMs,
        confidence: 0.85, // Default confidence for LLM extraction
        extractionMethod: 'llm-structured',
      });
      
      if (!publishResult.success) {
        throw new JDExtractorException(
          'PUBLISH_FAILED',
          {
            jobId: result.jobId,
            error: publishResult.error,
            messageId: publishResult.messageId
          }
        );
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

      // Implement retry logic with exponential backoff
      const jobInfo = this.processingJobs.get(jobId);
      
      // Publish error event to NATS for other services to handle
      await this.natsService.publishProcessingError(jobId, error, {
        stage: 'llm-extraction',
        retryAttempt: jobInfo?.attempts || 1,
      });
      const shouldRetry = this.shouldRetryProcessing(error, jobId) && 
                         jobInfo && jobInfo.attempts < 3;
      
      if (shouldRetry) {
        jobInfo!.attempts++;
        this.logger.log(`Scheduling retry ${jobInfo!.attempts}/3 for jobId: ${jobId}`);
        
        const delay = 1000 * Math.pow(2, jobInfo!.attempts - 1) + Math.random() * 1000;
        setTimeout(async () => {
          try {
            await this.handleJobJdSubmitted({
              jobId,
              jobTitle: 'Retry Job',
              jdText: 'Retry processing',
              timestamp: new Date().toISOString()
            } as JobJdSubmittedEvent);
          } catch (retryError) {
            this.logger.error(`Retry failed for jobId: ${jobId}`, retryError);
          }
        }, delay);
      }
      
    } catch (publishError) {
      this.logger.error(`Failed to handle processing error for jobId: ${jobId}`, publishError);
      // Don't throw here to avoid infinite loops
    }
  }

  private sanitizeJdText(jdText: string): string {
    if (!jdText || typeof jdText !== 'string') {
      throw new JDExtractorException(
        'INVALID_JD_TEXT',
        {
          provided: typeof jdText,
          expected: 'string'
        }
      );
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

  // Clean up expired jobs to prevent memory leaks
  private cleanupExpiredJobs(): void {
    const now = Date.now();
    for (const [jobId, jobInfo] of this.processingJobs.entries()) {
      if (now - jobInfo.timestamp > this.JOB_TIMEOUT_MS) {
        this.logger.warn(`Cleaning up expired job: ${jobId}`);
        this.processingJobs.delete(jobId);
      }
    }
  }

  // Utility method to get processing status
  isProcessing(jobId: string): boolean {
    this.cleanupExpiredJobs();
    return this.processingJobs.has(jobId);
  }

  // Utility method to get currently processing jobs
  getProcessingJobs(): string[] {
    this.cleanupExpiredJobs();
    return Array.from(this.processingJobs.keys());
  }

  // Get processing job details
  getProcessingJobDetails(): Array<{ jobId: string; timestamp: number; attempts: number; age: number }> {
    this.cleanupExpiredJobs();
    const now = Date.now();
    return Array.from(this.processingJobs.entries()).map(([jobId, info]) => ({
      jobId,
      timestamp: info.timestamp,
      attempts: info.attempts,
      age: now - info.timestamp
    }));
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const natsHealth = await this.natsService.getHealthStatus();
      const processingJobsCount = this.processingJobs.size;
      
      return {
        status: natsHealth.connected ? 'healthy' : 'degraded',
        details: {
          natsConnected: natsHealth.connected,
          natsConnectionInfo: natsHealth,
          processingJobsCount,
          processingJobs: this.getProcessingJobDetails(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime()
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

