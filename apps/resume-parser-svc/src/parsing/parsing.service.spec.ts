import { Test, TestingModule } from '@nestjs/testing';
import { ParsingService } from './parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';

describe('ParsingService', () => {
  let service: ParsingService;
  let vision: jest.Mocked<VisionLlmService>;
  let gridfs: jest.Mocked<GridFsService>;
  let mapper: jest.Mocked<FieldMapperService>;
  let nats: jest.Mocked<NatsClient>;

  const event = {
    jobId: 'job1',
    resumeId: 'res1',
    originalFilename: 'resume.pdf',
    tempGridFsUrl: 'gridfs://temp/resume.pdf',
  };

  const pdfBuf = Buffer.from('pdf');
  const llmOutput = { foo: 'bar' };
  const resumeDto = { contactInfo: { name: 'John', email: null, phone: null }, skills: [], workExperience: [], education: [] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsingService,
        { provide: VisionLlmService, useValue: { parseResumePdf: jest.fn() } },
        { provide: GridFsService, useValue: { downloadFile: jest.fn() } },
        { provide: FieldMapperService, useValue: { normalizeToResumeDto: jest.fn() } },
        { provide: NatsClient, useValue: { publishAnalysisResumeParsed: jest.fn(), publishJobResumeFailed: jest.fn() } },
      ],
    }).compile();

    service = module.get(ParsingService);
    vision = module.get(VisionLlmService);
    gridfs = module.get(GridFsService);
    mapper = module.get(FieldMapperService);
    nats = module.get(NatsClient);

    jest.clearAllMocks();
  });

  it('processes resume and publishes parsed event', async () => {
    gridfs.downloadFile.mockResolvedValue(pdfBuf);
    vision.parseResumePdf.mockResolvedValue(llmOutput);
    mapper.normalizeToResumeDto.mockResolvedValue(resumeDto);

    await service.handleResumeSubmitted(event);

    expect(gridfs.downloadFile).toHaveBeenCalledWith(event.tempGridFsUrl);
    expect(vision.parseResumePdf).toHaveBeenCalledWith(pdfBuf, event.originalFilename);
    expect(mapper.normalizeToResumeDto).toHaveBeenCalledWith(llmOutput);
    expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(expect.objectContaining({
      jobId: event.jobId,
      resumeId: event.resumeId,
      resumeDto,
    }));
  });

  it('publishes failure event on error', async () => {
    gridfs.downloadFile.mockRejectedValue(new Error('fail'));

    await expect(service.handleResumeSubmitted(event)).rejects.toThrow('fail');
    expect(nats.publishJobResumeFailed).toHaveBeenCalled();
  });
});
