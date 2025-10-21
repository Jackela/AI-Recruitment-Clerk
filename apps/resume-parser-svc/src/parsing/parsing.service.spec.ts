import { ParsingService } from './parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';
import pdfParse from 'pdf-parse';

jest.mock('pdf-parse', () => jest.fn());

const mockParse = pdfParse as jest.MockedFunction<any>;

const buildService = () => {
  const vision = { parseResumeText: jest.fn(), parseResumePdf: jest.fn() } as unknown as VisionLlmService;
  const pdf = { extractText: jest.fn() } as unknown as PdfTextExtractorService;
  const grid = { downloadFile: jest.fn() } as unknown as GridFsService;
  const mapper = { normalizeToResumeDto: jest.fn() } as unknown as FieldMapperService;
  const nats = {
    publishAnalysisResumeParsed: jest.fn(),
    publishJobResumeFailed: jest.fn(),
    publishProcessingError: jest.fn(),
    isConnected: true,
  } as unknown as ResumeParserNatsService;

  const svc = new ParsingService(vision, pdf, grid, mapper, nats);
  return { svc, vision, pdf, grid, mapper, nats };
};

describe('ParsingService (isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads resume and publishes parsed event', async () => {
    const { svc, grid, pdf, mapper, nats } = buildService();
    const event = {
      jobId: 'job-1',
      resumeId: 'resume-1',
      tempGridFsUrl: 'gridfs://bucket/id',
      originalFilename: 'candidate.pdf',
      organizationId: 'org',
      userId: 'user',
    } as any;

    const buffer = Buffer.from('%PDF-1.4 test');
    (grid.downloadFile as any).mockResolvedValue(buffer);
    (pdf.extractText as any).mockResolvedValue('resume text');
    mockParse.mockResolvedValue({ text: 'resume text' });
    (mapper.normalizeToResumeDto as any).mockResolvedValue({ contactInfo: null, skills: [], workExperience: [], education: [] });
    (nats.publishAnalysisResumeParsed as any).mockResolvedValue({ success: true });

    await svc.handleResumeSubmitted(event);

    expect(grid.downloadFile).toHaveBeenCalledWith(event.tempGridFsUrl);
    expect(pdf.extractText).toHaveBeenCalledWith(buffer);
    expect(nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(expect.objectContaining({ jobId: event.jobId }));
  });
});
