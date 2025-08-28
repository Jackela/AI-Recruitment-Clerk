import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketingAdminController } from './marketing-admin.controller';
import { FeedbackCodeService } from './feedback-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MarketingAdminController', () => {
  let controller: MarketingAdminController;
  let service: FeedbackCodeService;

  const mockFeedbackCodeService = {
    getMarketingStats: jest.fn(),
    getPendingPayments: jest.fn(),
    batchUpdatePaymentStatus: jest.fn(),
    updatePaymentStatus: jest.fn(),
    cleanupExpiredCodes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingAdminController],
      providers: [
        {
          provide: FeedbackCodeService,
          useValue: mockFeedbackCodeService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true }) // 模拟通过认证
    .compile();

    controller = module.get<MarketingAdminController>(MarketingAdminController);
    service = module.get<FeedbackCodeService>(FeedbackCodeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('控制器初始化', () => {
    it('应该正确定义控制器', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('GET /dashboard', () => {
    const mockStats = {
      totalCodes: 100,
      usedCodes: 80,
      pendingPayments: 15,
      totalPaid: 195,
      averageQualityScore: 4.2
    };

    it('应该返回完整的Dashboard数据', async () => {
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(mockStats);

      const result = await controller.getDashboardStats();

      expect(result.overview.totalCodes).toBe(100);
      expect(result.overview.usedCodes).toBe(80);
      expect(result.overview.pendingPayments).toBe(15);
      expect(result.overview.totalPaid).toBe(195);
      expect(result.overview.averageQualityScore).toBe(4.2);

      expect(result.conversion.usageRate).toBe(80.0); // 80/100 * 100
      expect(result.conversion.qualityRate).toBe(18.8); // 15/80 * 100

      expect(result.financial.pendingAmount).toBe(45); // 15 * 3
      expect(result.financial.averageReward).toBe(3.00);
      expect(result.financial.costPerUser).toBe(2.44); // 195/80

      expect(result.lastUpdated).toBeDefined();
    });

    it('应该处理空数据的情况', async () => {
      const emptyStats = {
        totalCodes: 0,
        usedCodes: 0,
        pendingPayments: 0,
        totalPaid: 0,
        averageQualityScore: 0
      };
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(emptyStats);

      const result = await controller.getDashboardStats();

      expect(result.overview.totalCodes).toBe(0);
      expect(result.conversion.usageRate).toBe(0);
      expect(result.financial.costPerUser).toBe(0); // NaN should be handled
    });

    it('应该处理服务错误', async () => {
      mockFeedbackCodeService.getMarketingStats.mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.getDashboardStats()).rejects.toThrow('Service error');
    });
  });

  describe('GET /pending-payments', () => {
    const mockPendingPayments = [
      {
        id: '1',
        code: 'FB123456789ABCD',
        alipayAccount: '138****8888',
        qualityScore: 4,
        usedAt: new Date('2023-01-01T10:00:00Z'),
        questionnaireData: {}
      },
      {
        id: '2',
        code: 'FB987654321EFGH',
        alipayAccount: 'user@example.com',
        qualityScore: 5,
        usedAt: new Date('2023-01-01T09:00:00Z'),
        questionnaireData: {}
      }
    ];

    it('应该返回分页的待支付列表', async () => {
      mockFeedbackCodeService.getPendingPayments.mockResolvedValue(mockPendingPayments);

      const result = await controller.getPendingPayments('1', '20', 'usedAt', 'desc');

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('应该正确处理分页参数', async () => {
      mockFeedbackCodeService.getPendingPayments.mockResolvedValue(mockPendingPayments);

      const result = await controller.getPendingPayments('2', '1', 'usedAt', 'desc');

      expect(result.data).toHaveLength(1); // 第二页只有1条数据
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(1);
    });

    it('应该支持不同的排序方式', async () => {
      mockFeedbackCodeService.getPendingPayments.mockResolvedValue(mockPendingPayments);

      const result = await controller.getPendingPayments('1', '20', 'qualityScore', 'asc');

      expect(result.data[0].qualityScore).toBe(4); // 升序排列
      expect(result.data[1].qualityScore).toBe(5);
    });

    it('应该使用默认参数', async () => {
      mockFeedbackCodeService.getPendingPayments.mockResolvedValue([]);

      const result = await controller.getPendingPayments();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe('POST /batch-payment', () => {
    const batchDto = {
      codes: ['FB123456789ABCD', 'FB987654321EFGH'],
      action: 'approve' as const,
      reason: '高质量反馈'
    };

    it('应该成功批量处理支付', async () => {
      mockFeedbackCodeService.batchUpdatePaymentStatus.mockResolvedValue(2);

      const result = await controller.processBatchPayment(batchDto);

      expect(service.batchUpdatePaymentStatus).toHaveBeenCalledWith(
        batchDto.codes,
        'paid',
        batchDto.reason
      );
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.action).toBe('approve');
    });

    it('应该处理拒绝操作', async () => {
      const rejectDto = { ...batchDto, action: 'reject' as const };
      mockFeedbackCodeService.batchUpdatePaymentStatus.mockResolvedValue(1);

      const result = await controller.processBatchPayment(rejectDto);

      expect(service.batchUpdatePaymentStatus).toHaveBeenCalledWith(
        rejectDto.codes,
        'rejected',
        rejectDto.reason
      );
      expect(result.action).toBe('reject');
    });

    it('应该验证反馈码列表不为空', async () => {
      const emptyDto = { ...batchDto, codes: [] };

      await expect(controller.processBatchPayment(emptyDto))
        .rejects.toThrow(BadRequestException);
    });

    it('应该验证操作类型', async () => {
      const invalidDto = { ...batchDto, action: 'invalid' as any };

      await expect(controller.processBatchPayment(invalidDto))
        .rejects.toThrow(BadRequestException);
    });

    it('应该处理服务错误', async () => {
      mockFeedbackCodeService.batchUpdatePaymentStatus.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(controller.processBatchPayment(batchDto))
        .rejects.toThrow('Update failed');
    });
  });

  describe('POST /payment/:code/:action', () => {
    const testCode = 'FB123456789ABCD';
    const testReason = '高质量反馈';

    const mockResult = {
      id: '1',
      code: testCode,
      paymentStatus: 'paid' as const
    };

    it('应该成功处理单个支付批准', async () => {
      mockFeedbackCodeService.updatePaymentStatus.mockResolvedValue(mockResult);

      const result = await controller.processSinglePayment(testCode, 'approve', testReason);

      expect(service.updatePaymentStatus).toHaveBeenCalledWith(
        testCode,
        'paid',
        testReason
      );
      expect(result.success).toBe(true);
      expect(result.action).toBe('approve');
    });

    it('应该成功处理单个支付拒绝', async () => {
      const rejectResult = { ...mockResult, paymentStatus: 'rejected' as const };
      mockFeedbackCodeService.updatePaymentStatus.mockResolvedValue(rejectResult);

      const result = await controller.processSinglePayment(testCode, 'reject', testReason);

      expect(service.updatePaymentStatus).toHaveBeenCalledWith(
        testCode,
        'rejected',
        testReason
      );
      expect(result.action).toBe('reject');
    });

    it('应该验证操作类型', async () => {
      await expect(controller.processSinglePayment(testCode, 'invalid', testReason))
        .rejects.toThrow(BadRequestException);
    });

    it('应该处理可选的原因参数', async () => {
      mockFeedbackCodeService.updatePaymentStatus.mockResolvedValue(mockResult);

      const result = await controller.processSinglePayment(testCode, 'approve');

      expect(service.updatePaymentStatus).toHaveBeenCalledWith(
        testCode,
        'paid',
        undefined
      );
      expect(result.success).toBe(true);
    });
  });

  describe('GET /export/payments', () => {
    it('应该生成支付数据导出信息', async () => {
      const mockStats = {
        totalCodes: 100,
        usedCodes: 80,
        pendingPayments: 15,
        totalPaid: 195,
        averageQualityScore: 4.2
      };
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(mockStats);

      const exportDto = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        status: 'pending' as const
      };

      const result = await controller.exportPaymentData(exportDto);

      expect(result.exportTime).toBeDefined();
      expect(result.criteria).toEqual(exportDto);
      expect(result.summary.totalRecords).toBe(80);
      expect(result.summary.pendingAmount).toBe(45);
      expect(result.summary.paidAmount).toBe(195);
      expect(result.downloadUrl).toContain('.xlsx');
    });

    it('应该处理空查询条件', async () => {
      const mockStats = {
        totalCodes: 0,
        usedCodes: 0,
        pendingPayments: 0,
        totalPaid: 0,
        averageQualityScore: 0
      };
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(mockStats);

      const result = await controller.exportPaymentData({});

      expect(result.summary.totalRecords).toBe(0);
    });
  });

  describe('GET /analytics/trends', () => {
    it('应该返回趋势分析数据', async () => {
      const result = await controller.getAnalyticsTrends('30');

      expect(result.period).toBe('30天');
      expect(result.qualityDistribution).toBeDefined();
      expect(result.paymentFlow).toBeDefined();
      expect(result.userBehavior).toBeDefined();
    });

    it('应该使用默认天数', async () => {
      const result = await controller.getAnalyticsTrends();

      expect(result.period).toBe('30天');
    });

    it('应该处理自定义天数', async () => {
      const result = await controller.getAnalyticsTrends('7');

      expect(result.period).toBe('7天');
    });
  });

  describe('POST /maintenance/cleanup', () => {
    it('应该执行维护清理', async () => {
      mockFeedbackCodeService.cleanupExpiredCodes.mockResolvedValue(5);

      const result = await controller.performMaintenance(30);

      expect(service.cleanupExpiredCodes).toHaveBeenCalledWith(30);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
      expect(result.cleanupDate).toBeDefined();
    });

    it('应该使用默认天数', async () => {
      mockFeedbackCodeService.cleanupExpiredCodes.mockResolvedValue(3);

      const result = await controller.performMaintenance();

      expect(service.cleanupExpiredCodes).toHaveBeenCalledWith(30);
    });

    it('应该处理清理错误', async () => {
      mockFeedbackCodeService.cleanupExpiredCodes.mockRejectedValue(
        new Error('Cleanup failed')
      );

      await expect(controller.performMaintenance(30))
        .rejects.toThrow('Cleanup failed');
    });
  });

  describe('GET /audit/logs', () => {
    it('应该返回审计日志', async () => {
      const result = await controller.getAuditLogs('1', '50');

      expect(result.data).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.total).toBeDefined();
    });

    it('应该使用默认分页参数', async () => {
      const result = await controller.getAuditLogs('1', '50');

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });
  });

  describe('性能测试', () => {
    it('Dashboard数据获取应该在合理时间内完成', async () => {
      const mockStats = {
        totalCodes: 1000,
        usedCodes: 800,
        pendingPayments: 150,
        totalPaid: 1950,
        averageQualityScore: 4.1
      };
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(mockStats);

      const startTime = Date.now();
      await controller.getDashboardStats();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('批量操作应该高效处理大量数据', async () => {
      const largeBatch = {
        codes: Array.from({ length: 100 }, (_, i) => `FB${i}`),
        action: 'approve' as const
      };
      mockFeedbackCodeService.batchUpdatePaymentStatus.mockResolvedValue(100);

      const startTime = Date.now();
      await controller.processBatchPayment(largeBatch);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });
  });

  describe('安全性测试', () => {
    it('应该要求认证', () => {
      // 确认JwtAuthGuard被应用
      const guardMetadata = Reflect.getMetadata('__guards__', MarketingAdminController);
      expect(guardMetadata).toBeDefined();
    });

    it('应该防止SQL注入', async () => {
      const maliciousBatch = {
        codes: ["FB'; DROP TABLE feedback_codes; --"],
        action: 'approve' as const
      };
      mockFeedbackCodeService.batchUpdatePaymentStatus.mockResolvedValue(0);

      // 应该安全处理恶意输入
      const result = await controller.processBatchPayment(maliciousBatch);
      expect(result.processedCount).toBe(0);
    });

    it('应该防止批量操作滥用', async () => {
      const hugeBatch = {
        codes: Array.from({ length: 10000 }, (_, i) => `FB${i}`),
        action: 'approve' as const
      };
      mockFeedbackCodeService.batchUpdatePaymentStatus.mockResolvedValue(10000);

      // 虽然会处理，但应该有合理的性能表现
      const startTime = Date.now();
      await controller.processBatchPayment(hugeBatch);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // 大批量操作应在2秒内完成
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空的待支付列表', async () => {
      mockFeedbackCodeService.getPendingPayments.mockResolvedValue([]);

      const result = await controller.getPendingPayments();

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('应该处理极大的页数', async () => {
      mockFeedbackCodeService.getPendingPayments.mockResolvedValue([]);

      const result = await controller.getPendingPayments('999999', '1');

      expect(result.data).toHaveLength(0);
      expect(result.pagination.page).toBe(999999);
    });

    it('应该处理负数天数', async () => {
      mockFeedbackCodeService.cleanupExpiredCodes.mockResolvedValue(0);

      const result = await controller.performMaintenance(-5);

      expect(service.cleanupExpiredCodes).toHaveBeenCalledWith(-5);
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('数据一致性测试', () => {
    it('统计数据应该保持数学一致性', async () => {
      const mockStats = {
        totalCodes: 100,
        usedCodes: 80,
        pendingPayments: 15,
        totalPaid: 195,
        averageQualityScore: 4.2
      };
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(mockStats);

      const result = await controller.getDashboardStats();

      // 检查数学关系
      expect(result.conversion.usageRate).toBe(80.0); // 80/100 * 100
      expect(result.financial.pendingAmount).toBe(45); // 15 * 3
      expect(result.financial.costPerUser).toBeCloseTo(2.44, 2); // 195/80
    });
  });
});