import { Test, TestingModule } from '@nestjs/testing';
import {
  ReportGeneratorService,
  MatchScoredEvent,
} from './report-generator.service';
import { LlmService } from './llm.service';
import { GridFsService } from './gridfs.service';
import { ReportRepository } from './report.repository';

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  let llm: jest.Mocked<LlmService>;
  let gridfs: jest.Mocked<GridFsService>;
  let repo: jest.Mocked<ReportRepository>;

  const event: MatchScoredEvent = {
    jobId: 'job1',
    resumeId: 'res1',
    scoreDto: { overallScore: 80 } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGeneratorService,
        {
          provide: LlmService,
          useValue: { generateReportMarkdown: jest.fn() },
        },
        { provide: GridFsService, useValue: { saveReport: jest.fn() } },
        {
          provide: ReportRepository,
          useValue: { updateResumeRecord: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ReportGeneratorService);
    llm = module.get(LlmService);
    gridfs = module.get(GridFsService);
    repo = module.get(ReportRepository);
  });

  it('processes match.scored event and stores report', async () => {
    llm.generateReportMarkdown.mockResolvedValue('# md');
    gridfs.saveReport.mockResolvedValue('gridfs://report/1');

    await service.handleMatchScored(event);

    expect(llm.generateReportMarkdown).toHaveBeenCalledWith(event);
    expect(gridfs.saveReport).toHaveBeenCalledWith('# md');
    expect(repo.updateResumeRecord).toHaveBeenCalledWith(event.resumeId, {
      status: 'completed',
      reportGridFsId: 'gridfs://report/1',
    });
  });
});
