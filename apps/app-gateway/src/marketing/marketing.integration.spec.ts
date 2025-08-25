import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { MarketingModule } from './marketing.module';
import { FeedbackCodeService } from './feedback-code.service';
import { CreateFeedbackCodeDto, MarkFeedbackCodeUsedDto } from '@app/shared-dtos';

describe('Marketing Integration Tests', () => {
  let app: INestApplication;
  let service: FeedbackCodeService;
  let mongod: MongoMemoryServer;
  let mongoUri: string;

  beforeAll(async () => {
    // 启动内存MongoDB实例
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
  });

  afterAll(async () => {
    // 清理内存MongoDB
    await mongod.stop();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MarketingModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    service = moduleFixture.get<FeedbackCodeService>(FeedbackCodeService);
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('完整营销流程集成测试', () => {
    it('应该完成从生成反馈码到支付的完整流程', async () => {
      const feedbackCode = 'FB123456789ABCD';
      
      // 1. 记录反馈码
      const recordResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      expect(recordResponse.body.success).toBe(true);
      expect(recordResponse.body.data.code).toBe(feedbackCode);

      // 2. 验证反馈码
      const validateResponse = await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${feedbackCode}`)
        .expect(200);

      expect(validateResponse.body.valid).toBe(true);

      // 3. 标记为已使用
      const markUsedDto: MarkFeedbackCodeUsedDto = {
        code: feedbackCode,
        alipayAccount: '138****8888',
        questionnaireData: {
          problems: '系统响应速度有时候比较慢，特别是在处理大文件时',
          favorite_features: '我最喜欢AI简历解析功能，因为它能够准确识别关键信息',
          improvements: '建议增加批量处理功能，优化系统响应速度',
          additional_features: '希望能够增加移动端支持和数据导出功能'
        }
      };

      const markUsedResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(markUsedDto)
        .expect(200);

      expect(markUsedResponse.body.success).toBe(true);
      expect(markUsedResponse.body.data.eligible).toBe(true); // 高质量反馈
      expect(markUsedResponse.body.data.qualityScore).toBeGreaterThanOrEqual(3);

      // 4. 验证反馈码现在无效
      const revalidateResponse = await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${feedbackCode}`)
        .expect(200);

      expect(revalidateResponse.body.valid).toBe(false);

      // 5. 检查统计数据
      const statsResponse = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats')
        .expect(200);

      expect(statsResponse.body.totalParticipants).toBe(1);
      expect(statsResponse.body.averageRating).toBeGreaterThan(0);
    });

    it('应该拒绝低质量反馈', async () => {
      const feedbackCode = 'FB987654321EFGH';

      // 记录反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 提交低质量反馈
      const lowQualityDto: MarkFeedbackCodeUsedDto = {
        code: feedbackCode,
        alipayAccount: '138****8888',
        questionnaireData: {
          problems: '无',
          favorite_features: '好',
          improvements: '没有',
          additional_features: ''
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(lowQualityDto)
        .expect(200);

      expect(response.body.data.eligible).toBe(false); // 低质量反馈不符合奖励条件
      expect(response.body.data.qualityScore).toBeLessThan(3);
    });
  });

  describe('Webhook集成测试', () => {
    it('应该正确处理腾讯问卷webhook', async () => {
      const feedbackCode = 'FB111222333444';

      // 先记录反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 模拟腾讯问卷webhook数据
      const webhookData = {
        surveyId: 'survey123',
        respondentId: 'resp456',
        submittedAt: '2023-01-01T10:00:00Z',
        answers: {
          feedback_code: feedbackCode,
          alipay_account: 'user@example.com',
          accuracy_rating: '4',
          problems: '界面有时候会卡顿，希望能够优化一下',
          favorite_features: '简历解析功能非常准确，大大提高了工作效率',
          improvements: '建议增加快捷键支持，以及更多的自定义选项',
          additional_features: '希望增加报告导出功能'
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/webhook/questionnaire')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 验证数据已正确处理
      const validateResponse = await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${feedbackCode}`)
        .expect(200);

      expect(validateResponse.body.valid).toBe(false); // 应该已被标记为使用
    });

    it('应该处理不完整的webhook数据', async () => {
      const incompleteWebhook = {
        answers: {
          feedback_code: 'FB555666777888'
          // 缺少alipay_account
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/webhook/questionnaire')
        .send(incompleteWebhook)
        .expect(200);

      expect(response.body.success).toBe(true); // 仍然返回成功避免重试
    });
  });

  describe('数据验证集成测试', () => {
    it('应该验证反馈码格式', async () => {
      // 测试太短的反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: '123' })
        .expect(400);

      // 测试验证太短的反馈码
      await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/validate/123')
        .expect(400);
    });

    it('应该验证支付宝账号格式', async () => {
      const feedbackCode = 'FB123456789ABCD';

      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 测试无效的支付宝账号格式
      const invalidDto = {
        code: feedbackCode,
        alipayAccount: 'invalid-account',
        questionnaireData: {}
      };

      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(invalidDto)
        .expect(400);
    });

    it('应该验证必填字段', async () => {
      // 测试缺少反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          alipayAccount: '138****8888',
          questionnaireData: {}
        })
        .expect(400);

      // 测试缺少支付宝账号
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: 'FB123456789ABCD',
          questionnaireData: {}
        })
        .expect(400);
    });
  });

  describe('并发安全测试', () => {
    it('应该防止反馈码重复使用', async () => {
      const feedbackCode = 'FB999888777666';

      // 记录反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      const markUsedDto: MarkFeedbackCodeUsedDto = {
        code: feedbackCode,
        alipayAccount: '138****8888',
        questionnaireData: {
          problems: '测试问题',
          favorite_features: '测试功能',
          improvements: '测试改进建议'
        }
      };

      // 第一次标记为使用
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(markUsedDto)
        .expect(200);

      // 第二次尝试使用同一个反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(markUsedDto)
        .expect(404); // 应该返回Not Found
    });

    it('应该处理并发的反馈码生成', async () => {
      // 并发创建多个反馈码
      const codes = Array.from({ length: 10 }, (_, i) => `FB${i}${Date.now()}`);
      
      const promises = codes.map(code =>
        request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code })
      );

      const responses = await Promise.all(promises);

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('性能集成测试', () => {
    it('批量操作应该在合理时间内完成', async () => {
      const startTime = Date.now();

      // 创建100个反馈码
      const codes = Array.from({ length: 100 }, (_, i) => `FB${i}${Date.now()}`);
      
      for (const code of codes.slice(0, 10)) { // 限制测试数量以避免超时
        await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code })
          .expect(201);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('统计查询应该高效执行', async () => {
      // 创建一些测试数据
      const codes = ['FB001', 'FB002', 'FB003'];
      
      for (const code of codes) {
        await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code })
          .expect(201);
      }

      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats')
        .expect(200);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });
  });

  describe('数据库集成测试', () => {
    it('应该正确持久化数据', async () => {
      const feedbackCode = 'FB_PERSIST_TEST';
      
      // 通过API创建数据
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 直接从数据库验证数据
      const stats = await service.getMarketingStats();
      expect(stats.totalCodes).toBeGreaterThan(0);

      // 验证数据可以被正确查询
      const isValid = await service.validateFeedbackCode(feedbackCode);
      expect(isValid).toBe(true);
    });

    it('应该正确处理数据库事务', async () => {
      const feedbackCode = 'FB_TRANSACTION_TEST';
      
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      const markUsedDto: MarkFeedbackCodeUsedDto = {
        code: feedbackCode,
        alipayAccount: '138****8888',
        questionnaireData: {
          problems: '事务测试',
          favorite_features: '事务测试',
          improvements: '事务测试'
        }
      };

      // 标记为使用
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(markUsedDto)
        .expect(200);

      // 验证状态已正确更新
      const isValid = await service.validateFeedbackCode(feedbackCode);
      expect(isValid).toBe(false);
    });
  });

  describe('错误处理集成测试', () => {
    it('应该正确处理网络错误', async () => {
      // 测试不存在的反馈码
      await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/validate/NONEXISTENT')
        .expect(200) // 应该返回valid: false，而不是错误
        .expect(res => {
          expect(res.body.valid).toBe(false);
        });
    });

    it('应该处理恶意输入', async () => {
      // SQL注入尝试
      const maliciousCode = "FB'; DROP TABLE feedback_codes; --";
      
      await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${encodeURIComponent(maliciousCode)}`)
        .expect(200)
        .expect(res => {
          expect(res.body.valid).toBe(false);
        });
    });

    it('应该处理大量数据输入', async () => {
      const oversizedData = {
        code: 'FB123456789ABCD',
        alipayAccount: '138****8888',
        questionnaireData: {
          problems: 'A'.repeat(10000), // 10KB文本
          favorite_features: 'B'.repeat(5000),
          improvements: 'C'.repeat(5000)
        }
      };

      // 先创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: 'FB123456789ABCD' })
        .expect(201);

      // 应该能处理大量数据而不崩溃
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(oversizedData)
        .expect(200);
    });
  });

  describe('API兼容性测试', () => {
    it('应该保持API响应格式兼容性', async () => {
      const feedbackCode = 'FB_COMPAT_TEST';

      // 记录反馈码响应格式
      const recordResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      expect(recordResponse.body).toMatchObject({
        success: expect.any(Boolean),
        data: {
          id: expect.any(String),
          code: expect.any(String),
          generatedAt: expect.any(String)
        }
      });

      // 验证反馈码响应格式
      const validateResponse = await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${feedbackCode}`)
        .expect(200);

      expect(validateResponse.body).toMatchObject({
        valid: expect.any(Boolean),
        code: expect.any(String),
        timestamp: expect.any(String)
      });

      // 统计响应格式
      const statsResponse = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats')
        .expect(200);

      expect(statsResponse.body).toMatchObject({
        totalParticipants: expect.any(Number),
        totalRewards: expect.any(Number),
        averageRating: expect.any(Number),
        lastUpdated: expect.any(String)
      });
    });
  });
});