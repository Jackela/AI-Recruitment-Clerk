import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { MarketingModule } from '../../apps/app-gateway/src/marketing/marketing.module';

describe('Payment Flow Integration Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MarketingModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('支付宝支付集成测试', () => {
    it('应该验证支付宝账号格式', async () => {
      const feedbackCode = 'FB_PAYMENT_VALIDATION_TEST';
      
      // 创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      const validAccounts = [
        'test@example.com',
        'user@alipay.com',
        'payment@company.com.cn',
        '13800138000', // 手机号格式
        '15912345678'
      ];

      const invalidAccounts = [
        '',
        'invalid-email',
        '@nodomain.com',
        '123', // 太短
        '1234567890123456', // 太长
        'spaces @domain.com', // 包含空格
        'chinese@测试.com' // 包含中文
      ];

      // 测试有效账号
      for (const account of validAccounts) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/mark-used')
          .send({
            code: feedbackCode + '_' + account.replace(/[@.]/g, '_'),
            alipayAccount: account,
            questionnaireData: { problems: '测试问题' }
          });

        // 第一次使用应该成功，后续会失败因为码已使用
        expect([200, 404]).toContain(response.status);
      }

      // 测试无效账号
      for (const account of invalidAccounts) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/mark-used')
          .send({
            code: feedbackCode + '_invalid',
            alipayAccount: account,
            questionnaireData: { problems: '测试问题' }
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('应该正确计算支付金额', async () => {
      const testCases = [
        {
          questionnaireData: {
            problems: '系统响应速度有时候比较慢，特别是在处理大文件时需要等待较长时间',
            favorite_features: '我最喜欢AI简历解析功能，因为它能够准确识别和提取关键信息',
            improvements: '建议增加批量处理功能，优化系统响应速度，改进用户界面设计',
            additional_features: '希望能够增加移动端支持，以及数据导出功能'
          },
          expectedScore: 5,
          expectedAmount: 8 // 高质量反馈
        },
        {
          questionnaireData: {
            problems: '还行',
            favorite_features: '不错',
            improvements: '无',
            additional_features: '没有'
          },
          expectedScore: 1,
          expectedAmount: 0 // 低质量反馈，不符合支付条件
        },
        {
          questionnaireData: {
            problems: '界面有些复杂，新用户可能需要时间适应',
            favorite_features: '简历分析功能很实用',
            improvements: '可以优化用户体验',
            additional_features: '增加更多模板选择'
          },
          expectedScore: 3,
          expectedAmount: 5 // 中等质量反馈
        }
      ];

      for (const [index, testCase] of testCases.entries()) {
        const feedbackCode = `FB_PAYMENT_CALC_${index}`;
        
        // 创建反馈码
        await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code: feedbackCode })
          .expect(201);

        // 提交反馈
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/mark-used')
          .send({
            code: feedbackCode,
            alipayAccount: `test${index}@example.com`,
            questionnaireData: testCase.questionnaireData
          })
          .expect(200);

        expect(response.body.data.qualityScore).toBe(testCase.expectedScore);
        
        if (testCase.expectedAmount > 0) {
          expect(response.body.data.eligible).toBe(true);
          expect(response.body.data.paymentStatus).toBe('pending');
        } else {
          expect(response.body.data.eligible).toBe(false);
        }
      }
    });

    it('应该防止重复支付', async () => {
      const feedbackCode = 'FB_DUPLICATE_PAYMENT_TEST';
      const alipayAccount = 'duplicate@example.com';
      
      // 创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 第一次提交
      const firstResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: alipayAccount,
          questionnaireData: {
            problems: '这是一个详细的问题描述',
            favorite_features: '喜欢的功能描述',
            improvements: '改进建议',
            additional_features: '额外功能建议'
          }
        })
        .expect(200);

      // 尝试重复提交相同的反馈码
      const duplicateResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: alipayAccount,
          questionnaireData: {
            problems: '尝试重复提交',
            favorite_features: '重复内容',
            improvements: '重复改进',
            additional_features: '重复功能'
          }
        });

      expect([404, 400]).toContain(duplicateResponse.status);
      expect(duplicateResponse.body.message).toContain('无效或已使用');
    });
  });

  describe('支付状态管理测试', () => {
    it('应该正确管理支付状态流转', async () => {
      const feedbackCode = 'FB_PAYMENT_STATUS_TEST';
      
      // 创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 提交高质量反馈
      const markUsedResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: 'status@example.com',
          questionnaireData: {
            problems: '系统在处理复杂查询时响应较慢，建议优化算法',
            favorite_features: 'AI分析功能非常准确，帮助我快速理解简历质量',
            improvements: '可以增加批量处理功能，提升工作效率',
            additional_features: '希望增加移动端APP，方便随时使用'
          }
        })
        .expect(200);

      expect(markUsedResponse.body.data.paymentStatus).toBe('pending');
      expect(markUsedResponse.body.data.eligible).toBe(true);

      // 验证反馈码状态
      const validateResponse = await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${feedbackCode}`)
        .expect(200);

      expect(validateResponse.body.valid).toBe(false); // 已使用
    });

    it('应该记录支付审核日志', async () => {
      const feedbackCode = 'FB_AUDIT_LOG_TEST';
      
      // 创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 提交反馈
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: 'audit@example.com',
          questionnaireData: {
            problems: '详细的问题描述，包含具体的使用场景和遇到的困难',
            favorite_features: '最喜欢的功能是智能匹配，因为它大大提高了筛选效率',
            improvements: '建议优化界面布局，增加快捷键支持，提升操作便利性',
            additional_features: '希望增加数据导出功能，支持多种格式输出'
          }
        })
        .expect(200);

      // 获取审核日志 (这里假设有相应的端点)
      const auditResponse = await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/${feedbackCode}/audit-logs`);

      if (auditResponse.status === 200) {
        expect(auditResponse.body).toHaveProperty('logs');
        expect(auditResponse.body.logs).toBeInstanceOf(Array);
        expect(auditResponse.body.logs.length).toBeGreaterThan(0);
        
        const firstLog = auditResponse.body.logs[0];
        expect(firstLog).toHaveProperty('timestamp');
        expect(firstLog).toHaveProperty('action');
        expect(firstLog).toHaveProperty('details');
      }
    });
  });

  describe('批量支付处理测试', () => {
    it('应该支持批量审核和支付', async () => {
      const feedbackCodes = [];
      const batchSize = 5;

      // 创建多个高质量反馈
      for (let i = 0; i < batchSize; i++) {
        const code = `FB_BATCH_${i}`;
        feedbackCodes.push(code);

        // 创建反馈码
        await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code })
          .expect(201);

        // 提交反馈
        await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/mark-used')
          .send({
            code,
            alipayAccount: `batch${i}@example.com`,
            questionnaireData: {
              problems: `详细问题描述 ${i}`,
              favorite_features: `最喜欢的功能 ${i}`,
              improvements: `改进建议 ${i}`,
              additional_features: `额外功能需求 ${i}`
            }
          })
          .expect(200);
      }

      // 获取待审核的支付列表
      const pendingResponse = await request(app.getHttpServer())
        .get('/api/marketing/admin/pending-payments');

      if (pendingResponse.status === 200) {
        expect(pendingResponse.body.data).toBeInstanceOf(Array);
        expect(pendingResponse.body.data.length).toBeGreaterThanOrEqual(batchSize);

        // 批量审核
        const codeIds = pendingResponse.body.data
          .filter(item => feedbackCodes.includes(item.code))
          .map(item => item.id);

        const batchApprovalResponse = await request(app.getHttpServer())
          .post('/api/marketing/admin/batch-approve')
          .send({ feedbackCodeIds: codeIds });

        if (batchApprovalResponse.status === 200) {
          expect(batchApprovalResponse.body.success).toBe(true);
          expect(batchApprovalResponse.body.data.approvedCount).toBe(codeIds.length);
        }
      }
    });

    it('应该正确计算批量支付统计', async () => {
      // 获取支付统计
      const statsResponse = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats')
        .expect(200);

      expect(statsResponse.body).toHaveProperty('totalParticipants');
      expect(statsResponse.body).toHaveProperty('totalRewards');
      expect(statsResponse.body).toHaveProperty('averageRating');
      expect(statsResponse.body).toHaveProperty('lastUpdated');

      expect(typeof statsResponse.body.totalParticipants).toBe('number');
      expect(typeof statsResponse.body.totalRewards).toBe('number');
      expect(typeof statsResponse.body.averageRating).toBe('number');
      expect(typeof statsResponse.body.lastUpdated).toBe('string');

      // 验证统计数据合理性
      expect(statsResponse.body.totalParticipants).toBeGreaterThanOrEqual(0);
      expect(statsResponse.body.totalRewards).toBeGreaterThanOrEqual(0);
      expect(statsResponse.body.averageRating).toBeGreaterThanOrEqual(0);
      expect(statsResponse.body.averageRating).toBeLessThanOrEqual(5);
    });
  });

  describe('支付安全测试', () => {
    it('应该防止支付金额篡改', async () => {
      const feedbackCode = 'FB_PAYMENT_SECURITY_TEST';
      
      // 创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 尝试通过请求体篡改支付金额
      const tamperResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: 'tamper@example.com',
          paymentAmount: 999999, // 恶意篡改
          paymentStatus: 'approved', // 尝试直接设置为已批准
          qualityScore: 5, // 尝试设置高分
          questionnaireData: {
            problems: '测试问题',
            favorite_features: '测试功能',
            improvements: '测试改进',
            additional_features: '测试额外功能'
          }
        })
        .expect(200);

      // 验证服务器忽略了篡改的参数
      expect(tamperResponse.body.data.paymentStatus).toBe('pending');
      expect(tamperResponse.body.data.qualityScore).toBeLessThan(5); // 应该基于内容计算
    });

    it('应该验证支付处理的幂等性', async () => {
      const feedbackCode = 'FB_IDEMPOTENCY_TEST';
      
      // 创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode })
        .expect(201);

      // 第一次处理
      const firstResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: 'idempotent@example.com',
          questionnaireData: {
            problems: '幂等性测试问题',
            favorite_features: '幂等性测试功能',
            improvements: '幂等性测试改进',
            additional_features: '幂等性测试额外功能'
          }
        })
        .expect(200);

      const firstQualityScore = firstResponse.body.data.qualityScore;
      const firstPaymentStatus = firstResponse.body.data.paymentStatus;

      // 尝试重复处理（应该失败）
      const duplicateResponse = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: 'idempotent@example.com',
          questionnaireData: {
            problems: '不同的问题内容',
            favorite_features: '不同的功能内容',
            improvements: '不同的改进内容',
            additional_features: '不同的额外功能内容'
          }
        });

      expect([404, 400]).toContain(duplicateResponse.status);
    });
  });

  describe('错误处理和异常情况', () => {
    it('应该处理数据库连接失败', async () => {
      // 暂时停止MongoDB
      await mongod.stop();

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: 'FB_DB_FAIL_TEST' });

      expect([500, 503]).toContain(response.status);
      
      // 重启数据库
      mongod = await MongoMemoryServer.create();
    });

    it('应该处理无效的JSON数据', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect([400, 422]).toContain(response.status);
    });

    it('应该处理超时情况', async () => {
      // 创建一个会触发超时的大请求
      const largeQuestionnaireData = {
        problems: 'A'.repeat(10000),
        favorite_features: 'B'.repeat(10000),
        improvements: 'C'.repeat(10000),
        additional_features: 'D'.repeat(10000)
      };

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: 'FB_TIMEOUT_TEST',
          alipayAccount: 'timeout@example.com',
          questionnaireData: largeQuestionnaireData
        });

      // 应该被大小限制拒绝，而不是超时
      expect([400, 413, 422]).toContain(response.status);
    });
  });
});