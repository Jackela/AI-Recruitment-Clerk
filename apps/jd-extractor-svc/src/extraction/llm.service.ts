import { Injectable, Logger } from '@nestjs/common';
import { GeminiClient, GeminiConfig, PromptTemplates, PromptBuilder } from '../../../../libs/shared-dtos/src';

export interface JdDTO {
  requiredSkills: { name: string; weight: number }[];
  experienceYears: { min: number; max: number };
  educationLevel: 'bachelor' | 'master' | 'phd' | 'any';
  softSkills: string[];
  jobTitle?: string;
  department?: string;
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  salaryRange?: { min: number; max: number; currency: string };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly geminiClient: GeminiClient;

  constructor() {
    const config: GeminiConfig = {
      apiKey: process.env.GEMINI_API_KEY || 'your_gemini_api_key_here',
      model: 'gemini-1.5-flash',
      temperature: 0.2, // Lower temperature for more consistent extraction
    };

    this.geminiClient = new GeminiClient(config);
  }

  async extractJd(jdText: string): Promise<JdDTO> {
    this.logger.debug('Starting job description extraction');

    const prompt = this.buildExtractionPrompt(jdText);
    const schema = this.getJdSchema();

    try {
      const response = await this.geminiClient.generateStructuredResponse<JdDTO>(
        prompt,
        schema
      );

      this.logger.debug(`JD extraction completed in ${response.processingTimeMs}ms`);
      
      // Validate and clean the extracted data
      const cleanedData = this.validateAndCleanJdData(response.data);
      
      return cleanedData;
    } catch (error) {
      this.logger.error('Failed to extract job description', error);
      throw new Error(`Job description extraction failed: ${error.message}`);
    }
  }

  private buildExtractionPrompt(jdText: string): string {
    const basePrompt = PromptTemplates.getJobDescriptionPrompt(jdText);
    const schema = this.getJdSchema();
    
    return PromptBuilder.addJsonSchemaInstruction(
      basePrompt, 
      schema
    );
  }

  private getJdSchema(): string {
    return JSON.stringify({
      type: 'object',
      properties: {
        requiredSkills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              weight: { type: 'number', minimum: 0.1, maximum: 1.0 }
            },
            required: ['name', 'weight']
          }
        },
        experienceYears: {
          type: 'object',
          properties: {
            min: { type: 'number', minimum: 0 },
            max: { type: 'number', minimum: 0 }
          },
          required: ['min', 'max']
        },
        educationLevel: {
          type: 'string',
          enum: ['bachelor', 'master', 'phd', 'any']
        },
        softSkills: {
          type: 'array',
          items: { type: 'string' }
        },
        jobTitle: { type: 'string' },
        department: { type: 'string' },
        location: { type: 'string' },
        employmentType: {
          type: 'string',
          enum: ['full-time', 'part-time', 'contract', 'internship']
        },
        responsibilities: {
          type: 'array',
          items: { type: 'string' }
        },
        qualifications: {
          type: 'array',
          items: { type: 'string' }
        },
        benefits: {
          type: 'array',
          items: { type: 'string' }
        },
        salaryRange: {
          type: 'object',
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
            currency: { type: 'string' }
          }
        }
      },
      required: ['requiredSkills', 'experienceYears', 'educationLevel', 'softSkills']
    }, null, 2);
  }

  private validateAndCleanJdData(data: any): JdDTO {
    // Ensure required fields are present and valid
    const cleanedData: JdDTO = {
      requiredSkills: Array.isArray(data.requiredSkills) 
        ? data.requiredSkills.filter(skill => 
            skill.name && typeof skill.name === 'string' &&
            typeof skill.weight === 'number' && skill.weight >= 0.1 && skill.weight <= 1.0
          )
        : [],
      experienceYears: {
        min: Math.max(0, Math.floor(data.experienceYears?.min || 0)),
        max: Math.max(0, Math.floor(data.experienceYears?.max || 0))
      },
      educationLevel: ['bachelor', 'master', 'phd', 'any'].includes(data.educationLevel) 
        ? data.educationLevel 
        : 'any',
      softSkills: Array.isArray(data.softSkills) 
        ? data.softSkills.filter(skill => skill && typeof skill === 'string')
        : []
    };

    // Ensure max >= min for experience years
    if (cleanedData.experienceYears.max < cleanedData.experienceYears.min) {
      cleanedData.experienceYears.max = cleanedData.experienceYears.min;
    }

    // Add optional fields if present
    if (data.jobTitle && typeof data.jobTitle === 'string') {
      cleanedData.jobTitle = data.jobTitle.trim();
    }
    
    if (data.department && typeof data.department === 'string') {
      cleanedData.department = data.department.trim();
    }
    
    if (data.location && typeof data.location === 'string') {
      cleanedData.location = data.location.trim();
    }
    
    if (['full-time', 'part-time', 'contract', 'internship'].includes(data.employmentType)) {
      cleanedData.employmentType = data.employmentType;
    }
    
    if (Array.isArray(data.responsibilities)) {
      cleanedData.responsibilities = data.responsibilities
        .filter(resp => resp && typeof resp === 'string')
        .map(resp => resp.trim());
    }
    
    if (Array.isArray(data.qualifications)) {
      cleanedData.qualifications = data.qualifications
        .filter(qual => qual && typeof qual === 'string')
        .map(qual => qual.trim());
    }
    
    if (Array.isArray(data.benefits)) {
      cleanedData.benefits = data.benefits
        .filter(benefit => benefit && typeof benefit === 'string')
        .map(benefit => benefit.trim());
    }
    
    if (data.salaryRange && 
        typeof data.salaryRange.min === 'number' && 
        typeof data.salaryRange.max === 'number' &&
        typeof data.salaryRange.currency === 'string') {
      cleanedData.salaryRange = {
        min: Math.max(0, data.salaryRange.min),
        max: Math.max(0, data.salaryRange.max),
        currency: data.salaryRange.currency.toUpperCase()
      };
      
      // Ensure max >= min
      if (cleanedData.salaryRange.max < cleanedData.salaryRange.min) {
        cleanedData.salaryRange.max = cleanedData.salaryRange.min;
      }
    }

    return cleanedData;
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.geminiClient.healthCheck();
    } catch {
      return false;
    }
  }
}
