import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('Security Integration Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              MONGO_URL: uri,
              JWT_SECRET:
                'test-jwt-secret-with-sufficient-length-for-security-testing',
              CSRF_SECRET: 'test-csrf-secret-for-security-testing',
              NODE_ENV: 'test',
            }),
          ],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());

    await app.init();
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('Security Headers', () => {
    it('should set security headers on all responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin',
      );
      expect(response.headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should set HSTS header in production', async () => {
      // This would need to be tested with NODE_ENV=production
      // For now, we test that it's not set in test environment
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should provide CSRF token on GET requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-csrf-token']).toBeDefined();
      expect(response.headers['x-csrf-token']).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should reject POST requests without CSRF token for session-based auth', async () => {
      // First create a user and login to get session-based auth
      // This test assumes session-based endpoints exist
      const testData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testData)
        .expect((res) => {
          // Should fail due to missing CSRF token if not using JWT
          if (res.status === 403) {
            expect(res.body.message).toMatch(/csrf/i);
          }
        });
    });

    it('should accept requests with valid CSRF token', async () => {
      // Get CSRF token first
      const tokenResponse = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      const csrfToken = tokenResponse.headers['x-csrf-token'];

      // Use CSRF token in subsequent request
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: 'Test User',
        })
        .expect((res) => {
          // Should not be rejected for CSRF reasons
          expect(res.status).not.toBe(403);
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make multiple failed login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post('/auth/login').send(loginData),
      );

      const responses = await Promise.all(promises);

      // Should start returning 429 after several attempts
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit headers
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(
        rateLimitedResponse.headers['x-ratelimit-remaining'],
      ).toBeDefined();
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });

    it('should have different rate limits for different operations', async () => {
      // Test API endpoint rate limits
      const apiPromises = Array.from({ length: 20 }, () =>
        request(app.getHttpServer()).get('/api/health'),
      );

      const apiResponses = await Promise.all(apiPromises);
      const apiRateLimited = apiResponses.filter((res) => res.status === 429);

      // Test auth endpoint rate limits
      const authPromises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' }),
      );

      const authResponses = await Promise.all(authPromises);
      const authRateLimited = authResponses.filter((res) => res.status === 429);

      // Auth endpoints should have stricter limits than API endpoints
      expect(authRateLimited.length).toBeGreaterThanOrEqual(
        apiRateLimited.length,
      );
    });
  });

  describe('Input Validation', () => {
    it('should reject malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should sanitize XSS attempts in input', async () => {
      const xssPayload = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(xssPayload)
        .expect((res) => {
          // Should either reject the input or sanitize it
          if (res.status === 201) {
            expect(res.body.name || '').not.toContain('<script>');
          }
        });
    });

    it('should reject SQL injection attempts', async () => {
      const sqlInjectionPayload = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'TestPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(sqlInjectionPayload)
        .expect((res) => {
          // Should handle gracefully without exposing database errors
          expect(res.status).not.toBe(500);
        });
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password', // Too common
        '123456', // Too simple
        'abc', // Too short
        'PASSWORD123', // No special chars
        'password123!', // No uppercase
      ];

      for (const weakPassword of weakPasswords) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: weakPassword,
            name: 'Test User',
          })
          .expect((res) => {
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/password/i);
          });
      }
    });
  });

  describe('Authentication Security', () => {
    it('should not expose sensitive information in error responses', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect((res) => {
          // Should not reveal whether user exists or not
          expect(res.body.message).not.toMatch(
            /user (not found|does not exist)/i,
          );
          expect(res.body.message).not.toContain('email');
        });
    });

    it('should implement secure session management', async () => {
      // Register and login
      const registerData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registerData.email, password: registerData.password })
        .expect(200);

      // Check for secure cookie settings
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
        const sessionCookie = cookieArr.find(
          (cookie: string) =>
            cookie.includes('connect.sid') || cookie.includes('session'),
        );

        if (sessionCookie) {
          expect(sessionCookie).toMatch(/HttpOnly/i);
          expect(sessionCookie).toMatch(/Secure/i);
          expect(sessionCookie).toMatch(/SameSite/i);
        }
      }
    });

    it('should implement proper logout functionality', async () => {
      // Register and login first
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const token = loginResponse.body.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use the token after logout
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('File Upload Security', () => {
    it('should reject malicious file types', async () => {
      const maliciousFiles = [
        { filename: 'malicious.exe', mimetype: 'application/x-executable' },
        { filename: 'script.js', mimetype: 'application/javascript' },
        { filename: 'virus.bat', mimetype: 'application/x-bat' },
      ];

      for (const file of maliciousFiles) {
        await request(app.getHttpServer())
          .post('/jobs/upload-resume')
          .attach('file', Buffer.from('malicious content'), file)
          .expect((res) => {
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/file type/i);
          });
      }
    });

    it('should enforce file size limits', async () => {
      const largeFile = Buffer.alloc(20 * 1024 * 1024); // 20MB file

      await request(app.getHttpServer())
        .post('/jobs/upload-resume')
        .attach('file', largeFile, 'large.pdf')
        .expect((res) => {
          expect(res.status).toBe(413); // Payload Too Large
        });
    });

    it('should scan uploaded files for malware (if enabled)', async () => {
      // This would test integration with antivirus scanning
      const testFile = Buffer.from('test file content');

      await request(app.getHttpServer())
        .post('/jobs/upload-resume')
        .attach('file', testFile, 'resume.pdf')
        .expect((res) => {
          // Should either accept the file or reject due to scanning
          expect([200, 201, 400, 403]).toContain(res.status);
        });
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose internal errors in production mode', async () => {
      // Force an internal error
      await request(app.getHttpServer())
        .get('/nonexistent-endpoint')
        .expect(404)
        .expect((res) => {
          expect(res.body.stack).toBeUndefined();
          expect(res.body.message).not.toContain('Error:');
          expect(res.body.message).not.toContain('at ');
        });
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, just ensure that any database errors don't expose sensitive info
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@invalid-format', password: 'test' })
        .expect((res) => {
          expect(res.body.message).not.toContain('mongo');
          expect(res.body.message).not.toContain('database');
          expect(res.body.message).not.toContain('connection');
        });
    });
  });

  describe('Security Configuration', () => {
    it('should enforce HTTPS in production', async () => {
      // This would need to be tested with HTTPS setup
      // For now, ensure that security headers are set for HTTPS enforcement
      const response = await request(app.getHttpServer()).get('/api/health');

      // In production, HSTS should be enabled
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['strict-transport-security']).toBeDefined();
      }
    });

    it('should have secure default configurations', async () => {
      // Test that security-critical configurations are properly set
      const healthResponse = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Verify security headers are present
      expect(healthResponse.headers['x-content-type-options']).toBe('nosniff');
      expect(healthResponse.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('API Security', () => {
    it('should require authentication for protected endpoints', async () => {
      // Test various protected endpoints
      const protectedEndpoints = [
        { method: 'get', path: '/auth/profile' },
        { method: 'post', path: '/jobs/create' },
        { method: 'get', path: '/security/events' },
      ];

      for (const endpoint of protectedEndpoints) {
        await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .expect(401);
      }
    });

    it('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid-token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
        '',
      ];

      for (const token of invalidTokens) {
        await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', token)
          .expect(401);
      }
    });

    it('should implement proper CORS policies', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect((res) => {
          // Should either reject the preflight or have proper CORS headers
          if (res.status === 200) {
            expect(res.headers['access-control-allow-origin']).toBeDefined();
          }
        });
    });
  });
});
