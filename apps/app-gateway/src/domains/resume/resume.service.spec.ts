import { ResumeService } from './resume.service';

describe('ResumeService', () => {
  let service: ResumeService;

  beforeEach(() => {
    service = new ResumeService();
    jest.clearAllMocks();
  });

  it('uploads resume and returns normalized payload', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const uploadData = {
      file: { originalname: 'candidate.pdf' },
      uploadedBy: 'user-1',
      jobId: 'job-1',
      candidateName: 'Alice',
      candidateEmail: 'alice@example.com',
    };

    const result = await service.uploadResume(uploadData);

    expect(result).toEqual(
      expect.objectContaining({
        resumeId: 'resume_1700000000000',
        fileName: 'candidate.pdf',
        uploadedBy: 'user-1',
        jobId: 'job-1',
        candidateName: 'Alice',
        candidateEmail: 'alice@example.com',
        status: 'uploaded',
        processingEstimate: '2-5 minutes',
      }),
    );
    expect(result.uploadedAt).toBeInstanceOf(Date);
    nowSpy.mockRestore();
  });

  it('falls back to fileName when file metadata is missing', async () => {
    const result = await service.uploadResume({
      fileName: 'fallback.pdf',
      uploadedBy: 'user-2',
      jobId: 'job-2',
      candidateName: 'Bob',
      candidateEmail: 'bob@example.com',
    });

    expect(result.fileName).toBe('fallback.pdf');
  });

  it('returns resume analysis for a resume/job pair', async () => {
    const result = await service.getResumeAnalysis('resume-1', 'job-1', 'user-1');

    expect(result).toEqual(
      expect.objectContaining({
        resumeId: 'resume-1',
        jobId: 'job-1',
        score: 85,
      }),
    );
    expect(Array.isArray(result.skills)).toBe(true);
    expect(Array.isArray(result.experience)).toBe(true);
    expect(Array.isArray(result.education)).toBe(true);
  });

  it('returns skills analysis payload', async () => {
    const result = await service.getResumeSkillsAnalysis('resume-2', 'user-2');

    expect(result).toEqual(
      expect.objectContaining({
        resumeId: 'resume-2',
        matchScore: 80,
      }),
    );
    expect(result.extractedSkills).toContain('TypeScript');
  });

  it('searches resumes and defaults to first page', async () => {
    const result = await service.searchResumes({}, 'org-1');

    expect(result).toEqual({
      resumes: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
    });
  });

  it('uses provided page when searching resumes', async () => {
    const result = await service.searchResumes({}, 'org-1', { page: 3 });

    expect(result.page).toBe(3);
  });

  it('updates resume status with audit metadata', async () => {
    const result = await service.updateResumeStatus(
      'resume-3',
      'reviewed',
      'user-3',
      'validated by reviewer',
    );

    expect(result).toEqual(
      expect.objectContaining({
        resumeId: 'resume-3',
        status: 'reviewed',
        updatedBy: 'user-3',
        reason: 'validated by reviewer',
      }),
    );
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('deletes resume with default hardDelete=false', async () => {
    const result = await service.deleteResume('resume-4', 'user-4', 'duplicate');

    expect(result).toEqual(
      expect.objectContaining({
        resumeId: 'resume-4',
        deleted: true,
        deletedBy: 'user-4',
        reason: 'duplicate',
        hardDelete: false,
      }),
    );
    expect(result.deletedAt).toBeInstanceOf(Date);
  });

  it('returns resume list defaults', async () => {
    const result = await service.getResumes('org-2', {});

    expect(result).toEqual({
      resumes: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
  });

  it('returns resume detail by id', async () => {
    const result = await service.getResume('resume-5');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'resume-5',
        fileName: 'sample-resume.pdf',
        status: 'uploaded',
      }),
    );
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('returns true when checking resume access under normal flow', async () => {
    await expect(service.checkResumeAccess('resume-6', 'user-6', 'org-6')).resolves.toBe(true);
  });

  it('returns false when access check logging throws', async () => {
    const logger = (service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger;
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {
      throw new Error('logger failure');
    });

    await expect(service.checkResumeAccess('resume-6', 'user-6', 'org-6')).resolves.toBe(false);
    logSpy.mockRestore();
  });

  it('batch processes resumes and reports per-item result', async () => {
    const result = await service.batchProcessResumes(
      ['resume-a', 'resume-b'],
      're-analyze',
      'user-7',
      {},
    );

    expect(result).toEqual({
      totalProcessed: 2,
      successful: 2,
      failed: 0,
      results: [
        { resumeId: 'resume-a', success: true },
        { resumeId: 'resume-b', success: true },
      ],
    });
  });

  it('reprocesses resume and returns queue metadata', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000001);
    const result = await service.reprocessResume('resume-7', 'user-7', {});

    expect(result).toEqual({
      jobId: 'reprocess_1700000000001',
      estimatedTime: '3-7 minutes',
      status: 'queued',
    });
    nowSpy.mockRestore();
  });

  it('returns processing stats structure', async () => {
    const result = await service.getProcessingStats('org-8');

    expect(result).toEqual({
      totalResumes: 0,
      processingStatus: {
        uploaded: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      averageProcessingTime: 240000,
      skillsDistribution: {},
      monthlyTrends: [],
      qualityMetrics: { averageScore: 0, highQuality: 0, needsReview: 0 },
    });
  });

  it('returns healthy status payload', async () => {
    const result = await service.getHealthStatus();

    expect(result).toEqual({
      overall: 'healthy',
      database: 'connected',
      storage: 'available',
      parser: 'operational',
      queue: 'running',
    });
  });

  it('rethrows upload errors when input access fails', async () => {
    const badUploadInput = {};
    Object.defineProperty(badUploadInput, 'file', {
      get() {
        throw new Error('file metadata unavailable');
      },
    });

    await expect(
      service.uploadResume(badUploadInput as unknown as Record<string, unknown>),
    ).rejects.toThrow('file metadata unavailable');
  });

  it('rethrows search errors when pagination access fails', async () => {
    const badOptions = {};
    Object.defineProperty(badOptions, 'page', {
      get() {
        throw new Error('invalid page');
      },
    });

    await expect(
      service.searchResumes({}, 'org-9', badOptions as unknown as Record<string, unknown>),
    ).rejects.toThrow('invalid page');
  });

  it('rethrows update/delete errors when logger fails', async () => {
    const logger = (service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger;
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {
      throw new Error('logger write failed');
    });

    await expect(service.updateResumeStatus('resume-9', 'failed', 'user-9')).rejects.toThrow(
      'logger write failed',
    );
    await expect(service.deleteResume('resume-9', 'user-9')).rejects.toThrow(
      'logger write failed',
    );

    logSpy.mockRestore();
  });

  it('rethrows getResumes errors when filters access fails', async () => {
    const badFilters = {};
    Object.defineProperty(badFilters, 'page', {
      get() {
        throw new Error('filter failure');
      },
    });

    await expect(service.getResumes('org-10', badFilters as unknown as Record<string, unknown>)).rejects.toThrow(
      'filter failure',
    );
  });

  it('rethrows batch and reprocess errors when logger fails', async () => {
    const logger = (service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger;
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {
      throw new Error('batch logger failed');
    });

    await expect(service.batchProcessResumes(['resume-11'], 'retry', 'user-11')).rejects.toThrow(
      'batch logger failed',
    );
    await expect(service.reprocessResume('resume-11', 'user-11')).rejects.toThrow(
      'batch logger failed',
    );

    logSpy.mockRestore();
  });
});
