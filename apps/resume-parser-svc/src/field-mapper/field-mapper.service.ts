import { Injectable, Logger } from '@nestjs/common';
import { FieldMappingResult } from '../dto/resume-parsing.dto';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import { SkillsTaxonomy } from '@ai-recruitment-clerk/candidate-scoring-domain';
import { DateParser } from './date-parser';
import { ExperienceCalculator } from './experience-calculator';

/**
 * Provides field mapper functionality.
 */
@Injectable()
export class FieldMapperService {
  private readonly logger = new Logger(FieldMapperService.name);

  /**
   * Performs the normalize to resume dto operation.
   * @param rawLlmOutput - The raw llm output.
   * @returns A promise that resolves to ResumeDTO.
   */
  async normalizeToResumeDto(rawLlmOutput: any): Promise<ResumeDTO> {
    try {
      this.logger.debug(
        'Starting normalization of raw LLM output to ResumeDTO',
      );

      if (!rawLlmOutput || typeof rawLlmOutput !== 'object') {
        throw new Error('Invalid raw LLM output: must be an object');
      }

      // Normalize contact information
      const contactInfo = await this.mapContactInfo(
        rawLlmOutput.contactInfo || {},
      );

      // Normalize skills
      const skills = await this.normalizeSkills(rawLlmOutput.skills || []);

      // Normalize work experience
      const workExperience = await this.mapWorkExperience(
        rawLlmOutput.workExperience || [],
      );

      // Normalize education
      const education = await this.mapEducation(rawLlmOutput.education || []);

      const normalizedResume: ResumeDTO = {
        contactInfo,
        skills,
        workExperience,
        education,
      };

      this.logger.debug('Successfully normalized raw LLM output to ResumeDTO');
      return normalizedResume;
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
  async normalizeWithValidation(
    rawLlmOutput: any,
  ): Promise<FieldMappingResult> {
    try {
      this.logger.debug('Starting normalization with validation');

      // First, normalize the data
      const resumeDto = await this.normalizeToResumeDto(rawLlmOutput);

      // Then validate the normalized data
      const validationErrors = await this.validateResumeData(resumeDto);

      // Calculate mapping confidence based on data quality and validation results
      const mappingConfidence = this.calculateMappingConfidence(
        resumeDto,
        validationErrors,
        rawLlmOutput,
      );

      const result: FieldMappingResult = {
        resumeDto,
        validationErrors,
        mappingConfidence,
      };

      this.logger.debug(
        `Normalization with validation completed. Confidence: ${mappingConfidence}, Errors: ${validationErrors.length}`,
      );
      return result;
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
  async validateResumeData(resumeDto: ResumeDTO): Promise<string[]> {
    const errors: string[] = [];

    try {
      // Validate contact info
      if (!resumeDto.contactInfo) {
        errors.push('Contact information is missing');
      } else {
        if (
          !resumeDto.contactInfo.name ||
          resumeDto.contactInfo.name.trim().length === 0
        ) {
          errors.push('Contact name is missing or empty');
        }

        if (
          resumeDto.contactInfo.email &&
          !this.isValidEmail(resumeDto.contactInfo.email)
        ) {
          errors.push('Email format is invalid');
        }

        if (
          resumeDto.contactInfo.phone &&
          !this.isValidPhone(resumeDto.contactInfo.phone)
        ) {
          errors.push('Phone number format is invalid');
        }
      }

      // Validate skills
      if (!Array.isArray(resumeDto.skills)) {
        errors.push('Skills must be an array');
      } else if (resumeDto.skills.length === 0) {
        errors.push('No skills found in resume');
      } else {
        resumeDto.skills.forEach((skill, index) => {
          if (typeof skill !== 'string' || skill.trim().length === 0) {
            errors.push(`Skill at index ${index} is invalid or empty`);
          }
        });
      }

      // Validate work experience
      if (!Array.isArray(resumeDto.workExperience)) {
        errors.push('Work experience must be an array');
      } else {
        resumeDto.workExperience.forEach((exp, index) => {
          if (!exp.company || exp.company.trim().length === 0) {
            errors.push(`Work experience ${index}: Company name is missing`);
          }
          if (!exp.position || exp.position.trim().length === 0) {
            errors.push(`Work experience ${index}: Position title is missing`);
          }
          if (!exp.startDate || exp.startDate.trim().length === 0) {
            errors.push(`Work experience ${index}: Start date is missing`);
          }
          if (!exp.endDate || exp.endDate.trim().length === 0) {
            errors.push(`Work experience ${index}: End date is missing`);
          }

          // Validate date formats
          if (exp.startDate && exp.startDate !== 'present') {
            const startDateParsed = DateParser.parseDate(exp.startDate);
            if (!startDateParsed.date) {
              errors.push(
                `Work experience ${index}: Invalid start date format`,
              );
            }
          }

          if (exp.endDate && exp.endDate !== 'present') {
            const endDateParsed = DateParser.parseDate(exp.endDate);
            if (!endDateParsed.date) {
              errors.push(`Work experience ${index}: Invalid end date format`);
            }
          }
        });
      }

      // Validate education
      if (!Array.isArray(resumeDto.education)) {
        errors.push('Education must be an array');
      } else {
        resumeDto.education.forEach((edu, index) => {
          if (!edu.school || edu.school.trim().length === 0) {
            errors.push(`Education ${index}: School name is missing`);
          }
          if (!edu.degree || edu.degree.trim().length === 0) {
            errors.push(`Education ${index}: Degree is missing`);
          }
        });
      }

      this.logger.debug(`Validation completed with ${errors.length} errors`);
      return errors;
    } catch (error) {
      this.logger.error('Error during validation', error);
      errors.push(`Validation error: ${(error as Error).message}`);
      return errors;
    }
  }

  /**
   * Maps contact info.
   * @param rawContactInfo - The raw contact info.
   * @returns A promise that resolves to ResumeDTO['contactInfo'].
   */
  async mapContactInfo(rawContactInfo: any): Promise<ResumeDTO['contactInfo']> {
    try {
      if (!rawContactInfo || typeof rawContactInfo !== 'object') {
        return { name: null, email: null, phone: null };
      }

      // Normalize and validate name
      const name = this.normalizeName(rawContactInfo.name);

      // Normalize and validate email
      const email = this.normalizeEmail(rawContactInfo.email);

      // Normalize and validate phone
      const phone = this.normalizePhone(rawContactInfo.phone);

      return { name, email, phone };
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
  async mapWorkExperience(
    rawWorkExperience: any[],
  ): Promise<ResumeDTO['workExperience']> {
    try {
      if (!Array.isArray(rawWorkExperience)) {
        this.logger.warn(
          'Raw work experience is not an array, returning empty array',
        );
        return [];
      }

      const mappedExperience: ResumeDTO['workExperience'] = [];

      for (const rawExp of rawWorkExperience) {
        if (!rawExp || typeof rawExp !== 'object') {
          continue;
        }

        // Extract and normalize fields
        const company = this.normalizeString(rawExp.company);
        const position = this.normalizeString(rawExp.position);
        const summary = this.normalizeString(
          rawExp.summary || rawExp.description || '',
        );

        // Normalize dates
        const startDate = await this.normalizeDates(rawExp.startDate || '');
        const endDate = await this.normalizeDates(rawExp.endDate || '');

        // Only include if we have minimum required fields
        if (company && position) {
          mappedExperience.push({
            company,
            position,
            startDate,
            endDate,
            summary,
          });
        }
      }

      // Sort by start date (most recent first)
      mappedExperience.sort((a, b) => {
        const aDate = DateParser.parseDate(a.startDate);
        const bDate = DateParser.parseDate(b.startDate);

        if (!aDate.date && !bDate.date) return 0;
        if (!aDate.date) return 1;
        if (!bDate.date) return -1;

        return bDate.date.getTime() - aDate.date.getTime();
      });

      return mappedExperience;
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
  async mapEducation(rawEducation: any[]): Promise<ResumeDTO['education']> {
    try {
      if (!Array.isArray(rawEducation)) {
        this.logger.warn(
          'Raw education is not an array, returning empty array',
        );
        return [];
      }

      const mappedEducation: ResumeDTO['education'] = [];

      for (const rawEdu of rawEducation) {
        if (!rawEdu || typeof rawEdu !== 'object') {
          continue;
        }

        // Extract and normalize fields
        const school = this.normalizeString(
          rawEdu.school || rawEdu.institution || rawEdu.university,
        );
        const degree = this.normalizeDegree(rawEdu.degree || '');
        const major = this.normalizeString(
          rawEdu.major || rawEdu.field || rawEdu.fieldOfStudy,
        );

        // Only include if we have minimum required fields
        if (school && degree) {
          mappedEducation.push({
            school,
            degree,
            major,
          });
        }
      }

      return mappedEducation;
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
  async normalizeSkills(rawSkills: any[]): Promise<string[]> {
    try {
      if (!Array.isArray(rawSkills)) {
        this.logger.warn('Raw skills is not an array, attempting to convert');

        // Try to handle string input (comma-separated skills)
        if (typeof rawSkills === 'string') {
          rawSkills = (rawSkills as string)
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        } else {
          return [];
        }
      }

      const normalizedSkills = new Set<string>();
      const skillGroups = new Set<string>();

      for (const rawSkill of rawSkills) {
        if (!rawSkill || typeof rawSkill !== 'string') {
          continue;
        }

        const cleanSkill = rawSkill.trim();
        if (cleanSkill.length === 0 || cleanSkill.length > 100) {
          continue; // Skip empty or overly long skills
        }

        // Normalize skill using taxonomy
        const normalizedSkill = SkillsTaxonomy.normalizeSkill(cleanSkill);
        if (normalizedSkill && normalizedSkill.length > 0) {
          normalizedSkills.add(normalizedSkill);

          // Get skill category for grouping
          const skillInfo = SkillsTaxonomy.getSkillInfo(normalizedSkill);
          if (skillInfo) {
            skillGroups.add(skillInfo.category);
          }
        }
      }

      // Convert to array and sort by importance
      const skillsArray = Array.from(normalizedSkills);

      // Sort skills by category importance and alphabetically within categories
      skillsArray.sort((a, b) => {
        const aInfo = SkillsTaxonomy.getSkillInfo(a);
        const bInfo = SkillsTaxonomy.getSkillInfo(b);

        if (aInfo && bInfo) {
          // Sort by weight first (descending)
          if (aInfo.weight !== bInfo.weight) {
            return bInfo.weight - aInfo.weight;
          }
          // Then alphabetically
          return a.localeCompare(b);
        }

        // If no skill info, sort alphabetically
        return a.localeCompare(b);
      });

      // Limit to reasonable number of skills (max 50)
      const limitedSkills = skillsArray.slice(0, 50);

      this.logger.debug(
        `Normalized ${rawSkills.length} raw skills to ${limitedSkills.length} normalized skills across ${skillGroups.size} categories`,
      );
      return limitedSkills;
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
  async normalizeDates(dateString: string): Promise<string> {
    try {
      if (!dateString || typeof dateString !== 'string') {
        return '';
      }

      const trimmed = dateString.trim();
      if (trimmed.length === 0) {
        return '';
      }

      // Use DateParser to normalize the date
      return DateParser.normalizeToISO(trimmed);
    } catch (error) {
      this.logger.error(`Failed to normalize date: ${dateString}`, error);
      return '';
    }
  }

  /**
   * Calculate experience from work history
   */
  async calculateExperience(
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
   * Extract dates from various formats
   */
  async extractDates(
    text: string,
  ): Promise<{ startDate: string; endDate: string; confidence: number }[]> {
    try {
      if (!text || typeof text !== 'string') {
        return [];
      }

      const dateRangePatterns = [
        // Common date range patterns
        /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-\u2013\u2014to]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}|present|current)/gi,
        /(\d{1,2}[/-]\d{4})\s*[-\u2013\u2014to]\s*(\d{1,2}[/-]\d{4}|present|current)/gi,
        /(\w+\s+\d{4})\s*[-\u2013\u2014to]\s*(\w+\s+\d{4}|present|current)/gi,
        /(\d{4})\s*[-\u2013\u2014to]\s*(\d{4}|present|current)/gi,
      ];

      const extractedRanges: {
        startDate: string;
        endDate: string;
        confidence: number;
      }[] = [];

      for (const pattern of dateRangePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const startDate = await this.normalizeDates(match[1]);
          const endDate = await this.normalizeDates(match[2]);

          if (startDate) {
            const startParsed = DateParser.parseDate(match[1]);
            const endParsed = DateParser.parseDate(match[2]);
            const confidence = Math.min(
              startParsed.confidence,
              endParsed.confidence,
            );

            extractedRanges.push({ startDate, endDate, confidence });
          }
        }
      }

      return extractedRanges;
    } catch (error) {
      this.logger.error('Failed to extract dates', error);
      return [];
    }
  }

  /**
   * Normalize education levels to standard scale
   */
  private normalizeDegree(degree: string): string {
    if (!degree || typeof degree !== 'string') {
      return '';
    }

    const normalized = degree.trim().toLowerCase();

    // Common degree mappings
    const degreeMap: Record<string, string> = {
      // Full degree names (check these first)
      'bachelor of science': 'Bachelor of Science',
      'bachelor of arts': 'Bachelor of Arts',
      'bachelor of technology': 'Bachelor of Technology',
      'bachelor of engineering': 'Bachelor of Engineering',
      'master of science': 'Master of Science',
      'master of arts': 'Master of Arts',
      'master of business administration': 'Master of Business Administration',
      'master of technology': 'Master of Technology',
      'master of engineering': 'Master of Engineering',
      'doctor of philosophy': 'Doctor of Philosophy',

      // Bachelor's degrees (abbreviated)
      bachelor: "Bachelor's Degree",
      bachelors: "Bachelor's Degree",
      "bachelor's": "Bachelor's Degree",
      ba: 'Bachelor of Arts',
      bs: 'Bachelor of Science',
      bsc: 'Bachelor of Science',
      'b.a': 'Bachelor of Arts',
      'b.s': 'Bachelor of Science',
      btech: 'Bachelor of Technology',
      beng: 'Bachelor of Engineering',

      // Master's degrees (abbreviated)
      master: "Master's Degree",
      masters: "Master's Degree",
      "master's": "Master's Degree",
      ma: 'Master of Arts',
      ms: 'Master of Science',
      msc: 'Master of Science',
      'm.a': 'Master of Arts',
      'm.s': 'Master of Science',
      mba: 'Master of Business Administration',
      mtech: 'Master of Technology',
      meng: 'Master of Engineering',

      // Doctorate degrees
      phd: 'Doctor of Philosophy',
      'ph.d': 'Doctor of Philosophy',
      doctorate: 'Doctorate',
      doctoral: 'Doctorate',
      dphil: 'Doctor of Philosophy',

      // Other degrees
      associate: 'Associate Degree',
      associates: 'Associate Degree',
      diploma: 'Diploma',
      certificate: 'Certificate',
      'high school': 'High School Diploma',
      secondary: 'High School Diploma',
    };

    // Check for exact match
    if (degreeMap[normalized]) {
      return degreeMap[normalized];
    }

    // Check for partial match
    for (const [key, value] of Object.entries(degreeMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Return capitalized original if no match
    return degree
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normalize string fields
   */
  private normalizeString(value: any): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize name field
   */
  private normalizeName(name: any): string | null {
    if (!name || typeof name !== 'string') {
      return null;
    }

    const normalized = name.trim().replace(/\s+/g, ' ');

    // Basic name validation
    if (normalized.length < 2 || normalized.length > 100) {
      return null;
    }

    // Check if it looks like a name (letters, spaces, common punctuation)
    if (!/^[a-zA-Z\s\-\'\.]+$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  /**
   * Normalize email field
   */
  private normalizeEmail(email: any): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const normalized = email.trim().toLowerCase();

    // Return the normalized email regardless of validity
    // Let the validation step determine if it's valid
    return normalized;
  }

  /**
   * Normalize phone field
   */
  private normalizePhone(phone: any): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Remove all non-digit characters except + and ()
    let normalized = phone.replace(/[^\d\+\(\)\-\s]/g, '');

    // Remove extra whitespace
    normalized = normalized.trim().replace(/\s+/g, ' ');

    if (this.isValidPhone(normalized)) {
      return normalized;
    }

    return null;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    if (!email || email.length > 254) {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    if (!phone) {
      return false;
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Valid phone numbers should have 7-15 digits
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }

  /**
   * Calculate mapping confidence based on data quality
   */
  private calculateMappingConfidence(
    resumeDto: ResumeDTO,
    validationErrors: string[],
    _rawInput: any,
  ): number {
    let score = 100; // Start with perfect score

    // Deduct points for validation errors
    score -= validationErrors.length * 5;

    // Check data completeness
    if (!resumeDto.contactInfo.name) score -= 15;
    if (!resumeDto.contactInfo.email) score -= 10;
    if (!resumeDto.contactInfo.phone) score -= 5;

    if (resumeDto.skills.length === 0) score -= 20;
    if (resumeDto.workExperience.length === 0) score -= 25;
    if (resumeDto.education.length === 0) score -= 10;

    // Check data quality
    const skillScore = SkillsTaxonomy.calculateSkillScore(resumeDto.skills);
    score += (skillScore - 50) / 10; // Adjust based on skill quality

    // Experience quality check
    const experienceQuality = resumeDto.workExperience.reduce((acc, exp) => {
      let expScore = 0;
      if (exp.startDate && exp.startDate !== '') expScore += 2;
      if (exp.endDate && exp.endDate !== '') expScore += 2;
      if (exp.summary && exp.summary.length > 10) expScore += 3;
      return acc + expScore;
    }, 0);

    score += Math.min(20, experienceQuality);

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(100, score)) / 100;
  }
}
