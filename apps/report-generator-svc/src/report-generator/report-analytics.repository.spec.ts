/**
 * Report Analytics Repository Tests
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReportAnalyticsRepository } from './report-analytics.repository';
import { Report } from '../schemas/report.schema';

describe('ReportAnalyticsRepository', () => {
  let repository: ReportAnalyticsRepository;
  let mockReportModel: jest.Mocked<any>;

  const mockReport = {
    _id: 'report-123',
    jobId: 'job-456',
    resumeId: 'resume-789',
    status: 'completed',
    recommendation: { decision: 'hire' },
    scoreBreakdown: { overallFit: 85 },
    processingTimeMs: 1500,
    analysisConfidence: 0.92,
    generatedAt: new Date(),
  };

  beforeEach(async () => {
    mockReportModel = {
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: jest.fn() }),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportAnalyticsRepository,
        {
          provide: getModelToken(Report.name, 'report-generator'),
          useValue: mockReportModel,
        },
      ],
    }).compile();

    repository = module.get<ReportAnalyticsRepository>(
      ReportAnalyticsRepository,
    );
  });

  describe('getReportAnalytics', () => {
    it('should return analytics with all metrics', async () => {
      // Mock countDocuments for total reports
      mockReportModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(100),
      });

      // Mock aggregate for status breakdown
      mockReportModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { _id: 'completed', count: 80 },
          { _id: 'pending', count: 20 },
        ]),
      });

      // Mock aggregate for recommendation breakdown
      mockReportModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { _id: 'hire', count: 60 },
          { _id: 'consider', count: 20 },
        ]),
      });

      // Mock aggregate for average metrics
      mockReportModel.aggregate.mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue([
            { avgProcessingTime: 1200, avgConfidence: 0.88 },
          ]),
      });

      // Mock countDocuments for today's reports
      mockReportModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(15),
      });

      // Mock find for top candidates
      mockReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([
                {
                  resumeId: 'resume-1',
                  scoreBreakdown: { overallFit: 95 },
                  recommendation: { decision: 'hire' },
                },
              ]),
            }),
          }),
        }),
      });

      const buildQueryFilter = jest.fn().mockReturnValue({});

      const result = await repository.getReportAnalytics({}, buildQueryFilter);

      expect(result.totalReports).toBe(100);
      expect(result.reportsByStatus).toEqual({
        completed: 80,
        pending: 20,
      });
      expect(result.reportsByRecommendation).toEqual({
        hire: 60,
        consider: 20,
      });
      expect(result.averageProcessingTime).toBe(1200);
      expect(result.averageConfidenceScore).toBe(0.88);
      expect(result.reportsGeneratedToday).toBe(15);
      expect(result.topPerformingCandidates).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      mockReportModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      mockReportModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      mockReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const buildQueryFilter = jest.fn().mockReturnValue({});

      const result = await repository.getReportAnalytics({}, buildQueryFilter);

      expect(result.totalReports).toBe(0);
      expect(result.reportsByStatus).toEqual({});
      expect(result.averageProcessingTime).toBe(0);
      expect(result.topPerformingCandidates).toHaveLength(0);
    });
  });

  describe('getJobAnalytics', () => {
    it('should return job-specific analytics', async () => {
      mockReportModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(50),
      });

      mockReportModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            { _id: 'completed', count: 40 },
            { _id: 'pending', count: 10 },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ avgScore: 82.5 }]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            {
              avgProcessingTime: 1100,
              totalReports: 50,
              successfulReports: 40,
            },
          ]),
        });

      mockReportModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([
                {
                  resumeId: 'resume-1',
                  scoreBreakdown: { overallFit: 95 },
                  recommendation: { decision: 'hire' },
                },
              ]),
            }),
          }),
        }),
      });

      const result = await repository.getJobAnalytics('job-123');

      expect(result.totalApplications).toBe(50);
      expect(result.statusDistribution).toEqual({
        completed: 40,
        pending: 10,
      });
      expect(result.averageScore).toBe(82.5);
      expect(result.processingStats.successRate).toBe(80);
    });
  });

  describe('getTimeSeriesAnalytics', () => {
    it('should return daily analytics', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      mockReportModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: { year: 2024, month: 1, day: 15 },
            totalReports: 10,
            averageScore: 85.5,
            completedReports: 8,
          },
        ]),
      });

      const result = await repository.getTimeSeriesAnalytics(
        { from: fromDate, to: toDate },
        'day',
      );

      expect(result).toHaveLength(1);
      expect(result[0].totalReports).toBe(10);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('should return weekly analytics', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      mockReportModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: { year: 2024, week: 3 },
            totalReports: 50,
            averageScore: 82.0,
            completedReports: 40,
          },
        ]),
      });

      const result = await repository.getTimeSeriesAnalytics(
        { from: fromDate, to: toDate },
        'week',
      );

      expect(result[0].date).toBe('2024-W03');
    });

    it('should return monthly analytics', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-03-31');

      mockReportModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: { year: 2024, month: 1 },
            totalReports: 100,
            averageScore: 85.0,
            completedReports: 80,
          },
        ]),
      });

      const result = await repository.getTimeSeriesAnalytics(
        { from: fromDate, to: toDate },
        'month',
      );

      expect(result[0].date).toBe('2024-01');
    });
  });
});
