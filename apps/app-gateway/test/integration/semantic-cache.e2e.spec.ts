import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../../src/jobs/jobs.module';
import { JobsService } from '../../src/jobs/jobs.service';
import { JobRepository } from '../../src/repositories/job.repository';
import { EmbeddingService } from '../../src/embedding/embedding.service';
import { VectorStoreService } from '../../src/cache/vector-store.service';
import { AppGatewayNatsService } from '../../src/nats/app-gateway-nats.service';
import { WebSocketGateway } from '../../src/websocket/websocket.gateway';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import {
  UserDto,
  UserRole,
} from '@ai-recruitment-clerk/user-management-domain';
import { getTestingEnvironment } from '@ai-recruitment-clerk/configuration';

const semanticCacheEnv = getTestingEnvironment({
  redisCacheEnabled: false,
  redisCacheDisabled: true,
  semanticCacheEnabled: true,
  semanticCacheSimilarityThreshold: 0.9,
  semanticCacheTtlMs: 86_400_000,
  semanticCacheMaxResults: 5,
});

const configureSemanticCacheEnvironment = () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_REDIS_CACHE = semanticCacheEnv.redisCacheEnabled
    ? 'true'
    : 'false';
  process.env.DISABLE_REDIS = semanticCacheEnv.redisCacheDisabled
    ? 'true'
    : 'false';
  process.env.SEMANTIC_CACHE_ENABLED = semanticCacheEnv.semanticCacheEnabled
    ? 'true'
    : 'false';
  process.env.SEMANTIC_CACHE_SIMILARITY_THRESHOLD =
    semanticCacheEnv.semanticCacheSimilarityThreshold.toString();
  process.env.SEMANTIC_CACHE_TTL_MS =
    semanticCacheEnv.semanticCacheTtlMs.toString();
  process.env.SEMANTIC_CACHE_MAX_RESULTS =
    semanticCacheEnv.semanticCacheMaxResults.toString();
};

class InMemoryVectorStoreService {
  private readonly entries = new Map<string, number[]>();

  async createIndex(): Promise<void> {
    return;
  }

  async addVector(key: string, vector: number[]): Promise<void> {
    this.entries.set(key, vector);
  }

  async findSimilar(
    vector: number[],
    threshold: number,
    count: number,
  ): Promise<Array<{ cacheKey: string; similarity: number }>> {
    const results: Array<{ cacheKey: string; similarity: number }> = [];
    for (const [key, stored] of this.entries.entries()) {
      const similarity = this.cosineSimilarity(vector, stored);
      if (similarity >= threshold) {
        results.push({ cacheKey: key, similarity });
      }
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, count);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length) {
      return 0;
    }
    const length = Math.max(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < length; i++) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

describe('Semantic cache job creation (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let jobsService: JobsService;
  let jobRepository: JobRepository;
  let vectorStore: InMemoryVectorStoreService;
  let natsService: jest.Mocked<AppGatewayNatsService>;

  const mockUser: UserDto = {
    id: 'user-semantic',
    username: 'semantic.user',
    email: 'semantic.user@example.com',
    role: UserRole.HR_MANAGER,
    organizationId: 'org-semantic',
    isActive: true,
    createdAt: new Date(),
  };

  const jdA =
    'A senior software engineer with 5 years of experience in Node.js, TypeScript, and scalable APIs.';
  const jdB =
    'An experienced Node.js developer with half a decade of professional backend work using TypeScript.';
  const embeddingMap = new Map<string, number[]>([
    [jdA, [0.9, 0.5, 0.8]],
    [jdB, [0.91, 0.52, 0.79]],
  ]);
  const cachedKeywords = ['Node.js', 'TypeScript', 'Scalable APIs'];

  beforeAll(async () => {
    configureSemanticCacheEnvironment();

    mongoServer = await MongoMemoryServer.create();
    vectorStore = new InMemoryVectorStoreService();

    const mockEmbeddingService = {
      createEmbedding: jest.fn(async (text: string) => {
        if (embeddingMap.has(text)) {
          return embeddingMap.get(text) as number[];
        }
        const normalized = text.length || 1;
        return [normalized / 1000, 0, 0];
      }),
    };

    natsService = {
      publishJobJdSubmitted: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'semantic-1',
      }),
      publishResumeSubmitted: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'semantic-resume',
      }),
      subscribeToAnalysisCompleted: jest.fn().mockResolvedValue(undefined),
      subscribeToAnalysisFailed: jest.fn().mockResolvedValue(undefined),
      waitForAnalysisParsed: jest.fn(),
      waitForEvent: jest.fn(),
      publish: jest.fn(),
      getHealthStatus: jest.fn(),
      isConnected: true,
    } as unknown as jest.Mocked<AppGatewayNatsService>;

    const mockWebSocketGateway = {
      emitJobUpdated: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      },
    };

    const mockRolesGuard = {
      canActivate: () => true,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoServer.getUri()),
        JobsModule,
      ],
      providers: [{ provide: WebSocketGateway, useValue: mockWebSocketGateway }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .overrideProvider(AppGatewayNatsService)
      .useValue(natsService)
      .overrideProvider(EmbeddingService)
      .useValue(mockEmbeddingService)
      .overrideProvider(VectorStoreService)
      .useValue(vectorStore)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jobsService = moduleFixture.get(JobsService);
    jobRepository = moduleFixture.get(JobRepository);
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  it('reuses completed JD analysis for semantically similar postings', async () => {
    const createResponseA = await request(app.getHttpServer())
      .post('/jobs')
      .send({ jobTitle: 'Senior Backend Engineer', jdText: jdA })
      .expect(202);

    const jobIdA = createResponseA.body.jobId;
    expect(jobIdA).toBeDefined();
    expect(natsService.publishJobJdSubmitted).toHaveBeenCalledTimes(1);

    await jobRepository.updateJdAnalysis(jobIdA, cachedKeywords, 0.93);
    await jobRepository.updateStatus(jobIdA, 'completed');
    const storedJobA = await jobRepository.findById(jobIdA);
    await (jobsService as any).registerSemanticCacheEntry(
      storedJobA,
      cachedKeywords,
      0.93,
    );

    const createResponseB = await request(app.getHttpServer())
      .post('/jobs')
      .send({ jobTitle: 'Node.js Platform Developer', jdText: jdB })
      .expect(202);

    const jobIdB = createResponseB.body.jobId;
    expect(jobIdB).toBeDefined();

    expect(natsService.publishJobJdSubmitted).toHaveBeenCalledTimes(1);

    const reusedJob = await jobRepository.findById(jobIdB);
    expect(reusedJob?.status).toBe('completed');
    expect(reusedJob?.extractedKeywords).toEqual(cachedKeywords);

  });
});
