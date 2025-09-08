import {
  createMockJobJdSubmittedEvent,
  createMockAnalysisJdExtractedEvent,
  createMockExtractedJdDTO,
  createMockLlmExtractionRequest,
  createMockLlmExtractionResponse,
  createMockNatsSuccessResult,
  createMockNatsFailureResult,
  isValidJobJdSubmittedEvent,
  isValidAnalysisJdExtractedEvent,
  isValidExtractedJdDTO,
  isValidLlmExtractionRequest,
  isValidLlmExtractionResponse,
  isValidNatsPublishResult,
  validateJobJdSubmittedEvent,
  validateAnalysisJdExtractedEvent,
} from './test-fixtures';

describe('Test Fixtures', () => {
  describe('Mock Factory Functions', () => {
    it('should create valid JobJdSubmittedEvent', () => {
      const mockEvent = createMockJobJdSubmittedEvent();

      expect(mockEvent.jobId).toBeDefined();
      expect(mockEvent.jobTitle).toBeDefined();
      expect(mockEvent.jdText).toBeDefined();
      expect(mockEvent.timestamp).toBeDefined();
      expect(isValidJobJdSubmittedEvent(mockEvent)).toBe(true);
    });

    it('should create valid AnalysisJdExtractedEvent', () => {
      const mockEvent = createMockAnalysisJdExtractedEvent();

      expect(mockEvent.jobId).toBeDefined();
      expect(mockEvent.extractedData).toBeDefined();
      expect(mockEvent.timestamp).toBeDefined();
      expect(mockEvent.processingTimeMs).toBeGreaterThan(0);
      expect(isValidAnalysisJdExtractedEvent(mockEvent)).toBe(true);
    });

    it('should create valid ExtractedJdDTO', () => {
      const mockDto = createMockExtractedJdDTO();

      expect(mockDto.requirements).toBeDefined();
      expect(Array.isArray(mockDto.requirements.technical)).toBe(true);
      expect(Array.isArray(mockDto.requirements.soft)).toBe(true);
      expect(Array.isArray(mockDto.responsibilities)).toBe(true);
      expect(isValidExtractedJdDTO(mockDto)).toBe(true);
    });

    it('should create valid LlmExtractionRequest', () => {
      const mockRequest = createMockLlmExtractionRequest();

      expect(mockRequest.jobTitle).toBeDefined();
      expect(mockRequest.jdText).toBeDefined();
      expect(isValidLlmExtractionRequest(mockRequest)).toBe(true);
    });

    it('should create valid LlmExtractionResponse', () => {
      const mockResponse = createMockLlmExtractionResponse();

      expect(mockResponse.extractedData).toBeDefined();
      expect(mockResponse.confidence).toBeGreaterThanOrEqual(0);
      expect(mockResponse.confidence).toBeLessThanOrEqual(1);
      expect(mockResponse.processingTimeMs).toBeGreaterThan(0);
      expect(isValidLlmExtractionResponse(mockResponse)).toBe(true);
    });

    it('should create valid NATS success result', () => {
      const mockResult = createMockNatsSuccessResult();

      expect(mockResult.success).toBe(true);
      expect(mockResult.messageId).toBeDefined();
      expect(isValidNatsPublishResult(mockResult)).toBe(true);
    });

    it('should create valid NATS failure result', () => {
      const mockResult = createMockNatsFailureResult();

      expect(mockResult.success).toBe(false);
      expect(mockResult.error).toBeDefined();
      expect(isValidNatsPublishResult(mockResult)).toBe(true);
    });
  });

  describe('Override Functionality', () => {
    it('should allow overriding mock event properties', () => {
      const customJobId = 'custom-job-123';
      const mockEvent = createMockJobJdSubmittedEvent({ jobId: customJobId });

      expect(mockEvent.jobId).toBe(customJobId);
    });

    it('should allow overriding mock DTO properties', () => {
      const customSkills = ['Custom Skill 1', 'Custom Skill 2'];
      const mockDto = createMockExtractedJdDTO({
        requirements: {
          technical: customSkills,
          soft: ['leadership'],
          experience: 'Mid-level',
          education: "Bachelor's degree",
        },
      });

      expect(mockDto.requirements.technical).toEqual(customSkills);
    });
  });

  describe('Validation Functions', () => {
    it('should validate JobJdSubmittedEvent using Jest helpers', () => {
      const mockEvent = createMockJobJdSubmittedEvent();

      expect(() => validateJobJdSubmittedEvent(mockEvent)).not.toThrow();
    });

    it('should validate AnalysisJdExtractedEvent using Jest helpers', () => {
      const mockEvent = createMockAnalysisJdExtractedEvent();

      expect(() => validateAnalysisJdExtractedEvent(mockEvent)).not.toThrow();
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify valid events', () => {
      const validEvent = createMockJobJdSubmittedEvent();
      const invalidEvent = { jobId: 'test' }; // Missing required fields

      expect(isValidJobJdSubmittedEvent(validEvent)).toBe(true);
      expect(isValidJobJdSubmittedEvent(invalidEvent)).toBe(false);
    });

    it('should correctly identify valid DTOs', () => {
      const validDto = createMockExtractedJdDTO();
      const invalidDto = { requirements: {} }; // Missing required structure

      expect(isValidExtractedJdDTO(validDto)).toBe(true);
      expect(isValidExtractedJdDTO(invalidDto)).toBe(false);
    });
  });
});
