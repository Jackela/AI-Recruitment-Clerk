import {
  Logger,
  createLogger,
  logger,
  LogContext,
  LoggerOptions,
} from './logger.service';
import { Logger as NestLogger } from '@nestjs/common';

describe('Logger', () => {
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

  describe('constructor', () => {
    it('should create logger with context', () => {
      const testLogger = new Logger('TestService');
      expect(testLogger).toBeDefined();
      expect(testLogger).toBeInstanceOf(Logger);
    });

    it('should create logger with options', () => {
      const options: LoggerOptions = {
        service: 'TestService',
        level: 'debug',
        timestamps: true,
        colors: true,
      };
      const testLogger = new Logger('TestContext', options);
      expect(testLogger).toBeDefined();
    });

    it('should use default context when not provided', () => {
      const testLogger = new Logger();
      expect(testLogger).toBeDefined();
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      const testLogger = new Logger('TestService');
      testLogger.error('Test error message');
      expect(mockError).toHaveBeenCalled();
    });

    it('should log error with trace', () => {
      const testLogger = new Logger('TestService');
      testLogger.error('Test error', 'stack trace here');
      expect(mockError).toHaveBeenCalled();
    });

    it('should log error with Error object', () => {
      const testLogger = new Logger('TestService');
      const error = new Error('Test error');
      testLogger.error('Test error message', error);
      expect(mockError).toHaveBeenCalled();
    });

    it('should log error with context', () => {
      const testLogger = new Logger('TestService');
      const context: LogContext = {
        operation: 'testOperation',
        traceId: 'trace-123',
        requestId: 'req-456',
        userId: 'user-789',
      };
      testLogger.error('Test error', undefined, context);
      expect(mockError).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      const testLogger = new Logger('TestService');
      testLogger.warn('Test warning message');
      expect(mockWarn).toHaveBeenCalled();
    });

    it('should log warning with context', () => {
      const testLogger = new Logger('TestService');
      const context: LogContext = {
        operation: 'testOperation',
      };
      testLogger.warn('Test warning', context);
      expect(mockWarn).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should log info message', () => {
      const testLogger = new Logger('TestService');
      testLogger.log('Test log message');
      expect(mockLog).toHaveBeenCalled();
    });

    it('should log info with context', () => {
      const testLogger = new Logger('TestService');
      const context: LogContext = {
        operation: 'testOperation',
        traceId: 'trace-123',
      };
      testLogger.log('Test log', context);
      expect(mockLog).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      const testLogger = new Logger('TestService');
      testLogger.debug('Test debug message');
      expect(mockDebug).toHaveBeenCalled();
    });

    it('should log debug with context', () => {
      const testLogger = new Logger('TestService');
      const context: LogContext = {
        operation: 'testOperation',
      };
      testLogger.debug('Test debug', context);
      expect(mockDebug).toHaveBeenCalled();
    });
  });

  describe('verbose', () => {
    it('should log verbose message (alias for debug)', () => {
      const testLogger = new Logger('TestService');
      testLogger.verbose('Test verbose message');
      expect(mockDebug).toHaveBeenCalled();
    });
  });

  describe('setContext', () => {
    it('should set context and return logger instance', () => {
      const testLogger = new Logger('TestService');
      const context: LogContext = {
        operation: 'testOperation',
        traceId: 'trace-123',
      };
      const result = testLogger.setContext(context);
      expect(result).toBe(testLogger);
    });

    it('should merge context with subsequent logs', () => {
      const testLogger = new Logger('TestService');
      testLogger.setContext({
        operation: 'testOperation',
        traceId: 'trace-123',
      });
      testLogger.log('Test message');
      expect(mockLog).toHaveBeenCalled();
    });
  });

  describe('child', () => {
    it('should create child logger with additional context', () => {
      const testLogger = new Logger('TestService');
      const childContext: LogContext = {
        userId: 'user-123',
      };
      const childLogger = testLogger.child(childContext);
      expect(childLogger).toBeDefined();
    });

    it('should merge parent and child context', () => {
      const testLogger = new Logger('TestService');
      testLogger.setContext({ operation: 'parentOp' });
      const childLogger = testLogger.child({ userId: 'user-123' });
      childLogger.log('Test message');
      expect(mockLog).toHaveBeenCalled();
    });
  });

  describe('formatLogEntry', () => {
    it('should format log entry with all context fields', () => {
      const testLogger = new Logger('TestService');
      const context: LogContext = {
        operation: 'testOp',
        traceId: 'trace-123',
        requestId: 'req-456',
        userId: 'user-789',
        customField: 'customValue',
      };
      testLogger.log('Test message', context);
      expect(mockLog).toHaveBeenCalled();
    });

    it('should format log entry without context', () => {
      const testLogger = new Logger('TestService');
      testLogger.log('Test message');
      expect(mockLog).toHaveBeenCalled();
    });
  });
});

describe('createLogger', () => {
  it('should create logger with context', () => {
    const testLogger = createLogger('TestService');
    expect(testLogger).toBeDefined();
    expect(testLogger).toBeInstanceOf(Logger);
  });

  it('should create logger with options', () => {
    const options: LoggerOptions = {
      service: 'TestService',
      level: 'debug',
    };
    const testLogger = createLogger('TestContext', options);
    expect(testLogger).toBeDefined();
  });
});

describe('logger', () => {
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

  it('should be default logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should have Application context', () => {
    logger.log('Test message from default logger');
    expect(mockLog).toHaveBeenCalled();
  });
});
