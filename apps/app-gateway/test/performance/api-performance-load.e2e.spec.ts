import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app/app.module';

/**
 * 🚀 API PERFORMANCE AND LOAD TESTING SUITE
 *
 * Comprehensive performance validation including:
 * - Load testing under various user scenarios
 * - Response time validation across all endpoints
 * - Memory and resource usage monitoring
 * - Concurrent user simulation
 * - Stress testing and breaking point analysis
 * - Performance regression detection
 */

describe('🚀 API Performance and Load Testing', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let testUserId: string;
  let testOrganizationId: string;

  // Performance metrics tracking
  const performanceMetrics = {
    responseTime: {
      auth: [],
      userManagement: [],
      resumeProcessing: [],
      questionnaire: [],
      analytics: [],
      system: [],
    },
    memoryUsage: [],
    requestCount: 0,
    errorCount: 0,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await setupPerformanceTestData();

    console.log('🚀 Starting Performance and Load Testing Suite');
    console.log(
      '📊 Monitoring: Response Times, Memory Usage, Concurrent Requests',
    );
  });

  afterAll(async () => {
    await generatePerformanceReport();
    await app.close();
  });

  async function setupPerformanceTestData() {
    // Create test organization
    const orgResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'performance.admin@test.com',
        password: 'Performance123!',
        name: 'Performance Test Admin',
        organizationName: 'Performance Test Organization',
        role: 'admin',
      });

    testOrganizationId = orgResponse.body.data.organizationId;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'performance.admin@test.com',
        password: 'Performance123!',
      });

    adminToken = adminLoginResponse.body.data.accessToken;

    // Create test user
    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'performance.user@test.com',
        password: 'Performance123!',
        name: 'Performance Test User',
        organizationId: testOrganizationId,
        role: 'user',
      });

    testUserId = userResponse.body.data.userId;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'performance.user@test.com',
        password: 'Performance123!',
      });

    userToken = userLoginResponse.body.data.accessToken;
  }

  async function measurePerformance(
    category: string,
    operation: () => Promise<any>,
  ): Promise<any> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await operation();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      performanceMetrics.responseTime[
        category as keyof typeof performanceMetrics.responseTime
      ].push(responseTime);
      performanceMetrics.requestCount++;

      const memoryDelta = process.memoryUsage().heapUsed - startMemory.heapUsed;
      performanceMetrics.memoryUsage.push(memoryDelta);

      return { result, responseTime, memoryDelta };
    } catch (error) {
      performanceMetrics.errorCount++;
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return { error, responseTime };
    }
  }

  async function generatePerformanceReport() {
    console.log('\\n📊 PERFORMANCE TEST RESULTS SUMMARY');
    console.log('=====================================');

    Object.entries(performanceMetrics.responseTime).forEach(
      ([category, times]) => {
        if (times.length > 0) {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          const max = Math.max(...times);
          const min = Math.min(...times);
          const p95 = times.sort((a, b) => a - b)[
            Math.floor(times.length * 0.95)
          ];

          console.log(`📈 ${category.toUpperCase()}:`);
          console.log(`   Average: ${avg.toFixed(2)}ms`);
          console.log(`   Min: ${min}ms | Max: ${max}ms`);
          console.log(`   95th percentile: ${p95}ms`);
          console.log(`   Request count: ${times.length}`);
        }
      },
    );

    const totalMemoryUsage = performanceMetrics.memoryUsage.reduce(
      (a, b) => a + Math.abs(b),
      0,
    );
    console.log(`\\n💾 MEMORY USAGE:`);
    console.log(
      `   Total memory delta: ${(totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
    );
    console.log(
      `   Average per request: ${(totalMemoryUsage / performanceMetrics.requestCount / 1024).toFixed(2)}KB`,
    );

    console.log(`\\n📊 OVERALL STATS:`);
    console.log(`   Total requests: ${performanceMetrics.requestCount}`);
    console.log(`   Total errors: ${performanceMetrics.errorCount}`);
    console.log(
      `   Success rate: ${(((performanceMetrics.requestCount - performanceMetrics.errorCount) / performanceMetrics.requestCount) * 100).toFixed(2)}%`,
    );
  }

  describe('🔐 Authentication Performance', () => {
    it('should handle login requests within performance thresholds', async () => {
      const loginRequests = [];
      const userCount = 20;

      // Create multiple concurrent login requests
      for (let i = 0; i < userCount; i++) {
        loginRequests.push(
          measurePerformance('auth', async () => {
            return await request(app.getHttpServer()).post('/auth/login').send({
              email: 'performance.user@test.com',
              password: 'Performance123!',
            });
          }),
        );
      }

      const results = await Promise.all(loginRequests);

      results.forEach((result, index) => {
        expect(result.responseTime).toBeLessThan(2000); // < 2 seconds
        if (result.result) {
          expect(result.result.status).toBe(200);
        }
        console.log(`Login ${index + 1}: ${result.responseTime}ms`);
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(`📊 Average login time: ${avgResponseTime.toFixed(2)}ms`);

      expect(avgResponseTime).toBeLessThan(1000); // Average < 1 second
    });

    it('should handle registration load efficiently', async () => {
      const registrationRequests = [];
      const userCount = 15;

      for (let i = 0; i < userCount; i++) {
        registrationRequests.push(
          measurePerformance('auth', async () => {
            return await request(app.getHttpServer())
              .post('/auth/register')
              .send({
                email: `loadtest.user${i}@test.com`,
                password: 'LoadTest123!',
                name: `Load Test User ${i}`,
                organizationId: testOrganizationId,
                role: 'user',
              });
          }),
        );
      }

      const results = await Promise.all(registrationRequests);

      const successfulRegistrations = results.filter(
        (r) => r.result && [200, 201].includes(r.result.status),
      );

      expect(successfulRegistrations.length).toBeGreaterThan(userCount * 0.8); // At least 80% success

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(3000); // Average < 3 seconds
    });
  });

  describe('👥 User Management Performance', () => {
    it('should handle profile requests under load', async () => {
      const profileRequests = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        profileRequests.push(
          measurePerformance('userManagement', async () => {
            return await request(app.getHttpServer())
              .get('/users/profile')
              .set('Authorization', `Bearer ${userToken}`);
          }),
        );
      }

      const results = await Promise.all(profileRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(1000); // < 1 second
        if (result.result) {
          expect(result.result.status).toBe(200);
        }
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(
        `📊 Average profile fetch time: ${avgResponseTime.toFixed(2)}ms`,
      );
    });

    it('should handle concurrent profile updates', async () => {
      const updateRequests = [];
      const concurrentUpdates = 10;

      for (let i = 0; i < concurrentUpdates; i++) {
        updateRequests.push(
          measurePerformance('userManagement', async () => {
            return await request(app.getHttpServer())
              .put('/users/profile')
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                name: `Updated User ${i}`,
                bio: `Updated bio ${i} - Performance test`,
                phone: `+123456789${i}`,
              });
          }),
        );
      }

      const results = await Promise.all(updateRequests);

      const successfulUpdates = results.filter(
        (r) => r.result && r.result.status === 200,
      );

      // At least some updates should succeed (race conditions are expected)
      expect(successfulUpdates.length).toBeGreaterThan(0);

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(2000); // Average < 2 seconds
    });

    it('should handle organization user list requests efficiently', async () => {
      const listRequests = [];
      const requestCount = 25;

      for (let i = 0; i < requestCount; i++) {
        listRequests.push(
          measurePerformance('userManagement', async () => {
            return await request(app.getHttpServer())
              .get('/users/organization/users?page=1&limit=20')
              .set('Authorization', `Bearer ${adminToken}`);
          }),
        );
      }

      const results = await Promise.all(listRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(1500); // < 1.5 seconds
        if (result.result) {
          expect([200, 403]).toContain(result.result.status);
        }
      });
    });
  });

  describe('📄 Resume Processing Performance', () => {
    it('should handle multiple resume uploads concurrently', async () => {
      const uploadRequests = [];
      const uploadCount = 8; // Reduced for realistic testing

      for (let i = 0; i < uploadCount; i++) {
        uploadRequests.push(
          measurePerformance('resumeProcessing', async () => {
            return await request(app.getHttpServer())
              .post('/resumes/upload')
              .set('Authorization', `Bearer ${userToken}`)
              .attach(
                'resume',
                Buffer.from(`Mock Resume Content ${i}`),
                `performance-resume-${i}.pdf`,
              )
              .field('candidateName', `Performance Candidate ${i}`)
              .field('candidateEmail', `candidate${i}@performance.test`)
              .field('notes', `Performance test upload ${i}`);
          }),
        );
      }

      const results = await Promise.all(uploadRequests);

      results.forEach((result, index) => {
        expect(result.responseTime).toBeLessThan(10000); // < 10 seconds for file upload
        console.log(`Upload ${index + 1}: ${result.responseTime}ms`);
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(
        `📊 Average resume upload time: ${avgResponseTime.toFixed(2)}ms`,
      );
    });

    it('should handle resume search queries efficiently', async () => {
      const searchRequests = [];
      const searchCount = 20;

      const searchQueries = [
        { skills: ['JavaScript', 'React'], experience: { min: 2, max: 8 } },
        { skills: ['Python', 'Django'], education: 'Bachelor' },
        { skills: ['Java', 'Spring'], location: 'Remote' },
        { experience: { min: 1, max: 5 }, education: 'Master' },
      ];

      for (let i = 0; i < searchCount; i++) {
        const query = searchQueries[i % searchQueries.length];
        searchRequests.push(
          measurePerformance('resumeProcessing', async () => {
            return await request(app.getHttpServer())
              .post('/resumes/search')
              .set('Authorization', `Bearer ${adminToken}`)
              .send(query);
          }),
        );
      }

      const results = await Promise.all(searchRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(3000); // < 3 seconds
        if (result.result) {
          expect(result.result.status).toBe(200);
        }
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(1500); // Average < 1.5 seconds
    });
  });

  describe('📊 Questionnaire Performance', () => {
    let performanceQuestionnaireId: string;

    it('should handle questionnaire creation efficiently', async () => {
      const { result, responseTime } = await measurePerformance(
        'questionnaire',
        async () => {
          return await request(app.getHttpServer())
            .post('/questionnaire')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              title: 'Performance Test Questionnaire',
              description: 'Load testing questionnaire creation',
              questions: Array.from({ length: 20 }, (_, i) => ({
                type: 'multiple_choice',
                question: `Performance test question ${i + 1}?`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                required: i % 2 === 0,
                weight: Math.floor(Math.random() * 3) + 1,
              })),
              settings: {
                allowAnonymous: false,
                requireAuth: true,
                timeLimit: 1800,
                maxAttempts: 3,
              },
            });
        },
      );

      expect(responseTime).toBeLessThan(5000); // < 5 seconds
      if (result && result.status === 201) {
        performanceQuestionnaireId = result.body.data.questionnaireId;
      }
    });

    it('should handle multiple questionnaire submissions', async () => {
      if (!performanceQuestionnaireId) {
        console.log(
          '⚠️ Skipping questionnaire submissions - no questionnaire ID',
        );
        return;
      }

      // First publish the questionnaire
      await request(app.getHttpServer())
        .post(`/questionnaire/${performanceQuestionnaireId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          publishDate: new Date().toISOString(),
          notifyUsers: false,
        });

      const submissionRequests = [];
      const submissionCount = 12;

      for (let i = 0; i < submissionCount; i++) {
        submissionRequests.push(
          measurePerformance('questionnaire', async () => {
            const responses = Array.from({ length: 20 }, (_, qIndex) => ({
              questionIndex: qIndex,
              answer: ['Option A', 'Option B', 'Option C'][
                Math.floor(Math.random() * 3)
              ],
            }));

            return await request(app.getHttpServer())
              .post(`/questionnaire/${performanceQuestionnaireId}/submit`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                responses,
                startTime: new Date(Date.now() - 300000).toISOString(),
                completionTime: 300,
              });
          }),
        );
      }

      const results = await Promise.all(submissionRequests);

      results.forEach((result, index) => {
        expect(result.responseTime).toBeLessThan(5000); // < 5 seconds
        console.log(`Submission ${index + 1}: ${result.responseTime}ms`);
      });
    });

    it('should handle questionnaire list requests under load', async () => {
      const listRequests = [];
      const requestCount = 30;

      for (let i = 0; i < requestCount; i++) {
        listRequests.push(
          measurePerformance('questionnaire', async () => {
            return await request(app.getHttpServer())
              .get('/questionnaire?page=1&limit=20')
              .set('Authorization', `Bearer ${userToken}`);
          }),
        );
      }

      const results = await Promise.all(listRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(2000); // < 2 seconds
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(
        `📊 Average questionnaire list time: ${avgResponseTime.toFixed(2)}ms`,
      );
    });
  });

  describe('📈 Analytics Performance', () => {
    it('should handle analytics event tracking efficiently', async () => {
      const eventRequests = [];
      const eventCount = 100; // High volume event tracking

      for (let i = 0; i < eventCount; i++) {
        eventRequests.push(
          measurePerformance('analytics', async () => {
            return await request(app.getHttpServer())
              .post('/analytics/events')
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                eventType: 'performance_test',
                category: 'load_testing',
                action: 'bulk_event_tracking',
                label: `event_${i}`,
                value: 1,
                metadata: {
                  testId: `perf_${i}`,
                  timestamp: new Date().toISOString(),
                  batchNumber: Math.floor(i / 10),
                },
              });
          }),
        );
      }

      const results = await Promise.all(eventRequests);

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(
        `📊 Average event tracking time: ${avgResponseTime.toFixed(2)}ms`,
      );

      expect(avgResponseTime).toBeLessThan(500); // Average < 500ms for event tracking

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(2000); // Each < 2 seconds
      });
    });

    it('should handle dashboard requests under concurrent load', async () => {
      const dashboardRequests = [];
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        dashboardRequests.push(
          measurePerformance('analytics', async () => {
            return await request(app.getHttpServer())
              .get('/analytics/dashboard?timeRange=7d')
              .set('Authorization', `Bearer ${adminToken}`);
          }),
        );
      }

      const results = await Promise.all(dashboardRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(5000); // < 5 seconds
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(3000); // Average < 3 seconds
    });

    it('should handle report generation requests', async () => {
      const reportRequests = [];
      const reportCount = 5; // Limited due to resource intensity

      for (let i = 0; i < reportCount; i++) {
        reportRequests.push(
          measurePerformance('analytics', async () => {
            return await request(app.getHttpServer())
              .post('/analytics/reports/generate')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                reportType: 'user_activity',
                format: 'json',
                dateRange: {
                  startDate: new Date(
                    Date.now() - 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  endDate: new Date().toISOString(),
                },
              });
          }),
        );
      }

      const results = await Promise.all(reportRequests);

      results.forEach((result, index) => {
        expect(result.responseTime).toBeLessThan(10000); // < 10 seconds
        console.log(`Report ${index + 1}: ${result.responseTime}ms`);
      });
    });
  });

  describe('🔧 System Performance', () => {
    it('should handle health check requests efficiently', async () => {
      const healthRequests = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        healthRequests.push(
          measurePerformance('system', async () => {
            return await request(app.getHttpServer()).get('/system/health');
          }),
        );
      }

      const results = await Promise.all(healthRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(1000); // < 1 second
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(
        `📊 Average health check time: ${avgResponseTime.toFixed(2)}ms`,
      );

      expect(avgResponseTime).toBeLessThan(500); // Average < 500ms
    });

    it('should handle system metrics requests', async () => {
      const metricsRequests = [];
      const requestCount = 15;

      for (let i = 0; i < requestCount; i++) {
        metricsRequests.push(
          measurePerformance('system', async () => {
            return await request(app.getHttpServer())
              .get('/system/metrics?timeRange=1h')
              .set('Authorization', `Bearer ${adminToken}`);
          }),
        );
      }

      const results = await Promise.all(metricsRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(3000); // < 3 seconds
      });
    });

    it('should handle cross-service validation efficiently', async () => {
      const validationRequests = [];
      const requestCount = 10;

      for (let i = 0; i < requestCount; i++) {
        validationRequests.push(
          measurePerformance('system', async () => {
            return await request(app.getHttpServer())
              .post('/system/validate')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                data: {
                  userId: testUserId,
                  organizationId: testOrganizationId,
                  requestId: `perf_${i}`,
                },
                rules: [
                  {
                    field: 'userId',
                    service: 'user-service',
                    endpoint: 'validate-user',
                    required: true,
                  },
                ],
                options: { timeout: 5000 },
              });
          }),
        );
      }

      const results = await Promise.all(validationRequests);

      results.forEach((result) => {
        expect(result.responseTime).toBeLessThan(8000); // < 8 seconds
      });

      const avgResponseTime =
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(5000); // Average < 5 seconds
    });
  });

  describe('🔥 Stress Testing and Breaking Points', () => {
    it('should identify rate limiting thresholds', async () => {
      const rapidRequests = [];
      const burstCount = 25; // Burst of requests

      console.log(`🔥 Testing rate limiting with ${burstCount} rapid requests`);

      for (let i = 0; i < burstCount; i++) {
        rapidRequests.push(
          measurePerformance('system', async () => {
            return await request(app.getHttpServer())
              .get('/system/status')
              .set('Authorization', `Bearer ${userToken}`);
          }),
        );
      }

      const results = await Promise.all(rapidRequests);

      const successRequests = results.filter(
        (r) => r.result && r.result.status === 200,
      );
      const rateLimitedRequests = results.filter(
        (r) => r.result && r.result.status === 429,
      );

      console.log(`✅ Successful: ${successRequests.length}`);
      console.log(`⚠️ Rate limited: ${rateLimitedRequests.length}`);
      console.log(
        `❌ Errors: ${results.length - successRequests.length - rateLimitedRequests.length}`,
      );

      // Should have some rate limiting
      expect(rateLimitedRequests.length).toBeGreaterThan(0);

      // But some requests should succeed
      expect(successRequests.length).toBeGreaterThan(0);
    });

    it('should handle memory pressure scenarios', async () => {
      const memoryIntensiveRequests = [];
      const requestCount = 8;

      console.log('🔥 Testing memory-intensive operations');

      for (let i = 0; i < requestCount; i++) {
        memoryIntensiveRequests.push(
          measurePerformance('system', async () => {
            return await request(app.getHttpServer())
              .post('/analytics/export?format=json')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                dataTypes: ['events', 'metrics'],
                dateRange: {
                  startDate: new Date(
                    Date.now() - 30 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  endDate: new Date().toISOString(),
                },
                includeMetadata: true,
              });
          }),
        );
      }

      const results = await Promise.all(memoryIntensiveRequests);

      results.forEach((result, index) => {
        console.log(
          `Export ${index + 1}: ${result.responseTime}ms, Memory: ${(result.memoryDelta / 1024).toFixed(2)}KB`,
        );

        // Should complete within reasonable time even under memory pressure
        expect(result.responseTime).toBeLessThan(30000); // < 30 seconds
      });
    });
  });

  describe('📊 Performance Regression Detection', () => {
    it('should validate performance benchmarks', async () => {
      const benchmarks = {
        login: 1000, // < 1 second
        profile: 800, // < 0.8 seconds
        resumeUpload: 8000, // < 8 seconds
        search: 2000, // < 2 seconds
        analytics: 3000, // < 3 seconds
        healthCheck: 500, // < 0.5 seconds
      };

      console.log('📊 Running performance benchmark validation');

      // Test each benchmark
      const benchmarkResults = {};

      // Login benchmark
      const { responseTime: loginTime } = await measurePerformance(
        'auth',
        async () => {
          return await request(app.getHttpServer()).post('/auth/login').send({
            email: 'performance.user@test.com',
            password: 'Performance123!',
          });
        },
      );

      benchmarkResults['login'] = loginTime;
      expect(loginTime).toBeLessThan(benchmarks.login);

      // Profile benchmark
      const { responseTime: profileTime } = await measurePerformance(
        'userManagement',
        async () => {
          return await request(app.getHttpServer())
            .get('/users/profile')
            .set('Authorization', `Bearer ${userToken}`);
        },
      );

      benchmarkResults['profile'] = profileTime;
      expect(profileTime).toBeLessThan(benchmarks.profile);

      // Health check benchmark
      const { responseTime: healthTime } = await measurePerformance(
        'system',
        async () => {
          return await request(app.getHttpServer()).get('/system/health');
        },
      );

      benchmarkResults['healthCheck'] = healthTime;
      expect(healthTime).toBeLessThan(benchmarks.healthCheck);

      console.log('📊 Benchmark Results:');
      Object.entries(benchmarkResults).forEach(([test, time]) => {
        const threshold = benchmarks[test as keyof typeof benchmarks];
        const timeValue = time as number;
        const status = timeValue < threshold ? '✅ PASS' : '❌ FAIL';
        console.log(
          `   ${test}: ${timeValue}ms (threshold: ${threshold}ms) ${status}`,
        );
      });
    });
  });

  describe('📋 Performance Test Summary', () => {
    it('should generate comprehensive performance report', async () => {
      console.log('\\n🚀 PERFORMANCE TESTING COMPLETED');
      console.log('====================================');

      const allResponseTimes = Object.values(performanceMetrics.responseTime)
        .flat()
        .filter((time) => time > 0);

      if (allResponseTimes.length > 0) {
        const overallAvg =
          allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
        const overallMax = Math.max(...allResponseTimes);
        const overallMin = Math.min(...allResponseTimes);

        console.log(`📊 OVERALL PERFORMANCE:`);
        console.log(`   Total requests: ${performanceMetrics.requestCount}`);
        console.log(`   Average response time: ${overallAvg.toFixed(2)}ms`);
        console.log(`   Min response time: ${overallMin}ms`);
        console.log(`   Max response time: ${overallMax}ms`);
        console.log(
          `   Error rate: ${((performanceMetrics.errorCount / performanceMetrics.requestCount) * 100).toFixed(2)}%`,
        );

        // Performance assertions
        expect(overallAvg).toBeLessThan(3000); // Overall average < 3 seconds
        expect(
          performanceMetrics.errorCount / performanceMetrics.requestCount,
        ).toBeLessThan(0.05); // < 5% error rate

        console.log('\\n✅ All performance tests completed successfully!');
      } else {
        console.log('⚠️ No performance data collected');
      }
    });
  });
});
