import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AnalysisRepository } from './analysis.repository';
import { AnalysisResult } from '../schemas/analysis-result.schema';

// Mock document factory
const createMockAnalysisDoc = (overrides = {}) =>
  ({
    _id: 'mock-id-1',
    analysisId: 'analysis-001',
    jobId: 'job-001',
    resumeId: 'resume-001',
    candidateName: 'John Doe',
    overallScore: 85,
    skillAnalysis: [],
    experienceAnalysis: {},
    educationAnalysis: {},
    recommendation: 'hire',
    summary: 'Strong candidate',
    version: 1,
    isLatestVersion: true,
    previousVersionId: undefined,
    status: 'completed',
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-001',
    save: jest.fn().mockResolvedValue(this),
    ...overrides,
  }) as unknown as ReturnType<Model<typeof AnalysisResult>['create']>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any

describe('AnalysisRepository', () => {
  let repository: AnalysisRepository;
  let analysisResultModel: Model<typeof AnalysisResult>;

  // Mock model methods
  const mockExec = jest.fn();
  const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
  const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
  const mockSkip = jest
    .fn()
    .mockReturnValue({ sort: mockSort, exec: mockExec });
  const mockFind = jest.fn().mockReturnValue({
    sort: mockSort,
    skip: mockSkip,
    limit: mockLimit,
    exec: mockExec,
  });
  const mockFindOne = jest.fn().mockReturnValue({ exec: mockExec });
  const mockFindOneAndUpdate = jest.fn().mockReturnValue({ exec: mockExec });
  const mockFindByIdAndUpdate = jest.fn().mockReturnValue({ exec: mockExec });
  const mockDeleteOne = jest.fn().mockReturnValue({ exec: mockExec });
  const mockCountDocuments = jest.fn().mockReturnValue({ exec: mockExec });
  const mockInsertMany = jest.fn().mockReturnValue({ exec: mockExec });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisRepository,
        {
          provide: getModelToken(AnalysisResult.name),
          useValue: {
            find: mockFind,
            findOne: mockFindOne,
            findOneAndUpdate: mockFindOneAndUpdate,
            findByIdAndUpdate: mockFindByIdAndUpdate,
            deleteOne: mockDeleteOne,
            countDocuments: mockCountDocuments,
            insertMany: mockInsertMany,
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<AnalysisRepository>(AnalysisRepository);
    analysisResultModel = module.get<Model<typeof AnalysisResult>>(
      getModelToken(AnalysisResult.name),
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Analysis Result Storage', () => {
    it('should create a new analysis result', async () => {
      // Arrange
      const mockDoc = createMockAnalysisDoc();
      const analysisData = {
        analysisId: 'analysis-001',
        jobId: 'job-001',
        resumeId: 'resume-001',
        overallScore: 85,
        status: 'processing' as const,
      };

      jest
        .spyOn(analysisResultModel, 'create')
        .mockResolvedValue(mockDoc as any);

      // Act
      const result = await repository.createAnalysis(analysisData);

      // Assert
      expect(result).toBeDefined();
    });

    it('should find analysis result by ID', async () => {
      // Arrange
      const mockDoc = createMockAnalysisDoc();
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.findById('analysis-001');

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({ analysisId: 'analysis-001' });
      expect(result).toEqual(mockDoc);
    });

    it('should update analysis status', async () => {
      // Arrange
      const mockDoc = createMockAnalysisDoc({ status: 'completed' });
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.updateStatus('analysis-001', 'completed');

      // Assert
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      expect(result?.status).toBe('completed');
    });

    it('should delete analysis result', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce({ deletedCount: 1 });

      // Act
      const result = await repository.deleteAnalysis('analysis-001');

      // Assert
      expect(mockDeleteOne).toHaveBeenCalledWith({
        analysisId: 'analysis-001',
      });
      expect(result).toBe(true);
    });
  });

  describe('Result Versioning', () => {
    it('should create new version of analysis', async () => {
      // Arrange
      const currentVersion = createMockAnalysisDoc({
        version: 1,
        isLatestVersion: true,
      });
      const newVersion = createMockAnalysisDoc({
        version: 2,
        isLatestVersion: true,
      });

      mockExec
        .mockResolvedValueOnce(currentVersion) // find current latest
        .mockResolvedValueOnce({}) // update current to not latest
        .mockResolvedValueOnce(newVersion); // save new version

      // Act
      const result = await repository.createVersion('analysis-001', {
        overallScore: 90,
      });

      // Assert
      expect(result).toBeDefined();
    });

    it('should find latest version of analysis', async () => {
      // Arrange
      const mockDoc = createMockAnalysisDoc({
        isLatestVersion: true,
        version: 3,
      });
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.findLatestVersion('analysis-001');

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({
        analysisId: 'analysis-001',
        isLatestVersion: true,
      });
      expect(result?.version).toBe(3);
    });

    it('should find all versions of analysis', async () => {
      // Arrange
      const versions = [
        createMockAnalysisDoc({ version: 3, isLatestVersion: true }),
        createMockAnalysisDoc({ version: 2, isLatestVersion: false }),
        createMockAnalysisDoc({ version: 1, isLatestVersion: false }),
      ];
      mockExec.mockResolvedValueOnce(versions);

      // Act
      const result = await repository.findAllVersions('analysis-001');

      // Assert
      expect(result).toHaveLength(3);
      expect(mockSort).toHaveBeenCalledWith({ version: -1 });
    });
  });

  describe('Comparison Queries', () => {
    it('should find analysis results for comparison', async () => {
      // Arrange
      const analysisIds = ['analysis-001', 'analysis-002', 'analysis-003'];
      const mockResults = analysisIds.map((id) =>
        createMockAnalysisDoc({
          analysisId: id,
          overallScore: 80 + Math.random() * 20,
        }),
      );
      mockExec.mockResolvedValueOnce(mockResults);

      // Act
      const result = await repository.findForComparison(analysisIds);

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        analysisId: { $in: analysisIds },
        isLatestVersion: true,
        status: 'completed',
      });
      expect(result).toHaveLength(3);
    });

    it('should find top analysis results by job ID', async () => {
      // Arrange
      const topResults = [
        createMockAnalysisDoc({ analysisId: 'a1', overallScore: 95 }),
        createMockAnalysisDoc({ analysisId: 'a2', overallScore: 90 }),
        createMockAnalysisDoc({ analysisId: 'a3', overallScore: 85 }),
      ];
      mockExec.mockResolvedValueOnce(topResults);

      // Act
      const result = await repository.findTopResultsByJobId('job-001', 3);

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        jobId: 'job-001',
        isLatestVersion: true,
        status: 'completed',
      });
      expect(mockSort).toHaveBeenCalledWith({ overallScore: -1 });
      expect(mockLimit).toHaveBeenCalledWith(3);
      expect(result).toHaveLength(3);
    });
  });

  describe('Batch Analysis Results', () => {
    it('should create batch analysis results', async () => {
      // Arrange
      const batchData = [
        {
          analysisId: 'a1',
          jobId: 'job-001',
          resumeId: 'r1',
          overallScore: 85,
        },
        {
          analysisId: 'a2',
          jobId: 'job-001',
          resumeId: 'r2',
          overallScore: 90,
        },
        {
          analysisId: 'a3',
          jobId: 'job-001',
          resumeId: 'r3',
          overallScore: 75,
        },
      ];
      const mockResults = batchData.map((data) => createMockAnalysisDoc(data));
      mockInsertMany.mockResolvedValueOnce(mockResults);

      // Act
      const result = await repository.createBatch(batchData);

      // Assert
      expect(mockInsertMany).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should find batch results for job and resumes', async () => {
      // Arrange
      const resumeIds = ['r1', 'r2', 'r3'];
      const mockResults = resumeIds.map(
        (id = createMockAnalysisDoc({ resumeId: id })),
      );
      mockExec.mockResolvedValueOnce(mockResults);

      // Act
      const result = await repository.findBatchResults('job-001', resumeIds);

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        jobId: 'job-001',
        resumeId: { $in: resumeIds },
        isLatestVersion: true,
      });
      expect(result).toHaveLength(3);
    });
  });

  describe('Query Building', () => {
    it('should build query filter correctly', () => {
      // Arrange
      const query = {
        jobId: 'job-001',
        minScore: 70,
        maxScore: 90,
        recommendation: 'hire',
      };

      // Act
      const filter = repository.buildQueryFilter(query);

      // Assert
      expect(filter).toEqual({
        jobId: 'job-001',
        overallScore: { $gte: 70, $lte: 90 },
        recommendation: 'hire',
      });
    });

    it('should return healthy status from health check', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce(100);

      // Act
      const result = await repository.healthCheck();

      // Assert
      expect(result).toEqual({ status: 'healthy', count: 100 });
    });
  });
});
