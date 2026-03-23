import {
  JobJdSubmittedEvent,
  AnalysisJdExtractedEvent,
} from './job-events.dto';
import { JdDTO } from '../dto/jd.dto';

describe('JobEventsDto', () => {
  describe('JobJdSubmittedEvent interface', () => {
    it('should accept valid job JD submitted event', () => {
      const event: JobJdSubmittedEvent = {
        jobId: 'job-123',
        jobTitle: 'Software Engineer',
        jdText: 'We are looking for...',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      expect(event.jobId).toBe('job-123');
      expect(event.jobTitle).toBe('Software Engineer');
      expect(event.jdText).toContain('looking for');
      expect(event.timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should accept empty JD text', () => {
      const event: JobJdSubmittedEvent = {
        jobId: 'job-456',
        jobTitle: 'Junior Developer',
        jdText: '',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      expect(event.jdText).toBe('');
    });
  });

  describe('AnalysisJdExtractedEvent interface', () => {
    it('should accept valid JD extracted event', () => {
      const extractedData: JdDTO = {
        requirements: {
          technical: ['Python', 'SQL'],
          soft: ['Communication'],
          experience: '2 years',
          education: "Bachelor's",
        },
        responsibilities: ['Develop APIs', 'Write tests'],
        benefits: ['Health insurance'],
        company: {
          name: 'Tech Inc',
          industry: 'Software',
        },
      };

      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-123',
        extractedData,
        timestamp: '2024-01-01T00:00:00.000Z',
        processingTimeMs: 2500,
      };

      expect(event.jobId).toBe('job-123');
      expect(event.extractedData.requirements.technical).toContain('Python');
      expect(event.processingTimeMs).toBe(2500);
    });

    it('should accept event with minimal extracted data', () => {
      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-789',
        extractedData: {
          requirements: {
            technical: [],
            soft: [],
            experience: 'any',
            education: 'any',
          },
          responsibilities: [],
          benefits: [],
          company: {},
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        processingTimeMs: 100,
      };

      expect(event.extractedData).toBeDefined();
      expect(event.processingTimeMs).toBe(100);
    });

    it('should accept very fast processing time', () => {
      const event: AnalysisJdExtractedEvent = {
        jobId: 'job-fast',
        extractedData: {
          requirements: {
            technical: ['Go'],
            soft: [],
            experience: '5 years',
            education: "Master's",
          },
          responsibilities: ['Backend development'],
          benefits: ['Stock options'],
          company: { name: 'Startup' },
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        processingTimeMs: 50,
      };

      expect(event.processingTimeMs).toBe(50);
    });
  });
});
