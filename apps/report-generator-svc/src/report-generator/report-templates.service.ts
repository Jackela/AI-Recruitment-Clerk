import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { GridFsService } from './gridfs.service';
import type { ReportFileMetadata } from './gridfs.service';
import type {
  ReportDocument,
  ScoreBreakdown,
  MatchingSkill,
  ReportRecommendation,
} from '../schemas/report.schema';
import { marked } from 'marked';
import { Workbook } from 'exceljs';
import type { Worksheet, BorderStyle } from 'exceljs';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import {
  ReportGeneratorException,
  ErrorCorrelationManager,
} from '@ai-recruitment-clerk/infrastructure-shared';

/**
 * Error codes for report template generation failures.
 * Used by ReportGeneratorException to identify specific failure modes.
 *
 * @example
 * throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
 *   error: 'Puppeteer timeout',
 *   format: 'pdf'
 * });
 */
export type ReportTemplateErrorCode =
  | 'BROWSER_LAUNCH_FAILED'
  | 'PAGE_CREATION_FAILED'
  | 'PAGE_RENDER_FAILED'
  | 'PDF_GENERATION_FAILED'
  | 'EXCEL_WORKBOOK_FAILED'
  | 'TEMPLATE_RENDER_FAILED'
  | 'HTML_GENERATION_FAILED'
  | 'MARKDOWN_PARSE_FAILED'
  | 'RESOURCE_CLEANUP_FAILED'
  | 'INVALID_TEMPLATE_DATA';

/**
 * Error context interface for template generation errors.
 * Provides detailed context for debugging report generation failures.
 *
 * @example
 * const errorContext: TemplateErrorContext = {
 *   error: 'Puppeteer timeout after 30s',
 *   templateType: 'individual',
 *   format: 'pdf',
 *   jobId: 'job-456',
 *   resumeId: 'resume-123',
 *   htmlLength: 15000,
 *   correlationId: 'trace-123'
 * };
 */
export interface TemplateErrorContext {
  error?: string;
  templateType?: string;
  format?: string;
  jobId?: string;
  resumeId?: string;
  htmlLength?: number;
  correlationId?: string;
  originalError?: unknown;
  [key: string]: unknown;
}

// Enhanced type definitions for report templates
/**
 * Defines the shape of the candidate comparison data for comparison reports.
 * Contains all information needed to display a candidate in comparison views.
 *
 * @example
 * const candidate: CandidateComparisonData = {
 *   name: 'John Doe',
 *   score: 85,
 *   recommendation: 'Strong Hire',
 *   skills: ['JavaScript', 'TypeScript', 'React'],
 *   strengths: ['Strong technical background'],
 *   concerns: ['Limited leadership experience'],
 *   experience: 5,
 *   education: 90
 * };
 */
export interface CandidateComparisonData {
  name: string;
  score: number;
  recommendation: string;
  skills: string[];
  strengths?: string[];
  concerns?: string[];
  experience?: number;
  education?: number;
}

/**
 * Defines the shape of an interview question category with follow-ups.
 * Used in interview guide reports to structure recommended questions.
 *
 * @example
 * const question: InterviewQuestion = {
 *   category: 'Technical Skills',
 *   questions: [
 *     {
 *       question: 'Describe your experience with React',
 *       lookFor: 'Depth of knowledge, project examples',
 *       followUp: ['What challenges did you face?', 'How did you optimize performance?']
 *     }
 *   ]
 * };
 */
export interface InterviewQuestion {
  category: string;
  questions: Array<{
    question: string;
    lookFor: string;
    followUp: string[];
  }>;
}

/**
 * Defines additional data that can be passed to report templates.
 * Allows customization and enrichment of report content beyond the standard fields.
 *
 * @example
 * const additionalData: AdditionalTemplateData = {
 *   jobTitle: 'Senior Software Engineer',
 *   candidateName: 'Jane Smith',
 *   detailedAnalysis: 'Candidate shows strong technical skills...',
 *   companyLogo: 'https://example.com/logo.png',
 *   companyName: 'Acme Corp',
 *   candidates: [candidate1, candidate2],
 *   interviewQuestions: [technicalQuestions, behavioralQuestions]
 * };
 */
export interface AdditionalTemplateData {
  jobTitle?: string;
  candidateName?: string;
  detailedAnalysis?: string;
  companyLogo?: string;
  companyName?: string;
  candidates?: CandidateComparisonData[];
  interviewQuestions?: InterviewQuestion[];
  customData?: Record<string, unknown>;
}

/**
 * Defines the configuration for a report template.
 * Specifies the type, format, and content of generated reports.
 *
 * @example
 * const template: ReportTemplate = {
 *   type: 'individual',
 *   format: 'pdf',
 *   template: '# {{reportTitle}}\n\n## Summary\n{{summary}}',
 *   styles: 'body { font-family: Arial; }'
 * };
 */
export interface ReportTemplate {
  type:
    | 'individual'
    | 'comparison'
    | 'batch'
    | 'executive-summary'
    | 'interview-guide';
  format: 'markdown' | 'html' | 'json' | 'pdf' | 'excel';
  template: string;
  styles?: string;
}

/**
 * Defines all variables available to report templates during rendering.
 * Contains report metadata, scores, analysis, and recommendations.
 *
 * @example
 * const variables: TemplateVariables = {
 *   reportTitle: 'Recruitment Analysis Report',
 *   jobTitle: 'Senior Software Engineer',
 *   jobId: 'job-456',
 *   candidateName: 'John Doe',
 *   resumeId: 'resume-123',
 *   generatedAt: new Date(),
 *   overallScore: 85,
 *   scoreBreakdown: { skillsMatch: 90, experienceMatch: 80, educationMatch: 85, overallFit: 85 },
 *   summary: 'Strong candidate with excellent technical skills...',
 *   recommendation: { decision: 'Strong Hire', reasoning: '...' }
 * };
 */
export interface TemplateVariables {
  reportTitle: string;
  jobTitle: string;
  jobId: string;
  candidateName?: string;
  resumeId?: string;
  generatedAt: Date;
  overallScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  skillsAnalysis?: MatchingSkill[];
  recommendation?: ReportRecommendation;
  summary: string;
  detailedAnalysis?: string;
  companyLogo?: string;
  companyName?: string;
  candidates?: CandidateComparisonData[];
  interviewQuestions?: InterviewQuestion[];
}

/**
 * Defines the shape of a generated report file with string content.
 * Used for text-based formats like markdown, HTML, and JSON.
 * PDF and Excel use GeneratedBinaryReportFile instead.
 *
 * @example
 * const report: GeneratedReportFile = {
 *   content: '# Report Title\n\n## Summary\n...',
 *   filename: 'individual-report-job-456-resume-123-2024-02-28.md',
 *   mimeType: 'text/markdown',
 *   metadata: {
 *     reportType: 'markdown',
 *     jobId: 'job-456',
 *     resumeId: 'resume-123',
 *     generatedBy: 'report-templates-service',
 *     generatedAt: new Date(),
 *     mimeType: 'text/markdown',
 *     encoding: 'utf-8'
 *   }
 * };
 */
export interface GeneratedReportFile {
  content: string;
  filename: string;
  mimeType: string;
  metadata: ReportFileMetadata;
}

/**
 * Defines the shape of a generated report file with binary content.
 * Used for binary formats like PDF and Excel that require Buffer storage.
 *
 * @example
 * const report: GeneratedBinaryReportFile = {
 *   content: pdfBuffer,
 *   filename: 'individual-report-job-456-resume-123-2024-02-28.pdf',
 *   mimeType: 'application/pdf',
 *   metadata: {
 *     reportType: 'pdf',
 *     jobId: 'job-456',
 *     resumeId: 'resume-123',
 *     generatedBy: 'report-templates-service',
 *     generatedAt: new Date(),
 *     mimeType: 'application/pdf',
 *     encoding: 'binary',
 *     fileSize: 102400
 *   }
 * };
 */
export interface GeneratedBinaryReportFile {
  content: Buffer;
  filename: string;
  mimeType: string;
  metadata: ReportFileMetadata;
}

/**
 * PDF generation options for Puppeteer page.pdf() method.
 * Configures paper size, margins, scaling, and header/footer templates.
 *
 * @example
 * const options: PdfGenerationOptions = {
 *   format: 'A4',
 *   printBackground: true,
 *   margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
 *   scale: 1,
 *   displayHeaderFooter: true,
 *   footerTemplate: '<div style="text-align:center">Page <span class="pageNumber"/></div>'
 * };
 */
export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  scale?: number;
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
}

/**
 * Default PDF generation options.
 */
const DEFAULT_PDF_OPTIONS: PdfGenerationOptions = {
  format: 'A4',
  printBackground: true,
  margin: {
    top: '20mm',
    bottom: '20mm',
    left: '15mm',
    right: '15mm',
  },
  scale: 1,
  displayHeaderFooter: true,
  footerTemplate: `
    <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `,
};

/**
 * Provides report templates functionality.
 */
@Injectable()
export class ReportTemplatesService implements OnModuleDestroy {
  private readonly logger = new Logger(ReportTemplatesService.name);
  private browser: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;

  /**
   * Initializes a new instance of the Report Templates Service.
   * @param gridFsService - The grid fs service.
   */
  constructor(private readonly gridFsService: GridFsService) {}

  /**
   * Cleanup browser instance when the module is destroyed.
   */
  public async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log('Puppeteer browser instance closed');
      } catch (error) {
        this.logger.error('Failed to close Puppeteer browser', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      this.browser = null;
    }
  }

  /**
   * Gets or creates a shared Puppeteer browser instance.
   * Uses a singleton pattern with lazy initialization and connection pooling.
   * @returns A promise that resolves to a Browser instance.
   * @throws ReportGeneratorException with code 'BROWSER_LAUNCH_FAILED' if browser launch fails.
   */
  private async getBrowser(): Promise<Browser> {
    const correlationContext = ErrorCorrelationManager.getContext();

    // If browser exists and is connected, return it
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    // If there's already a launch in progress, wait for it
    if (this.browserLaunchPromise) {
      return this.browserLaunchPromise;
    }

    // Launch a new browser instance
    this.browserLaunchPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    });

    try {
      this.browser = await this.browserLaunchPromise;
      this.logger.debug('Puppeteer browser instance launched');
      return this.browser;
    } catch (error) {
      this.browserLaunchPromise = null;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Failed to launch Puppeteer browser', {
        error: errorMessage,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('BROWSER_LAUNCH_FAILED', {
        error: errorMessage,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    } finally {
      this.browserLaunchPromise = null;
    }
  }

  /**
   * Generates a PDF from HTML content using Puppeteer.
   * @param htmlContent - The HTML content to convert to PDF.
   * @param options - PDF generation options.
   * @returns A promise that resolves to a PDF Buffer.
   * @throws ReportGeneratorException with specific error codes for different failure scenarios.
   */
  private async generatePdfFromHtml(
    htmlContent: string,
    options: PdfGenerationOptions = DEFAULT_PDF_OPTIONS,
  ): Promise<Buffer> {
    const correlationContext = ErrorCorrelationManager.getContext();
    let page: Page | null = null;

    try {
      // Step 1: Get or launch browser (will throw ReportGeneratorException on failure)
      const browser = await this.getBrowser();

      // Step 2: Create new page
      try {
        page = await browser.newPage();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to create new browser page', {
          error: errorMessage,
          correlationId: correlationContext?.traceId,
        });
        throw new ReportGeneratorException('PAGE_CREATION_FAILED', {
          error: errorMessage,
          correlationId: correlationContext?.traceId,
          originalError: error,
        } as TemplateErrorContext);
      }

      // Step 3: Set page content
      try {
        await page.setContent(htmlContent, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to render HTML content in page', {
          error: errorMessage,
          htmlLength: htmlContent.length,
          correlationId: correlationContext?.traceId,
        });
        throw new ReportGeneratorException('PAGE_RENDER_FAILED', {
          error: errorMessage,
          htmlLength: htmlContent.length,
          correlationId: correlationContext?.traceId,
          originalError: error,
        } as TemplateErrorContext);
      }

      // Step 4: Generate PDF
      let pdfBuffer: Buffer;
      try {
        const rawPdfBuffer = await page.pdf({
          format: options.format ?? 'A4',
          printBackground: options.printBackground ?? true,
          margin: {
            top: options.margin?.top ?? '20mm',
            bottom: options.margin?.bottom ?? '20mm',
            left: options.margin?.left ?? '15mm',
            right: options.margin?.right ?? '15mm',
          },
          scale: options.scale ?? 1,
          headerTemplate: options.headerTemplate ?? '',
          footerTemplate: options.footerTemplate ?? '',
          displayHeaderFooter: options.displayHeaderFooter ?? false,
        });
        pdfBuffer = Buffer.from(rawPdfBuffer);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to generate PDF buffer', {
          error: errorMessage,
          htmlLength: htmlContent.length,
          correlationId: correlationContext?.traceId,
        });
        throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
          error: errorMessage,
          htmlLength: htmlContent.length,
          correlationId: correlationContext?.traceId,
          originalError: error,
        } as TemplateErrorContext);
      }

      this.logger.debug(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error during PDF generation', {
        error: errorMessage,
        htmlLength: htmlContent.length,
        correlationId: correlationContext?.traceId,
      });
      throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
        error: errorMessage,
        htmlLength: htmlContent.length,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    } finally {
      // Always clean up the page resource
      if (page) {
        try {
          await page.close();
          this.logger.debug('Browser page closed successfully');
        } catch (cleanupError) {
          // Log cleanup errors but don't throw - the main operation may have succeeded
          this.logger.warn('Failed to close browser page during cleanup', {
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            correlationId: correlationContext?.traceId,
          });
        }
      }
    }
  }

  /**
   * Generates report in format.
   * @param reportData - The report data.
   * @param format - The format.
   * @param templateType - The template type.
   * @param additionalData - The additional data.
   * @returns A promise that resolves to GeneratedReportFile.
   * @throws ReportGeneratorException with code 'TEMPLATE_RENDER_FAILED' for rendering errors.
   */
  public async generateReportInFormat(
    reportData: ReportDocument,
    format: 'markdown' | 'html' | 'json' | 'pdf' | 'excel',
    templateType:
      | 'individual'
      | 'comparison'
      | 'batch'
      | 'executive-summary'
      | 'interview-guide' = 'individual',
    additionalData?: AdditionalTemplateData,
  ): Promise<GeneratedReportFile> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      this.logger.debug(`Generating ${format} report for ${templateType}`, {
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        format,
        templateType,
        correlationId: correlationContext?.traceId,
      });

      // Validate input data
      if (!reportData || !reportData.jobId || !reportData.resumeId) {
        throw new ReportGeneratorException('INVALID_TEMPLATE_DATA', {
          error: 'Missing required report data fields',
          jobId: reportData?.jobId,
          resumeId: reportData?.resumeId,
          correlationId: correlationContext?.traceId,
        } as TemplateErrorContext);
      }

      const variables = this.buildTemplateVariables(reportData, additionalData);
      let content: string;
      let mimeType: string;
      let extension: string;

      try {
        switch (format) {
          case 'markdown':
            content = await this.generateMarkdownReport(templateType, variables);
            mimeType = 'text/markdown';
            extension = 'md';
            break;
          case 'html':
            content = await this.generateHtmlReport(templateType, variables);
            mimeType = 'text/html';
            extension = 'html';
            break;
          case 'json':
            content = await this.generateJsonReport(templateType, variables);
            mimeType = 'application/json';
            extension = 'json';
            break;
          case 'pdf':
            content = await this.generatePdfReport(templateType, variables);
            mimeType = 'application/pdf';
            extension = 'pdf';
            break;
          case 'excel':
            content = await this.generateExcelReport(templateType, variables);
            mimeType =
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            extension = 'xlsx';
            break;
          default:
            throw new ReportGeneratorException('TEMPLATE_RENDER_FAILED', {
              error: `Unsupported format: ${format}`,
              format,
              templateType,
              jobId: reportData.jobId,
              resumeId: reportData.resumeId,
              correlationId: correlationContext?.traceId,
            } as TemplateErrorContext);
        }
      } catch (error) {
        // If it's already a ReportGeneratorException, re-throw it
        if (error instanceof ReportGeneratorException) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to render report template', {
          error: errorMessage,
          format,
          templateType,
          jobId: reportData.jobId,
          resumeId: reportData.resumeId,
          correlationId: correlationContext?.traceId,
        });

        throw new ReportGeneratorException('TEMPLATE_RENDER_FAILED', {
          error: errorMessage,
          format,
          templateType,
          jobId: reportData.jobId,
          resumeId: reportData.resumeId,
          correlationId: correlationContext?.traceId,
          originalError: error,
        } as TemplateErrorContext);
      }

      const filename = this.generateFilename(
        templateType,
        reportData.jobId,
        reportData.resumeId,
        extension,
      );

      const metadata: ReportFileMetadata = {
        reportType: format,
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        generatedBy: 'report-templates-service',
        generatedAt: new Date(),
        mimeType,
        encoding: format === 'pdf' || format === 'excel' ? 'binary' : 'utf-8',
      };

      this.logger.debug(`Successfully generated ${format} report`, {
        filename,
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        correlationId: correlationContext?.traceId,
      });

      return {
        content,
        filename,
        mimeType,
        metadata,
      };
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error in generateReportInFormat', {
        error: errorMessage,
        format,
        templateType,
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('TEMPLATE_RENDER_FAILED', {
        error: errorMessage,
        format,
        templateType,
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  private async generateMarkdownReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      const template = this.getMarkdownTemplate(templateType);
      return this.interpolateTemplate(template, variables);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate markdown report', {
        error: errorMessage,
        templateType,
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('TEMPLATE_RENDER_FAILED', {
        error: errorMessage,
        templateType,
        format: 'markdown',
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  private async generateHtmlReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      // First generate markdown, then convert to HTML with custom styling
      const markdownContent = await this.generateMarkdownReport(
        templateType,
        variables,
      );

      let htmlContent: string;
      try {
        htmlContent = await marked.parse(markdownContent);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        this.logger.error('Failed to parse markdown to HTML', {
          error: errorMessage,
          templateType,
          markdownLength: markdownContent.length,
          correlationId: correlationContext?.traceId,
        });

        throw new ReportGeneratorException('MARKDOWN_PARSE_FAILED', {
          error: errorMessage,
          templateType,
          format: 'html',
          correlationId: correlationContext?.traceId,
          originalError: parseError,
        } as TemplateErrorContext);
      }

      const styles = this.getHtmlStyles(templateType);
      return this.wrapInHtmlTemplate(htmlContent, styles, variables);
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate HTML report', {
        error: errorMessage,
        templateType,
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('HTML_GENERATION_FAILED', {
        error: errorMessage,
        templateType,
        format: 'html',
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  private async generateJsonReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      const jsonData = {
        metadata: {
          reportType: templateType,
          generatedAt: variables.generatedAt,
          jobId: variables.jobId,
          resumeId: variables.resumeId,
          jobTitle: variables.jobTitle,
          candidateName: variables.candidateName,
        },
        summary: variables.summary,
        overallScore: variables.overallScore,
        scoreBreakdown: variables.scoreBreakdown,
        skillsAnalysis: variables.skillsAnalysis,
        recommendation: variables.recommendation,
        detailedAnalysis: variables.detailedAnalysis,
        candidates: variables.candidates,
        interviewQuestions: variables.interviewQuestions,
      };

      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate JSON report', {
        error: errorMessage,
        templateType,
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('TEMPLATE_RENDER_FAILED', {
        error: errorMessage,
        templateType,
        format: 'json',
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  private async generatePdfReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    this.logger.debug(`Generating PDF report for template type: ${templateType}`, {
      jobId: variables.jobId,
      resumeId: variables.resumeId,
      correlationId: correlationContext?.traceId,
    });

    try {
      // Generate HTML content
      const htmlContent = await this.generateHtmlReport(templateType, variables);

      // Convert HTML to PDF using Puppeteer
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent, {
        ...DEFAULT_PDF_OPTIONS,
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Generated by AI Recruitment Clerk - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      // Return base64 encoded content for storage (matching existing contract)
      return pdfBuffer.toString('base64');
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate PDF report', {
        error: errorMessage,
        templateType,
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
        error: errorMessage,
        templateType,
        format: 'pdf',
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  /**
   * Generates a real Excel report using ExcelJS.
   * @param templateType - The template type.
   * @param variables - The template variables.
   * @returns A promise that resolves to base64-encoded Excel content.
   * @throws ReportGeneratorException with code 'EXCEL_WORKBOOK_FAILED' for Excel generation errors.
   */
  private async generateExcelReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    this.logger.debug(`Generating Excel report for template type: ${templateType}`, {
      jobId: variables.jobId,
      resumeId: variables.resumeId,
      correlationId: correlationContext?.traceId,
    });

    try {
      const workbook = new Workbook();
      workbook.creator = 'AI Recruitment Clerk';
      workbook.created = new Date();

      // Create worksheets with individual error handling
      try {
        this.createSummaryWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Summary worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      try {
        this.createScoreBreakdownWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Score Breakdown worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      try {
        this.createSkillsAnalysisWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Skills Analysis worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      try {
        this.createRecommendationWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Recommendation worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      // For comparison reports, add candidates worksheet
      if (templateType === 'comparison' && variables.candidates) {
        try {
          this.createCandidatesComparisonWorksheet(workbook, variables);
        } catch (error) {
          this.logger.warn('Failed to create Candidates Comparison worksheet', {
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId: correlationContext?.traceId,
          });
        }
      }

      // Generate buffer and convert to base64 for storage
      let buffer: Buffer;
      try {
        const rawBuffer = await workbook.xlsx.writeBuffer();
        buffer = Buffer.from(rawBuffer);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to write Excel workbook buffer', {
          error: errorMessage,
          templateType,
          jobId: variables.jobId,
          resumeId: variables.resumeId,
          correlationId: correlationContext?.traceId,
        });

        throw new ReportGeneratorException('EXCEL_WORKBOOK_FAILED', {
          error: errorMessage,
          templateType,
          format: 'excel',
          jobId: variables.jobId,
          resumeId: variables.resumeId,
          correlationId: correlationContext?.traceId,
          originalError: error,
        } as TemplateErrorContext);
      }

      this.logger.debug(`Excel report generated successfully, size: ${buffer.length} bytes`, {
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
      });

      return buffer.toString('base64');
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error during Excel report generation', {
        error: errorMessage,
        templateType,
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('EXCEL_WORKBOOK_FAILED', {
        error: errorMessage,
        templateType,
        format: 'excel',
        jobId: variables.jobId,
        resumeId: variables.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  /**
   * Generates a real Excel report using ExcelJS and returns a Buffer.
   * This is the preferred method for storing Excel files in GridFS.
   * @param reportData - The report data.
   * @param templateType - The template type.
   * @param additionalData - The additional data.
   * @returns A promise that resolves to GeneratedBinaryReportFile.
   * @throws ReportGeneratorException with code 'EXCEL_WORKBOOK_FAILED' for Excel generation errors.
   */
  public async generateExcelReportBuffer(
    reportData: ReportDocument,
    templateType:
      | 'individual'
      | 'comparison'
      | 'batch'
      | 'executive-summary'
      | 'interview-guide' = 'individual',
    additionalData?: AdditionalTemplateData,
  ): Promise<GeneratedBinaryReportFile> {
    const correlationContext = ErrorCorrelationManager.getContext();

    this.logger.debug(`Generating Excel report buffer for template type: ${templateType}`, {
      jobId: reportData.jobId,
      resumeId: reportData.resumeId,
      correlationId: correlationContext?.traceId,
    });

    try {
      // Validate input data
      if (!reportData || !reportData.jobId || !reportData.resumeId) {
        throw new ReportGeneratorException('INVALID_TEMPLATE_DATA', {
          error: 'Missing required report data fields',
          jobId: reportData?.jobId,
          resumeId: reportData?.resumeId,
          correlationId: correlationContext?.traceId,
        } as TemplateErrorContext);
      }

      const variables = this.buildTemplateVariables(reportData, additionalData);

      const workbook = new Workbook();
      workbook.creator = 'AI Recruitment Clerk';
      workbook.created = new Date();

      // Create worksheets with individual error handling
      try {
        this.createSummaryWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Summary worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      try {
        this.createScoreBreakdownWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Score Breakdown worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      try {
        this.createSkillsAnalysisWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Skills Analysis worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      try {
        this.createRecommendationWorksheet(workbook, variables);
      } catch (error) {
        this.logger.warn('Failed to create Recommendation worksheet, continuing with other sheets', {
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: correlationContext?.traceId,
        });
      }

      // For comparison reports, add candidates worksheet
      if (templateType === 'comparison' && variables.candidates) {
        try {
          this.createCandidatesComparisonWorksheet(workbook, variables);
        } catch (error) {
          this.logger.warn('Failed to create Candidates Comparison worksheet', {
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId: correlationContext?.traceId,
          });
        }
      }

      // Generate buffer
      let buffer: Buffer;
      try {
        const rawBuffer = await workbook.xlsx.writeBuffer();
        buffer = Buffer.from(rawBuffer);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to write Excel workbook buffer', {
          error: errorMessage,
          templateType,
          jobId: reportData.jobId,
          resumeId: reportData.resumeId,
          correlationId: correlationContext?.traceId,
        });

        throw new ReportGeneratorException('EXCEL_WORKBOOK_FAILED', {
          error: errorMessage,
          templateType,
          format: 'excel',
          jobId: reportData.jobId,
          resumeId: reportData.resumeId,
          correlationId: correlationContext?.traceId,
          originalError: error,
        } as TemplateErrorContext);
      }

      const filename = this.generateFilename(
        templateType,
        reportData.jobId,
        reportData.resumeId,
        'xlsx',
      );

      const metadata: ReportFileMetadata = {
        reportType: 'excel',
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        generatedBy: 'report-templates-service',
        generatedAt: new Date(),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        encoding: 'binary',
        fileSize: buffer.length,
      };

      this.logger.debug(`Excel report buffer generated successfully`, {
        filename,
        size: buffer.length,
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        correlationId: correlationContext?.traceId,
      });

      return {
        content: buffer,
        filename,
        mimeType: metadata.mimeType,
        metadata,
      };
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Unexpected error during Excel report buffer generation', {
        error: errorMessage,
        templateType,
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('EXCEL_WORKBOOK_FAILED', {
        error: errorMessage,
        templateType,
        format: 'excel',
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  /**
   * Generates and saves an Excel report directly to GridFS.
   * @param reportData - The report data.
   * @param templateType - The template type.
   * @param additionalData - The additional data.
   * @returns A promise that resolves to the GridFS file ID.
   * @throws ReportGeneratorException with code 'EXCEL_WORKBOOK_FAILED' for Excel generation errors.
   */
  public async generateAndSaveExcelReport(
    reportData: ReportDocument,
    templateType:
      | 'individual'
      | 'comparison'
      | 'batch'
      | 'executive-summary'
      | 'interview-guide' = 'individual',
    additionalData?: AdditionalTemplateData,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      const excelReport = await this.generateExcelReportBuffer(
        reportData,
        templateType,
        additionalData,
      );

      return await this.saveGeneratedReportBuffer(
        excelReport.content,
        excelReport.filename,
        excelReport.metadata,
      );
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate and save Excel report', {
        error: errorMessage,
        templateType,
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('EXCEL_WORKBOOK_FAILED', {
        error: errorMessage,
        templateType,
        format: 'excel',
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  /**
   * Generates a real PDF report using Puppeteer and returns a Buffer.
   * This is the preferred method for storing PDF files in GridFS.
   * @param reportData - The report data.
   * @param templateType - The template type.
   * @param additionalData - The additional data.
   * @param pdfOptions - Optional PDF generation options.
   * @returns A promise that resolves to GeneratedBinaryReportFile.
   * @throws ReportGeneratorException with code 'PDF_GENERATION_FAILED' for PDF generation errors.
   */
  public async generatePdfReportBuffer(
    reportData: ReportDocument,
    templateType:
      | 'individual'
      | 'comparison'
      | 'batch'
      | 'executive-summary'
      | 'interview-guide' = 'individual',
    additionalData?: AdditionalTemplateData,
    pdfOptions?: PdfGenerationOptions,
  ): Promise<GeneratedBinaryReportFile> {
    const correlationContext = ErrorCorrelationManager.getContext();

    this.logger.debug(`Generating PDF report buffer for template type: ${templateType}`, {
      jobId: reportData.jobId,
      resumeId: reportData.resumeId,
      correlationId: correlationContext?.traceId,
    });

    try {
      // Validate input data
      if (!reportData || !reportData.jobId || !reportData.resumeId) {
        throw new ReportGeneratorException('INVALID_TEMPLATE_DATA', {
          error: 'Missing required report data fields',
          jobId: reportData?.jobId,
          resumeId: reportData?.resumeId,
          correlationId: correlationContext?.traceId,
        } as TemplateErrorContext);
      }

      const variables = this.buildTemplateVariables(reportData, additionalData);

      // Generate HTML content
      const htmlContent = await this.generateHtmlReport(templateType, variables);

      // Merge default options with provided options
      const mergedOptions: PdfGenerationOptions = {
        ...DEFAULT_PDF_OPTIONS,
        ...pdfOptions,
        footerTemplate:
          pdfOptions?.footerTemplate ??
          `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Generated by AI Recruitment Clerk - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      };

      // Convert HTML to PDF using Puppeteer
      const buffer = await this.generatePdfFromHtml(htmlContent, mergedOptions);

      const filename = this.generateFilename(
        templateType,
        reportData.jobId,
        reportData.resumeId,
        'pdf',
      );

      const metadata: ReportFileMetadata = {
        reportType: 'pdf',
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        generatedBy: 'report-templates-service',
        generatedAt: new Date(),
        mimeType: 'application/pdf',
        encoding: 'binary',
        fileSize: buffer.length,
      };

      this.logger.debug(`PDF report buffer generated successfully`, {
        filename,
        size: buffer.length,
        jobId: reportData.jobId,
        resumeId: reportData.resumeId,
        correlationId: correlationContext?.traceId,
      });

      return {
        content: buffer,
        filename,
        mimeType: metadata.mimeType,
        metadata,
      };
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate PDF report buffer', {
        error: errorMessage,
        templateType,
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
        error: errorMessage,
        templateType,
        format: 'pdf',
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  /**
   * Generates and saves a PDF report directly to GridFS.
   * @param reportData - The report data.
   * @param templateType - The template type.
   * @param additionalData - The additional data.
   * @param pdfOptions - Optional PDF generation options.
   * @returns A promise that resolves to the GridFS file ID.
   * @throws ReportGeneratorException with code 'PDF_GENERATION_FAILED' for PDF generation errors.
   */
  public async generateAndSavePdfReport(
    reportData: ReportDocument,
    templateType:
      | 'individual'
      | 'comparison'
      | 'batch'
      | 'executive-summary'
      | 'interview-guide' = 'individual',
    additionalData?: AdditionalTemplateData,
    pdfOptions?: PdfGenerationOptions,
  ): Promise<string> {
    const correlationContext = ErrorCorrelationManager.getContext();

    try {
      const pdfReport = await this.generatePdfReportBuffer(
        reportData,
        templateType,
        additionalData,
        pdfOptions,
      );

      return await this.saveGeneratedReportBuffer(
        pdfReport.content,
        pdfReport.filename,
        pdfReport.metadata,
      );
    } catch (error) {
      // If it's already a ReportGeneratorException, re-throw it
      if (error instanceof ReportGeneratorException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate and save PDF report', {
        error: errorMessage,
        templateType,
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
      });

      throw new ReportGeneratorException('PDF_GENERATION_FAILED', {
        error: errorMessage,
        templateType,
        format: 'pdf',
        jobId: reportData?.jobId,
        resumeId: reportData?.resumeId,
        correlationId: correlationContext?.traceId,
        originalError: error,
      } as TemplateErrorContext);
    }
  }

  /**
   * Creates the Summary worksheet.
   * @param workbook - The Excel workbook.
   * @param variables - The template variables.
   */
  private createSummaryWorksheet(
    workbook: Workbook,
    variables: TemplateVariables,
  ): void {
    const sheet = workbook.addWorksheet('Summary', {
      views: [{ showGridLines: false }],
    });

    // Set column widths
    sheet.columns = [
      { width: 25 },
      { width: 50 },
    ];

    // Add title
    const titleCell = sheet.getCell('A1');
    titleCell.value = variables.reportTitle;
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells('A1:B1');

    // Add metadata section
    this.addMetadataRow(sheet, 3, 'Position', variables.jobTitle);
    this.addMetadataRow(sheet, 4, 'Job ID', variables.jobId);
    this.addMetadataRow(sheet, 5, 'Candidate', variables.candidateName ?? 'N/A');
    this.addMetadataRow(sheet, 6, 'Resume ID', variables.resumeId ?? 'N/A');
    this.addMetadataRow(sheet, 7, 'Generated', variables.generatedAt.toLocaleString());

    // Add overall score section
    sheet.getCell('A9').value = 'Overall Assessment';
    sheet.getCell('A9').font = { size: 14, bold: true };
    sheet.mergeCells('A9:B9');

    if (variables.overallScore !== undefined) {
      const scoreCell = sheet.getCell('A10');
      scoreCell.value = 'Match Score';
      scoreCell.font = { bold: true };

      const scoreValueCell = sheet.getCell('B10');
      scoreValueCell.value = `${variables.overallScore}%`;
      scoreValueCell.font = {
        size: 16,
        bold: true,
        color: { argb: this.getScoreColor(variables.overallScore) },
      };
    }

    if (variables.recommendation?.decision) {
      this.addMetadataRow(sheet, 11, 'Recommendation', variables.recommendation.decision);
    }

    // Add summary section
    sheet.getCell('A13').value = 'Summary';
    sheet.getCell('A13').font = { size: 14, bold: true };
    sheet.mergeCells('A13:B13');

    sheet.getCell('A14').value = variables.summary;
    sheet.getCell('A14').alignment = { wrapText: true, vertical: 'top' };
    sheet.mergeCells('A14:B16');
    sheet.getRow(14).height = 60;
  }

  /**
   * Creates the Score Breakdown worksheet.
   * @param workbook - The Excel workbook.
   * @param variables - The template variables.
   */
  private createScoreBreakdownWorksheet(
    workbook: Workbook,
    variables: TemplateVariables,
  ): void {
    const sheet = workbook.addWorksheet('Score Breakdown', {
      views: [{ showGridLines: false }],
    });

    // Set column widths
    sheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 20 },
    ];

    // Add title
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Score Breakdown';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells('A1:C1');

    // Add headers
    const headerRow = sheet.getRow(3);
    headerRow.values = ['Category', 'Score', 'Status'];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };

    // Add score data
    if (variables.scoreBreakdown) {
      const scores = [
        { name: 'Skills Match', value: variables.scoreBreakdown.skillsMatch },
        { name: 'Experience Match', value: variables.scoreBreakdown.experienceMatch },
        { name: 'Education Match', value: variables.scoreBreakdown.educationMatch },
        { name: 'Overall Fit', value: variables.scoreBreakdown.overallFit },
      ];

      scores.forEach((score, index) => {
        const row = sheet.getRow(4 + index);
        row.values = [score.name, `${score.value}%`, this.getScoreStatus(score.value)];
        row.getCell(2).font = {
          color: { argb: this.getScoreColor(score.value) },
        };
      });
    }
  }

  /**
   * Creates the Skills Analysis worksheet.
   * @param workbook - The Excel workbook.
   * @param variables - The template variables.
   */
  private createSkillsAnalysisWorksheet(
    workbook: Workbook,
    variables: TemplateVariables,
  ): void {
    const sheet = workbook.addWorksheet('Skills Analysis', {
      views: [{ showGridLines: false }],
    });

    // Set column widths
    sheet.columns = [
      { width: 25 },
      { width: 12 },
      { width: 15 },
      { width: 50 },
    ];

    // Add title
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Skills Analysis';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells('A1:D1');

    // Add headers
    const headerRow = sheet.getRow(3);
    headerRow.values = ['Skill', 'Score', 'Match Type', 'Explanation'];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };

    // Add skills data
    if (variables.skillsAnalysis && variables.skillsAnalysis.length > 0) {
      variables.skillsAnalysis.forEach((skill, index) => {
        const row = sheet.getRow(4 + index);
        row.values = [
          skill.skill,
          `${skill.matchScore}%`,
          skill.matchType,
          skill.explanation ?? '',
        ];
        row.getCell(2).font = {
          color: { argb: this.getScoreColor(skill.matchScore) },
        };
        row.getCell(4).alignment = { wrapText: true };
      });
    } else {
      sheet.getCell('A4').value = 'No skills analysis available';
    }
  }

  /**
   * Creates the Recommendation worksheet.
   * @param workbook - The Excel workbook.
   * @param variables - The template variables.
   */
  private createRecommendationWorksheet(
    workbook: Workbook,
    variables: TemplateVariables,
  ): void {
    const sheet = workbook.addWorksheet('Recommendation', {
      views: [{ showGridLines: false }],
    });

    // Set column widths
    sheet.columns = [
      { width: 60 },
    ];

    // Add title
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Recommendation';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF4472C4' } };

    if (variables.recommendation) {
      const rec = variables.recommendation;

      // Decision
      sheet.getCell('A3').value = 'Decision';
      sheet.getCell('A3').font = { bold: true };
      sheet.getCell('A4').value = rec.decision ?? 'N/A';
      sheet.getCell('A4').font = {
        size: 14,
        bold: true,
        color: { argb: this.getRecommendationColor(rec.decision) },
      };

      // Reasoning
      sheet.getCell('A6').value = 'Reasoning';
      sheet.getCell('A6').font = { bold: true };
      sheet.getCell('A7').value = rec.reasoning ?? 'N/A';
      sheet.getCell('A7').alignment = { wrapText: true };
      sheet.getRow(7).height = 45;

      // Strengths
      if (rec.strengths && rec.strengths.length > 0) {
        sheet.getCell('A9').value = 'Strengths';
        sheet.getCell('A9').font = { bold: true, color: { argb: 'FF28A745' } };
        rec.strengths.forEach((strength, idx) => {
          sheet.getCell(`A${10 + idx}`).value = `+ ${strength}`;
          sheet.getCell(`A${10 + idx}`).font = { color: { argb: 'FF28A745' } };
        });
      }

      // Concerns
      const concernsStartRow = 10 + (rec.strengths?.length ?? 0) + 1;
      if (rec.concerns && rec.concerns.length > 0) {
        sheet.getCell(`A${concernsStartRow}`).value = 'Concerns';
        sheet.getCell(`A${concernsStartRow}`).font = { bold: true, color: { argb: 'FFDC3545' } };
        rec.concerns.forEach((concern, idx) => {
          sheet.getCell(`A${concernsStartRow + 1 + idx}`).value = `- ${concern}`;
          sheet.getCell(`A${concernsStartRow + 1 + idx}`).font = { color: { argb: 'FFDC3545' } };
        });
      }

      // Suggestions
      const suggestionsStartRow = concernsStartRow + (rec.concerns?.length ?? 0) + 2;
      if (rec.suggestions && rec.suggestions.length > 0) {
        sheet.getCell(`A${suggestionsStartRow}`).value = 'Suggestions';
        sheet.getCell(`A${suggestionsStartRow}`).font = { bold: true, color: { argb: 'FF007BFF' } };
        rec.suggestions.forEach((suggestion, idx) => {
          sheet.getCell(`A${suggestionsStartRow + 1 + idx}`).value = `${idx + 1}. ${suggestion}`;
          sheet.getCell(`A${suggestionsStartRow + 1 + idx}`).font = { color: { argb: 'FF007BFF' } };
        });
      }
    } else {
      sheet.getCell('A3').value = 'No recommendation available';
    }
  }

  /**
   * Creates the Candidates Comparison worksheet for comparison reports.
   * @param workbook - The Excel workbook.
   * @param variables - The template variables.
   */
  private createCandidatesComparisonWorksheet(
    workbook: Workbook,
    variables: TemplateVariables,
  ): void {
    const sheet = workbook.addWorksheet('Candidate Comparison', {
      views: [{ showGridLines: false }],
    });

    // Set column widths
    sheet.columns = [
      { width: 25 },
      { width: 12 },
      { width: 20 },
      { width: 30 },
      { width: 30 },
    ];

    // Add title
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Candidate Comparison';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells('A1:E1');

    // Add headers
    const headerRow = sheet.getRow(3);
    headerRow.values = ['Candidate', 'Score', 'Recommendation', 'Key Skills', 'Strengths'];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };

    // Add candidate data
    if (variables.candidates && variables.candidates.length > 0) {
      variables.candidates.forEach((candidate, index) => {
        const row = sheet.getRow(4 + index);
        row.values = [
          candidate.name,
          `${candidate.score}%`,
          candidate.recommendation,
          candidate.skills.join(', '),
          candidate.strengths?.join(', ') ?? '',
        ];
        row.getCell(2).font = {
          color: { argb: this.getScoreColor(candidate.score) },
        };
        row.getCell(4).alignment = { wrapText: true };
        row.getCell(5).alignment = { wrapText: true };
      });

      // Add borders to the table
      const tableEndRow = 3 + variables.candidates.length;
      for (let i = 3; i <= tableEndRow; i++) {
        for (let j = 1; j <= 5; j++) {
          const cell = sheet.getRow(i).getCell(j);
          cell.border = {
            top: { style: 'thin' as BorderStyle },
            left: { style: 'thin' as BorderStyle },
            bottom: { style: 'thin' as BorderStyle },
            right: { style: 'thin' as BorderStyle },
          };
        }
      }
    } else {
      sheet.getCell('A4').value = 'No candidates to compare';
    }
  }

  /**
   * Adds a metadata row to a worksheet.
   * @param sheet - The worksheet.
   * @param rowNum - The row number.
   * @param label - The label.
   * @param value - The value.
   */
  private addMetadataRow(
    sheet: Worksheet,
    rowNum: number,
    label: string,
    value: string,
  ): void {
    sheet.getCell(`A${rowNum}`).value = label;
    sheet.getCell(`A${rowNum}`).font = { bold: true };
    sheet.getCell(`B${rowNum}`).value = value;
  }

  /**
   * Gets the color for a score value.
   * @param score - The score value (0-100).
   * @returns The ARGB color string.
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return 'FF28A745'; // Green
    if (score >= 60) return 'FF28A745'; // Green
    if (score >= 40) return 'FFFFC107'; // Yellow
    return 'FFDC3545'; // Red
  }

  /**
   * Gets the status text for a score value.
   * @param score - The score value (0-100).
   * @returns The status text.
   */
  private getScoreStatus(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Gets the color for a recommendation decision.
   * @param decision - The recommendation decision.
   * @returns The ARGB color string.
   */
  private getRecommendationColor(decision: string | undefined): string {
    if (!decision) return 'FF6C757D'; // Gray
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes('strong') || lowerDecision.includes('highly')) {
      return 'FF28A745'; // Green
    }
    if (lowerDecision.includes('proceed') || lowerDecision.includes('recommend')) {
      return 'FF28A745'; // Green
    }
    if (lowerDecision.includes('consider') || lowerDecision.includes('maybe')) {
      return 'FFFFC107'; // Yellow
    }
    if (lowerDecision.includes('reject') || lowerDecision.includes('not')) {
      return 'FFDC3545'; // Red
    }
    return 'FF6C757D'; // Gray
  }

  private buildTemplateVariables(
    reportData: ReportDocument,
    additionalData?: AdditionalTemplateData,
  ): TemplateVariables {
    return {
      reportTitle: `Recruitment Analysis Report - ${reportData.jobId}`,
      jobTitle: additionalData?.jobTitle || `Position ${reportData.jobId}`,
      jobId: reportData.jobId,
      candidateName:
        additionalData?.candidateName || `Candidate ${reportData.resumeId}`,
      resumeId: reportData.resumeId,
      generatedAt: reportData.generatedAt || new Date(),
      overallScore: Math.round(reportData.scoreBreakdown.overallFit),
      scoreBreakdown: reportData.scoreBreakdown,
      skillsAnalysis: reportData.skillsAnalysis,
      recommendation: reportData.recommendation,
      summary: reportData.summary,
      detailedAnalysis: additionalData?.detailedAnalysis,
      companyLogo: additionalData?.companyLogo,
      companyName: additionalData?.companyName || 'Your Company',
      candidates: additionalData?.candidates,
      interviewQuestions: additionalData?.interviewQuestions,
    };
  }

  private getMarkdownTemplate(templateType: string): string {
    switch (templateType) {
      case 'individual':
        return `# {{reportTitle}}

**Position:** {{jobTitle}}  
**Job ID:** {{jobId}}  
**Candidate:** {{candidateName}}  
**Resume ID:** {{resumeId}}  
**Generated:** {{generatedAt}}  

---

## Executive Summary

{{summary}}

## Overall Assessment

**Match Score:** {{overallScore}}%  
**Recommendation:** {{recommendation.decision}}

### Score Breakdown
- **Skills Match:** {{scoreBreakdown.skillsMatch}}%
- **Experience Match:** {{scoreBreakdown.experienceMatch}}%
- **Education Match:** {{scoreBreakdown.educationMatch}}%
- **Overall Fit:** {{scoreBreakdown.overallFit}}%

## Skills Analysis

{{#each skillsAnalysis}}
### {{skill}}
- **Match Score:** {{matchScore}}%
- **Match Type:** {{matchType}}
- **Analysis:** {{explanation}}

{{/each}}

## Recommendation Details

**Decision:** {{recommendation.decision}}

**Reasoning:** {{recommendation.reasoning}}

### Strengths
{{#each recommendation.strengths}}
- {{this}}
{{/each}}

### Areas of Concern
{{#each recommendation.concerns}}
- {{this}}
{{/each}}

### Suggestions
{{#each recommendation.suggestions}}
- {{this}}
{{/each}}

---

*Generated by AI Recruitment Clerk - {{generatedAt}}*`;

      case 'comparison':
        return `# Candidate Comparison Report

**Position:** {{jobTitle}}  
**Job ID:** {{jobId}}  
**Generated:** {{generatedAt}}  

---

## Summary

Comparison of {{candidates.length}} candidates for the {{jobTitle}} position.

## Candidate Rankings

{{#each candidates}}
### {{name}} ({{score}}% match)
- **Recommendation:** {{recommendation}}
- **Key Skills:** {{skills}}

{{/each}}

## Detailed Analysis

{{detailedAnalysis}}

---

*Generated by AI Recruitment Clerk - {{generatedAt}}*`;

      case 'interview-guide':
        return `# Interview Guide

**Position:** {{jobTitle}}  
**Candidate:** {{candidateName}}  
**Generated:** {{generatedAt}}  

---

## Candidate Overview

{{summary}}

## Recommended Interview Questions

{{#each interviewQuestions}}
### {{category}}

{{#each questions}}
**Q: {{question}}**

*What to look for:* {{lookFor}}

*Follow-up questions:*
{{#each followUp}}
- {{this}}
{{/each}}

{{/each}}
{{/each}}

---

*Generated by AI Recruitment Clerk - {{generatedAt}}*`;

      default:
        return this.getMarkdownTemplate('individual');
    }
  }

  private getHtmlStyles(_templateType: string): string {
    return `
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #fafafa;
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 {
          margin: 0;
          font-size: 2.5em;
          font-weight: 300;
        }
        
        .metadata {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 20px;
          font-size: 0.9em;
        }
        
        .score-card {
          background: white;
          border-radius: 10px;
          padding: 25px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-left: 4px solid #667eea;
        }
        
        .score-number {
          font-size: 3em;
          font-weight: bold;
          color: #667eea;
          text-align: center;
          margin: 10px 0;
        }
        
        .score-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        
        .score-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .skill-item {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin: 10px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border-left: 4px solid #28a745;
        }
        
        .recommendation {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 25px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        
        .recommendation.consider {
          border-left-color: #ffc107;
        }
        
        .recommendation.reject {
          border-left-color: #dc3545;
        }
        
        .strengths, .concerns, .suggestions {
          margin: 15px 0;
        }
        
        .strengths ul {
          color: #28a745;
        }
        
        .concerns ul {
          color: #dc3545;
        }
        
        .suggestions ul {
          color: #007bff;
        }
        
        h2 {
          color: #667eea;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }
        
        h3 {
          color: #495057;
          margin-top: 25px;
        }
        
        .footer {
          text-align: center;
          color: #6c757d;
          font-size: 0.9em;
          margin-top: 40px;
          padding: 20px;
          border-top: 1px solid #dee2e6;
        }
        
        @media print {
          body {
            background: white;
            font-size: 12px;
          }
          
          .score-card, .skill-item, .recommendation {
            box-shadow: none;
            border: 1px solid #dee2e6;
          }
        }
      </style>
    `;
  }

  private wrapInHtmlTemplate(
    content: string,
    styles: string,
    variables: TemplateVariables,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${variables.reportTitle}</title>
    ${styles}
</head>
<body>
    <div class="header">
        <h1>${variables.reportTitle}</h1>
        <div class="metadata">
            <div><strong>Position:</strong> ${variables.jobTitle}</div>
            <div><strong>Job ID:</strong> ${variables.jobId}</div>
            <div><strong>Candidate:</strong> ${variables.candidateName}</div>
            <div><strong>Generated:</strong> ${variables.generatedAt.toLocaleDateString()}</div>
        </div>
    </div>
    
    <div class="content">
        ${content}
    </div>
    
    <div class="footer">
        <p>Generated by AI Recruitment Clerk on ${variables.generatedAt.toISOString()}</p>
        <p>This report contains confidential information and should be handled according to company privacy policies.</p>
    </div>
</body>
</html>
    `;
  }

  private interpolateTemplate(
    template: string,
    variables: TemplateVariables,
  ): string {
    let result = template;

    // Simple variable substitution
    Object.entries(variables).forEach(([key, value]) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Handle nested objects
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          const pattern = new RegExp(`\\{\\{${key}\\.${nestedKey}\\}\\}`, 'g');
          result = result.replace(pattern, String(nestedValue || ''));
        });
      } else if (Array.isArray(value)) {
        // Handle arrays (simplified - in production use proper templating engine)
        const pattern = new RegExp(
          `\\{\\{#each ${key}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`,
          'g',
        );
        result = result.replace(pattern, (_match, itemTemplate) => {
          return value
            .map((item) => {
              let itemResult = itemTemplate;
              if (typeof item === 'object') {
                Object.entries(item).forEach(([itemKey, itemValue]) => {
                  itemResult = itemResult.replace(
                    new RegExp(`\\{\\{${itemKey}\\}\\}`, 'g'),
                    String(itemValue || ''),
                  );
                });
              } else {
                itemResult = itemResult.replace(/\{\{this\}\}/g, String(item));
              }
              return itemResult;
            })
            .join('');
        });
      } else {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(pattern, String(value || ''));
      }
    });

    // Clean up any remaining template variables
    result = result.replace(/\{\{[^}]+\}\}/g, '');

    return result;
  }

  private generateFilename(
    templateType: string,
    jobId: string,
    resumeId: string,
    extension: string,
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${templateType}-report-${jobId}-${resumeId}-${timestamp}.${extension}`;
  }

  /**
   * Performs the save generated report operation.
   * @param generatedReport - The generated report.
   * @returns A promise that resolves to string value.
   */
  public async saveGeneratedReport(
    generatedReport: GeneratedReportFile,
  ): Promise<string> {
    return await this.gridFsService.saveReport(
      generatedReport.content,
      generatedReport.filename,
      generatedReport.metadata,
    );
  }

  /**
   * Performs the save generated report buffer operation.
   * @param content - The content.
   * @param filename - The filename.
   * @param metadata - The metadata.
   * @returns A promise that resolves to string value.
   */
  public async saveGeneratedReportBuffer(
    content: Buffer,
    filename: string,
    metadata: ReportFileMetadata,
  ): Promise<string> {
    return await this.gridFsService.saveReportBuffer(
      content,
      filename,
      metadata,
    );
  }
}
