/**
 * Job Description DTOs - Unit Tests
 */

import type {
  JdDTO,
  LlmExtractionRequest,
  LlmExtractionResponse,
} from './job-description.dto';

describe('Job Description DTOs', () => {
  describe('JdDTO', () => {
    it('should create valid JdDTO with all fields', () => {
      const jdData: JdDTO = {
        requirements: {
          technical: ['JavaScript', 'TypeScript', 'React'],
          soft: ['Communication', 'Leadership'],
          experience: '3-5 years',
          education: 'Bachelor degree in CS',
        },
        responsibilities: ['Develop features', 'Code review', 'Mentoring'],
        benefits: ['Health insurance', '401k', 'Remote work'],
        company: {
          name: 'Tech Corp',
          industry: 'Software',
          size: '100-500',
        },
      };

      expect(jdData.requirements.technical).toHaveLength(3);
      expect(jdData.requirements.soft).toHaveLength(2);
      expect(jdData.responsibilities).toHaveLength(3);
      expect(jdData.benefits).toHaveLength(3);
      expect(jdData.company.name).toBe('Tech Corp');
    });

    it('should handle minimal JdDTO', () => {
      const minimalData: JdDTO = {
        requirements: {
          technical: [],
          soft: [],
          experience: '',
          education: '',
        },
        responsibilities: [],
        benefits: [],
        company: {},
      };

      expect(minimalData.requirements.technical).toHaveLength(0);
      expect(minimalData.company.name).toBeUndefined();
    });

    it('should handle single item arrays', () => {
      const singleItemData: JdDTO = {
        requirements: {
          technical: ['Python'],
          soft: ['Teamwork'],
          experience: '1+ years',
          education: 'High school',
        },
        responsibilities: ['Write code'],
        benefits: ['Salary'],
        company: {
          name: 'Startup',
        },
      };

      expect(singleItemData.requirements.technical).toHaveLength(1);
      expect(singleItemData.responsibilities).toHaveLength(1);
    });

    it('should handle empty company object', () => {
      const data: JdDTO = {
        requirements: {
          technical: ['Java'],
          soft: [],
          experience: 'Entry level',
          education: 'Bachelor',
        },
        responsibilities: [],
        benefits: [],
        company: {},
      };

      expect(data.company).toEqual({});
    });

    it('should handle partial company information', () => {
      const data: JdDTO = {
        requirements: {
          technical: ['Go'],
          soft: ['Adaptability'],
          experience: 'Senior',
          education: 'Master',
        },
        responsibilities: ['Architecture'],
        benefits: ['Stock options'],
        company: {
          name: 'Big Tech',
          industry: 'Technology',
        },
      };

      expect(data.company.name).toBe('Big Tech');
      expect(data.company.industry).toBe('Technology');
      expect(data.company.size).toBeUndefined();
    });

    it('should handle special characters in strings', () => {
      const data: JdDTO = {
        requirements: {
          technical: ['C#', 'C++', '.NET'],
          soft: ['Problem-solving'],
          experience: '5+ years (preferably in fintech)',
          education: "Bachelor's or Master's",
        },
        responsibilities: ['Develop & maintain', 'Code review & testing'],
        benefits: ['Health & dental', '401(k) matching'],
        company: {
          name: 'Company & Co.',
          industry: 'Fin-Tech',
        },
      };

      expect(data.requirements.technical).toContain('C#');
      expect(data.requirements.technical).toContain('C++');
    });

    it('should handle multiline descriptions', () => {
      const data: JdDTO = {
        requirements: {
          technical: ['React', 'Node.js'],
          soft: ['Communication'],
          experience: '3 years',
          education: 'BS',
        },
        responsibilities: [
          'Build scalable applications',
          'Collaborate with cross-functional teams',
          'Maintain code quality',
        ],
        benefits: [
          'Competitive salary',
          'Health coverage',
          'Professional development',
        ],
        company: {
          name: 'Tech Co',
        },
      };

      expect(data.responsibilities[0]).toContain('scalable');
      expect(data.benefits).toHaveLength(3);
    });

    it('should handle large arrays', () => {
      const manySkills = Array.from({ length: 20 }, (_, i) => `Skill ${i}`);
      const data: JdDTO = {
        requirements: {
          technical: manySkills,
          soft: ['Adaptable'],
          experience: 'Any',
          education: 'Any',
        },
        responsibilities: manySkills.slice(0, 10),
        benefits: manySkills.slice(0, 5),
        company: {
          name: 'Big Corp',
          size: '1000+',
        },
      };

      expect(data.requirements.technical).toHaveLength(20);
      expect(data.responsibilities).toHaveLength(10);
    });
  });

  describe('LlmExtractionRequest', () => {
    it('should create valid extraction request', () => {
      const request: LlmExtractionRequest = {
        jobTitle: 'Software Engineer',
        jdText: 'We are looking for a skilled developer...',
      };

      expect(request.jobTitle).toBe('Software Engineer');
      expect(request.jdText).toContain('developer');
    });

    it('should handle empty job title', () => {
      const request: LlmExtractionRequest = {
        jobTitle: '',
        jdText: 'Job description text',
      };

      expect(request.jobTitle).toBe('');
    });

    it('should handle long job description', () => {
      const longDescription = 'Job description. '.repeat(100);
      const request: LlmExtractionRequest = {
        jobTitle: 'Senior Developer',
        jdText: longDescription,
      };

      expect(request.jdText).toHaveLength(longDescription.length);
    });

    it('should handle special characters in job title', () => {
      const request: LlmExtractionRequest = {
        jobTitle: 'DevOps/SRE Engineer (Sr.) - Kubernetes & Cloud',
        jdText: 'Description',
      };

      expect(request.jobTitle).toContain('DevOps/SRE');
      expect(request.jobTitle).toContain('Kubernetes');
    });

    it('should handle unicode characters', () => {
      const request: LlmExtractionRequest = {
        jobTitle: 'Développeur Web 🚀',
        jdText: 'Description with emojis: 💻 🎉',
      };

      expect(request.jobTitle).toContain('Développeur');
      expect(request.jdText).toContain('💻');
    });
  });

  describe('LlmExtractionResponse', () => {
    it('should create valid extraction response', () => {
      const response: LlmExtractionResponse = {
        extractedData: {
          requirements: {
            technical: ['Python', 'Django'],
            soft: ['Teamwork'],
            experience: '2+ years',
            education: 'BS',
          },
          responsibilities: ['Build APIs'],
          benefits: ['Remote'],
          company: {
            name: 'TechCo',
          },
        },
        confidence: 0.95,
        processingTimeMs: 1200,
      };

      expect(response.confidence).toBe(0.95);
      expect(response.processingTimeMs).toBe(1200);
      expect(response.extractedData.company.name).toBe('TechCo');
    });

    it('should handle low confidence', () => {
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
        confidence: 0.3,
        processingTimeMs: 500,
      };

      expect(response.confidence).toBeLessThan(0.5);
    });

    it('should handle perfect confidence', () => {
      const response: LlmExtractionResponse = {
        extractedData: {
          requirements: {
            technical: ['Java'],
            soft: ['Leadership'],
            experience: 'Senior',
            education: 'MS',
          },
          responsibilities: ['Architecture'],
          benefits: ['Equity'],
          company: { name: 'Startup' },
        },
        confidence: 1.0,
        processingTimeMs: 800,
      };

      expect(response.confidence).toBe(1.0);
    });

    it('should handle zero processing time', () => {
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
        confidence: 0.5,
        processingTimeMs: 0,
      };

      expect(response.processingTimeMs).toBe(0);
    });

    it('should handle long processing time', () => {
      const response: LlmExtractionResponse = {
        extractedData: {
          requirements: {
            technical: ['AI', 'ML'],
            soft: ['Research'],
            experience: 'PhD',
            education: 'Doctorate',
          },
          responsibilities: ['Research'],
          benefits: ['Publication'],
          company: { name: 'AI Lab' },
        },
        confidence: 0.88,
        processingTimeMs: 30000,
      };

      expect(response.processingTimeMs).toBe(30000);
    });

    it('should handle floating point confidence', () => {
      const response: LlmExtractionResponse = {
        extractedData: {
          requirements: {
            technical: ['Rust'],
            soft: [],
            experience: 'Any',
            education: 'Any',
          },
          responsibilities: ['Systems programming'],
          benefits: [],
          company: {},
        },
        confidence: 0.873456,
        processingTimeMs: 1500,
      };

      expect(response.confidence).toBeCloseTo(0.873, 3);
    });
  });

  describe('DTO Type Safety', () => {
    it('should maintain type consistency in JdDTO', () => {
      const data: JdDTO = {
        requirements: {
          technical: ['React'],
          soft: ['Communication'],
          experience: '3 years',
          education: 'BS',
        },
        responsibilities: ['Build UI'],
        benefits: ['Remote'],
        company: {
          name: 'Company',
        },
      };

      // Verify structure integrity
      expect(Array.isArray(data.requirements.technical)).toBe(true);
      expect(Array.isArray(data.responsibilities)).toBe(true);
      expect(typeof data.company).toBe('object');
    });

    it('should allow flexible company information', () => {
      const variations: JdDTO['company'][] = [
        {},
        { name: 'Only Name' },
        { name: 'Full', industry: 'Tech', size: 'Large' },
        { industry: 'Partial' },
      ];

      variations.forEach((company) => {
        const data: JdDTO = {
          requirements: {
            technical: [],
            soft: [],
            experience: '',
            education: '',
          },
          responsibilities: [],
          benefits: [],
          company,
        };
        expect(data.company).toBeDefined();
      });
    });
  });
});
