import { Logger, createLogger, sharedLogger } from './shared-logger';
import type { LogContext, LogEntry, LoggerOptions } from './logger.service';
import { Logger as NestLogger } from '@nestjs/common';

describe('Shared Logger', () => {
  let mockLog: jest.SpyInstance;
  let mockError: jest.SpyInstance;
  let mockWarn: jest.SpyInstance;
  let mockDebug: jest.SpyInstance;

  beforeEach(() => {
    mockLog = jest.spyOn(NestLogger.prototype, 'log').mockImplementation();
    mockError = jest.spyOn(NestLogger.prototype, 'error').mockImplementation();
    mockWarn = jest.spyOn(NestLogger.prototype, 'warn').mockImplementation();
    mockDebug = jest.spyOn(NestLogger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Logger export', () => {
    it('should export Logger class', () => {
      expect(Logger).toBeDefined();
      expect(typeof Logger).toBe('function');
    });

    it('should be able to create Logger instance', () => {
      const logger = new Logger('TestContext');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('createLogger export', () => {
    it('should export createLogger function', () => {
      expect(createLogger).toBeDefined();
      expect(typeof createLogger).toBe('function');
    });

    it('should create logger with createLogger', () => {
      const logger = createLogger('TestService');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('sharedLogger export', () => {
    it('should export sharedLogger instance', () => {
      expect(sharedLogger).toBeDefined();
      expect(sharedLogger).toBeInstanceOf(Logger);
    });

    it('should have default Application context', () => {
      sharedLogger.log('Test message');
      expect(mockLog).toHaveBeenCalled();
    });

    it('should be able to log errors', () => {
      sharedLogger.error('Test error');
      expect(mockError).toHaveBeenCalled();
    });

    it('should be able to log warnings', () => {
      sharedLogger.warn('Test warning');
      expect(mockWarn).toHaveBeenCalled();
    });

    it('should be able to log debug messages', () => {
      sharedLogger.debug('Test debug');
      expect(mockDebug).toHaveBeenCalled();
    });
  });

  describe('type exports', () => {
    it('should be able to use LogContext type', () => {
      const context: LogContext = {
        service: 'TestService',
        operation: 'testOperation',
        traceId: 'trace-123',
        requestId: 'req-456',
        userId: 'user-789',
      };
      expect(context).toBeDefined();
    });

    it('should be able to use LogEntry type', () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Test message',
        context: {
          service: 'TestService',
        },
      };
      expect(entry).toBeDefined();
    });

    it('should be able to use LoggerOptions type', () => {
      const options: LoggerOptions = {
        service: 'TestService',
        level: 'debug',
        timestamps: true,
        colors: true,
      };
      expect(options).toBeDefined();
    });
  });

  describe('Logger functionality', () => {
    it('should set context', () => {
      const logger = new Logger('TestService');
      const result = logger.setContext({ operation: 'testOp' });
      expect(result).toBe(logger);
    });

    it('should create child logger', () => {
      const logger = new Logger('TestService');
      const childLogger = logger.child({ userId: 'user-123' });
      expect(childLogger).toBeDefined();
    });
  });
});
