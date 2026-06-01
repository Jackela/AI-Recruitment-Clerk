/**
 * Job Events - Unit Tests
 */

import type { JobJdSubmittedEvent, AnalysisJdExtractedEvent } from './job-events';
import type { JdDTO } from '../../application/dtos/job-description.dto';

describe('Job Events', () => {
  describe('JobJdSubmittedEvent', () => {
    it('should create valid JobJdSubmittedEvent', () => {
      const event: JobJdSubmittedEvent = {
        jobId: 'job-123',
        jobTitle: 'Software Engineer',
        jdText: 'Job description text',
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(event.jobId).toBe('job-123');
      expect(event.jobTitle).toBe('Software Engineer');
      expect(event.jdText).toBe('Job description text');
      expect(event.timestamp).toBe('2024-01-15T10:30:00Z');
    });

    it('should accept empty job title', () => {
      const event: JobJdSubmittedEvent = {
        jobId: 'job-456',
        jobTitle: '',
        jdText: 'Description',
        timestamp: new Date().toISOString(),
      };

      expect(event.jobTitle).toBe('');
    });

    it('should handle long job descriptions', () => {
      const longDescription = 'A'.repeat(10000);
      const event: JobJdSubmittedEvent = {
        jobId: 'job-789',
        jobTitle: 'Senior Developer',
        jdText: longDescription,
        timestamp: new Date().toISOString(),
      };

      expect(event.jdText).toHaveLength(10000);
    });

    it('should accept various timestamp formats', () => {
      const timestamps = [
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        new Date().toISOString(),
      ];

      timestamps.forEach((timestamp) => {
        const event: JobJdSubmittedEvent = {
          jobId: 'job-test',
          jobTitle: 'Test Job',
          jdText: 'Test description',
          timestamp,
        };
        expect(event.timestamp).toBe(timestamp);
      });
    });

    it('should handle special characters in job title', () => {
      const event: JobJdSubmittedEvent = {
        jobId: 'job-special',
        jobTitle: 'Developer (Remote) - JavaScript/React & Node.js!',
        jdText: 'Description with special chars: <>&"\'',
        timestamp: new Date().toISOString(),
      };

      expect(event.jobTitle).toContain('(Remote)');
      expect(event.jdText).toContain('<>&');
    });

    it('should maintain event immutability pattern', () => {
      const event: JobJdSubmittedEvent = {
        jobId: 'job-immutable',
        jobTitle: 'Immutable Job',
        jdText: 'Test',
        timestamp: '2024-01-15T10:30:00Z',
      };

      // TypeScript interface doesn't enforce immutability at runtime
      // but we can verify the structure is correct
      const eventKeys = Object.keys(event);
      expect(eventKeys).toContain('jobId');
      expect(eventKeys).toContain('jobTitle');
      expect(eventKeys).toContain('jdText');
      expect(eventKeys).toContain('timestamp');
      expect(eventKeys).toHaveLength(4);
    });
  });

  describe('AnalysisJdExtractedEvent', () => {
    const mockJdDTO: JdDTO = {
      requirements: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB'],
        soft: ['Communication', 'Teamwork'],
        experience: '3+ years',
        education: 'Bachelor degree',
      },
      responsibilities: ['Develop features', 'Write tests', 'Code review'],
      benefits: ['Health insurance', '401k', 'Remote work'],
      company: {
        name: 'Tech Corp',
        industry: 'Software',
        size: '100-500',
      },
    };

    it('should create valid AnalysisJdExtractedEvent', () => {
      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-123',
        extractedData: mockJdDTO,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 1500,
      };

      expect(event.jobId).toBe('job-123');
      expect(event.extractedData).toBe(mockJdDTO);
      expect(event.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(event.processingTimeMs).toBe(1500);
    });

    it('should handle minimal extracted data', () => {
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

      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-minimal',
        extractedData: minimalData,
        timestamp: new Date().toISOString(),
        processingTimeMs: 500,
      };

      expect(event.extractedData.requirements.technical).toEqual([]);
      expect(event.extractedData.company).toEqual({});
    });

    it('should handle zero processing time', () => {
      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-zero',
        extractedData: mockJdDTO,
        timestamp: new Date().toISOString(),
        processingTimeMs: 0,
      };

      expect(event.processingTimeMs).toBe(0);
    });

    it('should handle large processing time', () => {
      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-slow',
        extractedData: mockJdDTO,
        timestamp: new Date().toISOString(),
        processingTimeMs: 60000,
      };

      expect(event.processingTimeMs).toBe(60000);
    });

    it('should handle complex nested data structures', () => {
      const complexData: JdDTO = {
        requirements: {
          technical: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Terraform', 'Microservices'],
          soft: ['Leadership', 'Communication', 'Problem solving'],
          experience: '10+ years system design and cloud architecture',
          education: 'Masters degree in CS or related field',
        },
        responsibilities: ['Architecture design', 'Team mentoring', 'Code review', 'Technical leadership'],
        benefits: ['Health', 'Dental', 'Vision', '401k Match', 'Unlimited PTO', 'Remote Work'],
        company: {
          name: 'Big Tech Corp',
          industry: 'Cloud Computing',
          size: '1000+',
        },
      };

      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-complex',
        extractedData: complexData,
        timestamp: new Date().toISOString(),
        processingTimeMs: 2500,
      };

      expect(event.extractedData.requirements.technical).toHaveLength(6);
      expect(event.extractedData.company.name).toBe('Big Tech Corp');
    });

    it('should verify event structure completeness', () => {
      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-structure',
        extractedData: mockJdDTO,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 1000,
      };

      const eventKeys = Object.keys(event);
      expect(eventKeys).toContain('jobId');
      expect(eventKeys).toContain('extractedData');
      expect(eventKeys).toContain('timestamp');
      expect(eventKeys).toContain('processingTimeMs');
      expect(eventKeys).toHaveLength(4);
    });

    it('should handle events with all JdDTO fields populated', () => {
      const fullData: JdDTO = {
        requirements: {
          technical: ['React', 'Node', 'PostgreSQL', 'AWS', 'TypeScript', 'Full stack development'],
          soft: ['Communication', 'Problem solving', 'Leadership'],
          experience: '5+ years full stack development',
          education: 'BS in CS or equivalent experience',
        },
        responsibilities: ['Frontend development', 'Backend development', 'Database design', 'API development'],
        benefits: ['Health', 'Dental', 'Vision', '401k', 'Flexible schedule'],
        company: {
          name: 'Tech Startup',
          industry: 'SaaS',
          size: '50-200',
        },
      };

      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-full',
        extractedData: fullData,
        timestamp: new Date().toISOString(),
        processingTimeMs: 2000,
      };

      expect(event.extractedData).toEqual(fullData);
    });
  });

  describe('Event Type Safety', () => {
    it('should distinguish between event types', () => {
      const submitEvent: JobJdSubmittedEvent = {
        jobId: 'job-123',
        jobTitle: 'Developer',
        jdText: 'Description',
        timestamp: new Date().toISOString(),
      };

      const extractEvent: AnalysisJdExtractedEvent = {
        jobId: 'job-123',
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
        timestamp: new Date().toISOString(),
        processingTimeMs: 1000,
      };

      // Verify events have different structures
      expect('jobTitle' in submitEvent).toBe(true);
      expect('jobTitle' in extractEvent).toBe(false);
      expect('extractedData' in extractEvent).toBe(true);
      expect('extractedData' in submitEvent).toBe(false);
    });

    it('should maintain type consistency across events', () => {
      const jobId = 'job-consistency';
      const timestamp = '2024-01-15T10:30:00Z';

      const submitEvent: JobJdSubmittedEvent = {
        jobId,
        jobTitle: 'Developer',
        jdText: 'Description',
        timestamp,
      };

      const extractEvent: AnalysisJdExtractedEvent = {
        jobId,
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
        timestamp,
        processingTimeMs: 1000,
      };

      expect(submitEvent.jobId).toBe(extractEvent.jobId);
      expect(submitEvent.timestamp).toBe(extractEvent.timestamp);
    });
  });
});
