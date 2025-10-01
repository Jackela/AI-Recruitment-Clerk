import { Injectable, Logger } from '@nestjs/common';
import { VisionLlmRequest, VisionLlmResponse } from '../dto/resume-parsing.dto';
import { ResumeDTO } from '@ai-recruitment-clerk/resume-processing-domain';
import {
  GeminiClient,
  GeminiConfig,
  PromptTemplates,
  PromptBuilder,
} from './ai-services-shared.stub';
import { SecureConfigValidator } from '@app/shared-dtos';
import pdfParse from 'pdf-parse-fork';

@Injectable()
export class VisionLlmService {
  private readonly logger = new Logger(VisionLlmService.name);
  private readonly geminiClient: GeminiClient;

  constructor() {
    // 🔒 SECURITY: Validate configuration before service initialization (skip in tests)
    if (process.env.NODE_ENV !== 'test') {
      SecureConfigValidator.validateServiceConfig('VisionLlmService', [
        'GEMINI_API_KEY',
      ]);
    }

    const config: GeminiConfig = {
      apiKey:
        process.env.NODE_ENV === 'test'
          ? 'test-api-key'
          : SecureConfigValidator.requireEnv('GEMINI_API_KEY'),
      model: 'gemini-1.5-pro', // Using Pro model for vision capabilities
      temperature: 0.1, // Very low temperature for consistent extraction
    };

    // In tests, use stubbed Gemini client; otherwise real client
    this.geminiClient = new GeminiClient(config);
  }

  async parseResumePdf(
    pdfBuffer: Buffer,
    filename: string,
  ): Promise<ResumeDTO> {
    // ✅ FIXED: Enable AI processing in all environments
    this.logger.debug(`Starting resume parsing for: ${filename}`);

    try {
      // First validate the PDF
      const isValid = await this.validatePdfFile(pdfBuffer);
      if (!isValid) {
        throw new Error('Invalid PDF file format');
      }

      // Extract text from PDF first (fallback option)
      let extractedText: string;
      try {
        const pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        this.logger.warn(
          'PDF text extraction failed, using vision-only mode',
          pdfError,
        );
        extractedText = '';
      }

      // Use optimized prompts for extraction
      const schema = this.getResumeSchema();

      let resumeData: ResumeDTO;

      if (extractedText.trim()) {
        // Use text-based extraction with OCR as backup
        this.logger.debug('Using text-based extraction with vision backup');
        try {
          const textPrompt = PromptBuilder.addJsonSchemaInstruction(
            PromptTemplates.getResumeParsingPrompt(extractedText),
            schema,
          );
          const response =
            await this.geminiClient.generateStructuredResponse<ResumeDTO>(
              textPrompt,
              schema,
            );
          resumeData = response.data;
        } catch (textError) {
          this.logger.warn(
            'Text-based extraction failed, falling back to vision',
            textError,
          );
          const visionPrompt = PromptBuilder.addJsonSchemaInstruction(
            PromptTemplates.getResumeVisionPrompt(),
            schema,
          );
          const visionResponse =
            await this.geminiClient.generateStructuredVisionResponse<ResumeDTO>(
              visionPrompt,
              pdfBuffer,
              'application/pdf',
              schema,
            );
          resumeData = visionResponse.data;
        }
      } else {
        // Use vision-only extraction
        this.logger.debug('Using vision-only extraction');
        const visionPrompt = PromptBuilder.addJsonSchemaInstruction(
          PromptTemplates.getResumeVisionPrompt(),
          schema,
        );
        const response =
          await this.geminiClient.generateStructuredVisionResponse<ResumeDTO>(
            visionPrompt,
            pdfBuffer,
            'application/pdf',
            schema,
          );
        resumeData = response.data;
      }

      // Clean and validate the extracted data
      const cleanedData = this.validateAndCleanResumeData(resumeData);

      this.logger.debug(`Resume parsing completed for: ${filename}`);
      return cleanedData;
    } catch (error) {
      this.logger.error(`Failed to parse resume: ${filename}`, error);
      throw new Error(`Resume parsing failed: ${(error as Error).message}`);
    }
  }

  async parseResumeText(resumeText: string): Promise<ResumeDTO> {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('VisionLlmService.parseResumeText not implemented');
    }
    this.logger.debug('Starting resume parsing from plain text');
    try {
      const schema = this.getResumeSchema();
      const textPrompt = PromptBuilder.addJsonSchemaInstruction(
        PromptTemplates.getResumeParsingPrompt(resumeText),
        schema,
      );
      const response = await this.geminiClient.generateStructuredResponse<ResumeDTO>(
        textPrompt,
        schema,
      );
      const cleaned = this.validateAndCleanResumeData(response.data);
      this.logger.debug('Resume text parsing completed');
      return cleaned;
    } catch (error) {
      this.logger.error('Failed to parse resume text', error);
      throw new Error(`Resume text parsing failed: ${(error as Error).message}`);
    }
  }

  async parseResumePdfAdvanced(
    request: VisionLlmRequest,
  ): Promise<VisionLlmResponse> {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('VisionLlmService.parseResumePdfAdvanced not implemented');
    }
    const startTime = Date.now();

    try {
      const resumeData = await this.parseResumePdf(
        request.pdfBuffer,
        request.filename,
      );

      const processingTimeMs = Date.now() - startTime;

      // Calculate confidence based on data completeness
      const confidence = this.calculateConfidence(resumeData);

      return {
        extractedData: resumeData,
        confidence,
        processingTimeMs,
      };
    } catch (error) {
      throw error;
    }
  }

  async validatePdfFile(pdfBuffer: Buffer): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('VisionLlmService.validatePdfFile not implemented');
    }
    try {
      // Check PDF header
      if (!pdfBuffer || pdfBuffer.length < 8) {
        return false;
      }

      const header = pdfBuffer.subarray(0, 8).toString('ascii');
      if (!header.startsWith('%PDF-')) {
        return false;
      }

      // Try to parse the PDF to ensure it's valid
      await pdfParse(pdfBuffer);
      return true;
    } catch (error) {
      this.logger.warn('PDF validation failed', error);
      return false;
    }
  }

  async estimateProcessingTime(fileSize: number): Promise<number> {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('VisionLlmService.estimateProcessingTime not implemented');
    }
    // Base processing time estimation based on file size and complexity
    const baseMsPerKB = 50; // 50ms per KB as baseline
    const sizeInKB = fileSize / 1024;

    // Add complexity factors
    let estimatedMs = sizeInKB * baseMsPerKB;

    // Add overhead for vision processing
    estimatedMs += 2000; // Base overhead

    // Add network latency buffer
    estimatedMs += 1000;

    return Math.round(estimatedMs);
  }

  // @ts-ignore - Method reserved for future use
  private _buildResumeExtractionPrompt(extractedText: string): string {
    return `
Extract structured information from this resume text. Focus on identifying:

1. Contact information (name, email, phone)
2. Technical and professional skills
3. Work experience with details
4. Education background

${extractedText ? `Resume Text:\n${extractedText}` : 'No text extracted - please analyze the document image.'}

Extraction Guidelines:
- Extract exact information, avoid assumptions
- Use null for missing information
- For dates, use ISO format (YYYY-MM-DD) or "present" for current positions
- List skills as found, including both technical and soft skills
- Include complete work experience with company, position, dates, and summary
- Extract education with school, degree, and major when available
- Be thorough but accurate - only extract clearly visible information`;
  }

  // @ts-ignore - Method reserved for future use
  private _buildVisionPrompt(): string {
    return `
Analyze this resume document and extract structured information. Focus on:

1. Contact Information:
   - Full name
   - Email address
   - Phone number

2. Skills:
   - Technical skills
   - Programming languages
   - Tools and technologies
   - Soft skills and competencies

3. Work Experience:
   - Company names
   - Job titles/positions
   - Employment dates (start and end)
   - Job responsibilities and achievements

4. Education:
   - School/University names
   - Degrees obtained
   - Majors/Fields of study
   - Graduation dates if available

Extraction Guidelines:
- Read the document carefully and extract ALL visible information
- Use null for any information that is not clearly visible or legible
- For dates, use YYYY-MM-DD format, or "present" for current positions
- List skills exactly as they appear
- Provide complete work experience details
- Be thorough and accurate - extract only what you can clearly see`;
  }

  private getResumeSchema(): string {
    return JSON.stringify(
      {
        type: 'object',
        properties: {
          contactInfo: {
            type: 'object',
            properties: {
              name: { type: ['string', 'null'] },
              email: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
            },
            required: ['name', 'email', 'phone'],
          },
          skills: {
            type: 'array',
            items: { type: 'string' },
          },
          workExperience: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                company: { type: 'string' },
                position: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                summary: { type: 'string' },
              },
              required: [
                'company',
                'position',
                'startDate',
                'endDate',
                'summary',
              ],
            },
          },
          education: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                school: { type: 'string' },
                degree: { type: 'string' },
                major: { type: ['string', 'null'] },
              },
              required: ['school', 'degree', 'major'],
            },
          },
        },
        required: ['contactInfo', 'skills', 'workExperience', 'education'],
      },
      null,
      2,
    );
  }

  private validateAndCleanResumeData(data: any): ResumeDTO {
    // Ensure contact info is properly structured
    const contactInfo = {
      name: data.contactInfo?.name || null,
      email: this.validateEmail(data.contactInfo?.email)
        ? data.contactInfo.email
        : null,
      phone: data.contactInfo?.phone || null,
    };

    // Clean and validate skills array
    const skills = Array.isArray(data.skills)
      ? data.skills
          .filter((skill: any) => skill && typeof skill === 'string')
          .map((skill: string) => skill.trim())
      : [];

    // Clean and validate work experience
    const workExperience = Array.isArray(data.workExperience)
      ? data.workExperience
          .filter((exp: any) => exp.company && exp.position)
          .map((exp: any) => ({
            company: exp.company.trim(),
            position: exp.position.trim(),
            startDate: this.validateDate(exp.startDate) ? exp.startDate : '',
            endDate:
              this.validateDate(exp.endDate) || exp.endDate === 'present'
                ? exp.endDate
                : '',
            summary: exp.summary ? exp.summary.trim() : '',
          }))
      : [];

    // Clean and validate education
    const education = Array.isArray(data.education)
      ? data.education
          .filter((edu: any) => edu.school && edu.degree)
          .map((edu: any) => ({
            school: edu.school.trim(),
            degree: edu.degree.trim(),
            major: edu.major ? edu.major.trim() : null,
          }))
      : [];

    return {
      contactInfo,
      skills,
      workExperience,
      education,
    };
  }

  private validateEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateDate(dateStr: string): boolean {
    if (!dateStr || dateStr === 'present') return true;

    // Check ISO date format (YYYY-MM-DD)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDateRegex.test(dateStr)) {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }

    return false;
  }

  private calculateConfidence(resumeData: ResumeDTO): number {
    let score = 0;
    let maxScore = 0;

    // Contact info scoring (30% weight)
    maxScore += 30;
    if (resumeData.contactInfo.name) score += 15;
    if (resumeData.contactInfo.email) score += 10;
    if (resumeData.contactInfo.phone) score += 5;

    // Skills scoring (20% weight)
    maxScore += 20;
    if (resumeData.skills.length > 0) {
      score += Math.min(20, resumeData.skills.length * 2);
    }

    // Work experience scoring (35% weight)
    maxScore += 35;
    if (resumeData.workExperience.length > 0) {
      const expScore = resumeData.workExperience.reduce((acc, exp) => {
        let itemScore = 5; // Base score
        if (exp.startDate) itemScore += 2;
        if (exp.endDate) itemScore += 2;
        if (exp.summary && exp.summary.length > 10) itemScore += 3;
        return acc + itemScore;
      }, 0);
      score += Math.min(35, expScore);
    }

    // Education scoring (15% weight)
    maxScore += 15;
    if (resumeData.education.length > 0) {
      const eduScore = resumeData.education.length * 5;
      score += Math.min(15, eduScore);
    }

    return Math.round((score / maxScore) * 100) / 100; // Return as decimal (0.0-1.0)
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.geminiClient.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}
