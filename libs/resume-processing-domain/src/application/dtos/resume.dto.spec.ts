import type {
  ResumeDTO,
  ResumeAnalysisDto,
  ResumeUploadDto,
  ResumeStatusUpdateDto,
  ResumeSearchDto,
  ResumeSkillsAnalysisDto,
} from '@ai-recruitment-clerk/resume-dto';

describe('ResumeDTO', () => {
  describe('contactInfo', () => {
    it('should accept valid contact information', () => {
      const dto: ResumeDTO = {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1-555-123-4567',
        },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.contactInfo.name).toBe('John Doe');
      expect(dto.contactInfo.email).toBe('john@example.com');
      expect(dto.contactInfo.phone).toBe('+1-555-123-4567');
    });

    it('should accept null values for contact info', () => {
      const dto: ResumeDTO = {
        contactInfo: {
          name: null,
          email: null,
          phone: null,
        },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.contactInfo.name).toBeNull();
      expect(dto.contactInfo.email).toBeNull();
      expect(dto.contactInfo.phone).toBeNull();
    });

    it('should accept partial contact info', () => {
      const dto: ResumeDTO = {
        contactInfo: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: null,
        },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.contactInfo.name).toBe('Jane Smith');
      expect(dto.contactInfo.email).toBe('jane@example.com');
      expect(dto.contactInfo.phone).toBeNull();
    });
  });

  describe('summary', () => {
    it('should accept optional summary', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        summary: 'Experienced software engineer',
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.summary).toBe('Experienced software engineer');
    });

    it('should omit summary when not provided', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.summary).toBeUndefined();
    });
  });

  describe('skills', () => {
    it('should accept array of skill strings', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        workExperience: [],
        education: [],
      };

      expect(dto.skills).toHaveLength(4);
      expect(dto.skills).toContain('JavaScript');
      expect(dto.skills).toContain('TypeScript');
    });

    it('should accept empty skills array', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.skills).toEqual([]);
    });
  });

  describe('workExperience', () => {
    it('should accept valid work experience entries', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Led development team',
          },
          {
            company: 'Startup Inc',
            position: 'Developer',
            startDate: '2018-01-01',
            endDate: '2019-12-31',
            summary: 'Built MVP',
          },
        ],
        education: [],
      };

      expect(dto.workExperience).toHaveLength(2);
      expect(dto.workExperience[0].company).toBe('Tech Corp');
      expect(dto.workExperience[0].endDate).toBe('present');
    });

    it('should accept empty work experience array', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.workExperience).toEqual([]);
    });

    it('should accept present as endDate', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [
          {
            company: 'Current Company',
            position: 'Engineer',
            startDate: '2021-03-15',
            endDate: 'present',
            summary: 'Current role',
          },
        ],
        education: [],
      };

      expect(dto.workExperience[0].endDate).toBe('present');
    });
  });

  describe('education', () => {
    it('should accept valid education entries', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [
          {
            school: 'MIT',
            degree: 'Master of Science',
            major: 'Computer Science',
          },
          {
            school: 'State University',
            degree: 'Bachelor of Science',
            major: null,
          },
        ],
      };

      expect(dto.education).toHaveLength(2);
      expect(dto.education[0].school).toBe('MIT');
      expect(dto.education[0].major).toBe('Computer Science');
      expect(dto.education[1].major).toBeNull();
    });

    it('should accept empty education array', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.education).toEqual([]);
    });
  });

  describe('certifications', () => {
    it('should accept optional certifications array', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
        certifications: ['AWS Solutions Architect', 'PMP'],
      };

      expect(dto.certifications).toHaveLength(2);
      expect(dto.certifications).toContain('AWS Solutions Architect');
    });

    it('should omit certifications when not provided', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.certifications).toBeUndefined();
    });
  });

  describe('languages', () => {
    it('should accept optional languages array', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
        languages: ['English', 'Spanish', 'Mandarin'],
      };

      expect(dto.languages).toHaveLength(3);
    });

    it('should omit languages when not provided', () => {
      const dto: ResumeDTO = {
        contactInfo: { name: null, email: null, phone: null },
        skills: [],
        workExperience: [],
        education: [],
      };

      expect(dto.languages).toBeUndefined();
    });
  });
});

describe('ResumeAnalysisDto', () => {
  it('should accept valid analysis result', () => {
    const dto: ResumeAnalysisDto = {
      resumeId: 'resume-123',
      matchScore: 0.85,
      skillsMatch: {
        matched: ['JavaScript', 'TypeScript'],
        missing: ['Go'],
        additional: ['Python'],
      },
      experienceAnalysis: {
        totalYears: 10,
        relevantYears: 8,
        industries: ['Tech', 'Finance'],
      },
      recommendations: ['Consider certifications in cloud'],
      analysisDate: '2024-01-15T10:30:00Z',
    };

    expect(dto.resumeId).toBe('resume-123');
    expect(dto.matchScore).toBe(0.85);
    expect(dto.skillsMatch.matched).toHaveLength(2);
    expect(dto.experienceAnalysis.totalYears).toBe(10);
  });

  it('should accept zero match score', () => {
    const dto: ResumeAnalysisDto = {
      resumeId: 'resume-456',
      matchScore: 0,
      skillsMatch: { matched: [], missing: [], additional: [] },
      experienceAnalysis: { totalYears: 0, relevantYears: 0, industries: [] },
      recommendations: [],
      analysisDate: '2024-01-15T10:30:00Z',
    };

    expect(dto.matchScore).toBe(0);
  });

  it('should accept perfect match score', () => {
    const dto: ResumeAnalysisDto = {
      resumeId: 'resume-789',
      matchScore: 1.0,
      skillsMatch: { matched: ['JavaScript'], missing: [], additional: [] },
      experienceAnalysis: {
        totalYears: 5,
        relevantYears: 5,
        industries: ['Tech'],
      },
      recommendations: [],
      analysisDate: '2024-01-15T10:30:00Z',
    };

    expect(dto.matchScore).toBe(1.0);
  });
});

describe('ResumeUploadDto', () => {
  it('should accept valid upload request', () => {
    const dto: ResumeUploadDto = {
      fileName: 'john-doe-resume.pdf',
      fileSize: 102400,
      mimeType: 'application/pdf',
      jobId: 'job-123',
      candidateEmail: 'john@example.com',
      candidateName: 'John Doe',
    };

    expect(dto.fileName).toBe('john-doe-resume.pdf');
    expect(dto.fileSize).toBe(102400);
    expect(dto.mimeType).toBe('application/pdf');
    expect(dto.jobId).toBe('job-123');
  });

  it('should accept minimal upload request', () => {
    const dto: ResumeUploadDto = {
      fileName: 'resume.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
    };

    expect(dto.fileName).toBe('resume.pdf');
    expect(dto.jobId).toBeUndefined();
    expect(dto.candidateEmail).toBeUndefined();
  });

  it('should accept optional tags', () => {
    const dto: ResumeUploadDto = {
      fileName: 'resume.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      tags: ['urgent', 'referral', 'internal'],
    };

    expect(dto.tags).toHaveLength(3);
  });
});

describe('ResumeStatusUpdateDto', () => {
  it('should accept valid status values', () => {
    const statuses: Array<ResumeStatusUpdateDto['status']> = [
      'pending',
      'processing',
      'analyzed',
      'rejected',
      'archived',
    ];

    statuses.forEach((status) => {
      const dto: ResumeStatusUpdateDto = { status };
      expect(dto.status).toBe(status);
    });
  });

  it('should accept optional notes and reason', () => {
    const dto: ResumeStatusUpdateDto = {
      status: 'rejected',
      notes: 'Does not meet minimum requirements',
      updatedBy: 'hr@company.com',
      reason: 'Insufficient experience',
    };

    expect(dto.status).toBe('rejected');
    expect(dto.notes).toBe('Does not meet minimum requirements');
    expect(dto.reason).toBe('Insufficient experience');
  });
});

describe('ResumeSearchDto', () => {
  it('should accept empty search criteria', () => {
    const dto: ResumeSearchDto = {};

    expect(dto.query).toBeUndefined();
    expect(dto.skills).toBeUndefined();
  });

  it('should accept full search criteria', () => {
    const dto: ResumeSearchDto = {
      query: 'software engineer',
      skills: ['JavaScript', 'Python'],
      minExperience: 3,
      maxExperience: 10,
      education: ['Bachelor', 'Master'],
      status: ['analyzed'],
      dateFrom: '2023-01-01',
      dateTo: '2024-12-31',
      page: 1,
      limit: 20,
      sortBy: 'matchScore',
      sortOrder: 'desc',
    };

    expect(dto.query).toBe('software engineer');
    expect(dto.skills).toHaveLength(2);
    expect(dto.minExperience).toBe(3);
    expect(dto.maxExperience).toBe(10);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.sortOrder).toBe('desc');
  });

  it('should accept sortOrder asc', () => {
    const dto: ResumeSearchDto = {
      sortBy: 'date',
      sortOrder: 'asc',
    };

    expect(dto.sortOrder).toBe('asc');
  });
});

describe('ResumeSkillsAnalysisDto', () => {
  it('should accept valid skills analysis', () => {
    const dto: ResumeSkillsAnalysisDto = {
      resumeId: 'resume-123',
      technicalSkills: [
        { name: 'JavaScript', level: 'expert', yearsOfExperience: 10 },
        {
          name: 'TypeScript',
          level: 'advanced',
          yearsOfExperience: 5,
          lastUsed: '2024-01',
        },
        { name: 'Python', level: 'intermediate', yearsOfExperience: 2 },
      ],
      softSkills: ['Communication', 'Team Leadership'],
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

    expect(dto.resumeId).toBe('resume-123');
    expect(dto.technicalSkills).toHaveLength(3);
    expect(dto.softSkills).toHaveLength(2);
    expect(dto.certifications).toHaveLength(1);
    expect(dto.languages).toHaveLength(2);
  });

  it('should accept skill levels', () => {
    const levels: Array<
      ResumeSkillsAnalysisDto['technicalSkills'][0]['level']
    > = ['beginner', 'intermediate', 'advanced', 'expert'];

    levels.forEach((level) => {
      const dto: ResumeSkillsAnalysisDto = {
        resumeId: 'resume-123',
        technicalSkills: [{ name: 'Test', level, yearsOfExperience: 5 }],
        softSkills: [],
        certifications: [],
        languages: [],
      };
      expect(dto.technicalSkills[0].level).toBe(level);
    });
  });

  it('should accept language proficiencies', () => {
    const proficiencies: Array<
      ResumeSkillsAnalysisDto['languages'][0]['proficiency']
    > = ['basic', 'conversational', 'professional', 'native'];

    proficiencies.forEach((proficiency) => {
      const dto: ResumeSkillsAnalysisDto = {
        resumeId: 'resume-123',
        technicalSkills: [],
        softSkills: [],
        certifications: [],
        languages: [{ language: 'Test', proficiency }],
      };
      expect(dto.languages[0].proficiency).toBe(proficiency);
    });
  });

  it('should accept certification with expiry date', () => {
    const dto: ResumeSkillsAnalysisDto = {
      resumeId: 'resume-123',
      technicalSkills: [],
      softSkills: [],
      certifications: [
        {
          name: 'AWS Solutions Architect',
          issuer: 'Amazon',
          date: '2023-06-01',
          expiryDate: '2026-06-01',
        },
      ],
      languages: [],
    };

    expect(dto.certifications[0].expiryDate).toBe('2026-06-01');
  });
});
