import { ParsingService } from './parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { ResumeParserNatsService } from '../services/resume-parser-nats.service';

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
