import { JdDTO, LlmExtractionRequest, LlmExtractionResponse } from './jd.dto';

describe('JdDto', () => {
  describe('JdDTO interface', () => {
    it('should accept valid job description data', () => {
      const dto: JdDTO = {
        requirements: {
          technical: ['JavaScript', 'TypeScript', 'React'],
          soft: ['Communication', 'Teamwork'],
          experience: '3-5 years',
          education: "Bachelor's",
        },
        responsibilities: [
          'Develop web applications',
          'Collaborate with team members',
        ],
        benefits: ['Health insurance', 'Remote work'],
        company: {
          name: 'Tech Corp',
          industry: 'Technology',
          size: '100-500 employees',
        },
      };

      expect(dto.requirements.technical).toContain('JavaScript');
      expect(dto.benefits).toContain('Remote work');
      expect(dto.company.name).toBe('Tech Corp');
    });

    it('should allow partial company info', () => {
      const dto: JdDTO = {
        requirements: {
          technical: [],
          soft: [],
          experience: '0 years',
          education: 'any',
        },
        responsibilities: [],
        benefits: [],
        company: {},
      };

      expect(dto.company.name).toBeUndefined();
      expect(dto.company.industry).toBeUndefined();
    });
  });

  describe('LlmExtractionRequest interface', () => {
    it('should accept valid extraction request', () => {
      const request: LlmExtractionRequest = {
        jobTitle: 'Software Engineer',
        jdText: 'We are looking for a skilled developer...',
      };

      expect(request.jobTitle).toBe('Software Engineer');
      expect(request.jdText).toContain('skilled developer');
    });
  });

  describe('LlmExtractionResponse interface', () => {
    it('should accept valid extraction response', () => {
      const response: LlmExtractionResponse = {
        extractedData: {
          requirements: {
            technical: ['Python', 'Django'],
            soft: ['Problem solving'],
            experience: '2 years',
            education: "Bachelor's",
          },
          responsibilities: ['Backend development'],
          benefits: ['Health insurance'],
          company: { name: 'Startup' },
        },
        confidence: 0.92,
        processingTimeMs: 1500,
      };

      expect(response.confidence).toBe(0.92);
      expect(response.processingTimeMs).toBe(1500);
      expect(response.extractedData.requirements.technical).toContain('Python');
    });

    it('should accept low confidence response', () => {
      const response: LlmExtractionResponse = {
        extractedData: {
          requirements: {
            technical: [],
            soft: [],
            experience: 'unknown',
            education: 'unknown',
          },
          responsibilities: [],
          benefits: [],
          company: {},
        },
        confidence: 0.1,
        processingTimeMs: 3000,
      };

      expect(response.confidence).toBe(0.1);
    });
  });
});
