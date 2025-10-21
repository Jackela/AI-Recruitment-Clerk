import { Test, TestingModule } from '@nestjs/testing';
import { ParsingService } from './parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';

jest.mock('pdf-parse-fork', () =>
  jest.fn(async () => ({ text: 'Sample PDF text content' })),
);

describe('ParsingService - PDF Extraction', () => {
  let service: ParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsingService,
        { provide: VisionLlmService, useValue: {} },
        {
          provide: PdfTextExtractorService,
          useValue: {
            extractText: jest.fn(async () => 'Sample PDF text content'),
          },
        },
        { provide: GridFsService, useValue: {} },
        { provide: FieldMapperService, useValue: {} },
        { provide: ResumeParserNatsService, useValue: {} },
      ],
    }).compile();

    service = module.get(ParsingService);
  });

  it('extractTextFromMaybeTextFile returns extracted text for PDF buffers', async () => {
    const buf = Buffer.alloc(8);
    buf.write('%PDF', 0, 'ascii');
    const text = await (service as any).extractTextFromMaybeTextFile(buf);
    expect(typeof text).toBe('string');
    expect(text).toBe('Sample PDF text content');
  });

  it('extractTextFromMaybeTextFile decodes UTF-8 for non-PDF buffers', async () => {
    const expected = 'Hello world';
    const buf = Buffer.from(expected, 'utf8');
    const text = await (service as any).extractTextFromMaybeTextFile(buf);
    expect(text).toBe(expected);
  });
});
