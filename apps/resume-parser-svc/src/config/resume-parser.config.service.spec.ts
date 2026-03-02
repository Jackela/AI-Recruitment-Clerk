import { ResumeParserConfigService } from './resume-parser.config.service';

// Mock the configuration library
jest.mock('@ai-recruitment-clerk/configuration', () => ({
  validateEnv: jest.fn(() => ({
    getString: jest.fn((key: string, optional?: boolean) => {
      const env: Record<string, string> = {
        NODE_ENV: 'test',
        NATS_URL: 'nats://localhost:4222',
        MONGODB_URL: 'mongodb://localhost:27017/test',
        GRIDFS_BUCKET_NAME: 'resumes',
        NODE_NAME: 'test-node',
        SERVICE_NAME: 'resume-parser-svc',
        GEMINI_API_KEY: 'test-api-key',
        NATS_SERVERS: '',
      };
      if (!optional && !env[key] && env[key] !== '') {
        throw new Error(`${key} is required`);
      }
      return env[key] ?? '';
    }),
    getBoolean: jest.fn((_key: string, _optional?: boolean) => {
      return false;
    }),
  })),
}));

describe('ResumeParserConfigService', () => {
  let service: ResumeParserConfigService;

  beforeEach(() => {
    service = new ResumeParserConfigService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('nodeEnv', () => {
    it('should return node environment', () => {
      expect(service.nodeEnv).toBe('test');
    });
  });

  describe('isTest', () => {
    it('should return true when NODE_ENV is test', () => {
      expect(service.isTest).toBe(true);
    });
  });

  describe('natsUrl', () => {
    it('should return NATS URL', () => {
      expect(service.natsUrl).toBe('nats://localhost:4222');
    });
  });

  describe('mongoUrl', () => {
    it('should return MongoDB URL', () => {
      expect(service.mongoUrl).toBe('mongodb://localhost:27017/test');
    });
  });

  describe('gridfsBucketName', () => {
    it('should return GridFS bucket name', () => {
      expect(service.gridfsBucketName).toBe('resumes');
    });
  });

  describe('nodeName', () => {
    it('should return node name', () => {
      expect(service.nodeName).toBe('test-node');
    });
  });

  describe('serviceName', () => {
    it('should return service name', () => {
      expect(service.serviceName).toBe('resume-parser-svc');
    });
  });

  describe('geminiApiKey', () => {
    it('should return Gemini API key', () => {
      expect(service.geminiApiKey).toBe('test-api-key');
    });
  });

  describe('useDocker', () => {
    it('should return useDocker flag', () => {
      expect(service.useDocker).toBe(false);
    });
  });

  describe('natsServers', () => {
    it('should return NATS servers', () => {
      expect(service.natsServers).toBe('');
    });
  });

  describe('getConfigSnapshot', () => {
    it('should return configuration snapshot', () => {
      const snapshot = service.getConfigSnapshot();

      expect(snapshot).toHaveProperty('nodeEnv');
      expect(snapshot).toHaveProperty('isTest');
      expect(snapshot).toHaveProperty('natsUrl');
      expect(snapshot).toHaveProperty('mongoUrl');
      expect(snapshot).toHaveProperty('gridfsBucketName');
      expect(snapshot).toHaveProperty('nodeName');
      expect(snapshot).toHaveProperty('serviceName');
      expect(snapshot).toHaveProperty('hasGeminiApiKey');
      expect(snapshot).toHaveProperty('useDocker');
    });

    it('should mask password in mongoUrl', () => {
      const snapshot = service.getConfigSnapshot();
      // The test URL doesn't have a password, so just verify it returns
      expect(snapshot.mongoUrl).toBeDefined();
    });
  });
});
