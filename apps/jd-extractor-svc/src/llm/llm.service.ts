import { Injectable, Logger, Optional } from '@nestjs/common';
import type {
  JdDTO,
  LlmExtractionRequest,
  LlmExtractionResponse,
} from '@ai-recruitment-clerk/job-management-domain';
import type { GeminiClient } from '@ai-recruitment-clerk/shared-dtos';

/**
 * Response schema for JD extraction from Gemini API.
 */
interface JdExtractionResponse {
  requirements: {
    technical: string[];
    soft: string[];
    experience: string;
    education: string;
  };
  responsibilities: string[];
  benefits: string[];
  company: {
    name: string | null;
    industry: string | null;
    size: string | null;
  };
}

/**
 * JSON schema for structured JD extraction.
 */
const JD_EXTRACTION_SCHEMA = `
{
  "requirements": {
    "technical": ["string - list of technical skills required"],
    "soft": ["string - list of soft skills required"],
    "experience": "string - experience level requirement",
    "education": "string - education requirement"
  },
  "responsibilities": ["string - list of job responsibilities"],
  "benefits": ["string - list of benefits offered"],
  "company": {
    "name": "string or null - company name if mentioned",
    "industry": "string or null - industry if mentioned",
    "size": "string or null - company size if mentioned"
  }
}
`;

/**
 * Prompt template for JD extraction.
 */
const JD_EXTRACTION_PROMPT = `You are an expert job description analyzer. Extract structured information from the following job description.

**Job Title:** {jobTitle}

**Job Description:**
{jdText}

**Instructions:**
1. Extract all technical skills mentioned (programming languages, frameworks, tools, platforms)
2. Extract all soft skills mentioned (communication, leadership, teamwork, etc.)
3. Determine the experience level requirement (years of experience, seniority level)
4. Extract the education requirement (degree, field of study)
5. List all job responsibilities mentioned
6. List all benefits mentioned
7. Extract company information if available (name, industry, size)

**Important:**
- If a field is not mentioned in the JD, use null for company fields or "Not specified" for text fields
- Always return valid JSON with all fields present
- Use empty arrays [] if no items are found for a list field
- Be specific and accurate in your extraction
- Preserve important details like version numbers or certifications`;

/**
 * Provides LLM functionality for JD extraction using Gemini API.
 * Falls back to keyword-based extraction if Gemini is unavailable.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(@Optional() private readonly geminiClient?: GeminiClient) {
    if (this.geminiClient) {
      this.logger.log('LlmService initialized with GeminiClient for AI-powered extraction');
    } else {
      this.logger.warn('LlmService initialized without GeminiClient - using keyword-based fallback extraction');
    }
  }

  /**
   * Performs the extract job requirements operation.
   * Uses Gemini API if available, otherwise falls back to keyword-based extraction.
   * @param jdText - The jd text.
   * @param jobTitle - Optional job title for context.
   * @returns A promise that resolves to JdDTO.
   */
  public async extractJobRequirements(jdText: string, jobTitle?: string): Promise<JdDTO> {
    this.logger.log('Extracting job requirements from JD text');

    // Handle null, undefined, or non-string inputs gracefully
    const sanitizedText = this.sanitizeInput(jdText);

    // Try Gemini API extraction first if client is available
    if (this.geminiClient) {
      try {
        const geminiResult = await this.extractWithGemini(sanitizedText, jobTitle);
        if (geminiResult) {
          this.logger.log('Successfully extracted JD data using Gemini API');
          return geminiResult;
        }
      } catch (error) {
        this.logger.warn(
          `Gemini extraction failed, falling back to keyword-based extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Fallback to keyword-based extraction
    this.logger.debug('Using keyword-based extraction fallback');
    return this.extractWithKeywords(sanitizedText);
  }

  /**
   * Extracts JD information using Gemini API.
   */
  private async extractWithGemini(jdText: string, jobTitle?: string): Promise<JdDTO | null> {
    if (!this.geminiClient) {
      return null;
    }

    const prompt = JD_EXTRACTION_PROMPT
      .replace('{jobTitle}', jobTitle ?? 'Not specified')
      .replace('{jdText}', jdText);

    try {
      const response = await this.geminiClient.generateStructuredResponse<JdExtractionResponse>(
        prompt,
        JD_EXTRACTION_SCHEMA,
        3, // retries
      );

      // Validate and transform the response
      const extractedData = response.data;

      // Ensure all required fields are present with defaults
      const jdDto: JdDTO = {
        requirements: {
          technical: extractedData.requirements?.technical ?? [],
          soft: extractedData.requirements?.soft ?? [],
          experience: extractedData.requirements?.experience ?? 'Not specified',
          education: extractedData.requirements?.education ?? 'Not specified',
        },
        responsibilities: extractedData.responsibilities ?? ['Key responsibilities to be defined'],
        benefits: extractedData.benefits ?? [],
        company: {
          name: extractedData.company?.name ?? undefined,
          industry: extractedData.company?.industry ?? undefined,
          size: extractedData.company?.size ?? undefined,
        },
      };

      return jdDto;
    } catch (error) {
      this.logger.error(
        `Gemini API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Fallback keyword-based extraction (original implementation).
   */
  private extractWithKeywords(jdText: string): JdDTO {
    return {
      requirements: {
        technical: this.extractTechnicalSkills(jdText),
        soft: this.extractSoftSkills(jdText),
        experience: this.extractExperienceLevel(jdText),
        education: this.extractEducationRequirement(jdText),
      },
      responsibilities: this.extractResponsibilities(jdText),
      benefits: this.extractBenefits(jdText),
      company: {
        name: this.extractCompanyName(jdText),
        industry: this.extractIndustry(jdText),
        size: this.extractCompanySize(jdText),
      },
    };
  }

  /**
   * Sanitizes input text, handling null/undefined/empty values.
   * @param text - The input text.
   * @returns Sanitized text string.
   */
  private sanitizeInput(text: string): string {
    if (text === null || text === undefined) {
      return '';
    }
    if (typeof text !== 'string') {
      return String(text);
    }
    return text;
  }

  /**
   * Performs the extract structured data operation.
   * @param request - The request.
   * @returns A promise that resolves to LlmExtractionResponse.
   */
  public async extractStructuredData(
    request: LlmExtractionRequest,
  ): Promise<LlmExtractionResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Extracting structured data for job: ${request.jobTitle}`,
      );

      const extractedData = await this.extractJobRequirements(request.jdText, request.jobTitle);

      // Validate the extracted data
      const isValid = await this.validateExtractedData(extractedData);
      if (!isValid) {
        this.logger.warn(
          'Extracted data validation failed, using fallback data',
        );
      }

      const processingTimeMs = Date.now() - startTime;

      // Higher confidence when using Gemini API, lower for keyword fallback
      const baseConfidence = this.geminiClient ? 0.85 : 0.65;
      const confidence = isValid ? baseConfidence : 0.5;

      return {
        extractedData,
        confidence,
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error('Failed to extract structured data', error);
      throw error;
    }
  }

  /**
   * Validates extracted data.
   * @param data - The data.
   * @returns A promise that resolves to boolean value.
   */
  public async validateExtractedData(data: JdDTO): Promise<boolean> {
    // Basic validation logic
    if (!data.requirements || !data.responsibilities) {
      return false;
    }

    // Check if technical skills are present
    if (
      !data.requirements.technical ||
      data.requirements.technical.length === 0
    ) {
      return false;
    }

    // Check if responsibilities are present
    if (!data.responsibilities || data.responsibilities.length === 0) {
      return false;
    }

    return true;
  }

  private extractTechnicalSkills(jdText: string): string[] {
    // Simple keyword extraction - in production this would use LLM
    const techKeywords = [
      'JavaScript',
      'TypeScript',
      'React',
      'Angular',
      'Node.js',
      'Python',
      'Java',
      'Docker',
      'Kubernetes',
      'AWS',
      'Azure',
    ];
    return techKeywords.filter((skill) =>
      jdText.toLowerCase().includes(skill.toLowerCase()),
    );
  }

  private extractSoftSkills(jdText: string): string[] {
    const softSkillKeywords = [
      'communication',
      'teamwork',
      'leadership',
      'problem-solving',
      'analytical',
      'creative',
    ];
    return softSkillKeywords.filter((skill) =>
      jdText.toLowerCase().includes(skill.toLowerCase()),
    );
  }

  private extractExperienceLevel(jdText: string): string {
    const text = jdText.toLowerCase();
    if (
      text.includes('senior') ||
      text.includes('5+ years') ||
      text.includes('lead')
    ) {
      return 'Senior (5+ years)';
    } else if (text.includes('mid') || text.includes('3+ years')) {
      return 'Mid-level (3-5 years)';
    } else if (
      text.includes('junior') ||
      text.includes('entry') ||
      text.includes('1+ year')
    ) {
      return 'Junior (1-3 years)';
    }
    return 'Not specified';
  }

  private extractEducationRequirement(jdText: string): string {
    const text = jdText.toLowerCase();
    if (text.includes('phd') || text.includes('doctorate')) {
      return 'PhD/Doctorate';
    } else if (
      text.includes('master') ||
      text.includes('msc') ||
      text.includes('mba')
    ) {
      return "Master's degree";
    } else if (text.includes('bachelor') || text.includes('degree')) {
      return "Bachelor's degree";
    }
    return 'Not specified';
  }

  private extractResponsibilities(jdText: string): string[] {
    // Simple extraction - in production would use LLM parsing
    const responsibilityIndicators = [
      'responsible for',
      'duties include',
      'you will',
      'responsibilities',
    ];
    const lines = jdText.split('\n');
    const responsibilities: string[] = [];

    lines.forEach((line) => {
      if (
        responsibilityIndicators.some((indicator) =>
          line.toLowerCase().includes(indicator.toLowerCase()),
        )
      ) {
        responsibilities.push(line.trim());
      }
    });

    return responsibilities.length > 0
      ? responsibilities
      : ['Key responsibilities to be defined'];
  }

  private extractBenefits(jdText: string): string[] {
    const benefitKeywords = [
      'health insurance',
      'dental',
      'vacation',
      'remote work',
      'flexible hours',
      '401k',
      'stock options',
    ];
    return benefitKeywords.filter((benefit) =>
      jdText.toLowerCase().includes(benefit.toLowerCase()),
    );
  }

  private extractCompanyName(jdText: string): string | undefined {
    // Simple extraction - would use NER in production
    const lines = jdText.split('\n');
    for (const line of lines.slice(0, 5)) {
      // Check first few lines
      if (
        line.trim().length > 0 &&
        !line.includes('Job') &&
        !line.includes('Position')
      ) {
        return line.trim();
      }
    }
    return undefined;
  }

  private extractIndustry(jdText: string): string | undefined {
    const industries = [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Retail',
      'Manufacturing',
    ];
    const text = jdText.toLowerCase();

    for (const industry of industries) {
      if (text.includes(industry.toLowerCase())) {
        return industry;
      }
    }
    return undefined;
  }

  private extractCompanySize(jdText: string): string | undefined {
    const text = jdText.toLowerCase();
    if (text.includes('startup') || text.includes('small')) {
      return 'Small (1-50 employees)';
    } else if (text.includes('medium') || text.includes('growing')) {
      return 'Medium (51-500 employees)';
    } else if (text.includes('enterprise') || text.includes('large')) {
      return 'Large (500+ employees)';
    }
    return undefined;
  }
}
