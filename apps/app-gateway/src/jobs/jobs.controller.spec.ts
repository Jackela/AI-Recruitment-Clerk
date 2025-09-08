import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JobsModule } from './jobs.module';

describe('JobsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JobsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/jobs returns 202 with jobId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ jobTitle: 'Dev', jdText: 'desc' })
      .expect(202);

    expect(res.body.jobId).toBeDefined();
  });

  describe('POST /api/jobs/:jobId/resumes', () => {
    let validJobId: string;

    beforeEach(async () => {
      // Create a job for resume upload tests
      const jobRes = await request(app.getHttpServer())
        .post('/api/jobs')
        .send({ jobTitle: 'Test Job', jdText: 'Test description' })
        .expect(202);
      validJobId = jobRes.body.jobId;
    });

    it('returns 202 with correct response when files uploaded', async () => {
      const pdfBuffer = Buffer.from('fake pdf content');

      const res = await request(app.getHttpServer())
        .post(`/api/jobs/${validJobId}/resumes`)
        .attach('resumes', pdfBuffer, {
          filename: 'resume1.pdf',
          contentType: 'application/pdf',
        })
        .attach('resumes', pdfBuffer, {
          filename: 'resume2.pdf',
          contentType: 'application/pdf',
        })
        .expect(202);

      expect(res.body).toEqual({
        jobId: validJobId,
        submittedResumes: 2,
      });
    });

    it('returns 400 when no files uploaded', async () => {
      await request(app.getHttpServer())
        .post(`/api/jobs/${validJobId}/resumes`)
        .expect(400);
    });

    it('returns 400 when jobId is invalid UUID', async () => {
      const pdfBuffer = Buffer.from('fake pdf content');

      await request(app.getHttpServer())
        .post('/api/jobs/invalid-uuid/resumes')
        .attach('resumes', pdfBuffer, {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('returns 400 when file is not PDF', async () => {
      const textBuffer = Buffer.from('text content');

      await request(app.getHttpServer())
        .post(`/api/jobs/${validJobId}/resumes`)
        .attach('resumes', textBuffer, {
          filename: 'resume.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('returns 400 when no files are provided in form field', async () => {
      await request(app.getHttpServer())
        .post(`/api/jobs/${validJobId}/resumes`)
        .field('resumes', '')
        .expect(400);
    });
  });
});
