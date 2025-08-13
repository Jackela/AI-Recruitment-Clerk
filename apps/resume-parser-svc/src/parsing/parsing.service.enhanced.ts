/**
 * @fileoverview Enhanced Resume Parsing Service with Design by Contract
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.1.0 - Added DBC contracts and comprehensive validation
 * @module ParsingService
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';
import { 
  RetryUtility, 
  WithCircuitBreaker, 
  InputValidator, 
  EncryptionService,
  Requires,
  Ensures,
  Invariant,
  ContractValidators,
  ContractViolationError
} from '../../../../libs/shared-dtos/src';
import { createHash } from 'crypto';

/**
 * Resume parsing result interface
 * 
 * @interface ParsingResult
 * @since 1.1.0
 */
export interface ParsingResult {
  /** Unique parsing job ID */
  jobId: string;
  /** Processing status */
  status: 'processing' | 'completed' | 'failed' | 'partial';
  /** Extracted resume data */
  parsedData?: any;
  /** File storage URL */
  fileUrl?: string;
  /** Processing warnings */
  warnings: string[];
  /** Processing metadata */
  metadata: {
    duration: number;
    confidence?: number;
    error?: string;
  };
}

/**
 * Enhanced Resume Parsing Service with comprehensive DBC contracts
 * 
 * @class ParsingService
 * @classdesc Handles PDF resume parsing with AI analysis, validation, and error handling
 * 
 * @example
 * ```typescript
 * const parser = new ParsingService(visionLlm, gridFs, fieldMapper, nats);
 * const result = await parser.parseResumeFile(fileBuffer, 'resume.pdf', 'user123');
 * console.log(result.status, result.parsedData);
 * ```
 * 
 * @since 1.0.0
 * @version 1.1.0 - Added DBC contracts
 */
@Injectable()
@Invariant(
  (instance) => instance.visionLlmService && instance.gridFsService && instance.fieldMapperService,
  'ParsingService must have all required dependencies initialized'
)
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);
  private readonly processingFiles = new Map<string, { timestamp: number; hash: string; attempts: number }>();
  private readonly FILE_TIMEOUT_MS = 600000; // 10 minutes
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  /**
   * Creates ParsingService with dependency injection
   * 
   * @constructor
   * @param {VisionLlmService} visionLlmService - AI vision service for document analysis
   * @param {GridFsService} gridFsService - File storage service
   * @param {FieldMapperService} fieldMapperService - Data field mapping service  
   * @param {NatsClient} natsClient - Message queue client
   * 
   * @throws {TypeError} When required dependencies are missing
   * 
   * @since 1.0.0
   */
  constructor(
    private readonly visionLlmService: VisionLlmService,
    private readonly gridFsService: GridFsService,
    private readonly fieldMapperService: FieldMapperService,
    private readonly natsClient: NatsClient,
  ) {
    // Periodic cleanup of expired processing records
    setInterval(() => this.cleanupExpiredProcessing(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Parses resume file with comprehensive validation and error handling
   * 
   * @async
   * @method parseResumeFile
   * @param {Buffer} fileBuffer - Resume file buffer
   * @param {string} fileName - Original file name
   * @param {string} userId - User identifier
   * @param {Object} [options={}] - Parsing options
   * @param {boolean} [options.skipDuplicateCheck=false] - Skip duplicate file checking
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * 
   * @returns {Promise<ParsingResult>} Parsing result with extracted data
   * @returns {string} returns.jobId - Unique job identifier
   * @returns {'processing'|'completed'|'failed'|'partial'} returns.status - Processing status
   * @returns {any} returns.parsedData - Extracted resume data (if successful)
   * @returns {string} returns.fileUrl - Stored file URL (if successful)
   * @returns {string[]} returns.warnings - Processing warnings
   * @returns {Object} returns.metadata - Processing metadata
   * 
   * @throws {ContractViolationError} When preconditions fail
   * @throws {BadRequestException} When file validation fails
   * @throws {Error} When parsing fails unexpectedly
   * 
   * @example Successful parsing
   * ```typescript
   * const buffer = fs.readFileSync('resume.pdf');
   * const result = await parser.parseResumeFile(buffer, 'resume.pdf', 'user123');
   * 
   * if (result.status === 'completed') {
   *   console.log('Name:', result.parsedData.personalInfo.name);
   *   console.log('Skills:', result.parsedData.skills);
   * }
   * ```
   * 
   * @example With options
   * ```typescript
   * const result = await parser.parseResumeFile(
   *   buffer, 
   *   'resume.pdf', 
   *   'user123',
   *   { skipDuplicateCheck: true, maxRetries: 1 }
   * );
   * ```
   * 
   * @example Error handling
   * ```typescript
   * try {
   *   const result = await parser.parseResumeFile(buffer, fileName, userId);
   * } catch (error) {
   *   if (error instanceof ContractViolationError) {
   *     console.error('Contract violation:', error.message);
   *   } else if (error instanceof BadRequestException) {
   *     console.error('Validation error:', error.message);
   *   }
   * }
   * ```
   * 
   * @since 1.0.0
   * @version 1.1.0 - Added DBC contracts and enhanced validation
   */
  @Requires(
    (fileBuffer, fileName, userId) => Buffer.isBuffer(fileBuffer) && fileBuffer.length > 0,
    'File buffer must be valid and non-empty'
  )
  @Requires(
    (fileBuffer, fileName, userId) => ContractValidators.isNonEmptyString(fileName),
    'File name must be non-empty string'
  )
  @Requires(
    (fileBuffer, fileName, userId) => ContractValidators.isNonEmptyString(userId),
    'User ID must be non-empty string'
  )
  @Requires(
    (fileBuffer) => ContractValidators.isValidFileSize(fileBuffer.length),
    'File size must be within acceptable limits (10MB max)'
  )
  @Ensures(
    (result) => result && typeof result === 'object' && 
                ['processing', 'completed', 'failed', 'partial'].includes(result.status),
    'Result must have valid status'
  )
  @Ensures(
    (result) => result.jobId && ContractValidators.isNonEmptyString(result.jobId),
    'Result must include valid job ID'
  )
  @Ensures(
    (result) => Array.isArray(result.warnings),
    'Result must include warnings array'
  )
  @Ensures(
    (result) => result.metadata && typeof result.metadata.duration === 'number' && result.metadata.duration > 0,
    'Result must include valid processing duration'
  )
  @WithCircuitBreaker('resume-processing', {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 300000
  })
  public async parseResumeFile(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    options: { 
      skipDuplicateCheck?: boolean; 
      maxRetries?: number 
    } = {}
  ): Promise<ParsingResult> {
    const startTime = Date.now();
    const jobId = this.generateJobId(userId, fileName);
    const warnings: string[] = [];

    this.logger.log(`Starting resume parsing for job ${jobId}, user ${userId}, file ${fileName}`);

    try {
      // Validate file type from name and buffer content
      await this.validateFileType(fileName, fileBuffer);

      // Check for duplicate processing (unless skipped)
      if (!options.skipDuplicateCheck) {
        await this.checkDuplicateProcessing(fileBuffer, userId);
      }

      // Store file in GridFS
      const fileUrl = await this.storeFile(fileBuffer, fileName, userId);
      
      // Track processing attempt
      this.trackProcessingAttempt(jobId, fileBuffer);

      // Extract text and analyze with AI
      const extractedData = await this.extractWithAI(fileBuffer, fileName, options.maxRetries || 3);

      // Map and validate extracted fields
      const parsedData = await this.fieldMapperService.normalizeToResumeDto(extractedData);

      // Validate parsing quality
      const confidence = this.calculateConfidence(parsedData, extractedData);
      if (confidence < 0.7) {
        warnings.push(`Low confidence parsing (${Math.round(confidence * 100)}%)`);
      }

      // Clean up processing tracker
      this.processingFiles.delete(jobId);

      const result: ParsingResult = {
        jobId,
        status: confidence > 0.8 ? 'completed' : 'partial',
        parsedData,
        fileUrl,
        warnings,
        metadata: {
          duration: Date.now() - startTime,
          confidence
        }
      };

      this.logger.log(`Resume parsing completed for job ${jobId} with status ${result.status}`);
      return result;

    } catch (error) {
      // Clean up processing tracker on error
      this.processingFiles.delete(jobId);

      this.logger.error(`Resume parsing failed for job ${jobId}: ${error.message}`, error.stack);

      // Return failed result instead of throwing (unless it's a contract violation)
      if (error instanceof ContractViolationError) {
        throw error;
      }

      return {
        jobId,
        status: 'failed',
        warnings: [`Processing failed: ${error.message}`],
        metadata: {
          duration: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }

  /**
   * Validates file type based on name and buffer content
   * 
   * @private
   * @async
   * @method validateFileType
   * @param {string} fileName - File name to validate
   * @param {Buffer} fileBuffer - File buffer to analyze
   * 
   * @throws {BadRequestException} When file type is invalid
   * 
   * @since 1.1.0
   */
  private async validateFileType(fileName: string, fileBuffer: Buffer): Promise<void> {
    // Check file extension
    const extension = fileName.toLowerCase().split('.').pop();
    if (!['pdf', 'doc', 'docx'].includes(extension || '')) {
      throw new BadRequestException('Only PDF, DOC, and DOCX files are supported');
    }

    // Check file signature (magic bytes)
    const signature = fileBuffer.slice(0, 8);
    const isValidPdf = signature[0] === 0x25 && signature[1] === 0x50 && 
                      signature[2] === 0x44 && signature[3] === 0x46; // %PDF
    
    const isValidDoc = signature[0] === 0xD0 && signature[1] === 0xCF && 
                      signature[2] === 0x11 && signature[3] === 0xE0; // DOC signature
    
    const isValidDocx = signature[0] === 0x50 && signature[1] === 0x4B && 
                       signature[2] === 0x03 && signature[3] === 0x04; // ZIP signature (DOCX)

    if (!isValidPdf && !isValidDoc && !isValidDocx) {
      throw new BadRequestException('Invalid file format detected');
    }
  }

  /**
   * Checks for duplicate file processing
   * 
   * @private
   * @async
   * @method checkDuplicateProcessing
   * @param {Buffer} fileBuffer - File buffer to check
   * @param {string} userId - User ID for context
   * 
   * @throws {BadRequestException} When duplicate processing detected
   * 
   * @since 1.1.0
   */
  private async checkDuplicateProcessing(fileBuffer: Buffer, userId: string): Promise<void> {
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    const existingProcessing = Array.from(this.processingFiles.values())
      .find(p => p.hash === fileHash);

    if (existingProcessing) {
      const timeSinceStart = Date.now() - existingProcessing.timestamp;
      if (timeSinceStart < this.FILE_TIMEOUT_MS) {
        throw new BadRequestException('File is already being processed');
      }
    }
  }

  /**
   * Stores file in GridFS storage
   * 
   * @private
   * @async
   * @method storeFile
   * @param {Buffer} fileBuffer - File buffer to store
   * @param {string} fileName - Original file name
   * @param {string} userId - User ID for organization
   * 
   * @returns {Promise<string>} File storage URL
   * 
   * @since 1.1.0
   */
  private async storeFile(fileBuffer: Buffer, fileName: string, userId: string): Promise<string> {
    return await this.gridFsService.uploadFile(
      fileBuffer,
      fileName,
      {
        userId,
        uploadedAt: new Date(),
        fileSize: fileBuffer.length
      }
    );
  }

  /**
   * Tracks processing attempt for duplicate prevention
   * 
   * @private
   * @method trackProcessingAttempt
   * @param {string} jobId - Job identifier
   * @param {Buffer} fileBuffer - File buffer for hash generation
   * 
   * @since 1.1.0
   */
  private trackProcessingAttempt(jobId: string, fileBuffer: Buffer): void {
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    this.processingFiles.set(jobId, {
      timestamp: Date.now(),
      hash: fileHash,
      attempts: 1
    });
  }

  /**
   * Extracts data using AI vision service with retry logic
   * 
   * @private
   * @async
   * @method extractWithAI
   * @param {Buffer} fileBuffer - File buffer to analyze
   * @param {string} fileName - File name for context
   * @param {number} maxRetries - Maximum retry attempts
   * 
   * @returns {Promise<any>} Extracted data from AI service
   * 
   * @since 1.1.0
   */
  private async extractWithAI(fileBuffer: Buffer, fileName: string, maxRetries: number): Promise<any> {
    return await RetryUtility.withExponentialBackoff(
      async () => {
        return await this.visionLlmService.parseResumePdf(fileBuffer, fileName);
      },
      {
        maxAttempts: maxRetries,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        retryIf: (error) => {
          // Retry on network errors, but not on validation errors
          return !error.message.includes('validation') && 
                 !error.message.includes('invalid');
        }
      }
    );
  }

  /**
   * Calculates parsing confidence score based on extracted data quality
   * 
   * @private
   * @method calculateConfidence
   * @param {any} parsedData - Mapped and validated data
   * @param {any} rawData - Raw extracted data
   * 
   * @returns {number} Confidence score between 0 and 1
   * 
   * @since 1.1.0
   */
  private calculateConfidence(parsedData: any, rawData: any): number {
    let score = 0.5; // Base score

    // Check for essential fields
    if (parsedData.personalInfo?.name) score += 0.2;
    if (parsedData.personalInfo?.email) score += 0.1;
    if (parsedData.experience?.length > 0) score += 0.1;
    if (parsedData.skills?.length > 0) score += 0.1;

    // Check data quality indicators from raw extraction
    if (rawData.confidence && rawData.confidence > 0.8) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Generates unique job ID for tracking
   * 
   * @private
   * @method generateJobId
   * @param {string} userId - User identifier
   * @param {string} fileName - File name
   * 
   * @returns {string} Unique job identifier
   * 
   * @since 1.1.0
   */
  private generateJobId(userId: string, fileName: string): string {
    const timestamp = Date.now();
    const hash = createHash('md5')
      .update(`${userId}-${fileName}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    return `parse_${timestamp}_${hash}`;
  }

  /**
   * Cleans up expired processing records
   * 
   * @private
   * @method cleanupExpiredProcessing
   * 
   * @since 1.1.0
   */
  private cleanupExpiredProcessing(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [jobId, processing] of this.processingFiles.entries()) {
      if (now - processing.timestamp > this.FILE_TIMEOUT_MS) {
        this.processingFiles.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired processing records`);
    }
  }

  /**
   * Gets current processing status for monitoring
   * 
   * @method getProcessingStats
   * @returns {Object} Current processing statistics
   * @returns {number} returns.activeJobs - Number of active processing jobs
   * @returns {number} returns.totalCapacity - Maximum concurrent processing capacity
   * @returns {boolean} returns.isHealthy - Whether service is operating normally
   * 
   * @example
   * ```typescript
   * const stats = parser.getProcessingStats();
   * console.log(`Active jobs: ${stats.activeJobs}/${stats.totalCapacity}`);
   * ```
   * 
   * @since 1.1.0
   */
  public getProcessingStats(): { 
    activeJobs: number; 
    totalCapacity: number; 
    isHealthy: boolean;
  } {
    const activeJobs = this.processingFiles.size;
    const totalCapacity = 50; // Maximum concurrent jobs
    
    return {
      activeJobs,
      totalCapacity,
      isHealthy: activeJobs < totalCapacity && 
                 this.visionLlmService !== null && 
                 this.gridFsService !== null
    };
  }
}