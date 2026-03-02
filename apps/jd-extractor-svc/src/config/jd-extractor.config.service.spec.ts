import { JdExtractorConfigService } from './jd-extractor.config.service';

// Mock the configuration module
jest.mock('@ai-recruitment-clerk/configuration', () => ({
  validateEnv: jest.fn(),
}));

import { validateEnv } from '@ai-recruitment-clerk/configuration';

describe('JdExtractorConfigService', () => {
  let service: JdExtractorConfigService;
  let mockEnvAccess: jest.Mocked<{
    getString: jest.Mock;
    getNumber: jest.Mock;
    getBoolean: jest.Mock;
    getArray: jest.Mock;
    getUrl: jest.Mock;
  }>;

  beforeEach(() => {
    mockEnvAccess = {
      getString: jest.fn(),
      getNumber: jest.fn(),
      getBoolean: jest.fn(),
      getArray: jest.fn(),
      getUrl: jest.fn(),
    };

    (validateEnv as jest.Mock).mockReturnValue(mockEnvAccess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      service = new JdExtractorConfigService();
      expect(service).toBeDefined();
    });

    it('should call validateEnv with correct service name', () => {
      service = new JdExtractorConfigService();

      expect(validateEnv).toHaveBeenCalledWith('jdExtractor');
    });

    it('should throw error when validateEnv throws', () => {
      (validateEnv as jest.Mock).mockImplementation(() => {
        throw new Error('Missing required environment variables');
      });

      expect(() => new JdExtractorConfigService()).toThrow(
        'Missing required environment variables',
      );
    });
  });

  describe('nodeEnv', () => {
    it('should return NODE_ENV value when set', () => {
      mockEnvAccess.getString.mockReturnValue('production');
      service = new JdExtractorConfigService();

      expect(service.nodeEnv).toBe('production');
      expect(mockEnvAccess.getString).toHaveBeenCalledWith('NODE_ENV', false);
    });

    it('should return "development" when NODE_ENV is not set', () => {
      mockEnvAccess.getString.mockReturnValue(null);
      service = new JdExtractorConfigService();

      expect(service.nodeEnv).toBe('development');
    });

    it('should return "test" when NODE_ENV is test', () => {
      mockEnvAccess.getString.mockReturnValue('test');
      service = new JdExtractorConfigService();

      expect(service.nodeEnv).toBe('test');
    });
  });

  describe('isTest', () => {
    it('should return true when NODE_ENV is test', () => {
      mockEnvAccess.getString.mockReturnValue('test');
      service = new JdExtractorConfigService();

      expect(service.isTest).toBe(true);
    });

    it('should return false when NODE_ENV is production', () => {
      mockEnvAccess.getString.mockReturnValue('production');
      service = new JdExtractorConfigService();

      expect(service.isTest).toBe(false);
    });

    it('should return false when NODE_ENV is development', () => {
      mockEnvAccess.getString.mockReturnValue('development');
      service = new JdExtractorConfigService();

      expect(service.isTest).toBe(false);
    });
  });

  describe('natsUrl', () => {
    it('should return NATS_URL value when set', () => {
      mockEnvAccess.getString.mockImplementation((key: string, _optional?: boolean) => {
        if (key === 'NATS_URL') {
          return 'nats://production-server:4222';
        }
        return null;
      });
      service = new JdExtractorConfigService();

      expect(service.natsUrl).toBe('nats://production-server:4222');
    });

    it('should return default NATS URL when not set', () => {
      mockEnvAccess.getString.mockReturnValue(null);
      service = new JdExtractorConfigService();

      expect(service.natsUrl).toBe('nats://localhost:4222');
    });

    it('should call getString with correct parameters', () => {
      service = new JdExtractorConfigService();

      // Access natsUrl to trigger the getter
      void service.natsUrl;

      // NODE_ENV and NATS_URL are both called
      expect(mockEnvAccess.getString).toHaveBeenCalled();
    });
  });

  describe('geminiApiKey', () => {
    it('should return GEMINI_API_KEY when set', () => {
      mockEnvAccess.getString.mockImplementation((key: string) => {
        if (key === 'GEMINI_API_KEY') {
          return 'test-api-key-12345';
        }
        return null;
      });
      service = new JdExtractorConfigService();

      expect(service.geminiApiKey).toBe('test-api-key-12345');
    });

    it('should throw error when GEMINI_API_KEY is not set', () => {
      mockEnvAccess.getString.mockReturnValue(null);
      service = new JdExtractorConfigService();

      expect(() => service.geminiApiKey).toThrow('GEMINI_API_KEY is required');
    });

    it('should throw error when GEMINI_API_KEY is empty string', () => {
      mockEnvAccess.getString.mockReturnValue('');
      service = new JdExtractorConfigService();

      expect(() => service.geminiApiKey).toThrow('GEMINI_API_KEY is required');
    });
  });

  describe('getConfigSnapshot', () => {
    it('should return configuration snapshot with all values', () => {
      mockEnvAccess.getString.mockImplementation((key: string) => {
        const config: Record<string, string | null> = {
          NODE_ENV: 'production',
          NATS_URL: 'nats://prod:4222',
          GEMINI_API_KEY: 'secret-key',
        };
        return config[key] ?? null;
      });

      service = new JdExtractorConfigService();
      const snapshot = service.getConfigSnapshot();

      expect(snapshot).toEqual({
        nodeEnv: 'production',
        isTest: false,
        natsUrl: 'nats://prod:4222',
        hasGeminiApiKey: true,
      });
    });

    it('should indicate missing API key in snapshot', () => {
      mockEnvAccess.getString.mockImplementation((key: string) => {
        if (key === 'GEMINI_API_KEY') {
          return null;
        }
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return null;
      });

      service = new JdExtractorConfigService();
      const snapshot = service.getConfigSnapshot();

      expect(snapshot.hasGeminiApiKey).toBe(false);
    });

    it('should return test environment in snapshot', () => {
      mockEnvAccess.getString.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'test';
        }
        return null;
      });

      service = new JdExtractorConfigService();
      const snapshot = service.getConfigSnapshot();

      expect(snapshot.isTest).toBe(true);
      expect(snapshot.nodeEnv).toBe('test');
    });

    it('should return development defaults in snapshot', () => {
      mockEnvAccess.getString.mockReturnValue(null);

      service = new JdExtractorConfigService();
      const snapshot = service.getConfigSnapshot();

      expect(snapshot.nodeEnv).toBe('development');
      expect(snapshot.natsUrl).toBe('nats://localhost:4222');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined getString return', () => {
      mockEnvAccess.getString.mockReturnValue(undefined as unknown as string);
      service = new JdExtractorConfigService();

      expect(service.nodeEnv).toBe('development');
      expect(service.natsUrl).toBe('nats://localhost:4222');
    });

    it('should handle empty NODE_ENV string', () => {
      mockEnvAccess.getString.mockReturnValue('');
      service = new JdExtractorConfigService();

      expect(service.nodeEnv).toBe('development');
    });

    it('should handle whitespace in NATS_URL', () => {
      mockEnvAccess.getString.mockImplementation((key: string) => {
        if (key === 'NATS_URL') {
          return '  nats://localhost:4222  ';
        }
        return null;
      });
      service = new JdExtractorConfigService();

      // Service returns value as-is, no trimming in getter
      expect(service.natsUrl).toBe('  nats://localhost:4222  ');
    });

    it('should handle various environment names', () => {
      const environments = ['development', 'test', 'production', 'staging', 'ci'];

      for (const env of environments) {
        mockEnvAccess.getString.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') {
            return env;
          }
          return null;
        });

        service = new JdExtractorConfigService();
        expect(service.nodeEnv).toBe(env);
      }
    });
  });

  describe('Integration with validateEnv', () => {
    it('should use returned env object for all access', () => {
      service = new JdExtractorConfigService();

      // Access all properties
      void service.nodeEnv;
      void service.isTest;
      void service.natsUrl;
      try {
        void service.geminiApiKey;
      } catch {
        // Expected to throw
      }
      void service.getConfigSnapshot();

      expect(validateEnv).toHaveBeenCalledTimes(1);
    });
  });
});
