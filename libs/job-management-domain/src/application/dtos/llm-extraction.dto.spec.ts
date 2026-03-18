/**
 * LLM Extraction DTOs - Unit Tests
 */

import {
  LlmExtractionRequest,
  LlmExtractionResponse,
} from './llm-extraction.dto';

describe('LLM Extraction DTOs', () => {
  it('should re-export LlmExtractionRequest', () => {
    // Type checking - this will fail compilation if type doesn't exist
    const request: LlmExtractionRequest = {
      jobTitle: 'Test Job',
      jdText: 'Test description',
    };
    expect(request.jobTitle).toBe('Test Job');
  });

  it('should re-export LlmExtractionResponse', () => {
    const response: LlmExtractionResponse = {
      extractedData: {
        requirements: {
          technical: [],
          soft: [],
          experience: '',
          education: '',
        },
        responsibilities: [],
        benefits: [],
        company: {},
      },
      confidence: 0.95,
      processingTimeMs: 1000,
    };
    expect(response.confidence).toBe(0.95);
  });

  it('should import without errors', () => {
    expect(() => {
      require('./llm-extraction.dto');
    }).not.toThrow();
  });

  it('should be importable via named import', async () => {
    const dto = await import('./llm-extraction.dto');
    expect(dto).toBeDefined();
  });

  it('should maintain backward compatibility', () => {
    // Verify the types are compatible with expected structure
    const request: LlmExtractionRequest = {
      jobTitle: 'Developer',
      jdText: 'Description',
    };

    const response: LlmExtractionResponse = {
      extractedData: {
        requirements: {
          technical: ['TS'],
          soft: [],
          experience: '1 year',
          education: 'BS',
        },
        responsibilities: ['Code'],
        benefits: [],
        company: { name: 'Co' },
      },
      confidence: 0.9,
      processingTimeMs: 500,
    };

    expect(request).toBeDefined();
    expect(response).toBeDefined();
  });
});
