import {
  ResumeDTO,
  ResumeAnalysisDto,
  ResumeUploadDto,
  ResumeStatusUpdateDto,
  ResumeSearchDto,
  ResumeSkillsAnalysisDto,
} from './resume.dto';
import {
  FileMetadata,
  ResumeSubmittedEvent,
  AnalysisResumeParsedEvent,
  JobResumeFailedEvent,
} from './resume-events.dto';

describe('resume.dto', () => {
  describe('ResumeDTO', () => {
    it('should create a valid resume DTO', () => {
      const resume: ResumeDTO = {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        summary: 'Experienced developer',
        skills: ['JavaScript', 'TypeScript', 'Node.js'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Led development team',
          },
        ],
        education: [
          {
            school: 'MIT',
            degree: 'Bachelor',
            major: 'Computer Science',
          },
        ],
        certifications: ['AWS Solutions Architect'],
        languages: ['English', 'Spanish'],
      };

      expect(resume.contactInfo.name).toBe('John Doe');
      expect(resume.skills).toContain('JavaScript');
      expect(resume.workExperience[0].endDate).toBe('present');
    });

    it('should allow null contact info fields', () => {
      const resume: ResumeDTO = {
        contactInfo: {
          name: null,
          email: null,
          phone: null,
        },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(resume.contactInfo.name).toBeNull();
      expect(resume.contactInfo.email).toBeNull();
    });

    it('should allow optional fields to be omitted', () => {
      const resume: ResumeDTO = {
        contactInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+0987654321',
        },
        skills: ['Python'],
        workExperience: [],
        education: [],
      };

      expect(resume.summary).toBeUndefined();
      expect(resume.certifications).toBeUndefined();
      expect(resume.languages).toBeUndefined();
    });

    it('should allow empty arrays for required array fields', () => {
      const resume: ResumeDTO = {
        contactInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1111111111',
        },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(resume.skills).toHaveLength(0);
      expect(resume.workExperience).toHaveLength(0);
      expect(resume.education).toHaveLength(0);
    });
  });

  describe('ResumeAnalysisDto', () => {
    it('should create a valid resume analysis DTO', () => {
      const analysis: ResumeAnalysisDto = {
        resumeId: 'resume-123',
        matchScore: 85,
        skillsMatch: {
          matched: ['JavaScript', 'React'],
          missing: ['GraphQL'],
          additional: ['jQuery'],
        },
        experienceAnalysis: {
          totalYears: 10,
          relevantYears: 8,
          industries: ['Tech', 'Finance'],
        },
        recommendations: ['Add more project details'],
        analysisDate: '2024-01-15T10:30:00Z',
      };

      expect(analysis.resumeId).toBe('resume-123');
      expect(analysis.matchScore).toBe(85);
      expect(analysis.skillsMatch.matched).toHaveLength(2);
      expect(analysis.experienceAnalysis.totalYears).toBe(10);
    });

    it('should allow zero match score', () => {
      const analysis: ResumeAnalysisDto = {
        resumeId: 'resume-456',
        matchScore: 0,
        skillsMatch: { matched: [], missing: [], additional: [] },
        experienceAnalysis: { totalYears: 0, relevantYears: 0, industries: [] },
        recommendations: [],
        analysisDate: '2024-01-15T10:30:00Z',
      };

      expect(analysis.matchScore).toBe(0);
    });

    it('should allow match score of 100', () => {
      const analysis: ResumeAnalysisDto = {
        resumeId: 'resume-789',
        matchScore: 100,
        skillsMatch: { matched: ['TypeScript'], missing: [], additional: [] },
        experienceAnalysis: {
          totalYears: 15,
          relevantYears: 15,
          industries: ['Tech'],
        },
        recommendations: [],
        analysisDate: '2024-01-15T10:30:00Z',
      };

      expect(analysis.matchScore).toBe(100);
    });
  });

  describe('ResumeUploadDto', () => {
    it('should create a valid resume upload DTO', () => {
      const upload: ResumeUploadDto = {
        fileName: 'resume.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        jobId: 'job-123',
        candidateEmail: 'candidate@example.com',
        candidateName: 'John Candidate',
        source: 'website',
        notes: 'Applying for senior position',
        tags: ['urgent', 'referral'],
      };

      expect(upload.fileName).toBe('resume.pdf');
      expect(upload.fileSize).toBe(1024000);
      expect(upload.tags).toContain('urgent');
    });

    it('should allow minimal upload DTO', () => {
      const upload: ResumeUploadDto = {
        fileName: 'resume.docx',
        fileSize: 512000,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      expect(upload.fileName).toBe('resume.docx');
      expect(upload.jobId).toBeUndefined();
      expect(upload.tags).toBeUndefined();
    });
  });

  describe('ResumeStatusUpdateDto', () => {
    it('should create a valid status update DTO with all statuses', () => {
      const statuses: ResumeStatusUpdateDto['status'][] = [
        'pending',
        'processing',
        'analyzed',
        'rejected',
        'archived',
      ];

      statuses.forEach((status) => {
        const update: ResumeStatusUpdateDto = { status };
        expect(update.status).toBe(status);
      });
    });

    it('should allow optional fields', () => {
      const update: ResumeStatusUpdateDto = {
        status: 'analyzed',
        notes: 'Passed all checks',
        updatedBy: 'admin-user-id',
        reason: 'All criteria met',
      };

      expect(update.notes).toBe('Passed all checks');
      expect(update.updatedBy).toBe('admin-user-id');
      expect(update.reason).toBe('All criteria met');
    });
  });

  describe('ResumeSearchDto', () => {
    it('should create a valid search DTO', () => {
      const search: ResumeSearchDto = {
        query: 'senior developer',
        skills: ['JavaScript', 'TypeScript'],
        minExperience: 5,
        maxExperience: 15,
        education: ['Computer Science'],
        status: ['pending', 'analyzed'],
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      expect(search.query).toBe('senior developer');
      expect(search.skills).toHaveLength(2);
      expect(search.page).toBe(1);
      expect(search.sortOrder).toBe('desc');
    });

    it('should allow empty search DTO', () => {
      const search: ResumeSearchDto = {};

      expect(search.query).toBeUndefined();
      expect(search.skills).toBeUndefined();
      expect(search.page).toBeUndefined();
    });
  });

  describe('ResumeSkillsAnalysisDto', () => {
    it('should create a valid skills analysis DTO', () => {
      const skillsAnalysis: ResumeSkillsAnalysisDto = {
        resumeId: 'resume-123',
        technicalSkills: [
          {
            name: 'JavaScript',
            level: 'expert',
            yearsOfExperience: 10,
            lastUsed: '2024',
          },
          { name: 'Python', level: 'advanced', yearsOfExperience: 5 },
        ],
        softSkills: ['Communication', 'Teamwork'],
        certifications: [
          {
            name: 'AWS Solutions Architect',
            issuer: 'Amazon',
            date: '2023-06-01',
          },
        ],
        languages: [
          { language: 'English', proficiency: 'native' },
          { language: 'Spanish', proficiency: 'conversational' },
        ],
      };

      expect(skillsAnalysis.resumeId).toBe('resume-123');
      expect(skillsAnalysis.technicalSkills[0].level).toBe('expert');
      expect(skillsAnalysis.softSkills).toContain('Communication');
      expect(skillsAnalysis.certifications[0].issuer).toBe('Amazon');
      expect(skillsAnalysis.languages[0].proficiency).toBe('native');
    });

    it('should allow all skill levels', () => {
      const levels: ResumeSkillsAnalysisDto['technicalSkills'][0]['level'][] = [
        'beginner',
        'intermediate',
        'advanced',
        'expert',
      ];

      levels.forEach((level) => {
        const skill = { name: 'Test', level, yearsOfExperience: 5 };
        expect(skill.level).toBe(level);
      });
    });

    it('should allow all language proficiencies', () => {
      const proficiencies: ResumeSkillsAnalysisDto['languages'][0]['proficiency'][] =
        ['basic', 'conversational', 'professional', 'native'];

      proficiencies.forEach((proficiency) => {
        const lang = { language: 'Test', proficiency };
        expect(lang.proficiency).toBe(proficiency);
      });
    });

    it('should allow optional expiry date on certifications', () => {
      const cert = {
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
        date: '2023-06-01',
        expiryDate: '2026-06-01',
      };

      expect(cert.expiryDate).toBe('2026-06-01');
    });
  });
});

describe('resume-events.dto', () => {
  describe('FileMetadata', () => {
    it('should create valid file metadata', () => {
      const metadata: FileMetadata = {
        mimeType: 'application/pdf',
        size: 1024000,
        encoding: 'binary',
      };

      expect(metadata.mimeType).toBe('application/pdf');
      expect(metadata.size).toBe(1024000);
      expect(metadata.encoding).toBe('binary');
    });

    it('should allow partial file metadata', () => {
      const metadata: FileMetadata = {
        mimeType: 'image/png',
      };

      expect(metadata.mimeType).toBe('image/png');
      expect(metadata.size).toBeUndefined();
    });
  });

  describe('ResumeSubmittedEvent', () => {
    it('should create a valid resume submitted event', () => {
      const event: ResumeSubmittedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'john_doe_resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/abc123',
        organizationId: 'org-789',
        fileMetadata: {
          mimeType: 'application/pdf',
          size: 1024000,
        },
      };

      expect(event.jobId).toBe('job-123');
      expect(event.resumeId).toBe('resume-456');
      expect(event.tempGridFsUrl).toContain('storage.example.com');
      expect(event.fileMetadata?.mimeType).toBe('application/pdf');
    });

    it('should allow minimal resume submitted event', () => {
      const event: ResumeSubmittedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'resume.pdf',
        tempGridFsUrl: 'https://storage.example.com/temp/xyz',
      };

      expect(event.jobId).toBe('job-123');
      expect(event.organizationId).toBeUndefined();
      expect(event.fileMetadata).toBeUndefined();
    });
  });

  describe('AnalysisResumeParsedEvent', () => {
    it('should create a valid analysis resume parsed event', () => {
      const resumeDto: ResumeDTO = {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        skills: ['JavaScript', 'TypeScript'],
        workExperience: [],
        education: [],
      };

      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        resumeDto,
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 1500,
      };

      expect(event.jobId).toBe('job-123');
      expect(event.resumeDto.contactInfo.name).toBe('John Doe');
      expect(event.processingTimeMs).toBe(1500);
    });

    it('should allow zero processing time', () => {
      const event: AnalysisResumeParsedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        resumeDto: {
          contactInfo: { name: null, email: null, phone: null },
          skills: [],
          workExperience: [],
          education: [],
        },
        timestamp: '2024-01-15T10:30:00Z',
        processingTimeMs: 0,
      };

      expect(event.processingTimeMs).toBe(0);
    });
  });

  describe('JobResumeFailedEvent', () => {
    it('should create a valid job resume failed event', () => {
      const event: JobResumeFailedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'resume.pdf',
        error: 'Failed to parse resume: Invalid PDF format',
        retryCount: 3,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(event.jobId).toBe('job-123');
      expect(event.resumeId).toBe('resume-456');
      expect(event.error).toContain('Failed to parse resume');
      expect(event.retryCount).toBe(3);
    });

    it('should allow zero retry count', () => {
      const event: JobResumeFailedEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        originalFilename: 'resume.pdf',
        error: 'Parse error',
        retryCount: 0,
        timestamp: '2024-01-15T10:30:00Z',
      };

      expect(event.retryCount).toBe(0);
    });
  });
});
