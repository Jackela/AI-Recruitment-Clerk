import { VisionLlmService } from './vision-llm.service';

jest.mock('@ai-recruitment-clerk/shared-dtos', () => {
  const clientFactory = () => ({
    generateStructuredResponse: jest.fn().mockResolvedValue({
      data: {
        contactInfo: { name: 'Test', email: 'test@example.com', phone: null },
        skills: [],
        workExperience: [],
        education: [],
      },
    }),
    generateStructuredVisionResponse: jest.fn().mockResolvedValue({
      data: {
        contactInfo: { name: 'Test', email: 'test@example.com', phone: null },
        skills: [],
        workExperience: [],
        education: [],
      },
    }),
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
  });

  const GeminiClient = jest.fn(() => clientFactory());

  return {
    GeminiClient,
    PromptTemplates: {
      getResumeParsingPrompt: jest.fn(() => 'parse-text'),
      getResumeVisionPrompt: jest.fn(() => 'parse-vision'),
    },
    PromptBuilder: {
      addJsonSchemaInstruction: jest.fn((prompt: string) => prompt),
    },
    __esModule: true,
  };
});

jest.mock('@app/shared-dtos', () => ({
  SecureConfigValidator: {
    validateServiceConfig: jest.fn(),
    requireEnv: jest.fn(() => 'test-key'),
  },
  __esModule: true,
}));

jest.mock('pdf-parse-fork', () => jest.fn().mockResolvedValue({ text: 'Sample PDF text content' }));

describe('VisionLlmService (isolated)', () => {
  let service: VisionLlmService;
  let geminiInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisionLlmService();
    geminiInstance = (service as any).geminiClient;
    if (!geminiInstance) {
      throw new Error('Expected VisionLlmService to provide a Gemini client');
    }
    geminiInstance.healthCheck = jest.fn().mockResolvedValue(true);
  });

  it('healthCheck returns true when Gemini client is healthy', async () => {
    await expect(service.healthCheck()).resolves.toBe(true);
    expect(geminiInstance.healthCheck).toHaveBeenCalled();
  });

  it('parseResumeText throws in test mode', async () => {
    await expect(service.parseResumeText('sample resume')).rejects.toThrow(
      'VisionLlmService.parseResumeText not implemented',
    );
  });
});
