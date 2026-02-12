import { VisionLlmService } from './vision-llm.service';
import type { ResumeParserConfigService } from '../config';

const mockConfig = {
  isTest: true,
  nodeName: 'unknown',
  geminiApiKey: 'test-key',
} as unknown as ResumeParserConfigService;

// Mock client instance
const mockClientInstance = {
  generateStructuredResponse: jest.fn().mockResolvedValue({
    data: {
      contactInfo: { name: 'Test', email: 'test@example.com', phone: null },
      skills: [],
      workExperience: [],
      education: [],
    },
  }),
  healthCheck: jest.fn().mockResolvedValue(true),
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
};

// Mock factory that throws
const createMockGeminiClient = jest.fn(() => {
  throw new Error('MockGeminiClient - triggering fallback');
});

(createMockGeminiClient as any).mock = {
  results: [{ value: mockClientInstance, type: 'return' as const }],
};

// Mock stub file
jest.mock('libs/ai-services-shared/src/gemini/gemini.stub.ts', () => ({
  GeminiClient: jest.fn(() => mockClientInstance),
}));

jest.mock('@ai-recruitment-clerk/shared-dtos', () => ({
  GeminiClient: createMockGeminiClient as any,
  PromptTemplates: {
    getResumeParsingPrompt: jest.fn(() => 'parse-text'),
    getResumeVisionPrompt: jest.fn(() => 'parse-vision'),
  },
  PromptBuilder: {
    addJsonSchemaInstruction: jest.fn((prompt: string) => prompt),
  },
  __esModule: true,
}));

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
    service = new VisionLlmService(mockConfig);
    geminiInstance = (service as any).geminiClient;

    if (!geminiInstance) {
      throw new Error('Expected VisionLlmService to provide a Gemini client');
    }
  });

  it('healthCheck returns true when Gemini client is healthy', async () => {
    await expect(service.healthCheck()).resolves.toBe(true);
    expect(geminiInstance?.healthCheck).toBeDefined();
    if (geminiInstance?.healthCheck) {
      await expect(geminiInstance.healthCheck()).resolves.toBe(true);
    }
  });

  it('parseResumeText throws in test mode', async () => {
    await expect(service.parseResumeText('sample resume')).rejects.toThrow(
      'VisionLlmService.parseResumeText not implemented',
    );
  });
});
