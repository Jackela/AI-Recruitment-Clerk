import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Workbook } from 'exceljs';
import type {
  GeneratedReportDocument,
  GeneratedReport,
} from './schemas/report.schema';
import { ReportRepository } from './repositories/report.repository';
import { type ReportQuery } from './repositories/report.repository';
import { GuestResumeAnalysisService } from '../guest/services/guest-resume-analysis.service';

export interface ReportListItemResponse {
  id: string;
  jobId: string;
  candidateName: string;
  jobTitle?: string;
  matchScore: number;
  oneSentenceSummary: string;
  summary?: string;
  status: 'completed' | 'processing' | 'failed';
  generatedAt: Date;
  createdAt?: Date;
  resumeCount?: number;
}

export interface ReportsListResponse {
  jobId: string;
  reports: ReportListItemResponse[];
}

export interface GenerateReportRequest {
  analysisId?: string;
  jobId?: string;
  resumeId?: string;
  candidateName?: string;
  jobTitle?: string;
  matchScore?: number;
  summary?: string;
  format?: 'pdf' | 'excel';
  generatedBy?: string;
  reportType?: 'candidate' | 'job' | 'analytics' | 'custom';
}

export interface ReportDownload {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(ReportRepository)
    private readonly reportRepository: ReportRepository,
    @Inject(GuestResumeAnalysisService)
    private readonly guestAnalysisService: GuestResumeAnalysisService,
  ) {}

  public async listReports(query: ReportQuery = {}): Promise<{
    reports: ReportListItemResponse[];
    totalCount: number;
  }> {
    const result = await this.reportRepository.findReports(query, {
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      reports: result.reports.map((report) => this.toListItem(report)),
      totalCount: result.totalCount,
    };
  }

  public async getReportsByJobId(jobId: string): Promise<ReportsListResponse> {
    const result = await this.reportRepository.findReportsByJobId(jobId, {
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      jobId,
      reports: result.reports.map((report) => this.toListItem(report)),
    };
  }

  public async getReportById(
    reportId: string,
  ): Promise<ReportListItemResponse> {
    const report = await this.findReportOrThrow(reportId);
    return this.toListItem(report);
  }

  public async generateReport(
    request: GenerateReportRequest,
  ): Promise<ReportListItemResponse> {
    const reportId = `report-${randomUUID()}`;
    const now = new Date();
    const candidateName = request.candidateName || 'Unknown candidate';
    const matchScore = this.normalizeScore(request.matchScore ?? 0);
    const summary =
      request.summary ||
      `${candidateName} has a ${matchScore}% match score for this report.`;

    const report = await this.reportRepository.createReport({
      reportId,
      templateId: 'default-candidate-report',
      name: `${candidateName} - Analysis Report`,
      type: request.reportType ?? 'candidate',
      jobId: request.jobId,
      resumeId: request.resumeId,
      analysisId: request.analysisId,
      content: {
        candidateName,
        jobTitle: request.jobTitle,
        matchScore,
        summary,
        strengths: [],
        potentialGaps: [],
        redFlags: [],
        suggestedInterviewQuestions: [],
      },
      format: request.format ?? 'pdf',
      fileUrl: `/api/reports/${reportId}/download`,
      status: 'generated',
      generatedAt: now,
      generatedBy: request.generatedBy ?? 'system',
    } satisfies Partial<GeneratedReport>);

    return this.toListItem(report);
  }

  public async downloadReport(
    reportId: string,
    format: 'pdf' | 'excel',
  ): Promise<ReportDownload> {
    const report = await this.findReportOrBuildVirtual(reportId);
    if (format === 'excel') {
      return this.buildExcelDownload(report);
    }
    return this.buildPdfDownload(report);
  }

  private async findReportOrThrow(
    reportId: string,
  ): Promise<GeneratedReportDocument> {
    const report =
      (await this.reportRepository.findReportById(reportId)) ||
      (await this.findReportByAnalysisId(reportId));
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    return report;
  }

  private async findReportOrBuildVirtual(
    reportId: string,
  ): Promise<GeneratedReportDocument | GeneratedReport> {
    const report =
      (await this.reportRepository.findReportById(reportId)) ||
      (await this.findReportByAnalysisId(reportId));
    if (report) return report;

    const analysis = await this.guestAnalysisService.findByAnalysisId(reportId);
    if (analysis?.status === 'completed') {
      const detailed = this.guestAnalysisService.toDetailedResult(analysis);
      return {
        reportId,
        templateId: 'guest-detailed-analysis',
        name: `${detailed.candidateName} - Resume Analysis`,
        type: 'candidate',
        analysisId: reportId,
        content: detailed as unknown as Record<string, unknown>,
        format: 'pdf',
        status: 'generated',
        generatedAt: new Date(detailed.analysisTime),
        generatedBy: 'guest',
        createdAt: analysis.uploadedAt,
        updatedAt: analysis.completedAt ?? analysis.uploadedAt,
      } as GeneratedReport;
    }

    throw new NotFoundException(`Report ${reportId} not found`);
  }

  private async findReportByAnalysisId(
    analysisId: string,
  ): Promise<GeneratedReportDocument | null> {
    const result = await this.reportRepository.findReports(
      { analysisId },
      { limit: 1 },
    );
    return result.reports[0] ?? null;
  }

  private toListItem(
    report: GeneratedReportDocument | GeneratedReport,
  ): ReportListItemResponse {
    const content = report.content ?? {};
    return {
      id: report.reportId,
      jobId: report.jobId ?? '',
      candidateName: this.getString(content.candidateName, report.name),
      jobTitle: this.getOptionalString(content.jobTitle),
      matchScore: this.normalizeScore(this.getNumber(content.matchScore, 0)),
      oneSentenceSummary: this.getString(
        content.summary,
        `${report.name} is ready for review.`,
      ),
      summary: this.getOptionalString(content.summary),
      status: report.status === 'generated' ? 'completed' : 'processing',
      generatedAt: report.generatedAt ?? report.createdAt ?? new Date(),
      createdAt: report.createdAt,
      resumeCount: this.getNumber(content.resumeCount, undefined),
    };
  }

  private buildPdfDownload(
    report: GeneratedReportDocument | GeneratedReport,
  ): ReportDownload {
    const item = this.toListItem(report);
    const text = [
      item.candidateName,
      `Score: ${item.matchScore}`,
      item.oneSentenceSummary,
    ].join('\\n');
    const escaped = text.replace(/[()\\]/g, '\\$&');
    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${escaped.length + 64} >>
stream
BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

    return {
      filename: `${item.id}.pdf`,
      contentType: 'application/pdf',
      buffer: Buffer.from(pdf, 'utf8'),
    };
  }

  private async buildExcelDownload(
    report: GeneratedReportDocument | GeneratedReport,
  ): Promise<ReportDownload> {
    const item = this.toListItem(report);
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Report');
    sheet.addRows([
      ['Report ID', item.id],
      ['Candidate', item.candidateName],
      ['Job', item.jobTitle ?? item.jobId],
      ['Score', item.matchScore],
      ['Summary', item.oneSentenceSummary],
      ['Generated At', item.generatedAt.toISOString()],
    ]);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      filename: `${item.id}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(arrayBuffer),
    };
  }

  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : fallback;
  }

  private getOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : undefined;
  }

  private getNumber(value: unknown, fallback: number): number;
  private getNumber(value: unknown, fallback: undefined): number | undefined;
  private getNumber(
    value: unknown,
    fallback: number | undefined,
  ): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }
}
