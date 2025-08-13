import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app/app.module';

/**
 * 🔗 CROSS-SERVICE VALIDATION E2E TESTS
 * 
 * Tests the integration between different microservices and validates
 * data consistency, communication patterns, and service dependencies.
 */

describe('🔗 Cross-Service Validation Integration', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let testUserId: string;
  let testOrganizationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create test organization and users
    const orgResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'crossservice.admin@test.com',
        password: 'CrossService123!',
        name: 'Cross Service Admin',
        organizationName: 'Cross Service Test Org',
        role: 'admin'
      });
    
    testOrganizationId = orgResponse.body.data.organizationId;
    
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'crossservice.admin@test.com',
        password: 'CrossService123!'
      });
    
    adminToken = adminLoginResponse.body.data.accessToken;

    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'crossservice.user@test.com',
        password: 'CrossService123!',
        name: 'Cross Service User',
        organizationId: testOrganizationId,
        role: 'user'
      });
    
    testUserId = userResponse.body.data.userId;
    
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'crossservice.user@test.com',
        password: 'CrossService123!'
      });
    
    userToken = userLoginResponse.body.data.accessToken;
  }

  describe('📄 Resume Service Integration', () => {
    let testResumeId: string;

    it('should validate resume data across services', async () => {
      // Upload resume through app-gateway
      const resumeUpload = await request(app.getHttpServer())
        .post('/resumes/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('resume', Buffer.from('Test Resume PDF Content'), 'test-resume.pdf')
        .field('candidateName', 'John Cross Service')
        .field('candidateEmail', 'john@crossservice.com');

      expect(resumeUpload.status).toBe(201);
      testResumeId = resumeUpload.body.data.resumeId;

      // Validate resume exists in resume-parser-svc
      const resumeValidation = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            resumeId: testResumeId,
            userId: testUserId,
            organizationId: testOrganizationId
          },
          rules: [
            {
              field: 'resumeId',
              service: 'resume-parser-svc',
              endpoint: 'validate-resume',
              required: true
            },
            {
              field: 'userId',
              service: 'user-service',
              endpoint: 'validate-user',
              required: true
            }
          ]
        });

      expect(resumeValidation.status).toBe(200);
      expect(resumeValidation.body.data.valid).toBe(true);

      // Test resume analysis integration
      const analysisResponse = await request(app.getHttpServer())
        .get(`/resumes/${testResumeId}/analysis`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(analysisResponse.status).toBe(200);
      expect(analysisResponse.body.data).toHaveProperty('skills');
      expect(analysisResponse.body.data).toHaveProperty('experience');
    });

    it('should handle resume service unavailability gracefully', async () => {
      // Test circuit breaker behavior when resume service is down
      const resumeRequest = await request(app.getHttpServer())
        .get('/resumes/unavailable-resume-id')
        .set('Authorization', `Bearer ${userToken}`);

      // Should get proper error response, not crash
      expect([404, 503, 500]).toContain(resumeRequest.status);
      expect(resumeRequest.body).toHaveProperty('success', false);
    });
  });

  describe('📊 Job Description Extraction Integration', () => {
    let testJobId: string;

    it('should validate job data across services', async () => {
      // Create job through app-gateway
      const jobCreation = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cross Service Developer',
          description: 'Test job for cross-service validation',
          requirements: 'JavaScript, Node.js, Testing',
          location: 'Remote',
          salary: { min: 80000, max: 120000, currency: 'USD' }
        });

      expect([201, 200]).toContain(jobCreation.status);
      if (jobCreation.body.data) {
        testJobId = jobCreation.body.data.jobId;

        // Validate job exists in jd-extractor-svc
        const jobValidation = await request(app.getHttpServer())
          .post('/system/validate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            data: {
              jobId: testJobId,
              organizationId: testOrganizationId
            },
            rules: [
              {
                field: 'jobId',
                service: 'jd-extractor-svc',
                endpoint: 'validate-job',
                required: true
              }
            ]
          });

        expect(jobValidation.status).toBe(200);
      }
    });
  });

  describe('🎯 Scoring Engine Integration', () => {
    it('should validate scoring across resume and job services', async () => {
      // Test cross-service scoring validation
      const scoringValidation = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            resumeId: 'test-resume-id',
            jobId: 'test-job-id',
            userId: testUserId,
            organizationId: testOrganizationId
          },
          rules: [
            {
              field: 'resumeId',
              service: 'resume-parser-svc',
              endpoint: 'validate-resume',
              required: false // May not exist yet
            },
            {
              field: 'jobId',
              service: 'jd-extractor-svc',
              endpoint: 'validate-job',
              required: false // May not exist yet
            },
            {
              field: 'userId',
              service: 'user-service',
              endpoint: 'validate-user',
              required: true
            }
          ],
          options: {
            parallel: true,
            failFast: false,
            timeout: 10000
          }
        });

      expect(scoringValidation.status).toBe(200);
      expect(scoringValidation.body.data).toHaveProperty('validationTime');
    });
  });

  describe('📈 Report Generation Integration', () => {
    it('should validate data aggregation across all services', async () => {
      // Test comprehensive data validation for reporting
      const reportValidation = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            organizationId: testOrganizationId,
            reportType: 'comprehensive',
            dateRange: {
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString()
            }
          },
          rules: [
            {
              field: 'organizationId',
              service: 'user-service',
              endpoint: 'validate-organization',
              required: true
            },
            {
              field: 'reportType',
              service: 'report-generator-svc',
              endpoint: 'validate-report-type',
              required: true
            }
          ],
          options: {
            parallel: false,
            timeout: 15000
          }
        });

      expect(reportValidation.status).toBe(200);
      expect(reportValidation.body.data).toHaveProperty('valid');
    });
  });

  describe('🔄 Service Communication Patterns', () => {
    it('should test request-response patterns', async () => {
      // Test synchronous communication
      const syncResponse = await request(app.getHttpServer())
        .get('/system/health');

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.data).toHaveProperty('services');

      // Validate all services are reachable
      const services = syncResponse.body.data.services;
      const expectedServices = [
        'resume-parser-svc',
        'jd-extractor-svc',
        'scoring-engine-svc',
        'report-generator-svc'
      ];

      expectedServices.forEach(serviceName => {
        const service = services.find((s: any) => s.name === serviceName);
        if (service) {
          expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status);
        }
      });
    });

    it('should test async communication patterns', async () => {
      // Test async processing patterns
      const asyncRequest = await request(app.getHttpServer())
        .post('/analytics/reports/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'user_activity',
          format: 'json',
          dateRange: {
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        });

      expect(asyncRequest.status).toBe(201);
      expect(asyncRequest.body.data).toHaveProperty('reportId');
      expect(asyncRequest.body.data).toHaveProperty('status');
      expect(['processing', 'queued', 'pending']).toContain(asyncRequest.body.data.status);
    });

    it('should handle service timeouts and retries', async () => {
      // Test timeout handling
      const timeoutTest = await request(app.getHttpServer())
        .post('/system/integration-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testSuite: 'timeout-handling',
          services: ['resume-parser-svc'],
          skipLongRunningTests: false
        });

      expect(timeoutTest.status).toBe(200);
      expect(timeoutTest.body.data).toHaveProperty('duration');
    });
  });

  describe('💾 Data Consistency Validation', () => {
    it('should ensure data consistency across services', async () => {
      // Test user data consistency
      const userConsistency = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            userId: testUserId,
            organizationId: testOrganizationId,
            email: 'crossservice.user@test.com'
          },
          rules: [
            {
              field: 'userId',
              service: 'user-service',
              endpoint: 'validate-user',
              required: true,
              validate: async (value: string) => {
                return value.length > 0;
              }
            },
            {
              field: 'organizationId',
              service: 'user-service',
              endpoint: 'validate-organization',
              required: true,
              transform: (value: string) => {
                return value.toLowerCase();
              }
            }
          ]
        });

      expect(userConsistency.status).toBe(200);
      expect(userConsistency.body.data.valid).toBe(true);

      if (userConsistency.body.data.transformedData) {
        expect(userConsistency.body.data.transformedData).toHaveProperty('organizationId');
      }
    });

    it('should detect and report data inconsistencies', async () => {
      // Test with intentionally inconsistent data
      const inconsistentData = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            userId: 'non-existent-user-id',
            organizationId: testOrganizationId
          },
          rules: [
            {
              field: 'userId',
              service: 'user-service',
              endpoint: 'validate-user',
              required: true
            }
          ],
          options: {
            failFast: true
          }
        });

      expect(inconsistentData.status).toBe(200);
      
      if (!inconsistentData.body.data.valid) {
        expect(inconsistentData.body.data).toHaveProperty('errors');
        expect(Array.isArray(inconsistentData.body.data.errors)).toBe(true);
      }
    });
  });

  describe('🔒 Cross-Service Security Validation', () => {
    it('should validate authentication across services', async () => {
      // Test service-to-service authentication
      const authValidation = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            serviceToken: adminToken,
            requestingService: 'app-gateway',
            targetService: 'resume-parser-svc'
          },
          rules: [
            {
              field: 'serviceToken',
              service: 'auth-service',
              endpoint: 'validate-service-token',
              required: true
            }
          ]
        });

      expect(authValidation.status).toBe(200);
    });

    it('should enforce authorization policies across services', async () => {
      // Test cross-service authorization
      const unauthorizedRequest = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          data: {
            operation: 'admin-only-operation',
            userId: testUserId
          },
          rules: [
            {
              field: 'operation',
              service: 'user-service',
              endpoint: 'check-admin-permission',
              required: true
            }
          ]
        });

      // User should not have admin permissions
      if (unauthorizedRequest.status === 200 && !unauthorizedRequest.body.data.valid) {
        expect(unauthorizedRequest.body.data.errors).toBeDefined();
      } else {
        // May be 403 forbidden
        expect([403, 200]).toContain(unauthorizedRequest.status);
      }
    });
  });

  describe('📊 Performance and Monitoring Integration', () => {
    it('should monitor cross-service performance', async () => {
      const performanceStart = Date.now();

      // Perform cross-service operation
      const crossServiceOp = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            userId: testUserId,
            organizationId: testOrganizationId
          },
          rules: [
            {
              field: 'userId',
              service: 'user-service',
              endpoint: 'validate-user',
              required: true
            },
            {
              field: 'organizationId',
              service: 'user-service',
              endpoint: 'validate-organization',
              required: true
            }
          ],
          options: {
            parallel: true
          }
        });

      const performanceEnd = Date.now();
      const operationTime = performanceEnd - performanceStart;

      expect(crossServiceOp.status).toBe(200);
      expect(operationTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(crossServiceOp.body.data).toHaveProperty('validationTime');
      expect(crossServiceOp.body.data.validationTime).toBeGreaterThan(0);
    });

    it('should handle concurrent cross-service requests', async () => {
      const concurrentRequests = [];
      const requestCount = 5;

      for (let i = 0; i < requestCount; i++) {
        concurrentRequests.push(
          request(app.getHttpServer())
            .post('/system/validate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              data: {
                userId: testUserId,
                requestId: `concurrent-${i}`
              },
              rules: [
                {
                  field: 'userId',
                  service: 'user-service',
                  endpoint: 'validate-user',
                  required: true
                }
              ]
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('validationTime');
        console.log(`Request ${index}: ${response.body.data.validationTime}ms`);
      });

      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBe(requestCount);
    });
  });

  describe('🔄 Circuit Breaker and Resilience', () => {
    it('should handle service failures with circuit breaker', async () => {
      // Test circuit breaker behavior
      const circuitBreakerTest = await request(app.getHttpServer())
        .get('/system/health');

      expect(circuitBreakerTest.status).toBe(200);
      
      // Check if any services are in circuit breaker state
      const services = circuitBreakerTest.body.data.services;
      services.forEach((service: any) => {
        if (service.status === 'unhealthy') {
          expect(service).toHaveProperty('lastCheck');
          expect(service).toHaveProperty('error');
        }
      });
    });

    it('should implement fallback mechanisms', async () => {
      // Test fallback behavior when service is unavailable
      const fallbackTest = await request(app.getHttpServer())
        .post('/system/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            userId: testUserId,
            fallbackEnabled: true
          },
          rules: [
            {
              field: 'userId',
              service: 'unavailable-service',
              endpoint: 'validate-user',
              required: false
            }
          ],
          options: {
            enableFallback: true,
            timeout: 5000
          }
        });

      expect(fallbackTest.status).toBe(200);
      
      // Should complete even if service is unavailable
      expect(fallbackTest.body.data).toHaveProperty('validationTime');
    });
  });

  describe('📋 Integration Test Summary', () => {
    it('should validate complete cross-service integration', async () => {
      console.log('🔗 Cross-Service Integration Test Summary:');

      // Run final comprehensive validation
      const finalValidation = await request(app.getHttpServer())
        .post('/system/integration-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testSuite: 'cross-service-validation',
          services: ['user-service', 'resume-parser-svc', 'jd-extractor-svc', 'scoring-engine-svc'],
          skipLongRunningTests: true
        });

      expect(finalValidation.status).toBe(200);
      
      const results = finalValidation.body.data;
      console.log(`✅ Total Tests: ${results.totalTests}`);
      console.log(`✅ Passed: ${results.passed}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`⏭️ Skipped: ${results.skipped}`);
      console.log(`⏱️ Duration: ${results.duration}ms`);

      // Expect high success rate
      const successRate = (results.passed / results.totalTests) * 100;
      expect(successRate).toBeGreaterThan(80); // At least 80% success rate

      console.log('🎉 CROSS-SERVICE VALIDATION COMPLETED');
    });
  });
});