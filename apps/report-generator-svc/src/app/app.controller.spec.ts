import { AppController } from './app.controller';
import type { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let mockService: jest.Mocked<AppService>;

  beforeEach(() => {
    mockService = {
      getData: jest.fn().mockReturnValue({
        message: 'Report Generator Service API',
        status: 'ready',
      }),
    } as unknown as jest.Mocked<AppService>;

    controller = new AppController(mockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should return data from app service', () => {
      const result = controller.getData();

      expect(result).toEqual({
        message: 'Report Generator Service API',
        status: 'ready',
      });
      expect(mockService.getData).toHaveBeenCalled();
    });

    it('should return correct message', () => {
      const result = controller.getData();

      expect(result.message).toBe('Report Generator Service API');
    });

    it('should return ready status when initialized', () => {
      const result = controller.getData();

      expect(result.status).toBe('ready');
    });
  });

  describe('healthCheck', () => {
    it('should return health check response', () => {
      const result = controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('report-generator-svc');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.healthCheck();

      const timestampDate = new Date(result.timestamp);
      expect(timestampDate.toISOString()).toBe(result.timestamp);
    });

    it('should return correct service name', () => {
      const result = controller.healthCheck();

      expect(result.service).toBe('report-generator-svc');
    });

    it('should return ok status', () => {
      const result = controller.healthCheck();

      expect(result.status).toBe('ok');
    });
  });
});
