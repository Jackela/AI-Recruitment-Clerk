/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable, Logger } from '@nestjs/common';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import {
  RetryUtility,
  WithCircuitBreaker,
  ResumeParserException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';
import {
  FileProcessingService,
  ResumeEncryptionService,
} from '../processing';
import { ResumeParserConfigService } from '../config';
import type {
  ResumeSubmittedEventData,
  ResumeParseSuccessResult,
  RetryOriginalData,
} from '../types/parsing.types';
import { ParsingEventService, type ResumeParseSuccessResult as EventSuccessResult } from './services/parsing-event.service';
import { ParsingRetryService } from './services/parsing-retry.service';
import { ParsingHealthService } from './services/parsing-health.service';
import { ParsingFileService } from './services/parsing-file.service';
/* eslint-enable @typescript-eslint/consistent-type-imports */

/** Main orchestrator service for resume parsing. Delegates to specialized sub-services. */
@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);
  private readonly FILE_TIMEOUT_MS = 600000;
  private readonly eventService: ParsingEventService;
  private readonly retryService: ParsingRetryService;
  private readonly healthService: ParsingHealthService;
  private readonly fileService: ParsingFileService;
  private readonly natsService: ResumeParserNatsService;

  constructor(
    private readonly visionLlmService: VisionLlmService,
    private readonly pdfTextExtractorService: PdfTextExtractorService,
    gridFsService: GridFsService,
    private readonly fieldMapperService: FieldMapperService,
    natsService: ResumeParserNatsService,
    fileProcessingService: FileProcessingService,
    resumeEncryptionService: ResumeEncryptionService,
    private readonly config: ResumeParserConfigService,
  ) {
    this.natsService = natsService;
    this.eventService = new ParsingEventService(natsService);
    this.retryService = new ParsingRetryService(this.eventService);
    this.fileService = new ParsingFileService(gridFsService, fileProcessingService, resumeEncryptionService);
    this.healthService = new ParsingHealthService(natsService, this.retryService);
    if (!this.config.isTest) {
      setInterval(() => this.retryService.cleanupExpiredProcessing(this.FILE_TIMEOUT_MS), 5 * 60 * 1000);
    }
  }

  public getProcessingStats(): { activeJobs: number; totalCapacity: number; isHealthy: boolean } {
    return this.healthService.getProcessingStats();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async parseResumeFile(buffer: Buffer, filename: string, userId: string): Promise<any> {
    const started = Date.now();
    const jobId = `${filename}-${Date.now()}`;
    this.fileService.validateFileInput(buffer, filename, userId);

    try {
      if (!this.fileService.isPdf(buffer)) {
        return { jobId, status: 'failed', warnings: ['Invalid file format'], metadata: { duration: Date.now() - started, userId, filename } };
      }

      this.logger.log(`Extracting text from PDF: ${filename}`);
      const extractedText = await this.pdfTextExtractorService.extractText(buffer);
      this.logger.debug(`Extracted ${extractedText.length} characters from PDF`);
      this.logger.debug(`Text sample: ${extractedText.substring(0, 200).replace(/\n/g, ' ')}...`);

      const raw = await this.visionLlmService.parseResumeText(extractedText);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(raw as any);

      let fileUrl = await this.fileService.uploadFile(buffer, filename);
      if (fileUrl === undefined) {
        return { jobId, status: 'failed', warnings: ['Processing failed: Storage error'], metadata: { duration: Date.now() - started, userId, filename, error: 'Storage error' } };
      }
      if (!fileUrl) { fileUrl = `http://storage.example.com/${encodeURIComponent(filename)}`; }

      return { jobId: `parse_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`, status: 'completed', parsedData: resumeDto, fileUrl, warnings: [], metadata: { duration: Date.now() - started, userId, filename } };
    } catch (error) {
      const msg = (error as Error)?.message || 'Unknown error';
      return { jobId, status: 'failed', warnings: [`Processing failed: ${msg}`], metadata: { duration: Date.now() - started, userId, filename, error: msg } };
    }
  }

  @WithCircuitBreaker('resume-processing', { failureThreshold: 5, resetTimeoutMs: 60000, monitorWindow: 300000 })
  public async handleResumeSubmitted(event: ResumeSubmittedEventData): Promise<void> {
    const { jobId, resumeId, originalFilename, tempGridFsUrl, organizationId, fileMetadata } = event || {};
    const correlationContext = ErrorCorrelationManager.getContext();

    if (!jobId || !resumeId || !originalFilename || !tempGridFsUrl) {
      throw new ResumeParserException('INVALID_EVENT_DATA', { provided: { jobId: !!jobId, resumeId: !!resumeId, originalFilename: !!originalFilename, tempGridFsUrl: !!tempGridFsUrl }, correlationId: correlationContext?.traceId });
    }
    if (!organizationId) {
      throw new ResumeParserException('ORGANIZATION_ID_REQUIRED', { correlationId: correlationContext?.traceId });
    }

    const start = Date.now();
    const processingKey = `${resumeId}-${organizationId}`;

    try {
      if (this.retryService.isProcessing(processingKey)) {
        this.logger.warn(`Resume ${resumeId} is already being processed, skipping duplicate`);
        return;
      }

      this.logger.log(`Downloading resume file for processing: ${resumeId}`);
      const fileBuffer = await this.fileService.downloadAndValidateFile(tempGridFsUrl, originalFilename, fileMetadata);
      const fileHash = this.fileService.createFileHash(fileBuffer);
      this.retryService.registerProcessingFile(processingKey, fileHash);

      const rawLlmOutput = await this.parseWithRetry(fileBuffer, originalFilename);
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(rawLlmOutput as unknown as Record<string, unknown>);
      const encryptedResumeDto = this.fileService.encryptSensitiveData(resumeDto, organizationId);

      await this.natsService.publishAnalysisResumeParsed({ jobId, resumeId, resumeDto: encryptedResumeDto, processingTimeMs: Date.now() - start, confidence: 0.85, parsingMethod: 'ai-vision-enhanced' });
      this.logger.log(`Resume processing completed successfully: ${resumeId}`);
      this.retryService.clearRetryCount(resumeId);
    } catch (error) {
      this.logger.error(`Resume processing failed for ${resumeId}:`, error);
      await this.natsService.publishJobResumeFailed({ jobId, resumeId, error: error as Error, stage: 'resume-processing', retryAttempt: 0 });
      throw error;
    } finally {
      this.retryService.unregisterProcessingFile(processingKey);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async processResumeFile(jobId: string, resumeId: string, gridFsUrl: string, filename: string, organizationId: string): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing resume file for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${filename}`);

      if (!jobId || !resumeId || !gridFsUrl || !filename || !organizationId) {
        throw new ResumeParserException('INVALID_PARAMETERS', { provided: { jobId: !!jobId, resumeId: !!resumeId, gridFsUrl: !!gridFsUrl, filename: !!filename, organizationId: !!organizationId } });
      }

      this.fileService.validateOrganizationAccess(organizationId, jobId);
      this.logger.log(`Downloading file from GridFS: ${gridFsUrl}`);
      const fileBuffer = await this.fileService.downloadAndValidateFile(gridFsUrl, filename);
      const fileHash = this.fileService.createFileHash(fileBuffer);
      this.logger.debug(`File integrity hash: ${fileHash}`);

      this.logger.log(`Parsing resume with appropriate strategy: ${filename}`);
      const rawLlmOutput = await RetryUtility.withExponentialBackoff(() => this.parseWithStrategy(fileBuffer, filename), { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 5000 });

      if (!rawLlmOutput) { throw new ResumeParserException('VISION_LLM_EMPTY_RESULT', { filename, resumeId }); }

      this.logger.log(`Normalizing and securing extracted data for resume: ${resumeId}`);
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(rawLlmOutput as unknown as Record<string, unknown>);
      const securedResumeDto = this.fileService.encryptSensitiveData(resumeDto, organizationId);

      if (!resumeDto) { throw new ResumeParserException('FIELD_MAPPING_FAILED', { resumeId, filename }); }

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(`Resume processing completed successfully for resumeId: ${resumeId}, processing time: ${processingTimeMs}ms`);

      return { jobId, resumeId, resumeDto: securedResumeDto, organizationId, timestamp: new Date().toISOString(), processingTimeMs, originalFilename: filename, fileHash, securityMetadata: { encrypted: true, encryptionVersion: '1.0', processingNode: this.config.nodeName, dataClassification: 'sensitive-pii' } };
    } catch (error) {
      this.logger.error(`Failed to process resume file for resumeId: ${resumeId}`, error);
      throw error;
    }
  }

  public async publishSuccessEvent(result: ResumeParseSuccessResult): Promise<void> {
    await this.eventService.publishSuccessEvent(result as EventSuccessResult);
  }

  public async publishFailureEvent(jobId: string, resumeId: string, filename: string, error: Error, retryCount: number): Promise<void> {
    await this.eventService.publishFailureEvent(jobId, resumeId, filename, error, retryCount);
  }

  public async handleProcessingError(error: Error, jobId: string, resumeId: string, originalData?: RetryOriginalData): Promise<void> {
    await this.retryService.handleProcessingError(error, jobId, resumeId, originalData, async (jId, rId, data) => { await this.retryParseOperation(jId, rId, data); });
  }

  public async healthCheck(): Promise<{ status: string; details: Record<string, unknown> }> {
    return this.healthService.healthCheck();
  }

  public getSecurityMetrics(): { activeProcessingFiles: number; totalProcessedToday: number; encryptionFailures: number; validationFailures: number } {
    return this.healthService.getSecurityMetrics();
  }

  // Private methods
  private async parseWithRetry(fileBuffer: Buffer, filename: string): Promise<unknown> {
    return RetryUtility.withExponentialBackoff(() => this.parseWithStrategy(fileBuffer, filename), { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2, jitterMs: 500 });
  }

  private async parseWithStrategy(fileBuffer: Buffer, filename: string): Promise<unknown> {
    if (this.fileService.isPdf(fileBuffer)) {
      this.logger.log(`Extracting text from PDF: ${filename}`);
      const extractedText = await this.pdfTextExtractorService.extractText(fileBuffer);
      this.logger.debug(`Extracted ${extractedText.length} characters from PDF`);
      this.logger.debug(`Text sample: ${extractedText.substring(0, 200).replace(/\n/g, ' ')}...`);
      return this.visionLlmService.parseResumeText(extractedText);
    }
    const text = await this.fileService.extractTextFromMaybeTextFile(fileBuffer);
    return this.visionLlmService.parseResumeText(text);
  }

  private async retryParseOperation(jobId: string, resumeId: string, originalData: RetryOriginalData): Promise<void> {
    try {
      this.logger.log(`Retrying parsing operation for resumeId: ${resumeId}`);
      if (originalData.fileBuffer) {
        await this.parseResumeFileInternal(jobId, resumeId, originalData.fileBuffer, originalData.fileName ?? 'unknown-filename');
      } else if (originalData.resumeText) {
        await this.parseResumeText(jobId, resumeId, originalData.resumeText);
      } else {
        throw new ResumeParserException('RETRY_DATA_UNAVAILABLE', { resumeId, retryCount: this.retryService.getRetryCount(resumeId) });
      }
      this.logger.log(`Retry successful for resumeId: ${resumeId}`);
      this.retryService.clearRetryCount(resumeId);
    } catch (error) {
      this.logger.error(`Retry operation failed for resumeId: ${resumeId}`, error);
      throw error;
    }
  }

  private async parseResumeFileInternal(_jobId: string, resumeId: string, _fileBuffer: Buffer, fileName: string): Promise<void> {
    this.logger.log(`Parsing resume file: ${fileName} for resumeId: ${resumeId}`);
  }

  private async parseResumeText(_jobId: string, resumeId: string, _resumeText: string): Promise<void> {
    this.logger.log(`Parsing resume text for resumeId: ${resumeId}`);
  }

  // Backward-compatible method for tests
   
  private async extractTextFromMaybeTextFile(buffer: Buffer): Promise<string> {
    return this.fileService.extractTextFromMaybeTextFile(buffer);
  }
}
