import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ReportRepository } from './report.repository';
import { ReportTemplate, GeneratedReport } from '../schemas/report.schema';

// Mock document factory
const createMockTemplateDoc = (overrides = {}) =>
  ({
    _id: 'template-id-1',
    templateId: 'template-001',
    name: 'Candidate Report',
    description: 'Standard candidate evaluation report',
    type: 'candidate',
    structure: {},
    sections: ['summary', 'skills', 'experience'],
    isActive: true,
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as ReturnType<Model<typeof ReportTemplate>['create'>;

const createMockReportDoc = (overrides = {}) =>
  ({
    _id: 'report-id-1',
    reportId: 'report-001',
    templateId: 'template-001',
    name: 'John Doe - Analysis Report',
    type: 'candidate',
    jobId: 'job-001',
    resumeId: 'resume-001',
    analysisId: 'analysis-001',
    content: {},
    format: 'pdf',
    fileUrl: 'https://example.com/report.pdf',
    status: 'generated',
    shares: [],
    schedule: undefined,
    generatedAt: new Date(),
    expiresAt: undefined,
    generatedBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as ReturnType<Model<typeof GeneratedReport>['create']>;

describe('ReportRepository', () => {
  let repository: ReportRepository;
  let reportTemplateModel: Model<typeof ReportTemplate>;
  let generatedReportModel: Model<typeof GeneratedReport>;

  // Mock model methods
  const mockExec = jest.fn();
  const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
  const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
  const mockSkip = jest.fn().mockReturnValue({ sort: mockSort, exec: mockExec });
  const mockFind = jest.fn().mockReturnValue({
    sort: mockSort,
    skip: mockSkip,
    limit: mockLimit,
    exec: mockExec,
  });
  const mockFindOne = jest.fn().mockReturnValue({ exec: mockExec });
  const mockFindOneAndUpdate = jest.fn().mockReturnValue({ exec: mockExec });
  const mockDeleteOne = jest.fn().mockReturnValue({ exec: mockExec });
  const mockCountDocuments = jest.fn().mockReturnValue({ exec: mockExec });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportRepository,
        {
          provide: getModelToken(ReportTemplate.name),
          useValue: {
            find: mockFind,
            findOne: mockFindOne,
            findOneAndUpdate: mockFindOneAndUpdate,
            deleteOne: mockDeleteOne,
          },
        },
        {
          provide: getModelToken(GeneratedReport.name),
          useValue: {
            find: mockFind,
            findOne: mockFindOne,
            findOneAndUpdate: mockFindOneAndUpdate,
            deleteOne: mockDeleteOne,
            countDocuments: mockCountDocuments,
          },
        },
      ],
    }).compile();

    repository = module.get<ReportRepository>(ReportRepository);
    reportTemplateModel = module.get<Model<typeof ReportTemplate>>(
      getModelToken(ReportTemplate.name),
    );
    generatedReportModel = module.get<Model<typeof GeneratedReport>>(
      getModelToken(GeneratedReport.name),
    );

    jest.clearAllMocks();
  });

  describe('Report Template Storage', () => {
    it('should create a new report template', async () => {
      // Arrange
      const templateData = {
        templateId: 'template-001',
        name: 'Candidate Report',
        type: 'candidate' as const,
        structure: {},
      };
      const mockDoc = createMockTemplateDoc(templateData);
      jest.spyOn(reportTemplateModel, 'create').mockResolvedValue(mockDoc as any);

      // Act
      const result = await repository.createTemplate(templateData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Candidate Report');
    });

    it('should find template by ID', async () => {
      // Arrange
      const mockDoc = createMockTemplateDoc();
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.findTemplateById('template-001');

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({ templateId: 'template-001' });
      expect(result?.templateId).toBe('template-001');
    });

    it('should find active templates by type', async () => {
      // Arrange
      const mockTemplates = [
        createMockTemplateDoc({ type: 'candidate' }),
        createMockTemplateDoc({ type: 'candidate', templateId: 'template-002' }),
      ];
      mockExec.mockResolvedValueOnce(mockTemplates);

      // Act
      const result = await repository.findActiveTemplates('candidate');

      // Assert
      expect(mockFind).toHaveBeenCalledWith({ isActive: true, type: 'candidate' });
      expect(result).toHaveLength(2);
    });
  });

  describe('Generated Report Storage', () => {
    it('should create a new generated report', async () => {
      // Arrange
      const reportData = {
        reportId: 'report-001',
        templateId: 'template-001',
        name: 'Test Report',
        type: 'candidate' as const,
      };
      const mockDoc = createMockReportDoc(reportData);
      jest.spyOn(generatedReportModel, 'create').mockResolvedValue(mockDoc as any);

      // Act
      const result = await repository.createReport(reportData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Report');
    });

    it('should find report by ID', async () => {
      // Arrange
      const mockDoc = createMockReportDoc();
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.findReportById('report-001');

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({ reportId: 'report-001' });
      expect(result?.reportId).toBe('report-001');
    });

    it('should update report status', async () => {
      // Arrange
      const mockDoc = createMockReportDoc({ status: 'generated' });
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.updateReportStatus('report-001', 'generated');

      // Assert
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      expect(result?.status).toBe('generated');
    });
  });

  describe('Report Sharing', () => {
    it('should share a report with a user', async () => {
      // Arrange
      const mockDoc = createMockReportDoc({
        shares: [
          {
            shareId: 'share-001',
            sharedBy: 'user-001',
            sharedWith: 'user-002',
            permission: 'view',
            expiresAt: new Date('2025-12-31'),
            sharedAt: new Date(),
          },
        ],
      });
      mockExec.mockResolvedValueOnce(mockDoc);

      const shareData = {
        sharedBy: 'user-001',
        sharedWith: 'user-002',
        permission: 'view' as const,
        expiresAt: new Date('2025-12-31'),
      };

      // Act
      const result = await repository.shareReport('report-001', shareData);

      // Assert
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      expect(result?.shares).toHaveLength(1);
      expect(result?.shares[0].sharedWith).toBe('user-002');
    });

    it('should revoke a share', async () => {
      // Arrange
      const mockDoc = createMockReportDoc({ shares: [] });
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.revokeShare('report-001', 'share-001');

      // Assert
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { reportId: 'report-001' },
        {
          $pull: { shares: { shareId: 'share-001' } },
          $set: { updatedAt: expect.any(Date) },
        },
        { new: true },
      );
      expect(result).toBeDefined();
    });

    it('should find reports shared with a user', async () => {
      // Arrange
      const sharedReports = [
        createMockReportDoc({ reportId: 'r1' }),
        createMockReportDoc({ reportId: 'r2' }),
      ];
      mockExec.mockResolvedValueOnce(sharedReports);

      // Act
      const result = await repository.findSharedReports('user-002');

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        'shares.sharedWith': 'user-002',
        'shares.expiresAt': { $gt: expect.any(Date) },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('Report Scheduling', () => {
    it('should schedule a report', async () => {
      // Arrange
      const mockDoc = createMockReportDoc({
        schedule: {
          scheduleId: 'schedule-001',
          frequency: 'weekly',
          nextRunAt: new Date('2025-01-01'),
          lastRunAt: undefined,
          isActive: true,
          parameters: {},
        },
      });
      mockExec.mockResolvedValueOnce(mockDoc);

      const scheduleData = {
        scheduleId: 'schedule-001',
        frequency: 'weekly' as const,
        nextRunAt: new Date('2025-01-01'),
        parameters: {},
      };

      // Act
      const result = await repository.scheduleReport('report-001', scheduleData);

      // Assert
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      expect(result?.schedule?.frequency).toBe('weekly');
    });

    it('should cancel a scheduled report', async () => {
      // Arrange
      const mockDoc = createMockReportDoc({ schedule: undefined });
      mockExec.mockResolvedValueOnce(mockDoc);

      // Act
      const result = await repository.cancelSchedule('report-001');

      // Assert
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { reportId: 'report-001' },
        { $set: { schedule: undefined, updatedAt: expect.any(Date) } },
        { new: true },
      );
      expect(result).toBeDefined();
    });

    it('should find due scheduled reports', async () => {
      // Arrange
      const dueReports = [
        createMockReportDoc({ reportId: 'r1' }),
        createMockReportDoc({ reportId: 'r2' }),
      ];
      mockExec.mockResolvedValueOnce(dueReports);

      // Act
      const result = await repository.findDueScheduledReports();

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        'schedule.isActive': true,
        'schedule.nextRunAt': { $lte: expect.any(Date) },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('Query Building', () => {
    it('should build query filter correctly', () => {
      // Arrange
      const query = {
        jobId: 'job-001',
        type: 'candidate',
        status: 'generated',
        generatedBy: 'user-001',
      };

      // Act
      const filter = repository.buildQueryFilter(query);

      // Assert
      expect(filter).toEqual({
        jobId: 'job-001',
        type: 'candidate',
        status: 'generated',
        generatedBy: 'user-001',
      });
    });

    it('should check if user has access to report', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce(createMockReportDoc());

      // Act
      const result = await repository.checkAccess('report-001', 'user-001');

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({
        reportId: 'report-001',
        $or: [
          { generatedBy: 'user-001' },
          { 'shares.sharedWith': 'user-001', 'shares.expiresAt': { $gt: expect.any(Date) } },
        ],
      });
      expect(result).toBe(true);
    });
  });
});
