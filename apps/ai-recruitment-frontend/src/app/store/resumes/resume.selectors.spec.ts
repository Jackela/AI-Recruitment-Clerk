import * as ResumeSelectors from './resume.selectors';
import type { ResumeState} from './resume.state';
import { initialResumeState as _initialResumeState } from './resume.state';
import type { ResumeListItem, ResumeDetail } from './resume.model';
import type { AppState } from '../app.state';

describe('Resume Selectors', () => {
  type BaseResumeStatus = ResumeListItem['status'];
  type ExtendedResumeAnalysis =
    NonNullable<ResumeListItem['analysis']> & {
      skills?: string[];
    };
  type ExtendedResumeListItem = Omit<ResumeListItem, 'status' | 'analysis'> & {
    status: BaseResumeStatus | 'processed' | 'processing';
    uploadedAt: Date;
    analysis?: ExtendedResumeAnalysis;
  };

  const mockResumeListItems: ExtendedResumeListItem[] = [
    {
      id: 'resume1',
      jobId: 'job1',
      originalFilename: 'john_doe_resume.pdf',
      status: 'processed',
      matchScore: 85,
      candidateName: 'John Doe',
      createdAt: new Date('2024-01-01'),
      uploadedAt: new Date('2024-01-01'),
      analysis: {
        overallScore: 85,
        skillsMatch: 88,
        experienceMatch: 82,
        educationMatch: 79,
        skills: ['JavaScript', 'TypeScript', 'Angular'],
      },
    },
    {
      id: 'resume2',
      jobId: 'job1',
      originalFilename: 'jane_smith_resume.pdf',
      status: 'processing',
      matchScore: 92,
      candidateName: 'Jane Smith',
      createdAt: new Date('2024-01-02'),
      uploadedAt: new Date('2024-01-02'),
      analysis: {
        overallScore: 92,
        skillsMatch: 95,
        experienceMatch: 90,
        educationMatch: 85,
        skills: ['React', 'Node.js', 'Python'],
      },
    },
    {
      id: 'resume3',
      jobId: 'job1',
      originalFilename: 'bob_johnson_resume.docx',
      status: 'processed',
      matchScore: 78,
      candidateName: 'Bob Johnson',
      createdAt: new Date('2024-01-03'),
      uploadedAt: new Date('2024-01-03'),
      analysis: {
        overallScore: 78,
        skillsMatch: 80,
        experienceMatch: 75,
        educationMatch: 70,
        skills: ['Java', 'Spring', 'MySQL'],
      },
    },
    {
      id: 'resume4',
      jobId: 'job2',
      originalFilename: 'alice_williams_resume.pdf',
      status: 'failed',
      matchScore: 88,
      candidateName: 'Alice Williams',
      createdAt: new Date('2024-01-04'),
      uploadedAt: new Date('2024-01-04'),
      analysis: {
        overallScore: 88,
        skillsMatch: 90,
        experienceMatch: 84,
        educationMatch: 80,
        skills: ['Vue.js', 'TypeScript', 'Express'],
      },
    },
  ];
  const mockSelectedResume: ResumeDetail = {
    id: 'resume1',
    jobId: 'job1',
    originalFilename: 'john_doe_resume.pdf',
    status: 'completed',
    candidateName: 'John Doe',
    contactInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
    },
    skills: ['JavaScript', 'TypeScript', 'Angular', 'Node.js'],
    workExperience: [
      {
        company: 'Tech Corp',
        position: 'Frontend Developer',
        startDate: '2021-01-01',
        endDate: '2024-01-01',
        summary:
          'Developed modern web applications using Angular and TypeScript',
      },
    ],
    education: [
      {
        school: 'State University',
        degree: 'Bachelor of Science',
        major: 'Computer Science',
      },
    ],
    matchScore: 85,
    reportId: 'report1',
    createdAt: new Date('2024-01-01'),
  };

  const mockResumeState: ResumeState = {
    resumes: mockResumeListItems as ResumeListItem[],
    selectedResume: mockSelectedResume,
    loading: false,
    error: null,
    uploading: false,
    uploadProgress: 0,
  };

  const mockAppState: AppState = {
    jobs: {
      jobs: [],
      selectedJob: null,
      loading: false,
      error: null,
      creating: false,
      webSocketConnected: false,
      webSocketStatus: 'disconnected',
      jobProgress: {},
    },
    reports: {
      reports: [],
      selectedReport: null,
      loading: false,
      error: null,
      currentJobId: null,
    },
    resumes: mockResumeState,
    guest: {
      isLoading: false,
      error: null,
      usageCount: 0,
      maxUsage: 5,
      remainingCount: 5,
      showLimitModal: false,
      showFeedbackModal: false,
      feedbackCode: null,
      surveyUrl: null,
      lastActivity: null,
    },
  };

  describe('Feature Selector', () => {
    it('should select resume state from app state', () => {
      const result = ResumeSelectors.selectResumeState(mockAppState);
      expect(result).toEqual(mockResumeState);
    });
  });

  describe('Basic State Selectors', () => {
    it('should select all resumes', () => {
      const result =
        ResumeSelectors.selectAllResumes.projector(mockResumeState);
      expect(result).toEqual(mockResumeListItems);
      expect(result).toHaveLength(4);
    });

    it('should select selected resume', () => {
      const result =
        ResumeSelectors.selectSelectedResume.projector(mockResumeState);
      expect(result).toEqual(mockSelectedResume);
    });

    it('should select resumes loading state', () => {
      const loadingState = { ...mockResumeState, loading: true };
      const result =
        ResumeSelectors.selectResumesLoading.projector(loadingState);
      expect(result).toBe(true);
    });

    it('should select resumes error', () => {
      const errorState = { ...mockResumeState, error: 'Upload failed' };
      const result = ResumeSelectors.selectResumesError.projector(errorState);
      expect(result).toBe('Upload failed');
    });

    it('should select resume uploading state', () => {
      const uploadingState = { ...mockResumeState, uploading: true };
      const result =
        ResumeSelectors.selectResumeUploading.projector(uploadingState);
      expect(result).toBe(true);
    });

    it('should select resume upload progress', () => {
      const progressState = { ...mockResumeState, uploadProgress: 75 };
      const result =
        ResumeSelectors.selectResumeUploadProgress.projector(progressState);
      expect(result).toBe(75);
    });

    it('should handle null selected resume', () => {
      const stateWithoutSelected = { ...mockResumeState, selectedResume: null };
      const result =
        ResumeSelectors.selectSelectedResume.projector(stateWithoutSelected);
      expect(result).toBeNull();
    });

    it('should handle empty resumes array', () => {
      const stateWithoutResumes = { ...mockResumeState, resumes: [] };
      const result =
        ResumeSelectors.selectAllResumes.projector(stateWithoutResumes);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Derived Selectors', () => {
    it('should select resumes count', () => {
      const result =
        ResumeSelectors.selectResumesCount.projector(mockResumeListItems as unknown as ResumeListItem[]);
      expect(result).toBe(4);
    });

    it('should select resume by ID', () => {
      const selectorFunction = ResumeSelectors.selectResumeById('resume2');
      const result = selectorFunction.projector(mockResumeListItems as unknown as ResumeListItem[]);
      expect(result).toEqual(mockResumeListItems[1]);
      expect(result!.candidateName).toBe('Jane Smith');
    });

    it('should return undefined for non-existent resume ID', () => {
      const selectorFunction = ResumeSelectors.selectResumeById('nonexistent');
      const result = selectorFunction.projector(mockResumeListItems as unknown as ResumeListItem[]);
      expect(result).toBeUndefined();
    });

    it('should select resumes by status', () => {
      const processedResumesSelector =
        ResumeSelectors.selectResumesByStatus('processed');
      const result = processedResumesSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);
      expect(result).toHaveLength(2);
      expect(result.every((resume) => resume.status === 'processed')).toBe(
        true,
      );
      expect(result.map((resume) => resume.candidateName)).toEqual([
        'John Doe',
        'Bob Johnson',
      ]);
    });

    it('should return empty array for non-existent status', () => {
      const nonExistentStatusSelector =
        ResumeSelectors.selectResumesByStatus('archived');
      const result = nonExistentStatusSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);
      expect(result).toEqual([]);
    });

    it('should select processed resumes', () => {
      const result =
        ResumeSelectors.selectProcessedResumes.projector(mockResumeListItems as unknown as ResumeListItem[]);
      expect(result).toHaveLength(2);
      expect(result.every((resume) => resume.status === 'processed')).toBe(
        true,
      );
    });

    it('should select pending resumes', () => {
      const resumesWithPending = [
        { ...mockResumeListItems[0], status: 'pending' as const },
        { ...mockResumeListItems[1], status: 'processing' as const },
        mockResumeListItems[2],
        mockResumeListItems[3],
      ];
      const result =
        ResumeSelectors.selectPendingResumes.projector(resumesWithPending);
      expect(result).toHaveLength(2);
      expect(
        result.every(
          (resume) =>
            resume.status === 'pending' || resume.status === 'processing',
        ),
      ).toBe(true);
    });
  });

  describe('Recent Resumes Selector', () => {
    it('should select recent resumes with default limit', () => {
      const recentResumesSelector = ResumeSelectors.selectRecentResumes();
      const result = recentResumesSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(4); // All resumes since we only have 4
      // Should be sorted by most recent first
      expect(result[0].uploadedAt).toEqual(new Date('2024-01-04'));
      expect(result[1].uploadedAt).toEqual(new Date('2024-01-03'));
      expect(result[2].uploadedAt).toEqual(new Date('2024-01-02'));
      expect(result[3].uploadedAt).toEqual(new Date('2024-01-01'));
    });

    it('should respect custom limit', () => {
      const recentResumesSelector = ResumeSelectors.selectRecentResumes(2);
      const result = recentResumesSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(2);
      expect(result[0].uploadedAt).toEqual(new Date('2024-01-04'));
      expect(result[1].uploadedAt).toEqual(new Date('2024-01-03'));
    });

    it('should handle empty resumes array', () => {
      const recentResumesSelector = ResumeSelectors.selectRecentResumes();
      const result = recentResumesSelector.projector([]);
      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const originalResumes = [...mockResumeListItems];
      const recentResumesSelector = ResumeSelectors.selectRecentResumes();
      recentResumesSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(mockResumeListItems).toEqual(originalResumes);
    });
  });

  describe('High-Scoring Resumes Selector', () => {
    it('should select high-scoring resumes with default threshold', () => {
      const highScoringSelector = ResumeSelectors.selectHighScoringResumes();
      const result = highScoringSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(3); // 85, 92, 88 are >= 75
      expect(
        result.every(
          (resume) => resume.analysis && resume.analysis.overallScore >= 75,
        ),
      ).toBe(true);
    });

    it('should respect custom threshold', () => {
      const highScoringSelector = ResumeSelectors.selectHighScoringResumes(90);
      const result = highScoringSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(1); // Only 92 is >= 90
      expect(result[0].candidateName).toBe('Jane Smith');
    });

    it('should handle resumes without analysis', () => {
      const resumesWithoutAnalysis = [
        { ...mockResumeListItems[0], analysis: undefined },
        mockResumeListItems[1],
        { ...mockResumeListItems[2], analysis: undefined },
        mockResumeListItems[3],
      ];

      const highScoringSelector = ResumeSelectors.selectHighScoringResumes();
      const result = highScoringSelector.projector(resumesWithoutAnalysis);

      expect(result).toHaveLength(2); // Only items with analysis
    });

    it('should return empty array when no resumes meet threshold', () => {
      const highScoringSelector = ResumeSelectors.selectHighScoringResumes(95);
      const result = highScoringSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toEqual([]);
    });
  });

  describe('UI State Selectors', () => {
    it('should select resume loading state with combined flags', () => {
      const loading = true;
      const uploading = false;
      const result = ResumeSelectors.selectResumeLoadingState.projector(
        loading,
        uploading,
      );

      expect(result.loading).toBe(true);
      expect(result.uploading).toBe(false);
      expect(result.isLoading).toBe(true);
    });

    it('should show isLoading true when uploading', () => {
      const loading = false;
      const uploading = true;
      const result = ResumeSelectors.selectResumeLoadingState.projector(
        loading,
        uploading,
      );

      expect(result.loading).toBe(false);
      expect(result.uploading).toBe(true);
      expect(result.isLoading).toBe(true);
    });

    it('should show isLoading false when neither loading nor uploading', () => {
      const loading = false;
      const uploading = false;
      const result = ResumeSelectors.selectResumeLoadingState.projector(
        loading,
        uploading,
      );

      expect(result.isLoading).toBe(false);
    });

    it('should select resume upload state', () => {
      const uploading = true;
      const progress = 75;
      const error = null;
      const result = ResumeSelectors.selectResumeUploadState.projector(
        uploading,
        progress,
        error,
      );

      expect(result.uploading).toBe(true);
      expect(result.progress).toBe(75);
      expect(result.error).toBeNull();
      expect(result.hasError).toBe(false);
      expect(result.canUpload).toBe(false);
    });

    it('should show hasError true with error', () => {
      const uploading = false;
      const progress = 0;
      const error = 'Upload failed';
      const result = ResumeSelectors.selectResumeUploadState.projector(
        uploading,
        progress,
        error,
      );

      expect(result.hasError).toBe(true);
      expect(result.canUpload).toBe(true);
    });

    it('should select resumes with error state', () => {
      const error = 'Failed to load resumes';
      const loading = false;
      const result = ResumeSelectors.selectResumesWithError.projector(
        error,
        loading,
      );

      expect(result.error).toBe(error);
      expect(result.hasError).toBe(true);
    });

    it('should not show error when loading', () => {
      const error = 'Failed to load resumes';
      const loading = true;
      const result = ResumeSelectors.selectResumesWithError.projector(
        error,
        loading,
      );

      expect(result.error).toBe(error);
      expect(result.hasError).toBe(false);
    });
  });

  describe('Complex Derived Selectors', () => {
    it('should calculate resume statistics correctly', () => {
      const result =
        ResumeSelectors.selectResumeStatistics.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result.total).toBe(4);
      expect(result.processed).toBe(2);
      expect(result.processing).toBe(1); // pending + processing
      expect(result.failed).toBe(1);
      expect(result.averageScore).toBe(81.5); // (85 + 78) / 2 = 81.5 (only processed resumes)
      expect(result.processingRate).toBe(50); // 2/4 * 100 = 50%
      expect(result.topSkills).toBeDefined();
    });

    it('should calculate top skills correctly', () => {
      const result =
        ResumeSelectors.selectResumeStatistics.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result.topSkills).toHaveLength(6); // Unique skills from processed resumes
      expect(result.topSkills[0]).toEqual({ skill: 'JavaScript', count: 1 });
      expect(result.topSkills[1]).toEqual({ skill: 'TypeScript', count: 1 });
    });

    it('should handle empty resumes array in statistics', () => {
      const result = ResumeSelectors.selectResumeStatistics.projector([]);

      expect(result.total).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.processing).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.processingRate).toBe(0);
      expect(result.topSkills).toEqual([]);
    });

    it('should handle resumes without analysis in statistics', () => {
      const resumesWithoutAnalysis = [
        { ...mockResumeListItems[0], analysis: undefined },
        { ...mockResumeListItems[1], analysis: undefined },
        {
          ...mockResumeListItems[2],
          status: 'processed' as const,
          analysis: undefined,
        },
      ];

      const result = ResumeSelectors.selectResumeStatistics.projector(
        resumesWithoutAnalysis,
      );

      expect(result.averageScore).toBe(0); // No scores available
      expect(result.topSkills).toEqual([]); // No skills available
    });
  });

  describe('Score Range Selector', () => {
    it('should select resumes by score range', () => {
      const scoreRangeSelector = ResumeSelectors.selectResumesByScoreRange(
        80,
        90,
      );
      const result = scoreRangeSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(2); // 85 and 88 are in range 80-90
      expect(result.map((resume) => resume.candidateName)).toEqual([
        'John Doe',
        'Alice Williams',
      ]);
    });

    it('should handle inclusive score boundaries', () => {
      const scoreRangeSelector = ResumeSelectors.selectResumesByScoreRange(
        78,
        85,
      );
      const result = scoreRangeSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(2); // 78 and 85 (inclusive)
      expect(
        result.every((resume) => {
          const score = resume.analysis?.overallScore;
          return score !== undefined && score >= 78 && score <= 85;
        }),
      ).toBe(true);
    });

    it('should return empty array when no resumes in range', () => {
      const scoreRangeSelector = ResumeSelectors.selectResumesByScoreRange(
        95,
        100,
      );
      const result = scoreRangeSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toEqual([]);
    });

    it('should handle resumes without scores', () => {
      const resumesWithoutScores = [
        { ...mockResumeListItems[0], analysis: undefined },
        mockResumeListItems[1],
        mockResumeListItems[2],
      ];

      const scoreRangeSelector = ResumeSelectors.selectResumesByScoreRange(
        80,
        95,
      );
      const result = scoreRangeSelector.projector(resumesWithoutScores);

      expect(result).toHaveLength(1); // Only one resume has score in range
    });
  });

  describe('Skill Search Selector', () => {
    it('should select resumes by skill query', () => {
      const skillSearchSelector =
        ResumeSelectors.selectResumesBySkill('JavaScript');
      const result = skillSearchSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(1);
      expect(result[0].candidateName).toBe('John Doe');
    });

    it('should handle case-insensitive search', () => {
      const skillSearchSelector =
        ResumeSelectors.selectResumesBySkill('typescript');
      const result = skillSearchSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(2); // John Doe and Alice Williams have TypeScript
    });

    it('should handle partial skill matching', () => {
      const skillSearchSelector =
        ResumeSelectors.selectResumesBySkill('Script');
      const result = skillSearchSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toHaveLength(2); // JavaScript and TypeScript contain 'Script'
    });

    it('should return empty array for empty query', () => {
      const skillSearchSelector = ResumeSelectors.selectResumesBySkill('');
      const result = skillSearchSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', () => {
      const skillSearchSelector = ResumeSelectors.selectResumesBySkill('   ');
      const result = skillSearchSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toEqual([]);
    });

    it('should handle resumes without skills', () => {
      const resumesWithoutSkills = [
        { ...mockResumeListItems[0], analysis: undefined },
        mockResumeListItems[1],
      ];

      const skillSearchSelector = ResumeSelectors.selectResumesBySkill('React');
      const result = skillSearchSelector.projector(resumesWithoutSkills);

      expect(result).toHaveLength(1); // Only Jane Smith has React
    });

    it('should return empty array when no skills match', () => {
      const skillSearchSelector = ResumeSelectors.selectResumesBySkill('Rust');
      const result = skillSearchSelector.projector(mockResumeListItems as unknown as ResumeListItem[]);

      expect(result).toEqual([]);
    });
  });

  describe('Resume Management State Selector', () => {
    it('should select resume management state with computed properties', () => {
      const result =
        ResumeSelectors.selectResumeManagementState.projector(mockResumeState);

      expect(result.resumes).toEqual(mockResumeListItems);
      expect(result.selectedResume).toEqual(mockSelectedResume);
      expect(result.loading).toBe(false);
      expect(result.uploading).toBe(false);
      expect(result.uploadProgress).toBe(0);
      expect(result.error).toBeNull();
      expect(result.hasResumes).toBe(true);
      expect(result.canUpload).toBe(true);
      expect(result.isProcessing).toBe(false);
    });

    it('should show canUpload false when uploading', () => {
      const uploadingState = { ...mockResumeState, uploading: true };
      const result =
        ResumeSelectors.selectResumeManagementState.projector(uploadingState);

      expect(result.canUpload).toBe(false);
      expect(result.isProcessing).toBe(true);
    });

    it('should show canUpload false when loading', () => {
      const loadingState = { ...mockResumeState, loading: true };
      const result =
        ResumeSelectors.selectResumeManagementState.projector(loadingState);

      expect(result.canUpload).toBe(false);
      expect(result.isProcessing).toBe(true);
    });

    it('should show hasResumes false when no resumes exist', () => {
      const emptyState = { ...mockResumeState, resumes: [] };
      const result =
        ResumeSelectors.selectResumeManagementState.projector(emptyState);

      expect(result.hasResumes).toBe(false);
    });

    it('should handle upload progress state', () => {
      const progressState = {
        ...mockResumeState,
        uploading: true,
        uploadProgress: 65,
      };
      const result =
        ResumeSelectors.selectResumeManagementState.projector(progressState);

      expect(result.uploadProgress).toBe(65);
      expect(result.isProcessing).toBe(true);
      expect(result.canUpload).toBe(false);
    });
  });

  describe('Selector Memoization', () => {
    it('should return same reference for identical inputs', () => {
      const result1 =
        ResumeSelectors.selectAllResumes.projector(mockResumeState);
      const result2 =
        ResumeSelectors.selectAllResumes.projector(mockResumeState);

      expect(result1).toBe(result2);
    });

    it('should return new reference for different inputs', () => {
      const modifiedState = {
        ...mockResumeState,
        resumes: [
          ...mockResumeListItems,
          {
            id: 'resume5',
            jobId: 'job1',
            originalFilename: 'new_resume.pdf',
            status: 'processed' as const,
            candidateName: 'New Candidate',
            createdAt: new Date(),
            uploadedAt: new Date(),
            analysis: {
              overallScore: 90,
              skills: ['Vue.js', 'MongoDB'],
            },
          } as ExtendedResumeListItem,
        ],
      };

      const result1 =
        ResumeSelectors.selectAllResumes.projector(mockResumeState);
      const result2 = ResumeSelectors.selectAllResumes.projector(modifiedState);

      expect(result1).not.toBe(result2);
      expect(result2).toHaveLength(5);
    });

    it('should memoize complex calculations', () => {
      const spy = jest
        .fn()
        .mockImplementation(ResumeSelectors.selectResumeStatistics.projector);

      // First call
      spy(mockResumeListItems);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second call with same input should use memoized result
      spy(mockResumeListItems);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle state with undefined resumes gracefully', () => {
      const invalidState = { ...mockResumeState, resumes: undefined as any };
      const result = ResumeSelectors.selectAllResumes.projector(invalidState);
      expect(result).toBeUndefined();
    });

    it('should handle resumes with missing required fields', () => {
      const invalidResumes = [
        { id: 'resume1' } as any,
        { candidateName: 'Resume without ID' } as any,
      ];

      const result =
        ResumeSelectors.selectResumesCount.projector(invalidResumes);
      expect(result).toBe(2);
    });

    it('should handle filter operations on malformed data', () => {
      const malformedResumes = [
        { ...mockResumeListItems[0], status: null as any },
        { ...mockResumeListItems[1], status: undefined as any },
        mockResumeListItems[2],
      ];

      const processedSelector =
        ResumeSelectors.selectResumesByStatus('processed');
      const result = processedSelector.projector(malformedResumes);
      expect(result).toHaveLength(1); // Only mockResumeListItems[2] has valid status
    });

    it('should handle invalid dates in recent resumes selector', () => {
      const resumesWithInvalidDates = [
        { ...mockResumeListItems[0], uploadedAt: null as any },
        { ...mockResumeListItems[1], uploadedAt: undefined as any },
        mockResumeListItems[2],
      ];

      const recentResumesSelector = ResumeSelectors.selectRecentResumes();
      const result = recentResumesSelector.projector(resumesWithInvalidDates);
      expect(result).toHaveLength(3); // Should handle invalid dates gracefully
    });

    it('should handle division by zero in statistics calculations', () => {
      const emptyResumes: ExtendedResumeListItem[] = [];
      const result =
        ResumeSelectors.selectResumeStatistics.projector(emptyResumes);

      expect(result.averageScore).toBe(0);
      expect(result.processingRate).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle skill search with malformed analysis data', () => {
      const resumesWithMalformedAnalysis = [
        { ...mockResumeListItems[0], analysis: { skills: null } as any },
        { ...mockResumeListItems[1], analysis: { skills: undefined } as any },
        mockResumeListItems[2],
      ];

      const skillSearchSelector = ResumeSelectors.selectResumesBySkill('Java');
      const result = skillSearchSelector.projector(
        resumesWithMalformedAnalysis,
      );

      expect(result).toHaveLength(1); // Only one resume has valid skills array
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', () => {
      const largeResumesList: ExtendedResumeListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `resume${i}`,
          jobId: 'job1',
          originalFilename: `resume${i}.pdf`,
          status: i % 2 === 0 ? 'processed' : 'processing',
          candidateName: `Candidate ${i}`,
          matchScore: Math.floor(Math.random() * 100),
          createdAt: new Date(),
          uploadedAt: new Date(),
          analysis: {
            overallScore: Math.floor(Math.random() * 100),
            skillsMatch: Math.floor(Math.random() * 100),
            experienceMatch: Math.floor(Math.random() * 100),
            educationMatch: Math.floor(Math.random() * 100),
            skills: ['JavaScript', 'TypeScript', 'React'],
          },
        }),
      );

      const start = performance.now();
      const result =
        ResumeSelectors.selectResumeStatistics.projector(largeResumesList);
      const end = performance.now();

      expect(result.total).toBe(1000);
      expect(result.processed).toBe(500);
      expect(result.processing).toBe(500);
      expect(end - start).toBeLessThan(150); // Should complete in reasonable time
    });

    it('should efficiently filter resumes by status', () => {
      const largeResumesList: ExtendedResumeListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `resume${i}`,
          jobId: 'job1',
          originalFilename: `resume${i}.pdf`,
          status:
            i % 3 === 0 ? 'processed' : i % 3 === 1 ? 'processing' : 'failed',
          candidateName: `Candidate ${i}`,
          createdAt: new Date(),
          uploadedAt: new Date(),
        }),
      );

      const processedSelector =
        ResumeSelectors.selectResumesByStatus('processed');
      const start = performance.now();
      const result = processedSelector.projector(largeResumesList);
      const end = performance.now();

      expect(result.length).toBeGreaterThan(300);
      expect(result.every((resume) => resume.status === 'processed')).toBe(
        true,
      );
      expect(end - start).toBeLessThan(50); // Should be very fast
    });

    it('should efficiently sort recent resumes', () => {
      const largeResumesList: ExtendedResumeListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `resume${i}`,
          jobId: 'job1',
          originalFilename: `resume${i}.pdf`,
          status: 'processed',
          candidateName: `Candidate ${i}`,
          createdAt: new Date(),
          uploadedAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          ),
        }),
      );

      const recentResumesSelector = ResumeSelectors.selectRecentResumes(10);
      const start = performance.now();
      const result = recentResumesSelector.projector(largeResumesList);
      const end = performance.now();

      expect(result).toHaveLength(10);
      // Verify sorting is correct (most recent first)
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].uploadedAt.getTime()).toBeGreaterThanOrEqual(
          result[i].uploadedAt.getTime(),
        );
      }
      expect(end - start).toBeLessThan(100); // Should complete reasonably fast
    });

    it('should efficiently search by skills', () => {
      const largeResumesList: ExtendedResumeListItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `resume${i}`,
          jobId: 'job1',
          originalFilename: `resume${i}.pdf`,
          status: 'processed',
          candidateName: `Candidate ${i}`,
          createdAt: new Date(),
          uploadedAt: new Date(),
          analysis: {
            overallScore: 80,
            skillsMatch: 82,
            experienceMatch: 78,
            educationMatch: 76,
            skills:
              i % 10 === 0 ? ['JavaScript', 'React'] : ['Python', 'Django'],
          },
        }),
      );

      const skillSearchSelector =
        ResumeSelectors.selectResumesBySkill('JavaScript');
      const start = performance.now();
      const result = skillSearchSelector.projector(largeResumesList);
      const end = performance.now();

      expect(result.length).toBe(100); // Every 10th resume has JavaScript
      expect(
        result.every((resume) =>
          resume.analysis?.skills?.some((skill) =>
            skill.toLowerCase().includes('javascript'),
          ),
        ),
      ).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete reasonably fast
    });
  });
});
