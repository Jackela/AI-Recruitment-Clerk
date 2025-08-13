import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AnalysisJdExtractedEvent, AnalysisResumeParsedEvent, ResumeDTO, JdDTO as ExtractedJdDTO } from '../../../../libs/shared-dtos/src';
import { NatsClient } from '../nats/nats.client';
import { ScoringEngineService, JdDTO } from '../scoring.service';

@Controller()
export class ScoringEventsController implements OnModuleInit {
  private readonly logger = new Logger(ScoringEventsController.name);

  constructor(
    private readonly natsClient: NatsClient,
    private readonly scoringEngine: ScoringEngineService
  ) {}

  async onModuleInit() {
    // Subscribe to analysis events
    await this.natsClient.subscribe('analysis.jd.extracted', this.handleJdExtracted.bind(this), {
      durableName: 'scoring-engine-jd-extracted',
    });
    
    await this.natsClient.subscribe('analysis.resume.parsed', this.handleResumeParsed.bind(this), {
      durableName: 'scoring-engine-resume-parsed',
    });
  }

  @EventPattern('analysis.jd.extracted')
  async handleJdExtracted(payload: AnalysisJdExtractedEvent): Promise<void> {
    try {
      this.logger.log(`[SCORING-ENGINE] Processing analysis.jd.extracted event for jobId: ${payload.jobId}`);
      
      // Convert extracted JD to scoring engine JD format
      const scoringJdDto = this.convertToScoringJdDTO(payload.extractedData);
      
      // Use the scoring engine service to handle JD extracted event
      this.scoringEngine.handleJdExtractedEvent({
        jobId: payload.jobId,
        jdDto: scoringJdDto
      });
      
      this.logger.log(`[SCORING-ENGINE] Successfully processed JD data for jobId: ${payload.jobId}`);
      
    } catch (error) {
      this.logger.error(`[SCORING-ENGINE] Error processing analysis.jd.extracted for jobId: ${payload.jobId}:`, error);
    }
  }

  @EventPattern('analysis.resume.parsed')
  async handleResumeParsed(payload: AnalysisResumeParsedEvent): Promise<void> {
    try {
      this.logger.log(`[SCORING-ENGINE] Processing analysis.resume.parsed event for resumeId: ${payload.resumeId}`);
      
      // Use the enhanced scoring engine service to handle resume parsed event
      await this.scoringEngine.handleResumeParsedEvent({
        jobId: payload.jobId,
        resumeId: payload.resumeId,
        resumeDto: payload.resumeDto as ResumeDTO
      });
      
      this.logger.log(`[SCORING-ENGINE] Successfully processed enhanced scoring for resumeId: ${payload.resumeId}`);
      
    } catch (error) {
      this.logger.error(`[SCORING-ENGINE] Error processing analysis.resume.parsed for resumeId: ${payload.resumeId}:`, error);
      
      // Publish error event
      await this.natsClient.publishScoringError(payload.jobId, payload.resumeId, error as Error);
    }
  }

  /**
   * Convert extracted JD format to scoring engine JD format
   */
  private convertToScoringJdDTO(extractedData: ExtractedJdDTO): JdDTO {
    return {
      requiredSkills: extractedData.requirements?.technical?.map(skill => ({
        name: skill,
        weight: 1.0,
        required: true,
        category: 'technical'
      })) || [],
      experienceYears: this.parseExperienceYears(extractedData.requirements?.experience || ''),
      educationLevel: this.parseEducationLevel(extractedData.requirements?.education || ''),
      softSkills: extractedData.requirements?.soft || [],
      seniority: this.parseSeniority(extractedData.requirements?.experience || ''),
      industryContext: extractedData.company?.industry,
      companyProfile: {
        size: this.parseCompanySize(extractedData.company?.size || 'medium'),
        culture: {
          values: ['innovation', 'teamwork'],
          workStyle: 'hybrid' as const,
          decisionMaking: 'collaborative' as const,
          innovation: 'high' as const,
          growthStage: 'growth' as const
        },
        teamStructure: {
          teamSize: 10,
          managementLayers: 2,
          collaborationStyle: 'cross-functional' as const
        }
      }
    };
  }

  private parseExperienceYears(experience: string): { min: number; max: number } {
    // Extract numbers from experience string like "3-5 years", "5+ years", etc.
    const matches = experience.match(/(\d+)[-+\s]*(\d*)/);
    if (matches) {
      const min = parseInt(matches[1]) || 0;
      const max = matches[2] ? parseInt(matches[2]) : min + 2;
      return { min, max };
    }
    return { min: 0, max: 10 }; // Default
  }

  private parseEducationLevel(education: string): 'bachelor' | 'master' | 'phd' | 'any' {
    const lowerEducation = education.toLowerCase();
    if (lowerEducation.includes('phd') || lowerEducation.includes('doctorate')) return 'phd';
    if (lowerEducation.includes('master')) return 'master';
    if (lowerEducation.includes('bachelor')) return 'bachelor';
    return 'any';
  }

  private parseSeniority(experience: string): 'junior' | 'mid' | 'senior' | 'lead' | 'executive' {
    const lowerExp = experience.toLowerCase();
    if (lowerExp.includes('lead') || lowerExp.includes('principal')) return 'lead';
    if (lowerExp.includes('senior') || lowerExp.includes('7+') || lowerExp.includes('8+')) return 'senior';
    if (lowerExp.includes('junior') || lowerExp.includes('entry')) return 'junior';
    
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
    if (lowerSize.includes('startup') || lowerSize.includes('small')) return 'startup';
    if (lowerSize.includes('enterprise') || lowerSize.includes('large')) return 'enterprise';
    return 'scaleup'; // Default for medium
  }

}
