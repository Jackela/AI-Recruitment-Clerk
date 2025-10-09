import { Injectable, Logger } from '@nestjs/common';
import { GridFsService, ReportFileMetadata } from './gridfs.service';
import { ReportDocument, ScoreBreakdown, MatchingSkill, ReportRecommendation } from '../schemas/report.schema';
import { marked } from 'marked';

// Enhanced type definitions for report templates
/**
 * Defines the shape of the candidate comparison data.
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
 * Defines the shape of the interview question.
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
 * Defines the shape of the additional template data.
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
 * Defines the shape of the report template.
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
 * Defines the shape of the template variables.
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
 * Defines the shape of the generated report file.
 */
export interface GeneratedReportFile {
  content: string;
  filename: string;
  mimeType: string;
  metadata: ReportFileMetadata;
}

/**
 * Provides report templates functionality.
 */
@Injectable()
export class ReportTemplatesService {
  private readonly logger = new Logger(ReportTemplatesService.name);

  /**
   * Initializes a new instance of the Report Templates Service.
   * @param gridFsService - The grid fs service.
   */
  constructor(private readonly gridFsService: GridFsService) {}

  /**
   * Generates report in format.
   * @param reportData - The report data.
   * @param format - The format.
   * @param templateType - The template type.
   * @param additionalData - The additional data.
   * @returns A promise that resolves to GeneratedReportFile.
   */
  async generateReportInFormat(
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
    try {
      this.logger.debug(`Generating ${format} report for ${templateType}`);

      const variables = this.buildTemplateVariables(reportData, additionalData);
      let content: string;
      let mimeType: string;
      let extension: string;

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
          throw new Error(`Unsupported format: ${format}`);
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

      return {
        content,
        filename,
        mimeType,
        metadata,
      };
    } catch (error) {
      this.logger.error('Failed to generate report in format', {
        error: error.message,
        format,
        templateType,
        reportData: { jobId: reportData.jobId, resumeId: reportData.resumeId },
      });
      throw error;
    }
  }

  private async generateMarkdownReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    const template = this.getMarkdownTemplate(templateType);
    return this.interpolateTemplate(template, variables);
  }

  private async generateHtmlReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    // First generate markdown, then convert to HTML with custom styling
    const markdownContent = await this.generateMarkdownReport(
      templateType,
      variables,
    );
    const htmlContent = await marked.parse(markdownContent);
    const styles = this.getHtmlStyles(templateType);

    return this.wrapInHtmlTemplate(htmlContent, styles, variables);
  }

  private async generateJsonReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
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
  }

  private async generatePdfReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    // For now, return HTML that can be converted to PDF by a PDF library
    // In production, you would use libraries like puppeteer, wkhtmltopdf, or similar
    const htmlContent = await this.generateHtmlReport(templateType, variables);

    // Return base64 encoded content for binary storage
    return Buffer.from(htmlContent).toString('base64');
  }

  private async generateExcelReport(
    templateType: string,
    variables: TemplateVariables,
  ): Promise<string> {
    // Simplified Excel-like data structure
    // In production, you would use libraries like exceljs or xlsx
    const excelData = {
      metadata: {
        title: variables.reportTitle,
        generated: variables.generatedAt.toISOString(),
      },
      summary: {
        jobTitle: variables.jobTitle,
        candidateName: variables.candidateName,
        overallScore: variables.overallScore,
        recommendation: variables.recommendation?.decision,
      },
      skillsBreakdown:
        variables.skillsAnalysis?.map((skill) => ({
          skill: skill.skill,
          score: skill.matchScore,
          type: skill.matchType,
        })) || [],
      scoreBreakdown: variables.scoreBreakdown,
    };

    return JSON.stringify(excelData, null, 2);
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

  private getHtmlStyles(templateType: string): string {
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
        result = result.replace(pattern, (match, itemTemplate) => {
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
  async saveGeneratedReport(
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
  async saveGeneratedReportBuffer(
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
