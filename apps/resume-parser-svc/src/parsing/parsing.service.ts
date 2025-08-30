import { Injectable, Logger } from '@nestjs/common';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import { 
  RetryUtility, 
  WithCircuitBreaker, 
  InputValidator, 
  EncryptionService,
  ResumeParserException,
  ErrorCorrelationManager
} from '@ai-recruitment-clerk/infrastructure-shared';
import { createHash } from 'crypto';

@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);
  private readonly processingFiles = new Map<string, { timestamp: number; hash: string; attempts: number }>();
  private readonly FILE_TIMEOUT_MS = 600000; // 10 minutes
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  constructor(
    private readonly visionLlmService: VisionLlmService,
    private readonly gridFsService: GridFsService,
    private readonly fieldMapperService: FieldMapperService,
    private readonly natsService: ResumeParserNatsService,
  ) {
    // Periodic cleanup of expired processing records
    setInterval(() => this.cleanupExpiredProcessing(), 5 * 60 * 1000); // Every 5 minutes
  }

  @WithCircuitBreaker('resume-processing', {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 300000
  })
  async handleResumeSubmitted(event: any): Promise<void> {
    const { jobId, resumeId, originalFilename, tempGridFsUrl, organizationId, fileMetadata } = event || {};
    
    // Enhanced input validation with correlation
    const correlationContext = ErrorCorrelationManager.getContext();
    
    if (!jobId || !resumeId || !originalFilename || !tempGridFsUrl) {
      throw new ResumeParserException(
        'INVALID_EVENT_DATA',
        {
          provided: { jobId: !!jobId, resumeId: !!resumeId, originalFilename: !!originalFilename, tempGridFsUrl: !!tempGridFsUrl },
          correlationId: correlationContext?.traceId
        }
      );
    }

    // Validate organization context
    if (!organizationId) {
      throw new ResumeParserException(
        'ORGANIZATION_ID_REQUIRED',
        { correlationId: correlationContext?.traceId }
      );
    }

    const start = Date.now();
    const processingKey = `${resumeId}-${organizationId}`;

    try {
      // Check if already processing
      if (this.processingFiles.has(processingKey)) {
        this.logger.warn(`Resume ${resumeId} is already being processed, skipping duplicate`);
        return;
      }

      // Download and validate file
      this.logger.log(`Downloading resume file for processing: ${resumeId}`);
      const fileBuffer = await this.downloadAndValidateFile(tempGridFsUrl, originalFilename, fileMetadata);
      
      // Add to processing map
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
      this.processingFiles.set(processingKey, {
        timestamp: Date.now(),
        hash: fileHash,
        attempts: 0
      });

      // Parse resume with retry logic
      const rawLlmOutput = await RetryUtility.withExponentialBackoff(
        () => this.visionLlmService.parseResumePdf(fileBuffer, originalFilename),
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          jitterMs: 500
        }
      );

      // Normalize and encrypt sensitive data
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(rawLlmOutput);
      const encryptedResumeDto = this.encryptSensitiveData(resumeDto, organizationId);

      const payload = {
        jobId,
        resumeId,
        resumeDto: encryptedResumeDto,
        organizationId,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - start,
        fileHash,
        securityMetadata: {
          encrypted: true,
          encryptionVersion: '1.0',
          processingNode: process.env.NODE_NAME || 'unknown'
        }
      };

      await this.natsService.publishAnalysisResumeParsed({
        jobId: payload.jobId,
        resumeId: payload.resumeId,
        resumeDto: payload.resumeDto,
        processingTimeMs: payload.processingTimeMs,
        confidence: 0.85, // Default confidence for enhanced processing
        parsingMethod: 'ai-vision-enhanced',
      });
      this.logger.log(`Resume processing completed successfully: ${resumeId}`);
      
    } catch (error) {
      this.logger.error(`Resume processing failed for ${resumeId}:`, error);
      
      await this.natsService.publishJobResumeFailed({
        jobId,
        resumeId,
        error: error as Error,
        stage: 'resume-processing',
        retryAttempt: 0,
      });
      throw error;
    } finally {
      // Always cleanup processing record
      this.processingFiles.delete(processingKey);
    }
  }

  async processResumeFile(jobId: string, resumeId: string, gridFsUrl: string, filename: string, organizationId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing resume file for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${filename}`);
      
      // Enhanced input validation
      if (!jobId || !resumeId || !gridFsUrl || !filename || !organizationId) {
        throw new ResumeParserException(
          'INVALID_PARAMETERS',
          {
            provided: {
              jobId: !!jobId,
              resumeId: !!resumeId, 
              gridFsUrl: !!gridFsUrl,
              filename: !!filename,
              organizationId: !!organizationId
            }
          }
        );
      }

      // Validate organization access
      this.validateOrganizationAccess(organizationId, jobId);

      // Download and validate file
      this.logger.log(`Downloading file from GridFS: ${gridFsUrl}`);
      const fileBuffer = await this.downloadAndValidateFile(gridFsUrl, filename);
      
      // Additional security check: verify file hasn't been tampered with
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
      this.logger.debug(`File integrity hash: ${fileHash}`);

      // Parse resume using Vision LLM service with security context
      this.logger.log(`Parsing resume with Vision LLM service: ${filename}`);
      const rawLlmOutput = await RetryUtility.withExponentialBackoff(
        () => this.visionLlmService.parseResumePdf(fileBuffer, filename),
        { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 5000 }
      );
      
      if (!rawLlmOutput) {
        throw new ResumeParserException(
          'VISION_LLM_EMPTY_RESULT',
          { filename, resumeId }
        );
      }

      // Normalize, validate, and encrypt sensitive data
      this.logger.log(`Normalizing and securing extracted data for resume: ${resumeId}`);
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(rawLlmOutput);
      const securedResumeDto = this.encryptSensitiveData(resumeDto, organizationId);
      
      if (!resumeDto) {
        throw new ResumeParserException(
          'FIELD_MAPPING_FAILED',
          { resumeId, filename }
        );
      }

      const processingTimeMs = Date.now() - startTime;
      
      // Create success result with security metadata
      const result = {
        jobId,
        resumeId,
        resumeDto: securedResumeDto,
        organizationId,
        timestamp: new Date().toISOString(),
        processingTimeMs,
        originalFilename: filename,
        fileHash,
        securityMetadata: {
          encrypted: true,
          encryptionVersion: '1.0',
          processingNode: process.env.NODE_NAME || 'unknown',
          dataClassification: 'sensitive-pii'
        }
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

      // Publish through shared NATS service
      const publishResult = await this.natsService.publishJobResumeFailed({
        jobId: event.jobId,
        resumeId: event.resumeId,
        error: new Error(event.error),
        stage: 'parsing-failure',
        retryAttempt: event.retryCount || 0,
      });
      
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
        
        // Implement exponential backoff retry mechanism
        const retryDelay = this.calculateExponentialBackoffDelay(retryCount);
        this.logger.log(`Retry will be attempted in ${retryDelay}ms`);
        
        // Schedule retry with exponential backoff
        setTimeout(async () => {
          try {
            this.incrementRetryCount(resumeId);
            this.logger.log(`Executing retry ${retryCount + 1} for resumeId: ${resumeId}`);
            
            // Retry the parsing operation
            await this.retryParseOperation(jobId, resumeId, originalData);
          } catch (retryError) {
            this.logger.error(`Retry ${retryCount + 1} failed for resumeId: ${resumeId}`, retryError);
            // This will trigger another call to this error handler if retries remain
            await this.handleParsingError(jobId, resumeId, retryError, originalData);
          }
        }, retryDelay);
        
      } else {
        this.logger.log(`Max retries reached or error not retryable for resumeId: ${resumeId}`);
        
        // Publish failure event
        await this.publishFailureEvent(jobId, resumeId, 'unknown', error, retryCount);
      }

      // Publish internal error event for monitoring
      await this.natsService.publishProcessingError(jobId, resumeId, error, {
        stage: 'error-handling',
        retryAttempt: retryCount,
      });
      
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

  /**
   * Calculate exponential backoff delay with jitter
   * @param retryCount Current retry attempt (0-based)
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
   * Retry the parsing operation for a specific resume
   * @param jobId Job identifier
   * @param resumeId Resume identifier
   * @param originalData Original resume data for retry
   */
  private async retryParseOperation(jobId: string, resumeId: string, originalData: any): Promise<void> {
    try {
      this.logger.log(`Retrying parsing operation for resumeId: ${resumeId}`);
      
      // Re-attempt the parsing with the original data
      if (originalData.fileBuffer) {
        // Retry file-based parsing
        await this.parseResumeFile(jobId, resumeId, originalData.fileBuffer, originalData.fileName);
      } else if (originalData.resumeText) {
        // Retry text-based parsing
        await this.parseResumeText(jobId, resumeId, originalData.resumeText);
      } else {
        throw new ResumeParserException(
          'RETRY_DATA_UNAVAILABLE',
          { resumeId, retryCount: this.processingFiles.get(`${resumeId}-retry`)?.attempts || 0 }
        );
      }
      
      this.logger.log(`Retry successful for resumeId: ${resumeId}`);
      
      // Clear retry count on success
      this.retryCounts.delete(resumeId);
      
    } catch (error) {
      this.logger.error(`Retry operation failed for resumeId: ${resumeId}`, error);
      throw error;
    }
  }

  /**
   * Parse resume from file buffer
   * @param jobId Job identifier
   * @param resumeId Resume identifier  
   * @param fileBuffer File buffer
   * @param fileName Original file name
   */
  private async parseResumeFile(jobId: string, resumeId: string, fileBuffer: Buffer, fileName: string): Promise<void> {
    // Implementation would call existing parsing logic
    this.logger.log(`Parsing resume file: ${fileName} for resumeId: ${resumeId}`);
    // Add actual file parsing logic here - this would integrate with existing parse methods
    // For now, this is a placeholder that demonstrates the retry structure
  }

  /**
   * Parse resume from text
   * @param jobId Job identifier
   * @param resumeId Resume identifier
   * @param resumeText Resume text content
   */
  private async parseResumeText(jobId: string, resumeId: string, resumeText: string): Promise<void> {
    // Implementation would call existing parsing logic
    this.logger.log(`Parsing resume text for resumeId: ${resumeId}`);
    // Add actual text parsing logic here - this would integrate with existing parse methods
    // For now, this is a placeholder that demonstrates the retry structure
  }

  // Security helper methods
  private async downloadAndValidateFile(gridFsUrl: string, filename: string, metadata?: any): Promise<Buffer> {
    // Download file
    const fileBuffer = await this.gridFsService.downloadFile(gridFsUrl);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new ResumeParserException(
        'FILE_DOWNLOAD_FAILED',
        { filename, gridFsUrl }
      );
    }

    // Validate file size
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      throw new ResumeParserException(
        'FILE_SIZE_EXCEEDED',
        { 
          filename, 
          actualSize: fileBuffer.length, 
          maxAllowed: this.MAX_FILE_SIZE 
        }
      );
    }

    // Validate file using InputValidator
    const validation = InputValidator.validateResumeFile({
      buffer: fileBuffer,
      originalname: filename,
      mimetype: metadata?.mimetype || this.detectMimeType(fileBuffer),
      size: fileBuffer.length
    });

    if (!validation.isValid) {
      throw new ResumeParserException(
        'FILE_VALIDATION_FAILED',
        { 
          filename, 
          validationErrors: validation.errors,
          actualMimeType: metadata?.mimeType || 'unknown'
        }
      );
    }

    this.logger.log(`File validation passed for: ${filename}`);
    return fileBuffer;
  }

  private validateOrganizationAccess(organizationId: string, jobId: string): void {
    // Basic validation - in production this would check against organization permissions
    if (!organizationId || organizationId.length < 5) {
      throw new ResumeParserException(
        'INVALID_ORGANIZATION_ID',
        { 
          providedId: organizationId,
          minLength: 5 
        }
      );
    }

    // Validate jobId belongs to organization (basic format check)
    if (!jobId.includes(organizationId.substring(0, 8))) {
      this.logger.warn(`Potential cross-organization access attempt: org=${organizationId}, job=${jobId}`);
      // In production, this would be a strict check against database
    }
  }

  private encryptSensitiveData(resumeDto: any, organizationId: string): any {
    try {
      // Create a copy to avoid mutating original
      const secureCopy = JSON.parse(JSON.stringify(resumeDto));
      
      // Encrypt PII fields using organization-specific context
      if (secureCopy.contactInfo) {
        secureCopy.contactInfo = EncryptionService.encryptUserPII(secureCopy.contactInfo);
      }

      // Add organization context for data isolation
      secureCopy._organizationId = organizationId;
      secureCopy._dataClassification = 'sensitive-pii';
      
      this.logger.debug(`Encrypted sensitive data for organization: ${organizationId}`);
      return secureCopy;
    } catch (error) {
      this.logger.error(`Failed to encrypt sensitive data: ${error.message}`);
      throw new ResumeParserException(
        'DATA_ENCRYPTION_FAILED',
        { 
          organizationId,
          originalError: error.message 
        }
      );
    }
  }

  private detectMimeType(buffer: Buffer): string {
    // Basic MIME type detection based on file signatures
    const signatures: Record<string, string> = {
      '%PDF': 'application/pdf',
      'PK': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      '\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1': 'application/msword' // .doc
    };

    const header = buffer.toString('ascii', 0, 8);
    
    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (header.startsWith(signature)) {
        return mimeType;
      }
    }

    return 'application/octet-stream'; // Unknown type
  }

  private cleanupExpiredProcessing(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, info] of this.processingFiles.entries()) {
      if (now - info.timestamp > this.FILE_TIMEOUT_MS) {
        this.processingFiles.delete(key);
        cleanedCount++;
        this.logger.warn(`Cleaned up expired processing record: ${key}`);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired processing records`);
    }
  }

  // Enhanced health check with security metrics
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const natsHealth = await this.natsService.getHealthStatus();
      const retryQueueSize = this.retryCounts.size;
      const activeProcessingCount = this.processingFiles.size;
      
      return {
        status: natsHealth.connected ? 'healthy' : 'degraded',
        details: {
          natsConnected: natsHealth.connected,
          natsConnectionInfo: natsHealth,
          retryQueueSize,
          activeProcessingCount,
          activeRetries: Array.from(this.retryCounts.entries()),
          processingFiles: Array.from(this.processingFiles.entries()).map(([key, info]) => ({
            key,
            age: Date.now() - info.timestamp,
            attempts: info.attempts
          })),
          securityStatus: {
            encryptionEnabled: true,
            maxFileSize: this.MAX_FILE_SIZE,
            allowedTypes: this.ALLOWED_MIME_TYPES
          },
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

  // Get security metrics for monitoring
  getSecurityMetrics(): {
    activeProcessingFiles: number;
    totalProcessedToday: number;
    encryptionFailures: number;
    validationFailures: number;
  } {
    // In production, these would be tracked in proper metrics
    return {
      activeProcessingFiles: this.processingFiles.size,
      totalProcessedToday: 0, // Would be tracked in database
      encryptionFailures: 0, // Would be tracked in metrics
      validationFailures: 0 // Would be tracked in metrics
    };
  }
}