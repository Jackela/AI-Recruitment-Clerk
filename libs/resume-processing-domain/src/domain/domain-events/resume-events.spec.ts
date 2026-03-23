import type {
  ResumeSubmittedEvent,
  AnalysisResumeParsedEvent,
  JobResumeFailedEvent,
  FileMetadata,
} from '@ai-recruitment-clerk/resume-dto';
import type { ResumeDTO } from '@ai-recruitment-clerk/resume-dto';

describe('Resume Domain Events', () => {
  describe('FileMetadata', () => {
    it('should accept empty file metadata', () => {
      const metadata: FileMetadata = {};

      expect(metadata.mimeType).toBeUndefined();
      expect(metadata.size).toBeUndefined();
      expect(metadata.encoding).toBeUndefined();
    });

    it('should accept complete file metadata', () => {
      const metadata: FileMetadata = {
        mimeType: 'application/pdf',
        size: 102400,
        encoding: 'utf-8',
      };

      expect(metadata.mimeType).toBe('application/pdf');
      expect(metadata.size).toBe(102400);
      expect(metadata.encoding).toBe('utf-8');
    });

    it('should accept partial file metadata', () => {
      const metadata: FileMetadata = {
        mimeType: 'application/pdf',
      };

      expect(metadata.mimeType).toBe('application/pdf');
      expect(metadata.size).toBeUndefined();
    });
  });

  describe('ResumeSubmittedEvent', () => {
    it('should accept valid submitted event', () => {
      const event: ResumeSubmittedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'test-resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/abc123',
      };

      expect(event.jobId).toBe('job-456');
      expect(event.resumeId).toBe('resume-123');
      expect(event.originalFilename).toBe('test-resume.pdf');
      expect(event.tempGridFsUrl).toBe(
        'https://storage.example.com/temp/abc123',
      );
    });

    it('should accept event with optional organizationId', () => {
      const event: ResumeSubmittedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'test-resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/abc123',
        organizationId: 'org-789',
      };

      expect(event.organizationId).toBe('org-789');
    });

    it('should accept event with file metadata', () => {
      const event: ResumeSubmittedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'test-resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/abc123',
        fileMetadata: {
          mimeType: 'application/pdf',
          size: 102400,
          encoding: 'utf-8',
        },
      };

      expect(event.fileMetadata).toBeDefined();
      expect(event.fileMetadata?.mimeType).toBe('application/pdf');
      expect(event.fileMetadata?.size).toBe(102400);
    });

    it('should accept event without optional fields', () => {
      const event: ResumeSubmittedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/xyz',
      };

      expect(event.organizationId).toBeUndefined();
      expect(event.fileMetadata).toBeUndefined();
    });
  });

  describe('AnalysisResumeParsedEvent', () => {
    const validResumeDto: ResumeDTO = {
      contactInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
      summary: 'Experienced developer',
      skills: ['JavaScript', 'TypeScript'],
      workExperience: [
        {
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: '2020-01-01',
          endDate: 'present',
          summary: 'Led development',
        },
      ],
      education: [
        {
          school: 'MIT',
          degree: 'Master of Science',
          major: 'Computer Science',
        },
      ],
    };

    it('should accept valid parsed event', () => {
      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        resumeDto: validResumeDto,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 1500,
      };

      expect(event.jobId).toBe('job-456');
      expect(event.resumeId).toBe('resume-123');
      expect(event.resumeDto).toBeDefined();
      expect(event.resumeDto.contactInfo.name).toBe('John Doe');
      expect(event.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(event.processingTimeMs).toBe(1500);
    });

    it('should accept event with ISO timestamp string', () => {
      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        resumeDto: validResumeDto,
        timestamp: new Date().toISOString(),
        processingTimeMs: 500,
      };

      expect(event.timestamp).toContain('T');
    });

    it('should accept event with minimal resume', () => {
      const minimalResume: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        resumeDto: minimalResume,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 500,
      };

      expect(event.resumeDto.skills).toEqual([]);
      expect(event.resumeDto.workExperience).toEqual([]);
    });

    it('should accept zero processing time', () => {
      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        resumeDto: validResumeDto,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 0,
      };

      expect(event.processingTimeMs).toBe(0);
    });

    it('should accept large processing time', () => {
      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        resumeDto: validResumeDto,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 300000,
      };

      expect(event.processingTimeMs).toBe(300000);
    });
  });

  describe('JobResumeFailedEvent', () => {
    it('should accept valid failed event', () => {
      const event: JobResumeFailedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'test-resume.pdf',
        error: 'Failed to parse PDF: corrupted content',
        retryCount: 0,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(event.jobId).toBe('job-456');
      expect(event.resumeId).toBe('resume-123');
      expect(event.originalFilename).toBe('test-resume.pdf');
      expect(event.error).toBe('Failed to parse PDF: corrupted content');
      expect(event.retryCount).toBe(0);
      expect(event.timestamp).toBe('2024-01-15T10:30:00Z');
    });

    it('should accept event with retry count', () => {
      const event: JobResumeFailedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'resume.pdf',
        error: 'Timeout error',
        retryCount: 3,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(event.retryCount).toBe(3);
    });

    it('should accept various error messages', () => {
      const errors = [
        'PARSING_ERROR: Invalid PDF structure',
        'VALIDATION_ERROR: File too large',
        'EXTRACTION_ERROR: No text content found',
        'FORMAT_ERROR: Unsupported file type',
      ];

      errors.forEach((errorMsg) => {
        const event: JobResumeFailedEvent = {
          jobId: 'job-456',
          resumeId: 'resume-123',
          originalFilename: 'resume.pdf',
          error: errorMsg,
          retryCount: 0,
          timestamp: '2024-01-15T10:30:00Z',
        };

        expect(event.error).toBe(errorMsg);
      });
    });

    it('should accept max retry count', () => {
      const event: JobResumeFailedEvent = {
        jobId: 'job-456',
        resumeId: 'resume-123',
        originalFilename: 'resume.pdf',
        error: 'Max retries exceeded',
        retryCount: 5,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(event.retryCount).toBe(5);
    });
  });

  describe('Event Relationships', () => {
    const validResumeDto: ResumeDTO = {
      contactInfo: { name: 'John Doe', email: 'john@example.com', phone: null },
      skills: ['JavaScript'],
      workExperience: [],
      education: [],
    };

    it('should have consistent resumeId across events', () => {
      const resumeId = 'resume-123';

      const submittedEvent: ResumeSubmittedEvent = {
        jobId: 'job-456',
        resumeId,
        originalFilename: 'resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/abc',
      };

      const parsedEvent: AnalysisResumeParsedEvent = {
        jobId: 'job-456',
        resumeId,
        resumeDto: validResumeDto,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 1000,
      };

      const failedEvent: JobResumeFailedEvent = {
        jobId: 'job-456',
        resumeId,
        originalFilename: 'resume.pdf',
        error: 'Error',
        retryCount: 0,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(submittedEvent.resumeId).toBe(parsedEvent.resumeId);
      expect(submittedEvent.resumeId).toBe(failedEvent.resumeId);
    });

    it('should have consistent jobId across events', () => {
      const jobId = 'job-456';

      const submittedEvent: ResumeSubmittedEvent = {
        jobId,
        resumeId: 'resume-123',
        originalFilename: 'resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/abc',
      };

      const parsedEvent: AnalysisResumeParsedEvent = {
        jobId,
        resumeId: 'resume-123',
        resumeDto: validResumeDto,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 1000,
      };

      const failedEvent: JobResumeFailedEvent = {
        jobId,
        resumeId: 'resume-123',
        originalFilename: 'resume.pdf',
        error: 'Error',
        retryCount: 0,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(submittedEvent.jobId).toBe(parsedEvent.jobId);
      expect(submittedEvent.jobId).toBe(failedEvent.jobId);
    });
  });
});
