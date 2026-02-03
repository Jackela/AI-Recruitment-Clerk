import { ParsingService } from './parsing.service';
import type { VisionLlmService as _VisionLlmService } from '../vision-llm/vision-llm.service';
import type { PdfTextExtractorService as _PdfTextExtractorService } from './pdf-text-extractor.service';
import type { GridFsService as _GridFsService } from '../gridfs/gridfs.service';
import type { FieldMapperService as _FieldMapperService } from '../field-mapper/field-mapper.service';
import type { ResumeParserNatsService as _ResumeParserNatsService } from '../services/resume-parser-nats.service';

describe('ParsingService Contracts (smoke)', () => {
  it('exposes required contract methods', () => {
    const service = new ParsingService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect(service.handleResumeSubmitted).toBeInstanceOf(Function);
    expect(service.parseResumeFile).toBeInstanceOf(Function);
    expect(service.healthCheck).toBeInstanceOf(Function);
  });
});
