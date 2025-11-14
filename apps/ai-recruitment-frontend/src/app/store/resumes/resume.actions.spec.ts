import * as ResumeActions from './resume.actions';
import {
  ResumeListItem,
  ResumeDetail,
  ResumeUploadResponse,
} from './resume.model';

describe('Resume Actions', () => {
  const mockResumeListItem: ResumeListItem = {
    id: 'resume1',
    jobId: 'job1',
    fileName: 'john_doe_resume.pdf',
    status: 'processed',
    uploadedAt: new Date('2024-01-01'),
    candidateName: 'John Doe',
    candidateEmail: 'john@example.com',
    analysis: {
      overallScore: 85,
      skills: ['JavaScript', 'TypeScript', 'Angular'],
      experience: '3 years',
      education: 'Bachelor in Computer Science',
    },
  };

  const mockResumeDetail: ResumeDetail = {
    id: 'resume1',
    jobId: 'job1',
    fileName: 'john_doe_resume.pdf',
    status: 'processed',
    uploadedAt: new Date('2024-01-01'),
    candidateName: 'John Doe',
    candidateEmail: 'john@example.com',
    analysis: {
      overallScore: 85,
      skills: ['JavaScript', 'TypeScript', 'Angular'],
      experience: '3 years',
      education: 'Bachelor in Computer Science',
    },
    extractedData: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      address: '123 Main St, City, State',
      skills: ['JavaScript', 'TypeScript', 'Angular', 'Node.js'],
      experience: '3 years of frontend development',
      education: 'Bachelor of Science in Computer Science',
      workHistory: [
        {
          company: 'Tech Corp',
          position: 'Frontend Developer',
          duration: '2021-2024',
          description:
            'Developed modern web applications using Angular and TypeScript',
        },
      ],
      certifications: ['Angular Certified Developer'],
      languages: ['English (Native)', 'Spanish (Intermediate)'],
    },
  };

  const mockUploadResponse: ResumeUploadResponse = {
    jobId: 'job1',
    uploadedCount: 2,
    processedIds: ['resume1', 'resume2'],
    failedUploads: [],
    totalSize: 2048000,
  };

  const mockFiles = [
    new File(['resume content 1'], 'resume1.pdf', { type: 'application/pdf' }),
    new File(['resume content 2'], 'resume2.pdf', { type: 'application/pdf' }),
  ];

  describe('Load Resumes By Job Actions', () => {
    it('should create loadResumesByJob action', () => {
      const jobId = 'job1';
      const action = ResumeActions.loadResumesByJob({ jobId });
      expect(action.type).toBe('[Resume] Load Resumes By Job');
      expect(action.jobId).toBe(jobId);
    });

    it('should create loadResumesByJobSuccess action', () => {
      const resumes = [mockResumeListItem];
      const action = ResumeActions.loadResumesByJobSuccess({ resumes });
      expect(action.type).toBe('[Resume] Load Resumes By Job Success');
      expect(action.resumes).toEqual(resumes);
    });

    it('should create loadResumesByJobFailure action', () => {
      const error = 'Failed to load resumes';
      const action = ResumeActions.loadResumesByJobFailure({ error });
      expect(action.type).toBe('[Resume] Load Resumes By Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Load Single Resume Actions', () => {
    it('should create loadResume action', () => {
      const resumeId = 'resume1';
      const action = ResumeActions.loadResume({ resumeId });
      expect(action.type).toBe('[Resume] Load Resume');
      expect(action.resumeId).toBe(resumeId);
    });

    it('should create loadResumeSuccess action', () => {
      const action = ResumeActions.loadResumeSuccess({
        resume: mockResumeDetail,
      });
      expect(action.type).toBe('[Resume] Load Resume Success');
      expect(action.resume).toEqual(mockResumeDetail);
    });

    it('should create loadResumeFailure action', () => {
      const error = 'Failed to load resume';
      const action = ResumeActions.loadResumeFailure({ error });
      expect(action.type).toBe('[Resume] Load Resume Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Upload Resume Actions', () => {
    it('should create uploadResumes action', () => {
      const jobId = 'job1';
      const action = ResumeActions.uploadResumes({ jobId, files: mockFiles });
      expect(action.type).toBe('[Resume] Upload Resumes');
      expect(action.jobId).toBe(jobId);
      expect(action.files).toEqual(mockFiles);
    });

    it('should create uploadResumesProgress action', () => {
      const progress = 75;
      const action = ResumeActions.uploadResumesProgress({ progress });
      expect(action.type).toBe('[Resume] Upload Resumes Progress');
      expect(action.progress).toBe(progress);
    });

    it('should create uploadResumesSuccess action', () => {
      const action = ResumeActions.uploadResumesSuccess({
        response: mockUploadResponse,
      });
      expect(action.type).toBe('[Resume] Upload Resumes Success');
      expect(action.response).toEqual(mockUploadResponse);
    });

    it('should create uploadResumesFailure action', () => {
      const error = 'Failed to upload resumes';
      const action = ResumeActions.uploadResumesFailure({ error });
      expect(action.type).toBe('[Resume] Upload Resumes Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Utility Actions', () => {
    it('should create clearSelectedResume action', () => {
      const action = ResumeActions.clearSelectedResume();
      expect(action.type).toBe('[Resume] Clear Selected Resume');
    });

    it('should create clearResumes action', () => {
      const action = ResumeActions.clearResumes();
      expect(action.type).toBe('[Resume] Clear Resumes');
    });

    it('should create clearResumeError action', () => {
      const action = ResumeActions.clearResumeError();
      expect(action.type).toBe('[Resume] Clear Error');
    });
  });

  describe('Action Type Consistency', () => {
    it('should have consistent action types for load operations', () => {
      const loadAction = ResumeActions.loadResumesByJob({ jobId: 'test' });
      const successAction = ResumeActions.loadResumesByJobSuccess({
        resumes: [],
      });
      const failureAction = ResumeActions.loadResumesByJobFailure({
        error: 'test error',
      });

      expect(loadAction.type).toContain('[Resume]');
      expect(successAction.type).toContain('[Resume]');
      expect(failureAction.type).toContain('[Resume]');

      expect(successAction.type).toContain('Success');
      expect(failureAction.type).toContain('Failure');
    });

    it('should have consistent action types for upload operations', () => {
      const uploadAction = ResumeActions.uploadResumes({
        jobId: 'test',
        files: [],
      });
      const progressAction = ResumeActions.uploadResumesProgress({
        progress: 50,
      });
      const successAction = ResumeActions.uploadResumesSuccess({
        response: mockUploadResponse,
      });
      const failureAction = ResumeActions.uploadResumesFailure({
        error: 'test error',
      });

      expect(uploadAction.type).toContain('[Resume]');
      expect(progressAction.type).toContain('[Resume]');
      expect(successAction.type).toContain('[Resume]');
      expect(failureAction.type).toContain('[Resume]');

      expect(successAction.type).toContain('Success');
      expect(failureAction.type).toContain('Failure');
      expect(progressAction.type).toContain('Progress');
    });
  });

  describe('File Handling', () => {
    it('should handle single file upload', () => {
      const singleFile = [
        new File(['content'], 'resume.pdf', { type: 'application/pdf' }),
      ];
      const action = ResumeActions.uploadResumes({
        jobId: 'job1',
        files: singleFile,
      });

      expect(action.files).toHaveLength(1);
      expect(action.files[0].name).toBe('resume.pdf');
      expect(action.files[0].type).toBe('application/pdf');
    });

    it('should handle multiple file upload', () => {
      const multipleFiles = [
        new File(['content1'], 'resume1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'resume2.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        new File(['content3'], 'resume3.pdf', { type: 'application/pdf' }),
      ];

      const action = ResumeActions.uploadResumes({
        jobId: 'job1',
        files: multipleFiles,
      });

      expect(action.files).toHaveLength(3);
      expect(action.files.map((f) => f.name)).toEqual([
        'resume1.pdf',
        'resume2.docx',
        'resume3.pdf',
      ]);
    });

    it('should handle empty file array', () => {
      const action = ResumeActions.uploadResumes({ jobId: 'job1', files: [] });
      expect(action.files).toEqual([]);
      expect(action.files).toHaveLength(0);
    });

    it('should preserve file properties', () => {
      const fileWithMetadata = new File(['content'], 'resume.pdf', {
        type: 'application/pdf',
        lastModified: Date.now(),
      });

      const action = ResumeActions.uploadResumes({
        jobId: 'job1',
        files: [fileWithMetadata],
      });

      expect(action.files[0].name).toBe('resume.pdf');
      expect(action.files[0].type).toBe('application/pdf');
      expect(action.files[0].size).toBeGreaterThan(0);
    });
  });

  describe('Progress Tracking', () => {
    it('should handle progress values from 0 to 100', () => {
      const progressValues = [0, 25, 50, 75, 100];

      progressValues.forEach((progress) => {
        const action = ResumeActions.uploadResumesProgress({ progress });
        expect(action.progress).toBe(progress);
        expect(action.progress).toBeGreaterThanOrEqual(0);
        expect(action.progress).toBeLessThanOrEqual(100);
      });
    });

    it('should handle decimal progress values', () => {
      const decimalProgress = 75.5;
      const action = ResumeActions.uploadResumesProgress({
        progress: decimalProgress,
      });
      expect(action.progress).toBe(decimalProgress);
    });
  });

  describe('Error Handling Actions', () => {
    it('should handle file validation errors', () => {
      const validationError =
        'File type not supported: must be PDF, DOC, or DOCX';
      const action = ResumeActions.uploadResumesFailure({
        error: validationError,
      });
      expect(action.error).toBe(validationError);
    });

    it('should handle file size errors', () => {
      const sizeError = 'File too large: maximum size is 10MB';
      const action = ResumeActions.uploadResumesFailure({ error: sizeError });
      expect(action.error).toBe(sizeError);
    });

    it('should handle network errors', () => {
      const networkError = 'Upload failed: connection timeout';
      const action = ResumeActions.loadResumesByJobFailure({
        error: networkError,
      });
      expect(action.error).toBe(networkError);
    });

    it('should handle server errors', () => {
      const serverError = 'Resume processing failed: invalid document format';
      const action = ResumeActions.loadResumeFailure({ error: serverError });
      expect(action.error).toBe(serverError);
    });
  });

  describe('Complex Data Handling', () => {
    it('should preserve complex resume analysis data', () => {
      const complexResume: ResumeDetail = {
        ...mockResumeDetail,
        analysis: {
          overallScore: 92,
          skills: [
            'JavaScript',
            'TypeScript',
            'Angular',
            'React',
            'Node.js',
            'Python',
          ],
          experience: '5+ years full-stack development',
          education: 'Master of Science in Computer Science',
          strengths: [
            'Strong technical skills',
            'Team leadership',
            'Problem solving',
          ],
          weaknesses: ['Limited mobile development experience'],
          recommendations: ['Consider for senior role', 'Strong culture fit'],
        },
        extractedData: {
          ...mockResumeDetail.extractedData ?? null,
          workHistory: [
            {
              company: 'Tech Startup',
              position: 'Senior Full-Stack Developer',
              duration: '2022-2024',
              description: 'Led development of microservices architecture',
            },
            {
              company: 'Enterprise Corp',
              position: 'Software Engineer',
              duration: '2019-2022',
              description: 'Developed and maintained web applications',
            },
          ],
          projects: [
            {
              name: 'E-commerce Platform',
              description:
                'Built scalable e-commerce solution using MEAN stack',
              technologies: ['MongoDB', 'Express', 'Angular', 'Node.js'],
            },
          ],
        },
      };

      const action = ResumeActions.loadResumeSuccess({ resume: complexResume });

      expect(action.resume.analysis.skills).toHaveLength(6);
      expect(action.resume.extractedData ?? null.workHistory).toHaveLength(2);
      expect(action.resume.extractedData ?? null.projects).toHaveLength(1);
      expect(action.resume.analysis.strengths).toHaveLength(3);
    });

    it('should preserve upload response data integrity', () => {
      const complexUploadResponse: ResumeUploadResponse = {
        jobId: 'job1',
        uploadedCount: 3,
        processedIds: ['resume1', 'resume2', 'resume3'],
        failedUploads: [
          {
            fileName: 'invalid_resume.txt',
            error: 'Unsupported file format',
            code: 'INVALID_FORMAT',
          },
        ],
        totalSize: 5242880,
        processingStatus: {
          completed: 3,
          failed: 1,
          inProgress: 0,
        },
      };

      const action = ResumeActions.uploadResumesSuccess({
        response: complexUploadResponse,
      });

      expect(action.response.processedIds).toHaveLength(3);
      expect(action.response.failedUploads).toHaveLength(1);
      expect(action.response.failedUploads ?? [][0].fileName).toBe(
        'invalid_resume.txt',
      );
      expect(action.response.processingStatus ?? { completed: 0, failed: 0, inProgress: 0 }.completed).toBe(3);
    });
  });

  describe('Action Creator Functions', () => {
    it('should be functions that return action objects', () => {
      const actionCreators = [
        ResumeActions.loadResumesByJob,
        ResumeActions.loadResumesByJobSuccess,
        ResumeActions.loadResumesByJobFailure,
        ResumeActions.loadResume,
        ResumeActions.loadResumeSuccess,
        ResumeActions.loadResumeFailure,
        ResumeActions.uploadResumes,
        ResumeActions.uploadResumesProgress,
        ResumeActions.uploadResumesSuccess,
        ResumeActions.uploadResumesFailure,
        ResumeActions.clearSelectedResume,
        ResumeActions.clearResumes,
        ResumeActions.clearResumeError,
      ];

      actionCreators.forEach((creator) => {
        expect(typeof creator).toBe('function');
      });
    });

    it('should return objects with type property', () => {
      const actions = [
        ResumeActions.loadResumesByJob({ jobId: 'test' }),
        ResumeActions.loadResumesByJobSuccess({ resumes: [] }),
        ResumeActions.loadResumesByJobFailure({ error: 'test error' }),
        ResumeActions.loadResume({ resumeId: 'test' }),
        ResumeActions.loadResumeSuccess({ resume: mockResumeDetail }),
        ResumeActions.loadResumeFailure({ error: 'test error' }),
        ResumeActions.uploadResumes({ jobId: 'test', files: [] }),
        ResumeActions.uploadResumesProgress({ progress: 50 }),
        ResumeActions.uploadResumesSuccess({ response: mockUploadResponse }),
        ResumeActions.uploadResumesFailure({ error: 'test error' }),
        ResumeActions.clearSelectedResume(),
        ResumeActions.clearResumes(),
        ResumeActions.clearResumeError(),
      ];

      actions.forEach((action) => {
        expect(action).toHaveProperty('type');
        expect(typeof action.type).toBe('string');
        expect(action.type.length).toBeGreaterThan(0);
        expect(action.type).toContain('[Resume]');
      });
    });
  });
});
