import { LoggerService, LogLevel } from './logger.service';

const originalEnv = { ...process.env };

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    service = new LoggerService();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  it('stores history and outputs to console in development', () => {
    service.log('hello', 'ctx', { foo: 'bar' });
    const history = service.getLogHistory();
    expect(history.length).toBe(1);
    expect(history[0]).toMatchObject({
      level: LogLevel.LOG,
      message: 'hello',
      context: 'ctx',
    });
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('filters out debug when below log level', () => {
    (service as unknown as { logLevel: LogLevel }).logLevel = LogLevel.WARN;
    service.debug('should-skip');
    expect(service.getLogHistory()).toHaveLength(0);
  });

  it('sends errors to console and history', () => {
    const err = new Error('boom');
    service.error('failed', 'ctx', err);
    const history = service.getLogHistory();
    expect(history[0].error).toBe(err);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('clears history when requested', () => {
    service.log('entry');
    service.clearHistory();
    expect(service.getLogHistory()).toEqual([]);
  });
});
