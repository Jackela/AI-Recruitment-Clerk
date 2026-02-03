import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { loadOpenApiSchema, compileSchema } from '../utils/schema-validator';

describe('Contracts conformance (e2e)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  const opsKey = process.env.OPS_API_KEY || '';

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        MongooseModule.forRoot(uri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (mongo) await mongo.stop();
  });

  it('feature flags list matches schema', async () => {
    const openapi = loadOpenApiSchema('specs/002-cicd-quality-migration/contracts/feature-flags.yaml');
    const validateList = compileSchema(openapi.components, 'FeatureFlagList');
    const res = await request(app.getHttpServer())
      .get('/ops/flags')
      .set('x-ops-key', opsKey)
      .expect(200);
    expect(validateList(res.body)).toBe(true);
  });

  it('feature flag upsert returns flag object', async () => {
    const openapi = loadOpenApiSchema('specs/002-cicd-quality-migration/contracts/feature-flags.yaml');
    const validateFlag = compileSchema(openapi.components, 'FeatureFlag');
    const res = await request(app.getHttpServer())
      .post('/ops/flags')
      .set('x-ops-key', opsKey)
      .send({ key: 'ff_contract', enabled: true, rolloutPercentage: 1 })
      .expect((r) => expect([200, 201].includes(r.status)).toBe(true));
    expect(validateFlag(res.body)).toBe(true);
  });

  it('release deploy conforms to contract (202 + fields)', async () => {
    const openapi = loadOpenApiSchema('specs/002-cicd-quality-migration/contracts/release.yaml');
    const validateDep = compileSchema(openapi.components, 'DeployResponse');
    const res = await request(app.getHttpServer())
      .post('/ops/release/deploy')
      .set('x-ops-key', opsKey)
      .send({ channel: 'pre-release', artifactId: 'artifact_1' })
      .expect(202);
    expect(validateDep(res.body)).toBe(true);
  });

  it('gray rollout set returns percentage (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/ops/release/gray')
      .set('x-ops-key', opsKey)
      .send({ percentage: 5 })
      .expect(200);
    expect(res.body).toHaveProperty('percentage');
  });

  it('observability funnels returns expected fields', async () => {
    const openapi = loadOpenApiSchema('specs/002-cicd-quality-migration/contracts/observability.yaml');
    const validateFunnel = compileSchema(openapi.components, 'FunnelMetrics');
    const res = await request(app.getHttpServer())
      .get('/ops/observability/funnels?window=24h')
      .set('x-ops-key', opsKey)
      .expect(200);
    expect(validateFunnel(res.body)).toBe(true);
  });

  it('impact endpoint returns summary fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/ops/impact')
      .set('x-ops-key', opsKey)
      .expect(200);
    for (const k of ['exposure', 'success', 'error', 'cancel', 'successRate']) {
      expect(res.body).toHaveProperty(k);
    }
  });
});
