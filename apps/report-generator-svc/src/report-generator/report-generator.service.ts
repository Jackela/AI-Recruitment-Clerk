import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GridFsService } from './gridfs.service';
import { ReportRepository } from './report.repository';

export interface MatchScoredEvent {
  jobId: string;
  resumeId: string;
  scoreDto: any;
}

@Injectable()
export class ReportGeneratorService {
  constructor(
    private readonly llmService: LlmService,
    private readonly gridFsService: GridFsService,
    private readonly reportRepo: ReportRepository,
  ) {}

  async handleMatchScored(event: MatchScoredEvent): Promise<void> {
    const markdown = await this.llmService.generateReportMarkdown(event);
    const reportId = await this.gridFsService.saveReport(markdown);
    await this.reportRepo.updateResumeRecord(event.resumeId, {
      status: 'completed',
      reportGridFsId: reportId,
    });
  }
}
