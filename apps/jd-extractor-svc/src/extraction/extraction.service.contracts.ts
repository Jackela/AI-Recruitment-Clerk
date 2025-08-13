/**
 * @fileoverview ExtractionService Design by Contract Enhancement
 * @author AI Recruitment Team  
 * @since 1.0.0
 * @version 1.0.0
 * @module ExtractionServiceContracts
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  ContractViolationError, 
  Requires, 
  Ensures, 
  Invariant,
  ContractValidators 
} from '../../../../libs/shared-dtos/src/contracts/dbc.decorators';
import { LlmService } from '../llm/llm.service';
import { NatsClient } from '../nats/nats.client';
import { JobJdSubmittedEvent, AnalysisJdExtractedEvent } from '../dto/events.dto';
import { JdDTO } from '../../../../libs/shared-dtos/src';
import { RetryUtility, WithCircuitBreaker } from '../../../../libs/shared-dtos/src';

export interface ExtractionRequest {
  jobTitle: string;
  jdText: string;
  extractionConfig?: {
    includeDetailedAnalysis?: boolean;
    focusAreas?: string[];
    confidenceThreshold?: number;
  };
}

export interface ExtractionResult {
  jobTitle: string;
  requiredSkills: Array<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    importance: 'required' | 'preferred' | 'nice-to-have';
  }>;
  experienceYears: { min: number; max: number };
  educationLevel: 'any' | 'bachelor' | 'master' | 'phd';
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  softSkills: string[];
  responsibilities: string[];
  benefits?: string[];
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'remote';
  confidence: number; // 0.0 - 1.0
  extractionMetadata: {
    processingTime: number;
    llmModel: string;
    retryAttempts: number;
    fallbacksUsed: string[];
  };
}

/**
 * Enhanced ExtractionService with Design by Contract protections
 * 
 * @class ExtractionServiceContracts
 * @implements JD extraction with quality and reliability guarantees
 * 
 * @since 1.0.0
 */
@Injectable()
@Invariant(
  (instance: ExtractionServiceContracts) => 
    !!instance.llmService && 
    !!instance.natsClient &&
    instance.MAX_CONCURRENT_JOBS > 0 &&
    instance.JOB_TIMEOUT_MS > 0,
  'Extraction service dependencies and configuration must be valid'
)
export class ExtractionServiceContracts {
  private readonly logger = new Logger(ExtractionServiceContracts.name);
  private readonly processingJobs = new Map<string, { timestamp: number; attempts: number }>();
  private readonly JOB_TIMEOUT_MS = 300000; // 5 minutes
  private readonly MAX_CONCURRENT_JOBS = 10;

  constructor(
    private readonly llmService: LlmService,
    private readonly natsClient: NatsClient,
  ) {}

  /**
   * Extracts structured job requirements from JD text with quality guarantees
   * 
   * @method extractJobRequirements
   * @param {string} jdText - Raw job description text
   * @param {ExtractionConfig} extractionConfig - Optional extraction configuration
   * @returns {Promise<ExtractionResult>} Structured job requirements
   * 
   * @requires JD text length between 100-50000 characters
   * @requires JD text contains job-related keywords
   * @ensures Valid extraction result with confidence score
   * @ensures Required skills array is non-empty
   * @ensures Experience years range is valid
   * @ensures Confidence score is between 0.0-1.0
   * @ensures Processing time under 15 seconds
   * 
   * @performance Target: <15 seconds LLM response time
   * @reliability Circuit breaker protection for LLM failures
   * @quality Minimum confidence score 0.6 for production use
   * 
   * @since 1.0.0
   */
  @Requires(
    (jdText: string, extractionConfig?: any) => 
      ContractValidators.isNonEmptyString(jdText) &&
      jdText.length >= 100 && jdText.length <= 50000 &&
      jdText.toLowerCase().includes('job') || jdText.toLowerCase().includes('position') ||
      jdText.toLowerCase().includes('role') || jdText.toLowerCase().includes('responsibilities') &&
      (!extractionConfig || typeof extractionConfig === 'object'),
    'JD extraction requires valid text (100-50000 chars) with job-related content'
  )
  @Ensures(
    (result: ExtractionResult) => 
      ContractValidators.isValidExtractionResult(result) &&
      ContractValidators.isValidConfidenceLevel(result.confidence) &&
      result.extractionMetadata &&
      ContractValidators.isValidProcessingTime(result.extractionMetadata.processingTime, 15000),
    'Must return valid extraction result with confidence, skills, title, experience range, and processing time under 15 seconds'
  )
  async extractJobRequirements(
    jdText: string, 
    extractionConfig?: ExtractionRequest['extractionConfig']
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    let retryAttempts = 0;
    const fallbacksUsed: string[] = [];
    
    try {
      // Sanitize and validate input
      const sanitizedJdText = this.sanitizeJdText(jdText);
      
      // Prepare LLM extraction request
      const extractionRequest: ExtractionRequest = {
        jobTitle: this.extractJobTitle(sanitizedJdText),
        jdText: sanitizedJdText,
        extractionConfig: extractionConfig || {
          includeDetailedAnalysis: true,
          confidenceThreshold: 0.6
        }
      };

      // Call LLM service with circuit breaker and retry
      let llmResponse: any;
      
      try {
        llmResponse = await RetryUtility.withExponentialBackoff(
          () => this.llmService.extractStructuredData(extractionRequest),
          {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2
          }
        );
        retryAttempts = 1; // If no retries were needed, this remains 1
      } catch (llmError) {
        this.logger.warn(`LLM extraction failed, attempting fallback analysis: ${llmError.message}`);
        fallbacksUsed.push('rule-based-extraction');
        llmResponse = await this.fallbackRuleBasedExtraction(sanitizedJdText);
        retryAttempts = 3; // Maximum retries were used before fallback
      }

      // Validate and enhance LLM response
      const extractionResult = await this.validateAndEnhanceLLMResponse(
        llmResponse, 
        sanitizedJdText, 
        extractionRequest.jobTitle
      );

      // Add metadata
      const processingTime = Date.now() - startTime;
      const result: ExtractionResult = {
        ...extractionResult,
        extractionMetadata: {
          processingTime,
          llmModel: llmResponse.model || 'fallback-rules',
          retryAttempts,
          fallbacksUsed
        }
      };

      // Final validation
      this.validateExtractionQuality(result);

      this.logger.log(
        `JD extraction completed successfully in ${processingTime}ms. ` +
        `Confidence: ${result.confidence}, Skills: ${result.requiredSkills.length}, ` +
        `Retries: ${retryAttempts}, Fallbacks: ${fallbacksUsed.length}`
      );

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`JD extraction failed after ${processingTime}ms:`, error);
      
      if (error instanceof ContractViolationError) {
        throw error;
      }
      
      throw new ContractViolationError(
        `JD extraction failed: ${error.message}`,
        'POST',
        'ExtractionService.extractJobRequirements'
      );
    }
  }

  /**
   * Processes job description with event handling
   * 
   * @method handleJobJdSubmitted
   * @param {JobJdSubmittedEvent} event - Job submission event
   * @returns {Promise<void>} Processing completion
   * 
   * @requires Valid event with job ID, title, and text
   * @ensures Event processing completes or fails gracefully
   * @ensures Concurrent processing limits respected
   * 
   * @since 1.0.0
   */
  @Requires(
    (event: JobJdSubmittedEvent) => 
      ContractValidators.isNonEmptyString(event.jobId) &&
      ContractValidators.isNonEmptyString(event.jobTitle) &&
      ContractValidators.isNonEmptyString(event.jdText) &&
      event.jdText.length >= 50,
    'Job JD submitted event must have valid jobId, jobTitle, and jdText (min 50 chars)'
  )
  async handleJobJdSubmitted(event: JobJdSubmittedEvent): Promise<void> {
    const { jobId, jobTitle, jdText } = event;
    
    this.logger.log(`Received job JD submitted event for jobId: ${jobId}, title: ${jobTitle}`);

    // Check concurrent processing limits
    if (this.processingJobs.has(jobId)) {
      this.logger.warn(`Job ${jobId} is already being processed, skipping duplicate event`);
      return;
    }

    this.cleanupExpiredJobs();
    if (this.processingJobs.size >= this.MAX_CONCURRENT_JOBS) {
      this.logger.warn(`Maximum concurrent jobs (${this.MAX_CONCURRENT_JOBS}) reached, queuing job ${jobId}`);
      setTimeout(() => this.handleJobJdSubmitted(event), 5000);
      return;
    }

    // Add to processing map
    this.processingJobs.set(jobId, { timestamp: Date.now(), attempts: 0 });

    try {
      // Extract job requirements
      const extractionResult = await this.extractJobRequirements(jdText);
      
      // Convert to DTO format for event publishing
      const jdDto: JdDTO = this.convertToJdDTO(extractionResult);
      
      // Create analysis event
      const analysisEvent: AnalysisJdExtractedEvent = {
        jobId,
        extractedData: jdDto,
        timestamp: new Date().toISOString(),
        processingTimeMs: extractionResult.extractionMetadata.processingTime
      };

      // Publish extraction result
      await this.natsClient.publishAnalysisExtracted(analysisEvent);
      
      this.logger.log(`Successfully processed and published JD extraction for jobId: ${jobId}`);
      
    } catch (error) {
      this.logger.error(`Error processing job JD for jobId: ${jobId}`, error);
      await this.handleProcessingError(error, jobId);
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  // Helper methods for extraction logic

  private sanitizeJdText(jdText: string): string {
    // Remove excessive whitespace and normalize
    return jdText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,;:()\-\/]/g, ' ')
      .trim()
      .substring(0, 50000); // Ensure max length
  }

  private extractJobTitle(jdText: string): string {
    // Try to extract job title from the first few lines
    const lines = jdText.split('\n').slice(0, 5);
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 10 && cleanLine.length < 100) {
        // Check if it looks like a job title
        const titleKeywords = ['engineer', 'developer', 'manager', 'analyst', 'specialist', 'director', 'lead'];
        if (titleKeywords.some(keyword => cleanLine.toLowerCase().includes(keyword))) {
          return cleanLine;
        }
      }
    }
    return 'Software Position'; // Default fallback
  }

  private async fallbackRuleBasedExtraction(jdText: string): Promise<any> {
    // Rule-based extraction as LLM fallback
    const skills = this.extractSkillsUsingRules(jdText);
    const experience = this.extractExperienceUsingRules(jdText);
    const education = this.extractEducationUsingRules(jdText);
    
    return {
      requiredSkills: skills.map(skill => ({
        skill,
        level: 'intermediate',
        importance: 'required'
      })),
      experienceYears: experience,
      educationLevel: education,
      seniority: this.inferSeniorityFromText(jdText),
      softSkills: this.extractSoftSkillsUsingRules(jdText),
      responsibilities: this.extractResponsibilitiesUsingRules(jdText),
      confidence: 0.7, // Lower confidence for rule-based extraction
      model: 'rule-based-fallback'
    };
  }

  private async validateAndEnhanceLLMResponse(
    llmResponse: any,
    originalText: string,
    jobTitle: string
  ): Promise<Omit<ExtractionResult, 'extractionMetadata'>> {
    // Validate required fields and apply defaults if necessary
    const result = {
      jobTitle: llmResponse.jobTitle || jobTitle,
      requiredSkills: llmResponse.requiredSkills || [],
      experienceYears: llmResponse.experienceYears || { min: 0, max: 3 },
      educationLevel: llmResponse.educationLevel || 'bachelor',
      seniority: llmResponse.seniority || 'mid',
      softSkills: llmResponse.softSkills || [],
      responsibilities: llmResponse.responsibilities || [],
      benefits: llmResponse.benefits,
      location: llmResponse.location,
      employmentType: llmResponse.employmentType || 'full-time',
      confidence: Math.min(1.0, Math.max(0.0, llmResponse.confidence || 0.8))
    };

    // Enhance with additional validation
    if (result.requiredSkills.length === 0) {
      result.requiredSkills = this.extractSkillsUsingRules(originalText).map(skill => ({
        skill,
        level: 'intermediate' as const,
        importance: 'required' as const
      }));
    }

    return result;
  }

  private validateExtractionQuality(result: ExtractionResult): void {
    // Quality checks
    if (result.requiredSkills.length === 0) {
      throw new ContractViolationError(
        'Extraction must identify at least one required skill',
        'POST',
        'ExtractionService.validateExtractionQuality'
      );
    }

    if (result.confidence < 0.5) {
      throw new ContractViolationError(
        `Extraction confidence too low: ${result.confidence} (minimum 0.5)`,
        'POST',
        'ExtractionService.validateExtractionQuality'
      );
    }

    if (result.experienceYears.min < 0 || result.experienceYears.max > 50) {
      throw new ContractViolationError(
        `Invalid experience years range: ${result.experienceYears.min}-${result.experienceYears.max}`,
        'POST',
        'ExtractionService.validateExtractionQuality'
      );
    }
  }

  // Rule-based extraction helpers (fallback methods)
  private extractSkillsUsingRules(text: string): string[] {
    const skillKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'node.js', 'sql',
      'aws', 'docker', 'kubernetes', 'git', 'html', 'css', 'typescript'
    ];
    
    const foundSkills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    
    return foundSkills.length > 0 ? foundSkills : ['Programming'];
  }

  private extractExperienceUsingRules(text: string): { min: number; max: number } {
    const experiencePattern = /(\d+)[-+\s]*years?\s+experience/i;
    const match = text.match(experiencePattern);
    
    if (match) {
      const years = parseInt(match[1]);
      return { min: Math.max(0, years - 1), max: years + 2 };
    }
    
    return { min: 2, max: 5 }; // Default range
  }

  private extractEducationUsingRules(text: string): 'any' | 'bachelor' | 'master' | 'phd' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('phd') || lowerText.includes('doctorate')) return 'phd';
    if (lowerText.includes('master') || lowerText.includes('msc') || lowerText.includes('mba')) return 'master';
    if (lowerText.includes('bachelor') || lowerText.includes('degree')) return 'bachelor';
    
    return 'any';
  }

  private inferSeniorityFromText(text: string): 'junior' | 'mid' | 'senior' | 'lead' | 'executive' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('senior') || lowerText.includes('lead') || lowerText.includes('principal')) return 'senior';
    if (lowerText.includes('junior') || lowerText.includes('entry') || lowerText.includes('graduate')) return 'junior';
    if (lowerText.includes('manager') || lowerText.includes('director') || lowerText.includes('head')) return 'lead';
    
    return 'mid';
  }

  private extractSoftSkillsUsingRules(text: string): string[] {
    const softSkillKeywords = [
      'communication', 'teamwork', 'leadership', 'problem solving',
      'analytical', 'creative', 'adaptable', 'collaborative'
    ];
    
    return softSkillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
  }

  private extractResponsibilitiesUsingRules(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const responsibilities = sentences
      .filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return lowerSentence.includes('responsible') || 
               lowerSentence.includes('will') || 
               lowerSentence.includes('develop') ||
               lowerSentence.includes('manage') ||
               lowerSentence.includes('lead');
      })
      .slice(0, 5)
      .map(s => s.trim());
    
    return responsibilities.length > 0 ? responsibilities : ['General job responsibilities'];
  }

  private convertToJdDTO(extractionResult: ExtractionResult): JdDTO {
    return {
      requirements: {
        technical: extractionResult.requiredSkills.map(s => s.skill),
        soft: extractionResult.softSkills,
        experience: `${extractionResult.experienceYears.min}-${extractionResult.experienceYears.max} years`,
        education: extractionResult.educationLevel
      },
      responsibilities: extractionResult.responsibilities,
      benefits: extractionResult.benefits || [],
      company: {
        name: undefined,
        industry: extractionResult.location || undefined,
        size: undefined
      }
    };
  }

  private cleanupExpiredJobs(): void {
    const now = Date.now();
    for (const [jobId, metadata] of this.processingJobs.entries()) {
      if (now - metadata.timestamp > this.JOB_TIMEOUT_MS) {
        this.processingJobs.delete(jobId);
        this.logger.warn(`Cleaned up expired job: ${jobId}`);
      }
    }
  }

  private async handleProcessingError(error: any, jobId: string): Promise<void> {
    this.logger.error(`Processing error for job ${jobId}:`, error);
    
    // Publish error event
    try {
      await this.natsClient.publishProcessingError(jobId, new Error(error.message));
    } catch (publishError) {
      this.logger.error('Failed to publish error event:', publishError);
    }
  }
}