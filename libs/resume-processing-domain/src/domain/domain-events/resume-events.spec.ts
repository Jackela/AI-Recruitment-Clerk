/**
 * Resume Processing Domain Events Tests
 */
import {
  ResumeSubmittedEvent,
  AnalysisResumeParsedEvent,
  JobResumeFailedEvent,
} from './resume-events';

describe('Resume Domain Events', () => {
  describe('ResumeSubmittedEvent', () => {
    it('should define ResumeSubmittedEvent type', () => {
      // Verify the type is exported
      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        fileName: 'test-resume.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      };

      expect(event).toBeDefined();
      expect(event.resumeId).toBe('resume-123');
      expect(event.jobId).toBe('job-456');
      expect(event.fileName).toBe('test-resume.pdf');
      expect(event.fileType).toBe('application/pdf');
      expect(event.fileSize).toBe(1024);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should accept optional fields', () => {
      const event: ResumeSubmittedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        fileName: 'test-resume.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        candidateName: 'John Doe',
        candidateEmail: 'john@example.com',
        metadata: {
          source: 'email',
          submittedBy: 'hr@company.com',
        },
      };

      expect(event.candidateName).toBe('John Doe');
      expect(event.candidateEmail).toBe('john@example.com');
      expect(event.metadata).toEqual({
        source: 'email',
        submittedBy: 'hr@company.com',
      });
    });
  });

  describe('AnalysisResumeParsedEvent', () => {
    it('should define AnalysisResumeParsedEvent type', () => {
      const event: AnalysisResumeParsedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        extractedData: {
          personalInfo: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
          },
          skills: ['JavaScript', 'TypeScript', 'Node.js'],
          experience: [
            {
              company: 'Tech Corp',
              position: 'Senior Developer',
              duration: '2020-2023',
            },
          ],
          education: [
            {
              institution: 'University',
              degree: 'Bachelor',
              field: 'Computer Science',
              year: '2020',
            },
          ],
        },
        parsingConfidence: 0.95,
      };

      expect(event).toBeDefined();
      expect(event.extractedData).toBeDefined();
      expect(event.extractedData.personalInfo).toBeDefined();
      expect(event.extractedData.skills).toHaveLength(3);
      expect(event.parsingConfidence).toBe(0.95);
    });

    it('should accept event with minimal data', () => {
      const event: AnalysisResumeParsedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        extractedData: {
          personalInfo: {
            name: 'John Doe',
            email: 'john@example.com',
          },
          skills: [],
          experience: [],
          education: [],
        },
        parsingConfidence: 0.5,
      };

      expect(event.extractedData.skills).toHaveLength(0);
      expect(event.parsingConfidence).toBe(0.5);
    });

    it('should accept optional confidence score', () => {
      const event: AnalysisResumeParsedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        extractedData: {
          personalInfo: {
            name: 'John Doe',
            email: 'john@example.com',
          },
          skills: [],
          experience: [],
          education: [],
        },
      };

      expect(event.parsingConfidence).toBeUndefined();
    });
  });

  describe('JobResumeFailedEvent', () => {
    it('should define JobResumeFailedEvent type', () => {
      const event: JobResumeFailedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        errorCode: 'PARSING_ERROR',
        errorMessage: 'Failed to parse PDF file',
      };

      expect(event).toBeDefined();
      expect(event.errorCode).toBe('PARSING_ERROR');
      expect(event.errorMessage).toBe('Failed to parse PDF file');
    });

    it('should accept optional error details', () => {
      const event: JobResumeFailedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid file format',
        errorDetails: {
          field: 'fileType',
          expected: 'application/pdf',
          received: 'image/png',
        },
      };

      expect(event.errorDetails).toEqual({
        field: 'fileType',
        expected: 'application/pdf',
        received: 'image/png',
      });
    });

    it('should accept different error codes', () => {
      const errorCodes = [
        'PARSING_ERROR',
        'VALIDATION_ERROR',
        'EXTRACTION_ERROR',
        'FORMAT_ERROR',
        'SIZE_LIMIT_ERROR',
        'TIMEOUT_ERROR',
      ];

      errorCodes.forEach((code) => {
        const event: JobResumeFailedEvent = {
          resumeId: 'resume-123',
          jobId: 'job-456',
          timestamp: new Date(),
          errorCode: code,
          errorMessage: `Error: ${code}`,
        };

        expect(event.errorCode).toBe(code);
      });
    });
  });

  describe('Event Type Compatibility', () => {
    it('should have compatible timestamp fields', () => {
      const now = new Date();

      const submittedEvent: ResumeSubmittedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: now,
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      };

      const parsedEvent: AnalysisResumeParsedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: now,
        extractedData: {
          personalInfo: {
            name: 'John',
            email: 'john@example.com',
          },
          skills: [],
          experience: [],
          education: [],
        },
      };

      const failedEvent: JobResumeFailedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: now,
        errorCode: 'ERROR',
        errorMessage: 'Error',
      };

      expect(submittedEvent.timestamp).toEqual(now);
      expect(parsedEvent.timestamp).toEqual(now);
      expect(failedEvent.timestamp).toEqual(now);
    });

    it('should have common resumeId and jobId fields', () => {
      const submittedEvent: ResumeSubmittedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      };

      const parsedEvent: AnalysisResumeParsedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        extractedData: {
          personalInfo: {
            name: 'John',
            email: 'john@example.com',
          },
          skills: [],
          experience: [],
          education: [],
        },
      };

      const failedEvent: JobResumeFailedEvent = {
        resumeId: 'resume-123',
        jobId: 'job-456',
        timestamp: new Date(),
        errorCode: 'ERROR',
        errorMessage: 'Error',
      };

      expect(submittedEvent.resumeId).toBe(parsedEvent.resumeId);
      expect(submittedEvent.resumeId).toBe(failedEvent.resumeId);
      expect(submittedEvent.jobId).toBe(parsedEvent.jobId);
      expect(submittedEvent.jobId).toBe(failedEvent.jobId);
    });
  });
});
