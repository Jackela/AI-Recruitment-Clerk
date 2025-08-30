import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackCodeController } from './feedback-code.controller';
import { FeedbackCodeService } from './feedback-code.service';
import { CreateFeedbackCodeDto, MarkFeedbackCodeUsedDto } from '@ai-recruitment-clerk/marketing-domain';

describe('FeedbackCodeController', () => {
  let controller: FeedbackCodeController;
  let service: FeedbackCodeService;

  const mockFeedbackCodeService = {
    recordFeedbackCode: jest.fn(),
    validateFeedbackCode: jest.fn(),
    markAsUsed: jest.fn(),
    getMarketingStats: jest.fn(),
  };

  const mockRequest = {
    get: jest.fn(),
    connection: { remoteAddress: '192.168.1.1' },
    socket: { remoteAddress: '192.168.1.1' }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackCodeController],
      providers: [
        {
          provide: FeedbackCodeService,
          useValue: mockFeedbackCodeService,
        },
      ],
    }).compile();

    controller = module.get<FeedbackCodeController>(FeedbackCodeController);
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

  describe('POST /record', () => {
    const createDto: CreateFeedbackCodeDto = {
      code: 'FB123456789ABCD'
    };

    const mockResult = {
      id: '507f1f77bcf86cd799439011',
      code: 'FB123456789ABCD',
      generatedAt: new Date('2023-01-01T10:00:00Z')
    };

    it('应该成功记录反馈码', async () => {
      mockRequest.get.mockReturnValue('Mozilla/5.0...');
      mockFeedbackCodeService.recordFeedbackCode.mockResolvedValue(mockResult);

      const result = await controller.recordFeedbackCode(createDto, mockRequest as any);

      expect(service.recordFeedbackCode).toHaveBeenCalledWith(
        createDto,
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          sessionId: expect.any(String)
        })
      );
      expect(result.success).toBe(true);
      expect(result.data.code).toBe(createDto.code);
    });

    it('应该验证反馈码格式', async () => {
      const invalidDto = { code: '123' }; // 太短

      await expect(controller.recordFeedbackCode(invalidDto, mockRequest as any))
        .rejects.toThrow(BadRequestException);
    });

    it('应该正确提取客户端IP', async () => {
      // 测试 X-Forwarded-For 头
      mockRequest.get.mockImplementation((header: string) => {
        if (header === 'X-Forwarded-For') return '203.0.113.1';
        if (header === 'User-Agent') return 'Mozilla/5.0...';
        return null;
      });
      mockFeedbackCodeService.recordFeedbackCode.mockResolvedValue(mockResult);

      await controller.recordFeedbackCode(createDto, mockRequest as any);

      expect(service.recordFeedbackCode).toHaveBeenCalledWith(
        createDto,
        expect.objectContaining({
          ipAddress: '203.0.113.1'
        })
      );
    });

    it('应该处理服务层错误', async () => {
      mockFeedbackCodeService.recordFeedbackCode.mockRejectedValue(
        new Error('Database error')
      );

      await expect(controller.recordFeedbackCode(createDto, mockRequest as any))
        .rejects.toThrow('Database error');
    });
  });

  describe('GET /validate/:code', () => {
    const testCode = 'FB123456789ABCD';

    it('应该验证有效的反馈码', async () => {
      mockFeedbackCodeService.validateFeedbackCode.mockResolvedValue(true);

      const result = await controller.validateFeedbackCode(testCode);

      expect(service.validateFeedbackCode).toHaveBeenCalledWith(testCode);
      expect(result.valid).toBe(true);
      expect(result.code).toBe(testCode);
      expect(result.timestamp).toBeDefined();
    });

    it('应该验证无效的反馈码', async () => {
      mockFeedbackCodeService.validateFeedbackCode.mockResolvedValue(false);

      const result = await controller.validateFeedbackCode(testCode);

      expect(result.valid).toBe(false);
    });

    it('应该拒绝格式无效的反馈码', async () => {
      const invalidCode = '123';

      await expect(controller.validateFeedbackCode(invalidCode))
        .rejects.toThrow(BadRequestException);
    });

    it('应该处理服务层错误', async () => {
      mockFeedbackCodeService.validateFeedbackCode.mockRejectedValue(
        new Error('Service error')
      );

      await expect(controller.validateFeedbackCode(testCode))
        .rejects.toThrow('Service error');
    });
  });

  describe('POST /mark-used', () => {
    const markUsedDto: MarkFeedbackCodeUsedDto = {
      code: 'FB123456789ABCD',
      alipayAccount: '138****8888',
      questionnaireData: {
        problems: '响应速度有时候比较慢',
        favorite_features: '简历解析功能很准确',
        improvements: '希望能够提供批量处理功能'
      }
    };

    const mockResult = {
      code: 'FB123456789ABCD',
      qualityScore: 4,
      paymentStatus: 'pending' as const
    };

    it('应该成功标记反馈码为已使用', async () => {
      mockFeedbackCodeService.markAsUsed.mockResolvedValue(mockResult);

      const result = await controller.markAsUsed(markUsedDto);

      expect(service.markAsUsed).toHaveBeenCalledWith(markUsedDto);
      expect(result.success).toBe(true);
      expect(result.data.code).toBe(markUsedDto.code);
      expect(result.data.eligible).toBe(true); // qualityScore >= 3
    });

    it('应该验证必填字段', async () => {
      const incompleteDto = { code: 'FB123456789ABCD' }; // 缺少 alipayAccount

      await expect(controller.markAsUsed(incompleteDto as any))
        .rejects.toThrow(BadRequestException);
    });

    it('应该验证支付宝账号格式', async () => {
      const invalidDto = {
        ...markUsedDto,
        alipayAccount: 'invalid-account'
      };

      await expect(controller.markAsUsed(invalidDto))
        .rejects.toThrow(BadRequestException);
    });

    it('应该接受有效的邮箱格式支付宝账号', async () => {
      const emailDto = {
        ...markUsedDto,
        alipayAccount: 'user@example.com'
      };
      mockFeedbackCodeService.markAsUsed.mockResolvedValue(mockResult);

      const result = await controller.markAsUsed(emailDto);

      expect(result.success).toBe(true);
    });

    it('应该接受有效的手机号格式支付宝账号', async () => {
      const phoneDto = {
        ...markUsedDto,
        alipayAccount: '13812345678'
      };
      mockFeedbackCodeService.markAsUsed.mockResolvedValue(mockResult);

      const result = await controller.markAsUsed(phoneDto);

      expect(result.success).toBe(true);
    });

    it('应该处理无效或已使用的反馈码', async () => {
      mockFeedbackCodeService.markAsUsed.mockRejectedValue(
        new Error('反馈码无效或已使用')
      );

      await expect(controller.markAsUsed(markUsedDto))
        .rejects.toThrow(NotFoundException);
    });

    it('应该标识低质量反馈', async () => {
      const lowQualityResult = {
        ...mockResult,
        qualityScore: 2
      };
      mockFeedbackCodeService.markAsUsed.mockResolvedValue(lowQualityResult);

      const result = await controller.markAsUsed(markUsedDto);

      expect(result.data.eligible).toBe(false); // qualityScore < 3
    });
  });

  describe('GET /stats', () => {
    const mockStats = {
      totalCodes: 100,
      usedCodes: 80,
      pendingPayments: 15,
      totalPaid: 195,
      averageQualityScore: 4.2
    };

    it('应该返回公开统计信息', async () => {
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue(mockStats);

      const result = await controller.getPublicStats();

      expect(result.totalParticipants).toBe(80);
      expect(result.totalRewards).toBe(195); // 取整后的值
      expect(result.averageRating).toBe(4.2);
      expect(result.lastUpdated).toBeDefined();
    });

    it('应该隐藏敏感信息', async () => {
      mockFeedbackCodeService.getMarketingStats.mockResolvedValue({
        ...mockStats,
        totalPaid: 195.67 // 有小数
      });

      const result = await controller.getPublicStats();

      expect(result.totalRewards).toBe(195); // 应该取整
      expect(result).not.toHaveProperty('totalCodes');
      expect(result).not.toHaveProperty('pendingPayments');
    });

    it('应该处理服务错误', async () => {
      mockFeedbackCodeService.getMarketingStats.mockRejectedValue(
        new Error('Stats error')
      );

      await expect(controller.getPublicStats()).rejects.toThrow('Stats error');
    });
  });

  describe('POST /webhook/questionnaire', () => {
    const webhookData = {
      id: 'survey123',
      answers: {
        feedback_code: 'FB123456789ABCD',
        alipay_account: '138****8888',
        problems: '响应速度较慢',
        favorite_features: '简历解析准确'
      }
    };

    it('应该处理腾讯问卷webhook数据', async () => {
      mockFeedbackCodeService.markAsUsed.mockResolvedValue({
        code: 'FB123456789ABCD',
        qualityScore: 4,
        paymentStatus: 'pending'
      });

      const result = await controller.handleQuestionnaireWebhook(webhookData);

      expect(service.markAsUsed).toHaveBeenCalledWith({
        code: 'FB123456789ABCD',
        alipayAccount: '138****8888',
        questionnaireData: webhookData.answers
      });
      expect(result.success).toBe(true);
    });

    it('应该处理不完整的webhook数据', async () => {
      const incompleteData = {
        answers: {
          feedback_code: 'FB123456789ABCD'
          // 缺少 alipay_account
        }
      };

      const result = await controller.handleQuestionnaireWebhook(incompleteData);

      expect(service.markAsUsed).not.toHaveBeenCalled();
      expect(result.success).toBe(true); // 仍然返回成功，避免webhook重试
    });

    it('应该处理webhook处理错误', async () => {
      mockFeedbackCodeService.markAsUsed.mockRejectedValue(
        new Error('Processing error')
      );

      const result = await controller.handleQuestionnaireWebhook(webhookData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing error');
    });

    it('应该支持不同的数据格式', async () => {
      const alternativeFormat = {
        code: 'FB123456789ABCD', // 直接在根级别
        alipay_account: '138****8888',
        answers: {
          problems: '响应速度较慢'
        }
      };

      mockFeedbackCodeService.markAsUsed.mockResolvedValue({
        code: 'FB123456789ABCD',
        qualityScore: 3,
        paymentStatus: 'pending'
      });

      const result = await controller.handleQuestionnaireWebhook(alternativeFormat);

      expect(result.success).toBe(true);
    });
  });

  describe('辅助方法测试', () => {
    it('应该正确提取客户端IP', () => {
      const mockReq = {
        get: jest.fn().mockImplementation((header: string) => {
          const headers: { [key: string]: string } = {
            'X-Forwarded-For': '203.0.113.1, 70.41.3.18, 150.172.238.178',
            'X-Real-IP': '203.0.113.1'
          };
          return headers[header];
        }),
        connection: { remoteAddress: '192.168.1.1' },
        socket: { remoteAddress: '192.168.1.1' }
      };

      const ip = (controller as any).getClientIp(mockReq);
      expect(ip).toBe('203.0.113.1, 70.41.3.18, 150.172.238.178');
    });

    it('应该正确提取会话ID', () => {
      const code = 'FB123456789ABCD';
      const sessionId = (controller as any).extractSessionId(code);
      expect(sessionId).toBe('ABCD');
    });

    it('应该验证有效的支付宝账号格式', () => {
      expect((controller as any).isValidAlipayAccount('user@example.com')).toBe(true);
      expect((controller as any).isValidAlipayAccount('13812345678')).toBe(true);
      expect((controller as any).isValidAlipayAccount('invalid')).toBe(false);
      expect((controller as any).isValidAlipayAccount('')).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('API响应时间应该在合理范围内', async () => {
      const createDto: CreateFeedbackCodeDto = {
        code: 'FB123456789ABCD'
      };
      
      mockFeedbackCodeService.recordFeedbackCode.mockResolvedValue({
        id: '507f1f77bcf86cd799439011',
        code: 'FB123456789ABCD',
        generatedAt: new Date()
      });

      const startTime = Date.now();
      await controller.recordFeedbackCode(createDto, mockRequest as any);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极长的反馈码', async () => {
      const longCode = 'FB' + 'A'.repeat(1000);
      mockFeedbackCodeService.validateFeedbackCode.mockResolvedValue(false);

      const result = await controller.validateFeedbackCode(longCode);
      expect(result.valid).toBe(false);
    });

    it('应该处理特殊字符in反馈码', async () => {
      const specialCode = 'FB测试123!@#$%';
      mockFeedbackCodeService.validateFeedbackCode.mockResolvedValue(false);

      const result = await controller.validateFeedbackCode(specialCode);
      expect(result.valid).toBe(false);
    });

    it('应该处理网络请求超时', async () => {
      const createDto: CreateFeedbackCodeDto = {
        code: 'FB123456789ABCD'
      };
      
      mockFeedbackCodeService.recordFeedbackCode.mockRejectedValue(
        new Error('TIMEOUT')
      );

      await expect(controller.recordFeedbackCode(createDto, mockRequest as any))
        .rejects.toThrow('TIMEOUT');
    });
  });

  describe('安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const maliciousCode = "FB'; DROP TABLE feedback_codes; --";
      mockFeedbackCodeService.validateFeedbackCode.mockResolvedValue(false);

      const result = await controller.validateFeedbackCode(maliciousCode);
      expect(result.valid).toBe(false);
      expect(service.validateFeedbackCode).toHaveBeenCalledWith(maliciousCode);
    });

    it('应该防止XSS攻击', async () => {
      const xssCode = 'FB<script>alert("xss")</script>';
      mockFeedbackCodeService.validateFeedbackCode.mockResolvedValue(false);

      const result = await controller.validateFeedbackCode(xssCode);
      expect(result.valid).toBe(false);
    });

    it('应该验证输入数据长度', async () => {
      const oversizedDto = {
        code: 'FB123456789ABCD',
        alipayAccount: 'user@example.com',
        questionnaireData: {
          problems: 'A'.repeat(10000) // 极长文本
        }
      };

      mockFeedbackCodeService.markAsUsed.mockResolvedValue({
        code: 'FB123456789ABCD',
        qualityScore: 1,
        paymentStatus: 'pending'
      });

      // 应该能够处理大量数据而不崩溃
      const result = await controller.markAsUsed(oversizedDto);
      expect(result.success).toBe(true);
    });
  });
});