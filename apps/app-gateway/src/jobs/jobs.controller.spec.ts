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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /jobs returns 202 with jobId', async () => {
    const res = await request(app.getHttpServer())
      .post('/jobs')
      .send({ jobTitle: 'Dev', jdText: 'desc' })
      .expect(202);

    expect(res.body.jobId).toBeDefined();
  });
});
