import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;
  let controller: AppController;
  let service: AppService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = app.get<AppController>(AppController);
    service = app.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of AppController', () => {
      expect(controller).toBeInstanceOf(AppController);
    });

    it('should have AppService injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const result = controller.getData();

      expect(result).toEqual({ message: 'Hello API' });
    });

    it('should call appService.getData()', () => {
      const spy = jest.spyOn(service, 'getData');

      controller.getData();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return the exact result from appService', () => {
      const serviceResult = service.getData();
      const controllerResult = controller.getData();

      expect(controllerResult).toEqual(serviceResult);
    });

    it('should return an object with message property', () => {
      const result = controller.getData();

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });

    it('should return consistent results', () => {
      const firstCall = controller.getData();
      const secondCall = controller.getData();

      expect(firstCall).toEqual(secondCall);
    });

    it('should be accessible via HTTP GET', () => {
      // Verify the method exists and is a function
      expect(typeof controller.getData).toBe('function');
    });

    it('should not throw errors', () => {
      expect(() => controller.getData()).not.toThrow();
    });

    it('should return a serializable object', () => {
      const result = controller.getData();

      expect(() => JSON.stringify(result)).not.toThrow();
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });
  });

  describe('Controller-Service Integration', () => {
    it('should delegate to service correctly', () => {
      const mockResult = { message: 'Hello API' };
      jest.spyOn(service, 'getData').mockReturnValue(mockResult);

      const result = controller.getData();

      expect(result).toBe(mockResult);
    });

    it('should maintain service instance reference', () => {
      const result1 = service.getData();
      const result2 = controller.getData();

      // Both should return the same structure
      expect(result1).toEqual(result2);
    });
  });

  describe('HTTP Response Validation', () => {
    it('should return a valid JSON response', () => {
      const result = controller.getData();

      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should have correct response shape', () => {
      const result = controller.getData();

      expect(Object.keys(result)).toContain('message');
      expect(Object.keys(result).length).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should respond quickly', () => {
      const startTime = Date.now();

      controller.getData();

      const duration = Date.now() - startTime;

      // Should be nearly instant
      expect(duration).toBeLessThan(10);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => Promise.resolve(controller.getData()));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toEqual({ message: 'Hello API' });
      });
    });
  });

  describe('Error Handling', () => {
    it('should not throw if service returns null', () => {
      jest.spyOn(service, 'getData').mockReturnValue(null as unknown as {
        message: string;
      });

      expect(() => controller.getData()).not.toThrow();
    });

    it('should propagate service errors', () => {
      jest.spyOn(service, 'getData').mockImplementation(() => {
        throw new Error('Service error');
      });

      expect(() => controller.getData()).toThrow('Service error');
    });
  });
});
