import { Injectable, Logger } from '@nestjs/common';
import type { FieldMappingResult } from '../dto/resume-parsing.dto';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import { DateParser } from './date-parser';
import { ExperienceCalculator } from './experience-calculator';
import {
  ContactFieldMapper,
  DateRangeExtractor,
  EducationFieldMapper,
  ExperienceFieldMapper,
  ResumeDataValidator,
  SkillsFieldMapper,
} from './field-mapping.helpers';

/**
 * Provides field mapper functionality.
 */
@Injectable()
export class FieldMapperService {
  private readonly logger = new Logger(FieldMapperService.name);
  private readonly contactMapper = new ContactFieldMapper();
  private readonly experienceMapper = new ExperienceFieldMapper();
  private readonly educationMapper = new EducationFieldMapper();
  private readonly skillsMapper = new SkillsFieldMapper();
  private readonly validator = new ResumeDataValidator();
  private readonly dateRangeExtractor = new DateRangeExtractor();

  /**
   * Performs the normalize to resume dto operation.
   * @param rawLlmOutput - The raw llm output.
   * @returns A promise that resolves to ResumeDTO.
   */
  public async normalizeToResumeDto(
    rawLlmOutput: Record<string, unknown>,
  ): Promise<ResumeDTO> {
    try {
      this.logger.debug(
        'Starting normalization of raw LLM output to ResumeDTO',
      );

      if (!rawLlmOutput || typeof rawLlmOutput !== 'object') {
        throw new Error('Invalid raw LLM output: must be an object');
      }

      const contactInfo = await this.mapContactInfo(
        (rawLlmOutput.contactInfo as Record<string, unknown>) || {},
      );
      const skills = await this.normalizeSkills(
        (rawLlmOutput.skills as unknown[]) || [],
      );
      const workExperience = await this.mapWorkExperience(
        (rawLlmOutput.workExperience as Record<string, unknown>[]) || [],
      );
      const education = await this.mapEducation(
        (rawLlmOutput.education as Record<string, unknown>[]) || [],
      );

      this.logger.debug('Successfully normalized raw LLM output to ResumeDTO');

      return {
        contactInfo,
        skills,
        workExperience,
        education,
      };
    } catch (error) {
      this.logger.error('Failed to normalize raw LLM output', error);
      throw new Error(`Normalization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Performs the normalize with validation operation.
   * @param rawLlmOutput - The raw llm output.
   * @returns A promise that resolves to FieldMappingResult.
   */
  public async normalizeWithValidation(
    rawLlmOutput: Record<string, unknown>,
  ): Promise<FieldMappingResult> {
    try {
      this.logger.debug('Starting normalization with validation');

      const resumeDto = await this.normalizeToResumeDto(rawLlmOutput);
      const validationErrors = await this.validateResumeData(resumeDto);
      const mappingConfidence = this.validator.calculateConfidence(
        resumeDto,
        validationErrors,
      );

      this.logger.debug(
        `Normalization with validation completed. Confidence: ${mappingConfidence}, Errors: ${validationErrors.length}`,
      );

      return {
        resumeDto,
        validationErrors,
        mappingConfidence,
      };
    } catch (error) {
      this.logger.error('Failed to normalize with validation', error);
      throw new Error(
        `Normalization with validation failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Validates resume data.
   * @param resumeDto - The resume dto.
   * @returns A promise that resolves to an array of string value.
   */
  public async validateResumeData(resumeDto: ResumeDTO): Promise<string[]> {
    try {
      const errors = this.validator.validate(resumeDto);
      this.logger.debug(`Validation completed with ${errors.length} errors`);
      return errors;
    } catch (error) {
      this.logger.error('Error during validation', error);
      return [`Validation error: ${(error as Error).message}`];
    }
  }

  /**
   * Maps contact info.
   * @param rawContactInfo - The raw contact info.
   * @returns A promise that resolves to ResumeDTO['contactInfo'].
   */
  public async mapContactInfo(
    rawContactInfo: Record<string, unknown>,
  ): Promise<ResumeDTO['contactInfo']> {
    try {
      return this.contactMapper.map(rawContactInfo);
    } catch (error) {
      this.logger.error('Failed to map contact info', error);
      return { name: null, email: null, phone: null };
    }
  }

  /**
   * Maps work experience.
   * @param rawWorkExperience - The raw work experience.
   * @returns A promise that resolves to ResumeDTO['workExperience'].
   */
  public async mapWorkExperience(
    rawWorkExperience: Record<string, unknown>[],
  ): Promise<ResumeDTO['workExperience']> {
    try {
      if (!Array.isArray(rawWorkExperience)) {
        this.logger.warn(
          'Raw work experience is not an array, returning empty array',
        );
      }

      return await this.experienceMapper.map(rawWorkExperience, (dateString) =>
        this.normalizeDates(dateString),
      );
    } catch (error) {
      this.logger.error('Failed to map work experience', error);
      return [];
    }
  }

  /**
   * Maps education.
   * @param rawEducation - The raw education.
   * @returns A promise that resolves to ResumeDTO['education'].
   */
  public async mapEducation(
    rawEducation: Record<string, unknown>[],
  ): Promise<ResumeDTO['education']> {
    try {
      if (!Array.isArray(rawEducation)) {
        this.logger.warn(
          'Raw education is not an array, returning empty array',
        );
      }

      return this.educationMapper.map(rawEducation);
    } catch (error) {
      this.logger.error('Failed to map education', error);
      return [];
    }
  }

  /**
   * Performs the normalize skills operation.
   * @param rawSkills - The raw skills.
   * @returns A promise that resolves to an array of string value.
   */
  public async normalizeSkills(rawSkills: unknown[]): Promise<string[]> {
    try {
      const normalizedSkills = this.skillsMapper.normalize(rawSkills);
      this.logger.debug(
        `Normalized ${Array.isArray(rawSkills) ? rawSkills.length : 0} raw skills to ${normalizedSkills.length} normalized skills`,
      );
      return normalizedSkills;
    } catch (error) {
      this.logger.error('Failed to normalize skills', error);
      return [];
    }
  }

  /**
   * Performs the normalize dates operation.
   * @param dateString - The date string.
   * @returns A promise that resolves to string value.
   */
  public async normalizeDates(dateString: string): Promise<string> {
    try {
      if (!dateString || typeof dateString !== 'string') {
        return '';
      }

      const trimmed = dateString.trim();
      if (trimmed.length === 0) {
        return '';
      }

      return DateParser.normalizeToISO(trimmed);
    } catch (error) {
      this.logger.error(`Failed to normalize date: ${dateString}`, error);
      return '';
    }
  }

  /**
   * Calculate experience from work history.
   */
  public async calculateExperience(
    workExperience: ResumeDTO['workExperience'],
    targetSkills?: string[],
  ): Promise<{
    totalYears: number;
    relevantYears: number;
    seniorityLevel: string;
    confidenceScore: number;
  }> {
    try {
      const analysis = ExperienceCalculator.analyzeExperience(
        workExperience,
        targetSkills,
      );

      return {
        totalYears: analysis.totalExperienceYears,
        relevantYears: analysis.relevantExperienceYears,
        seniorityLevel: analysis.seniorityLevel,
        confidenceScore: analysis.confidenceScore,
      };
    } catch (error) {
      this.logger.error('Failed to calculate experience', error);
      return {
        totalYears: 0,
        relevantYears: 0,
        seniorityLevel: 'Entry',
        confidenceScore: 0,
      };
    }
  }

  /**
   * Extract dates from various formats.
   */
  public async extractDates(
    text: string,
  ): Promise<{ startDate: string; endDate: string; confidence: number }[]> {
    try {
      return await this.dateRangeExtractor.extract(text, (dateString) =>
        this.normalizeDates(dateString),
      );
    } catch (error) {
      this.logger.error('Failed to extract dates', error);
      return [];
    }
  }
}
