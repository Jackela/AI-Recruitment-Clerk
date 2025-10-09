import { Injectable, Logger } from '@nestjs/common';
import { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { AnalysisInitiatedResponseDto } from './dto/analysis-response.dto';
import { MulterFile } from '../jobs/types/multer.types';

// Define event interfaces locally to avoid module resolution issues
interface JobJdSubmittedEvent {
  jobId: string;
  jobTitle: string;
  jdText: string;
  timestamp: string;
}

interface ResumeSubmittedEvent {
  jobId: string;
  resumeId: string;
  originalFilename: string;
  tempGridFsUrl: string;
}

/**
 * Provides analysis functionality.
 */
@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  /**
   * Initializes a new instance of the Analysis Service.
   * @param natsClient - The nats client.
   */
  constructor(private readonly natsClient: AppGatewayNatsService) {}

  /**
   * Performs the initiate analysis operation.
   * @param jdText - The jd text.
   * @param resumeFile - The resume file.
   * @param sessionId - The session id.
   * @param options - The options.
   * @returns A promise that resolves to AnalysisInitiatedResponseDto.
   */
  async initiateAnalysis(
    jdText: string,
    resumeFile: MulterFile,
    sessionId?: string,
    options?: string,
  ): Promise<AnalysisInitiatedResponseDto> {
    const analysisId = this.generateAnalysisId();
    const timestamp = new Date().toISOString();

    this.logger.log(`🚀 Initiating analysis pipeline for ID: ${analysisId}`);

    try {
      // Parse options if provided
      let analysisOptions = {};
      if (options) {
        try {
          analysisOptions = JSON.parse(options);
        } catch (error) {
          this.logger.warn('Invalid options JSON provided, using defaults');
        }
      }

      // Create a virtual job ID for this analysis session
      const virtualJobId = `analysis_job_${analysisId}`;

      // Step 1: Publish JD extraction event
      const jdEvent: JobJdSubmittedEvent = {
        jobId: virtualJobId,
        jobTitle: 'Analysis Session Job',
        jdText,
        timestamp,
      };

      this.logger.log(`📤 Publishing JD extraction event for job: ${virtualJobId}`);
      const jdPublishResult = await this.natsClient.publishJobJdSubmitted(jdEvent);

      if (!jdPublishResult.success) {
        throw new Error(`Failed to publish JD event: ${jdPublishResult.error}`);
      }

      this.logger.log(`✅ JD extraction event published: ${jdPublishResult.messageId}`);

      // Step 2: Publish resume processing event
      const resumeId = this.generateResumeId();
      const resumeEvent: ResumeSubmittedEvent = {
        jobId: virtualJobId,
        resumeId,
        originalFilename: resumeFile.originalname,
        tempGridFsUrl: `analysis://session/${analysisId}/${resumeId}`,
      };

      this.logger.log(`📤 Publishing resume processing event for resume: ${resumeId}`);
      const resumePublishResult = await this.natsClient.publishResumeSubmitted(resumeEvent);

      if (!resumePublishResult.success) {
        throw new Error(`Failed to publish resume event: ${resumePublishResult.error}`);
      }

      this.logger.log(`✅ Resume processing event published: ${resumePublishResult.messageId}`);

      // Return analysis initiation response
      const response: AnalysisInitiatedResponseDto = {
        analysisId,
        status: 'processing',
        message: 'Analysis pipeline initiated successfully. JD extraction and resume parsing events have been published.',
        estimatedProcessingTime: 30, // 30 seconds estimate
        processingSteps: [
          'jd_extraction',
          'resume_parsing', 
          'skill_matching',
          'scoring_analysis',
          'report_generation',
        ],
        timestamp,
      };

      this.logger.log(`🎯 Analysis pipeline initiated successfully: ${analysisId}`);
      return response;

    } catch (error) {
      this.logger.error(`❌ Failed to initiate analysis pipeline: ${analysisId}`, error);
      throw new Error(`Analysis pipeline failed: ${error.message}`);
    }
  }

  private generateAnalysisId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `analysis_${timestamp}_${random}`;
  }

  private generateResumeId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `resume_${timestamp}_${random}`;
  }
}