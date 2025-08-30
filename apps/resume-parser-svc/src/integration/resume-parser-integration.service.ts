import { Injectable, Logger } from '@nestjs/common';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { FieldMappingResult, VisionLlmResponse } from '../dto/resume-parsing.dto';
import { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';

export interface ResumeParsingResult {
  resumeDto: ResumeDTO;
  validationErrors: string[];
  mappingConfidence: number;
  processingTimeMs: number;
  extractionConfidence: number;
  totalConfidence: number;
  qualityMetrics: {
    dataCompleteness: number;
    accuracyScore: number;
    consistencyScore: number;
    reliabilityScore: number;
  };
}

export interface ResumeParsingOptions {
  enableValidation?: boolean;
  enableExperienceCalculation?: boolean;
  targetSkills?: string[];
  qualityThreshold?: number;
  maxProcessingTime?: number;
}

@Injectable()
export class ResumeParserIntegrationService {
  private readonly logger = new Logger(ResumeParserIntegrationService.name);

  constructor(
    private readonly visionLlmService: VisionLlmService,
    private readonly fieldMapperService: FieldMapperService
  ) {}

  /**
   * Complete resume parsing pipeline: PDF → Vision LLM → Field Mapping → Validation
   */
  async parseResume(
    pdfBuffer: Buffer,
    filename: string,
    options: ResumeParsingOptions = {}
  ): Promise<ResumeParsingResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting complete resume parsing for: ${filename}`);
      
      // Set default options
      const opts = {
        enableValidation: true,
        enableExperienceCalculation: true,
        qualityThreshold: 0.7,
        maxProcessingTime: 30000, // 30 seconds
        ...options
      };

      // Step 1: Extract data using Vision LLM
      this.logger.debug('Step 1: Extracting data with Vision LLM');
      const visionResult = await this.extractWithVisionLLM(pdfBuffer, filename, opts);
      
      // Step 2: Normalize and map fields
      this.logger.debug('Step 2: Normalizing and mapping fields');
      const mappingResult = await this.normalizeFields(visionResult.extractedData, opts);
      
      // Step 3: Calculate experience if enabled
      let experienceMetrics;
      if (opts.enableExperienceCalculation) {
        this.logger.debug('Step 3: Calculating experience metrics');
        experienceMetrics = await this.fieldMapperService.calculateExperience(
          mappingResult.resumeDto.workExperience,
          opts.targetSkills
        );
      }

      // Step 4: Calculate quality metrics
      this.logger.debug('Step 4: Calculating quality metrics');
      const qualityMetrics = this.calculateQualityMetrics(
        mappingResult,
        visionResult,
        experienceMetrics
      );

      // Step 5: Calculate total confidence
      const totalConfidence = this.calculateTotalConfidence(
        mappingResult.mappingConfidence,
        visionResult.confidence,
        qualityMetrics
      );

      const processingTimeMs = Date.now() - startTime;

      // Step 6: Quality gate check
      if (totalConfidence < opts.qualityThreshold) {
        this.logger.warn(
          `Resume parsing quality below threshold: ${totalConfidence} < ${opts.qualityThreshold} for ${filename}`
        );
      }

      const result: ResumeParsingResult = {
        resumeDto: mappingResult.resumeDto,
        validationErrors: mappingResult.validationErrors,
        mappingConfidence: mappingResult.mappingConfidence,
        processingTimeMs,
        extractionConfidence: visionResult.confidence,
        totalConfidence,
        qualityMetrics
      };

      this.logger.log(
        `Resume parsing completed for ${filename}: ${processingTimeMs}ms, confidence: ${totalConfidence}`
      );

      return result;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      this.logger.error(`Resume parsing failed for ${filename} after ${processingTimeMs}ms`, error);
      
      // Return error result with basic structure
      return {
        resumeDto: {
          contactInfo: { name: null, email: null, phone: null },
          skills: [],
          workExperience: [],
          education: []
        },
        validationErrors: [`Processing failed: ${error.message}`],
        mappingConfidence: 0,
        processingTimeMs,
        extractionConfidence: 0,
        totalConfidence: 0,
        qualityMetrics: {
          dataCompleteness: 0,
          accuracyScore: 0,
          consistencyScore: 0,
          reliabilityScore: 0
        }
      };
    }
  }

  /**
   * Batch process multiple resumes
   */
  async parseResumesBatch(
    resumes: { pdfBuffer: Buffer; filename: string }[],
    options: ResumeParsingOptions = {}
  ): Promise<Array<{ filename: string; result: ResumeParsingResult; error?: string }>> {
    this.logger.log(`Starting batch processing of ${resumes.length} resumes`);
    
    const results = [];
    
    for (const resume of resumes) {
      try {
        const result = await this.parseResume(resume.pdfBuffer, resume.filename, options);
        results.push({ filename: resume.filename, result });
      } catch (error) {
        this.logger.error(`Batch processing failed for ${resume.filename}`, error);
        results.push({ 
          filename: resume.filename, 
          result: null as any,
          error: error.message 
        });
      }
    }

    this.logger.log(`Batch processing completed: ${results.length} results`);
    return results;
  }

  /**
   * Health check for the integrated pipeline
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    lastChecked: Date;
  }> {
    this.logger.debug('Performing health check');
    
    const components = {
      visionLlm: false,
      fieldMapper: true, // Always available as it's stateless
      integration: false
    };

    try {
      // Check Vision LLM service
      components.visionLlm = await this.visionLlmService.healthCheck();
      
      // Test integration with a minimal operation
      const testResult = await this.fieldMapperService.normalizeSkills(['JavaScript', 'Python']);
      components.integration = testResult.length > 0;

    } catch (error) {
      this.logger.error('Health check failed', error);
    }

    const healthyComponents = Object.values(components).filter(status => status).length;
    const totalComponents = Object.keys(components).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyComponents === totalComponents) {
      status = 'healthy';
    } else if (healthyComponents >= totalComponents / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      components,
      lastChecked: new Date()
    };
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    avgProcessingTime: number;
    avgConfidence: number;
    successRate: number;
    qualityDistribution: Record<string, number>;
  }> {
    // This would typically come from a metrics store
    // For now, return default values
    return {
      avgProcessingTime: 3500, // ms
      avgConfidence: 0.85,
      successRate: 0.95,
      qualityDistribution: {
        excellent: 0.3,
        good: 0.5,
        fair: 0.15,
        poor: 0.05
      }
    };
  }

  /**
   * Extract data using Vision LLM with retry logic
   */
  private async extractWithVisionLLM(
    pdfBuffer: Buffer,
    filename: string,
    options: ResumeParsingOptions
  ): Promise<VisionLlmResponse> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Vision LLM extraction attempt ${attempt}/${maxRetries}`);
        
        const request = {
          pdfBuffer,
          filename,
          options: {
            language: 'en',
            extractionPrompt: this.buildExtractionPrompt(options.targetSkills)
          }
        };

        const result = await this.visionLlmService.parseResumePdfAdvanced(request);
        
        if (result.confidence < 0.5) {
          this.logger.warn(`Low extraction confidence: ${result.confidence} for ${filename}`);
        }

        return result;

      } catch (error) {
        lastError = error;
        this.logger.warn(`Vision LLM attempt ${attempt} failed for ${filename}`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Vision LLM extraction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Normalize fields with validation
   */
  private async normalizeFields(
    rawData: any,
    options: ResumeParsingOptions
  ): Promise<FieldMappingResult> {
    if (options.enableValidation) {
      return await this.fieldMapperService.normalizeWithValidation(rawData);
    } else {
      const resumeDto = await this.fieldMapperService.normalizeToResumeDto(rawData);
      return {
        resumeDto,
        validationErrors: [],
        mappingConfidence: 1.0
      };
    }
  }

  /**
   * Calculate comprehensive quality metrics
   */
  private calculateQualityMetrics(
    mappingResult: FieldMappingResult,
    visionResult: VisionLlmResponse,
    experienceMetrics?: any
  ): ResumeParsingResult['qualityMetrics'] {
    const resume = mappingResult.resumeDto;
    
    // Data completeness (0-1)
    let completenessScore = 0;
    let totalFields = 0;
    
    // Contact info completeness
    totalFields += 3;
    if (resume.contactInfo.name) completenessScore += 1;
    if (resume.contactInfo.email) completenessScore += 1;
    if (resume.contactInfo.phone) completenessScore += 1;
    
    // Skills completeness
    totalFields += 1;
    if (resume.skills.length > 0) completenessScore += 1;
    
    // Work experience completeness
    totalFields += 1;
    if (resume.workExperience.length > 0) completenessScore += 1;
    
    // Education completeness
    totalFields += 1;
    if (resume.education.length > 0) completenessScore += 1;

    const dataCompleteness = completenessScore / totalFields;

    // Accuracy score based on validation errors and confidence
    const accuracyScore = Math.max(0, 1 - (mappingResult.validationErrors.length * 0.1));

    // Consistency score based on data formatting and structure
    let consistencyScore = 1.0;
    
    // Check date consistency in work experience
    for (const exp of resume.workExperience) {
      if (exp.startDate && exp.endDate && exp.endDate !== 'present') {
        const startDate = new Date(exp.startDate);
        const endDate = new Date(exp.endDate);
        if (startDate > endDate) {
          consistencyScore -= 0.2;
        }
      }
    }

    // Reliability score based on processing time and confidence
    const reliabilityScore = Math.min(1.0, 
      (mappingResult.mappingConfidence * 0.5) + 
      (visionResult.confidence * 0.3) + 
      (visionResult.processingTimeMs < 10000 ? 0.2 : 0.1)
    );

    return {
      dataCompleteness: Math.max(0, Math.min(1, dataCompleteness)),
      accuracyScore: Math.max(0, Math.min(1, accuracyScore)),
      consistencyScore: Math.max(0, Math.min(1, consistencyScore)),
      reliabilityScore: Math.max(0, Math.min(1, reliabilityScore))
    };
  }

  /**
   * Calculate total confidence score
   */
  private calculateTotalConfidence(
    mappingConfidence: number,
    extractionConfidence: number,
    qualityMetrics: ResumeParsingResult['qualityMetrics']
  ): number {
    // Weighted average of different confidence sources
    const weights = {
      mapping: 0.3,
      extraction: 0.3,
      quality: 0.4
    };

    const qualityScore = (
      qualityMetrics.dataCompleteness * 0.3 +
      qualityMetrics.accuracyScore * 0.3 +
      qualityMetrics.consistencyScore * 0.2 +
      qualityMetrics.reliabilityScore * 0.2
    );

    const totalConfidence = 
      mappingConfidence * weights.mapping +
      extractionConfidence * weights.extraction +
      qualityScore * weights.quality;

    return Math.max(0, Math.min(1, totalConfidence));
  }

  /**
   * Build extraction prompt based on target skills
   */
  private buildExtractionPrompt(targetSkills?: string[]): string {
    let basePrompt = `
    Extract comprehensive information from this resume with high accuracy.
    Pay special attention to:
    - Complete contact information
    - All technical and soft skills
    - Detailed work experience with dates
    - Education background with degrees
    `;

    if (targetSkills && targetSkills.length > 0) {
      basePrompt += `
    
    Target Skills to prioritize: ${targetSkills.join(', ')}
    Look specifically for experience and proficiency with these skills.
    `;
    }

    return basePrompt.trim();
  }

  /**
   * Validate processing options
   */
  private validateOptions(options: ResumeParsingOptions): void {
    if (options.qualityThreshold !== undefined) {
      if (options.qualityThreshold < 0 || options.qualityThreshold > 1) {
        throw new Error('Quality threshold must be between 0 and 1');
      }
    }

    if (options.maxProcessingTime !== undefined) {
      if (options.maxProcessingTime < 1000 || options.maxProcessingTime > 60000) {
        throw new Error('Max processing time must be between 1000ms and 60000ms');
      }
    }

    if (options.targetSkills && options.targetSkills.length > 100) {
      throw new Error('Target skills list too large (max 100)');
    }
  }
}