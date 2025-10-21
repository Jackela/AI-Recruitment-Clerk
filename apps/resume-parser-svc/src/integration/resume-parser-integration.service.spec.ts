import { ResumeParserIntegrationService } from './resume-parser-integration.service';

describe('ResumeParserIntegrationService (isolated)', () => {
  it('is instantiable', () => {
    const service = new ResumeParserIntegrationService({} as any, {} as any);
    expect(service).toBeDefined();
  });
});
