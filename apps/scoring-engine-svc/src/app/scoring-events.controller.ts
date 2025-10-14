import { Controller, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import type {
  AnalysisJdExtractedEvent,
  JdDTO as ExtractedJdDTO,
} from '@ai-recruitment-clerk/job-management-domain';
import type {
  AnalysisResumeParsedEvent,
  ResumeDTO,
} from '@ai-recruitment-clerk/resume-processing-domain';
import {
  ScoringEngineException,
  ScoringEngineErrorCode,
  ErrorCorrelationManager,
} from '@app/shared-dtos';
import { ScoringEngineNatsService } from '../services/scoring-engine-nats.service';
import { ScoringEngineService, JdDTO } from '../scoring.service';

/**
 * Exposes endpoints for scoring events.
 */
@Controller()
export class ScoringEventsController implements OnModuleInit {
  private readonly logger = new Logger(ScoringEventsController.name);

  /**
   * Initializes a new instance of the Scoring Events Controller.
   * @param natsService - The nats service.
   * @param scoringEngine - The scoring engine.
   */
  constructor(
    @Optional()
    private readonly natsService?: ScoringEngineNatsService,
    @Optional()
    private readonly scoringEngine?: ScoringEngineService,
  ) {}

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  async onModuleInit() {
    // Subscribe to analysis events using the shared NATS service
    if (!this.natsService) return;
    await this.natsService.subscribeToJdExtracted(
      this.handleJdExtracted.bind(this),
    );
    await this.natsService.subscribeToResumeParsed(
      this.handleResumeParsed.bind(this),
    );
  }

  /**
   * Handles jd extracted.
   * @param payload - The payload.
   * @returns A promise that resolves when the operation completes.
   */
  @EventPattern('analysis.jd.extracted')
  async handleJdExtracted(payload: AnalysisJdExtractedEvent): Promise<void> {
    try {
      this.logger.log(
        `[SCORING-ENGINE] Processing analysis.jd.extracted event for jobId: ${payload.jobId}`,
      );

      // Validate payload with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();

      if (!payload.jobId || !payload.extractedData) {
        throw new ScoringEngineException(
          ScoringEngineErrorCode.INSUFFICIENT_DATA,
          {
            provided: {
              jobId: !!payload.jobId,
              extractedData: !!payload.extractedData,
            },
            correlationId: correlationContext?.traceId,
          },
        );
      }

      // Convert extracted JD to scoring engine JD format
      const scoringJdDto = this.convertToScoringJdDTO(payload.extractedData);

      // Use the scoring engine service to handle JD extracted event
      this.scoringEngine?.handleJdExtractedEvent({
        jobId: payload.jobId,
        jdDto: scoringJdDto,
      });

      this.logger.log(
        `[SCORING-ENGINE] Successfully processed JD data for jobId: ${payload.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SCORING-ENGINE] Error processing analysis.jd.extracted for jobId: ${payload.jobId}:`,
        error,
      );
      throw error; // Let global exception filter handle it
    }
  }

  /**
   * Handles resume parsed.
   * @param payload - The payload.
   * @returns A promise that resolves when the operation completes.
   */
  @EventPattern('analysis.resume.parsed')
  async handleResumeParsed(payload: AnalysisResumeParsedEvent): Promise<void> {
    try {
      this.logger.log(
        `[SCORING-ENGINE] Processing analysis.resume.parsed event for resumeId: ${payload.resumeId}`,
      );

      // Validate payload with correlation context
      const correlationContext = ErrorCorrelationManager.getContext();

      if (!payload.jobId || !payload.resumeId || !payload.resumeDto) {
        throw new ScoringEngineException(
          ScoringEngineErrorCode.INSUFFICIENT_DATA,
          {
            provided: {
              jobId: !!payload.jobId,
              resumeId: !!payload.resumeId,
              resumeDto: !!payload.resumeDto,
            },
            correlationId: correlationContext?.traceId,
          },
        );
      }

      // Use the enhanced scoring engine service to handle resume parsed event
      await this.scoringEngine?.handleResumeParsedEvent({
        jobId: payload.jobId,
        resumeId: payload.resumeId,
        resumeDto: payload.resumeDto as ResumeDTO,
      });

      this.logger.log(
        `[SCORING-ENGINE] Successfully processed enhanced scoring for resumeId: ${payload.resumeId}`,
      );
    } catch (error) {
      this.logger.error(
        `[SCORING-ENGINE] Error processing analysis.resume.parsed for resumeId: ${payload.resumeId}:`,
        error,
      );

      // Publish error event using the shared NATS service
      await this.natsService?.publishScoringError(
        payload.jobId,
        payload.resumeId,
        error as Error,
        {
          stage: 'resume-scoring',
          retryAttempt: 1,
        },
      );
      throw error; // Let global exception filter handle it
    }
  }

  /**
   * Convert extracted JD format to scoring engine JD format
   */
  private convertToScoringJdDTO(extractedData: ExtractedJdDTO): JdDTO {
    return {
      requiredSkills:
        extractedData.requirements?.technical?.map((skill) => ({
          name: skill,
          weight: 1.0,
          required: true,
          category: 'technical',
        })) || [],
      experienceYears: this.parseExperienceYears(
        extractedData.requirements?.experience || '',
      ),
      educationLevel: this.parseEducationLevel(
        extractedData.requirements?.education || '',
      ),
      softSkills: extractedData.requirements?.soft || [],
      seniority: this.parseSeniority(
        extractedData.requirements?.experience || '',
      ),
      industryContext: extractedData.company?.industry,
      companyProfile: {
        size: this.parseCompanySize(extractedData.company?.size || 'medium'),
        culture: {
          values: ['innovation', 'teamwork'],
          workStyle: 'hybrid' as const,
          decisionMaking: 'collaborative' as const,
          innovation: 'high' as const,
          growthStage: 'growth' as const,
        },
        teamStructure: {
          teamSize: 10,
          managementLayers: 2,
          collaborationStyle: 'cross-functional' as const,
        },
      },
    };
  }

  private parseExperienceYears(experience: string): {
    min: number;
    max: number;
  } {
    // Extract numbers from experience string like "3-5 years", "5+ years", etc.
    const matches = experience.match(/(\d+)[-+\s]*(\d*)/);
    if (matches) {
      const min = parseInt(matches[1]) || 0;
      const max = matches[2] ? parseInt(matches[2]) : min + 2;
      return { min, max };
    }
    return { min: 0, max: 10 }; // Default
  }

  private parseEducationLevel(
    education: string,
  ): 'bachelor' | 'master' | 'phd' | 'any' {
    const lowerEducation = education.toLowerCase();
    if (lowerEducation.includes('phd') || lowerEducation.includes('doctorate'))
      return 'phd';
    if (lowerEducation.includes('master')) return 'master';
    if (lowerEducation.includes('bachelor')) return 'bachelor';
    return 'any';
  }

  private parseSeniority(
    experience: string,
  ): 'junior' | 'mid' | 'senior' | 'lead' | 'executive' {
    const lowerExp = experience.toLowerCase();
    if (lowerExp.includes('lead') || lowerExp.includes('principal'))
      return 'lead';
    if (
      lowerExp.includes('senior') ||
      lowerExp.includes('7+') ||
      lowerExp.includes('8+')
    )
      return 'senior';
    if (lowerExp.includes('junior') || lowerExp.includes('entry'))
      return 'junior';

    // Parse years
    const matches = experience.match(/(\d+)/);
    if (matches) {
      const years = parseInt(matches[1]);
      if (years >= 7) return 'senior';
      if (years >= 3) return 'mid';
      return 'junior';
    }

    return 'mid'; // Default
  }

  private parseCompanySize(size: string): 'startup' | 'scaleup' | 'enterprise' {
    const lowerSize = size.toLowerCase();
    if (lowerSize.includes('startup') || lowerSize.includes('small'))
      return 'startup';
    if (lowerSize.includes('enterprise') || lowerSize.includes('large'))
      return 'enterprise';
    return 'scaleup'; // Default for medium
  }
}
