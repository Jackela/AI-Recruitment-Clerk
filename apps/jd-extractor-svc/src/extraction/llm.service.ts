import { Injectable, Logger } from '@nestjs/common';
import { JdDTO, LlmExtractionRequest, LlmExtractionResponse } from '@ai-recruitment-clerk/job-management-domain';
import { RetryUtility, SecureConfigValidator } from '@ai-recruitment-clerk/infrastructure-shared';
import { GeminiClient, GeminiConfig, PromptTemplates, PromptBuilder } from '@ai-recruitment-clerk/ai-services-shared';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly geminiClient: GeminiClient;

  constructor() {
    // 🔒 SECURITY: Validate configuration before service initialization
    SecureConfigValidator.validateServiceConfig('JdExtractorLlmService', ['GEMINI_API_KEY']);
    
    const config: GeminiConfig = {
      apiKey: SecureConfigValidator.requireEnv('GEMINI_API_KEY'),
      model: 'gemini-1.5-flash',
      temperature: 0.2, // Lower temperature for more consistent extraction
    };

    this.geminiClient = new GeminiClient(config);
  }

  async extractJobRequirements(jdText: string): Promise<JdDTO> {
    this.logger.log('Extracting job requirements from JD text using Gemini API');

    const prompt = this.buildExtractionPrompt(jdText);
    const schema = this.getJdSchema();

    try {
      const response = await RetryUtility.withExponentialBackoff(
        () => this.geminiClient.generateStructuredResponse<any>(prompt, schema),
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          jitterMs: 500
        }
      );

      this.logger.debug(`JD extraction completed in ${response.processingTimeMs}ms`);
      
      // Convert Gemini response to expected JdDTO format
      const extractedData = this.convertToJdDTO(response.data);
      
      return extractedData;
    } catch (error) {
      this.logger.error('Failed to extract job description using Gemini API', error);
      throw new Error(`Job description extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractStructuredData(request: LlmExtractionRequest): Promise<LlmExtractionResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Extracting structured data for job: ${request.jobTitle}`);
      
      const extractedData = await this.extractJobRequirements(request.jdText);
      
      // Validate the extracted data
      const isValid = await this.validateExtractedData(extractedData);
      if (!isValid) {
        this.logger.warn('Extracted data validation failed, but proceeding with available data');
      }

      const processingTimeMs = Date.now() - startTime;
      
      return {
        extractedData,
        confidence: isValid ? 0.85 : 0.6, // Real confidence based on validation
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error('Failed to extract structured data', error);
      throw error;
    }
  }

  async validateExtractedData(data: JdDTO): Promise<boolean> {
    // Comprehensive validation logic for production use
    if (!data.requirements || !data.responsibilities) {
      return false;
    }
    
    // Check if technical skills are present and meaningful
    if (!data.requirements.technical || data.requirements.technical.length === 0) {
      return false;
    }
    
    // Check if responsibilities are present
    if (!data.responsibilities || data.responsibilities.length === 0) {
      return false;
    }
    
    // Validate experience and education are specified
    if (!data.requirements.experience || data.requirements.experience === 'Not specified') {
      this.logger.warn('Experience level not specified in extracted data');
    }
    
    if (!data.requirements.education || data.requirements.education === 'Not specified') {
      this.logger.warn('Education level not specified in extracted data');
    }
    
    return true;
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
        requirements: {
          type: 'object',
          properties: {
            technical: {
              type: 'array',
              items: { type: 'string' },
              description: 'Technical skills and technologies required for the job'
            },
            soft: {
              type: 'array', 
              items: { type: 'string' },
              description: 'Soft skills and personal qualities required'
            },
            experience: {
              type: 'string',
              description: 'Required years of experience or experience level'
            },
            education: {
              type: 'string',
              description: 'Required education level or degree'
            }
          },
          required: ['technical', 'soft', 'experience', 'education']
        },
        responsibilities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Main job responsibilities and duties'
        },
        benefits: {
          type: 'array',
          items: { type: 'string' },
          description: 'Benefits and perks offered by the company'
        },
        company: {
          type: 'object',
          properties: {
            name: { 
              type: 'string',
              description: 'Company name'
            },
            industry: { 
              type: 'string',
              description: 'Industry or business domain'
            },
            size: { 
              type: 'string',
              description: 'Company size or number of employees'
            }
          },
          description: 'Company information and details'
        }
      },
      required: ['requirements', 'responsibilities', 'benefits']
    }, null, 2);
  }

  private convertToJdDTO(rawData: any): JdDTO {
    this.logger.debug('Converting Gemini response to JdDTO format');
    
    // Handle direct JdDTO format response
    if (rawData.requirements && rawData.responsibilities && rawData.benefits) {
      return this.validateAndCleanJdData(rawData);
    }
    
    // Handle legacy format conversion if needed
    const convertedData: JdDTO = {
      requirements: {
        technical: Array.isArray(rawData.requiredSkills) 
          ? rawData.requiredSkills.map((skill: any) => 
              typeof skill === 'string' ? skill : skill.name || ''
            ).filter(Boolean)
          : rawData.technical || [],
        soft: Array.isArray(rawData.softSkills) 
          ? rawData.softSkills.filter(Boolean)
          : rawData.soft || [],
        experience: rawData.experience || this.formatExperienceYears(rawData.experienceYears) || 'Not specified',
        education: rawData.education || this.formatEducationLevel(rawData.educationLevel) || 'Not specified'
      },
      responsibilities: Array.isArray(rawData.responsibilities) 
        ? rawData.responsibilities.filter(Boolean)
        : ['Key responsibilities to be defined'],
      benefits: Array.isArray(rawData.benefits) 
        ? rawData.benefits.filter(Boolean)
        : [],
      company: {
        name: rawData.company?.name || rawData.jobTitle || undefined,
        industry: rawData.company?.industry || rawData.department || undefined,
        size: rawData.company?.size || undefined
      }
    };
    
    return this.validateAndCleanJdData(convertedData);
  }

  private formatExperienceYears(experienceYears: any): string {
    if (!experienceYears || typeof experienceYears !== 'object') {
      return 'Not specified';
    }
    
    const min = experienceYears.min || 0;
    const max = experienceYears.max || min;
    
    if (min === 0 && max === 0) {
      return 'Entry level';
    } else if (min === max) {
      return `${min} years`;
    } else {
      return `${min}-${max} years`;
    }
  }

  private formatEducationLevel(educationLevel: string): string {
    const educationMap: { [key: string]: string } = {
      'bachelor': 'Bachelor\'s degree',
      'master': 'Master\'s degree', 
      'phd': 'PhD or equivalent',
      'any': 'Any education level'
    };
    
    return educationMap[educationLevel] || educationLevel || 'Not specified';
  }

  private validateAndCleanJdData(data: any): JdDTO {
    // Ensure required fields are present and valid
    const cleanedData: JdDTO = {
      requirements: {
        technical: Array.isArray(data.requirements?.technical) 
          ? data.requirements.technical
              .filter((skill: any) => skill && typeof skill === 'string')
              .map((skill: string) => skill.trim())
          : [],
        soft: Array.isArray(data.requirements?.soft)
          ? data.requirements.soft
              .filter((skill: any) => skill && typeof skill === 'string') 
              .map((skill: string) => skill.trim())
          : [],
        experience: typeof data.requirements?.experience === 'string' 
          ? data.requirements.experience.trim() 
          : 'Not specified',
        education: typeof data.requirements?.education === 'string'
          ? data.requirements.education.trim()
          : 'Not specified'
      },
      responsibilities: Array.isArray(data.responsibilities)
        ? data.responsibilities
            .filter((resp: any) => resp && typeof resp === 'string')
            .map((resp: string) => resp.trim())
        : [],
      benefits: Array.isArray(data.benefits)
        ? data.benefits
            .filter((benefit: any) => benefit && typeof benefit === 'string')
            .map((benefit: string) => benefit.trim())
        : [],
      company: {
        name: data.company?.name && typeof data.company.name === 'string'
          ? data.company.name.trim()
          : undefined,
        industry: data.company?.industry && typeof data.company.industry === 'string'
          ? data.company.industry.trim()
          : undefined,
        size: data.company?.size && typeof data.company.size === 'string'
          ? data.company.size.trim()
          : undefined
      }
    };

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
