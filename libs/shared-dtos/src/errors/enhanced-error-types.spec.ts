import { HttpStatus } from '@nestjs/common';
import {
  ExtendedErrorType,
  EnhancedAppException,
  NatsMessageException,
  MLModelException,
  ParsingException,
  CacheException,
  QueueException,
  TemplateException,
  ErrorFactory,
} from './enhanced-error-types';
import { ErrorSeverity } from '../common/error-handling.patterns';

describe('Enhanced Error Types', () => {
  describe('ExtendedErrorType Enum', () => {
    it('should define all common error types', () => {
      expect(ExtendedErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ExtendedErrorType.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(ExtendedErrorType.AUTHORIZATION_ERROR).toBe('AUTHORIZATION_ERROR');
      expect(ExtendedErrorType.NOT_FOUND_ERROR).toBe('NOT_FOUND_ERROR');
      expect(ExtendedErrorType.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
      expect(ExtendedErrorType.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
      expect(ExtendedErrorType.SYSTEM_ERROR).toBe('SYSTEM_ERROR');
      expect(ExtendedErrorType.PERFORMANCE_ERROR).toBe('PERFORMANCE_ERROR');
    });

    it('should define all domain-specific error types', () => {
      expect(ExtendedErrorType.NATS_MESSAGE_ERROR).toBe('NATS_MESSAGE_ERROR');
      expect(ExtendedErrorType.PARSING_ERROR).toBe('PARSING_ERROR');
      expect(ExtendedErrorType.ML_MODEL_ERROR).toBe('ML_MODEL_ERROR');
      expect(ExtendedErrorType.REPORT_GENERATION_ERROR).toBe('REPORT_GENERATION_ERROR');
      expect(ExtendedErrorType.SCORING_ERROR).toBe('SCORING_ERROR');
      expect(ExtendedErrorType.PDF_PROCESSING_ERROR).toBe('PDF_PROCESSING_ERROR');
      expect(ExtendedErrorType.OCR_ERROR).toBe('OCR_ERROR');
      expect(ExtendedErrorType.TEMPLATE_ERROR).toBe('TEMPLATE_ERROR');
      expect(ExtendedErrorType.ANALYTICS_ERROR).toBe('ANALYTICS_ERROR');
      expect(ExtendedErrorType.CACHE_ERROR).toBe('CACHE_ERROR');
      expect(ExtendedErrorType.QUEUE_ERROR).toBe('QUEUE_ERROR');
    });
  });

  describe('EnhancedAppException', () => {
    it('should create an enhanced exception with default values', () => {
      const exception = new EnhancedAppException(
        ExtendedErrorType.SYSTEM_ERROR,
        'TEST_CODE',
        'Test message',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.message).toBe('Test message');
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.SYSTEM_ERROR);
      expect(exception.enhancedDetails.code).toBe('TEST_CODE');
      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
      expect(exception.enhancedDetails.recoveryStrategies).toEqual([]);
      expect(exception.enhancedDetails.affectedOperations).toEqual([]);
      expect(exception.enhancedDetails.relatedErrors).toEqual([]);
      expect(exception.enhancedDetails.monitoringTags).toEqual({});
    });

    it('should create an exception with custom HTTP status', () => {
      const exception = new EnhancedAppException(
        ExtendedErrorType.VALIDATION_ERROR,
        'VAL_CODE',
        'Validation failed',
        HttpStatus.BAD_REQUEST,
      );

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create an exception with details and context', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const context = { userId: 'user-123', action: 'update' };
      const exception = new EnhancedAppException(
        ExtendedErrorType.VALIDATION_ERROR,
        'VAL_CODE',
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        details,
        context,
      );

      expect(exception.enhancedDetails.details).toEqual(details);
      expect(exception.enhancedDetails.context).toEqual(context);
    });

    describe('Fluent Interface Methods', () => {
      it('should support withCorrelation', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        const context = {
          traceId: 'trace-123',
          spanId: 'span-456',
          requestId: 'req-123',
          timestamp: new Date().toISOString(),
          serviceName: 'test-service',
          operationName: 'test-operation',
        };
        exception.withCorrelation(context);

        expect(exception.enhancedDetails.correlationContext?.traceId).toBe('trace-123');
      });

      it('should support withRecoveryStrategies', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        const strategies = ['Retry', 'Use fallback'];
        exception.withRecoveryStrategies(strategies);

        expect(exception.enhancedDetails.recoveryStrategies).toEqual(strategies);
      });

      it('should support withAffectedOperations', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        const operations = ['operation1', 'operation2'];
        exception.withAffectedOperations(operations);

        expect(exception.enhancedDetails.affectedOperations).toEqual(operations);
      });

      it('should support withRelatedErrors', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        const errorIds = ['error-1', 'error-2'];
        exception.withRelatedErrors(errorIds);

        expect(exception.enhancedDetails.relatedErrors).toEqual(errorIds);
      });

      it('should support withBusinessImpact', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        exception.withBusinessImpact('critical');

        expect(exception.enhancedDetails.businessImpact).toBe('critical');
      });

      it('should support withUserImpact', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        exception.withUserImpact('severe');

        expect(exception.enhancedDetails.userImpact).toBe('severe');
      });

      it('should support withSeverity', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        exception.withSeverity(ErrorSeverity.CRITICAL);

        expect(exception.enhancedDetails.severity).toBe(ErrorSeverity.CRITICAL);
        expect(exception.errorDetails.severity).toBe(ErrorSeverity.CRITICAL);
      });

      it('should support withMonitoringTags', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        exception.withMonitoringTags({ key1: 'value1', key2: 'value2' });

        expect(exception.enhancedDetails.monitoringTags).toEqual({
          key1: 'value1',
          key2: 'value2',
        });
      });

      it('should merge monitoring tags', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );
        exception.withMonitoringTags({ key1: 'value1' });
        exception.withMonitoringTags({ key2: 'value2' });

        expect(exception.enhancedDetails.monitoringTags).toEqual({
          key1: 'value1',
          key2: 'value2',
        });
      });

      it('should chain multiple fluent methods', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        )
          .withBusinessImpact('high')
          .withUserImpact('severe')
          .withSeverity(ErrorSeverity.CRITICAL)
          .withRecoveryStrategies(['Retry'])
          .withMonitoringTags({ component: 'test' });

        expect(exception.enhancedDetails.businessImpact).toBe('high');
        expect(exception.enhancedDetails.userImpact).toBe('severe');
        expect(exception.enhancedDetails.severity).toBe(ErrorSeverity.CRITICAL);
        expect(exception.enhancedDetails.recoveryStrategies).toEqual(['Retry']);
        expect(exception.enhancedDetails.monitoringTags).toEqual({ component: 'test' });
      });
    });

    describe('getEnhancedContext', () => {
      it('should return comprehensive error context', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'TEST_CODE',
          'Test message',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { detail: 'value' },
          { userId: 'user-123' },
        )
          .withBusinessImpact('high')
          .withUserImpact('severe')
          .withRecoveryStrategies(['Retry']);

        const context = exception.getEnhancedContext();

        expect(context.error.type).toBe(ExtendedErrorType.SYSTEM_ERROR);
        expect(context.error.code).toBe('TEST_CODE');
        expect(context.error.message).toBe('Test message');
        expect(context.error.businessImpact).toBe('high');
        expect(context.error.userImpact).toBe('severe');
        expect(context.recovery.strategies).toEqual(['Retry']);
        expect(context.details).toEqual({ detail: 'value' });
        expect(context.context).toEqual({ userId: 'user-123' });
        expect(context.timestamp).toBeDefined();
      });

      it('should include correlation summary when context is set', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        ).withCorrelation({
          requestId: 'req-123',
          traceId: 'trace-123',
          spanId: 'span-456',
          parentSpanId: 'parent-789',
          timestamp: new Date().toISOString(),
          serviceName: 'test-service',
          operationName: 'test-op',
        });

        const context = exception.getEnhancedContext();

        expect(context.correlation).toBeDefined();
        expect(context.correlation?.traceId).toBe('trace-123');
      });

      it('should return null correlation when not set', () => {
        const exception = new EnhancedAppException(
          ExtendedErrorType.SYSTEM_ERROR,
          'CODE',
          'Message',
        );

        const context = exception.getEnhancedContext();

        expect(context.correlation).toBeNull();
      });
    });
  });

  describe('NatsMessageException', () => {
    it('should create a NATS message exception', () => {
      const exception = new NatsMessageException(
        'publish',
        'resume.parsed',
        'Connection refused',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.NATS_MESSAGE_ERROR);
      expect(exception.enhancedDetails.code).toBe('NATS_MESSAGE_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.message).toContain('publish');
      expect(exception.message).toContain('resume.parsed');
      expect(exception.message).toContain('Connection refused');
    });

    it('should include original error in details', () => {
      const originalError = new Error('Original error');
      const exception = new NatsMessageException(
        'subscribe',
        'scoring.request',
        'Timeout',
        originalError,
      );

      expect((exception.enhancedDetails.details as Record<string, unknown>).originalError).toBe('Original error');
    });

    it('should have correct business and user impact', () => {
      const exception = new NatsMessageException('publish', 'test', 'error');

      expect(exception.enhancedDetails.businessImpact).toBe('high');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have recovery strategies', () => {
      const exception = new NatsMessageException('publish', 'test', 'error');

      expect(exception.enhancedDetails.recoveryStrategies?.length).toBeGreaterThan(0);
    });

    it('should have monitoring tags', () => {
      const exception = new NatsMessageException('publish', 'test.subject', 'error');

      expect(exception.enhancedDetails.monitoringTags?.['nats.operation']).toBe('publish');
      expect(exception.enhancedDetails.monitoringTags?.['nats.subject']).toBe('test.subject');
      expect(exception.enhancedDetails.monitoringTags?.component).toBe('messaging');
    });
  });

  describe('MLModelException', () => {
    it('should create an ML model exception', () => {
      const exception = new MLModelException(
        'skill-matcher-v2',
        'inference',
        'Model not loaded',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.ML_MODEL_ERROR);
      expect(exception.enhancedDetails.code).toBe('ML_MODEL_PROCESSING_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toContain('skill-matcher-v2');
      expect(exception.message).toContain('inference');
      expect(exception.message).toContain('Model not loaded');
    });

    it('should include confidence in details', () => {
      const exception = new MLModelException(
        'scoring-model',
        'predict',
        'Low confidence',
        0.45,
      );

      expect((exception.enhancedDetails.details as Record<string, unknown>).confidence).toBe(0.45);
    });

    it('should have correct business and user impact', () => {
      const exception = new MLModelException('model', 'op', 'error');

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new MLModelException('test-model', 'test-op', 'error');

      expect(exception.enhancedDetails.monitoringTags?.['ml.model']).toBe('test-model');
      expect(exception.enhancedDetails.monitoringTags?.['ml.operation']).toBe('test-op');
      expect(exception.enhancedDetails.monitoringTags?.component).toBe('ml-processing');
    });
  });

  describe('ParsingException', () => {
    it('should create a parsing exception', () => {
      const exception = new ParsingException(
        'pdf',
        'resume.pdf',
        'pdf-text-extractor',
        'Invalid PDF structure',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.PARSING_ERROR);
      expect(exception.enhancedDetails.code).toBe('FILE_PARSING_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toContain('pdf');
      expect(exception.message).toContain('resume.pdf');
      expect(exception.message).toContain('pdf-text-extractor');
      expect(exception.message).toContain('Invalid PDF structure');
    });

    it('should include file size in details', () => {
      const exception = new ParsingException(
        'docx',
        'resume.docx',
        'docx-parser',
        'Error',
        1024000,
      );

      expect((exception.enhancedDetails.details as Record<string, unknown>).fileSize).toBe(1024000);
    });

    it('should have correct business and user impact', () => {
      const exception = new ParsingException('pdf', 'file.pdf', 'parser', 'error');

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new ParsingException('pdf', 'test.pdf', 'gemini', 'error');

      expect(exception.enhancedDetails.monitoringTags?.['parser.type']).toBe('gemini');
      expect(exception.enhancedDetails.monitoringTags?.['file.type']).toBe('pdf');
      expect(exception.enhancedDetails.monitoringTags?.component).toBe('file-processing');
    });
  });

  describe('CacheException', () => {
    it('should create a cache exception', () => {
      const exception = new CacheException(
        'get',
        'user:session:123',
        'redis',
        'Connection refused',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.CACHE_ERROR);
      expect(exception.enhancedDetails.code).toBe('CACHE_OPERATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.message).toContain('get');
      expect(exception.message).toContain('user:session:123');
      expect(exception.message).toContain('redis');
      expect(exception.message).toContain('Connection refused');
    });

    it('should have low business impact and minimal user impact', () => {
      const exception = new CacheException('get', 'key', 'redis', 'error');

      expect(exception.enhancedDetails.businessImpact).toBe('low');
      expect(exception.enhancedDetails.userImpact).toBe('minimal');
    });

    it('should have monitoring tags', () => {
      const exception = new CacheException('set', 'test-key', 'memory', 'error');

      expect(exception.enhancedDetails.monitoringTags?.['cache.operation']).toBe('set');
      expect(exception.enhancedDetails.monitoringTags?.['cache.type']).toBe('memory');
      expect(exception.enhancedDetails.monitoringTags?.component).toBe('caching');
    });
  });

  describe('QueueException', () => {
    it('should create a queue exception', () => {
      const exception = new QueueException(
        'enqueue',
        'scoring-jobs',
        'Queue full',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.QUEUE_ERROR);
      expect(exception.enhancedDetails.code).toBe('QUEUE_OPERATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.message).toContain('enqueue');
      expect(exception.message).toContain('scoring-jobs');
      expect(exception.message).toContain('Queue full');
    });

    it('should include message ID in details', () => {
      const exception = new QueueException(
        'dequeue',
        'report-jobs',
        'Not found',
        'msg-123',
      );

      expect((exception.enhancedDetails.details as Record<string, unknown>).messageId).toBe('msg-123');
    });

    it('should have correct business and user impact', () => {
      const exception = new QueueException('enqueue', 'test-queue', 'error');

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new QueueException('publish', 'test-queue', 'error');

      expect(exception.enhancedDetails.monitoringTags?.['queue.operation']).toBe('publish');
      expect(exception.enhancedDetails.monitoringTags?.['queue.name']).toBe('test-queue');
      expect(exception.enhancedDetails.monitoringTags?.component).toBe('queue-processing');
    });
  });

  describe('TemplateException', () => {
    it('should create a template exception', () => {
      const exception = new TemplateException(
        'report-template',
        'render',
        'Variable not found: score',
      );

      expect(exception).toBeInstanceOf(EnhancedAppException);
      expect(exception.enhancedDetails.type).toBe(ExtendedErrorType.TEMPLATE_ERROR);
      expect(exception.enhancedDetails.code).toBe('TEMPLATE_PROCESSING_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toContain('report-template');
      expect(exception.message).toContain('render');
      expect(exception.message).toContain('Variable not found: score');
    });

    it('should include template data in details', () => {
      const templateData = { score: 85, name: 'John' };
      const exception = new TemplateException(
        'summary-template',
        'compile',
        'Error',
        templateData,
      );

      expect((exception.enhancedDetails.details as Record<string, unknown>).templateData).toEqual(templateData);
    });

    it('should have correct business and user impact', () => {
      const exception = new TemplateException('template', 'op', 'error');

      expect(exception.enhancedDetails.businessImpact).toBe('medium');
      expect(exception.enhancedDetails.userImpact).toBe('moderate');
    });

    it('should have monitoring tags', () => {
      const exception = new TemplateException('test-tpl', 'render', 'error');

      expect(exception.enhancedDetails.monitoringTags?.['template.name']).toBe('test-tpl');
      expect(exception.enhancedDetails.monitoringTags?.['template.operation']).toBe('render');
      expect(exception.enhancedDetails.monitoringTags?.component).toBe('template-processing');
    });
  });

  describe('ErrorFactory', () => {
    it('should create NATS error', () => {
      const error = ErrorFactory.natsError(
        'publish',
        'test.subject',
        'Connection failed',
      );

      expect(error).toBeInstanceOf(NatsMessageException);
      expect(error.message).toContain('publish');
      expect(error.message).toContain('test.subject');
    });

    it('should create NATS error with original error', () => {
      const originalError = new Error('Original');
      const error = ErrorFactory.natsError(
        'subscribe',
        'test',
        'Failed',
        originalError,
      );

      expect((error.enhancedDetails.details as Record<string, unknown>).originalError).toBe('Original');
    });

    it('should create ML model error', () => {
      const error = ErrorFactory.mlModelError(
        'test-model',
        'inference',
        'Model failed',
      );

      expect(error).toBeInstanceOf(MLModelException);
      expect(error.message).toContain('test-model');
      expect(error.message).toContain('inference');
    });

    it('should create ML model error with confidence', () => {
      const error = ErrorFactory.mlModelError(
        'model',
        'op',
        'error',
        0.75,
      );

      expect((error.enhancedDetails.details as Record<string, unknown>).confidence).toBe(0.75);
    });

    it('should create parsing error', () => {
      const error = ErrorFactory.parsingError(
        'pdf',
        'resume.pdf',
        'pdf-extractor',
        'Parse failed',
      );

      expect(error).toBeInstanceOf(ParsingException);
      expect(error.message).toContain('pdf');
      expect(error.message).toContain('resume.pdf');
    });

    it('should create parsing error with file size', () => {
      const error = ErrorFactory.parsingError(
        'pdf',
        'file.pdf',
        'parser',
        'error',
        5000,
      );

      expect((error.enhancedDetails.details as Record<string, unknown>).fileSize).toBe(5000);
    });

    it('should create cache error', () => {
      const error = ErrorFactory.cacheError(
        'set',
        'cache-key',
        'redis',
        'Write failed',
      );

      expect(error).toBeInstanceOf(CacheException);
      expect(error.message).toContain('set');
      expect(error.message).toContain('cache-key');
    });

    it('should create queue error', () => {
      const error = ErrorFactory.queueError(
        'enqueue',
        'job-queue',
        'Queue full',
      );

      expect(error).toBeInstanceOf(QueueException);
      expect(error.message).toContain('enqueue');
      expect(error.message).toContain('job-queue');
    });

    it('should create queue error with message ID', () => {
      const error = ErrorFactory.queueError(
        'dequeue',
        'queue',
        'error',
        'msg-123',
      );

      expect((error.enhancedDetails.details as Record<string, unknown>).messageId).toBe('msg-123');
    });

    it('should create template error', () => {
      const error = ErrorFactory.templateError(
        'report-tpl',
        'render',
        'Variable missing',
      );

      expect(error).toBeInstanceOf(TemplateException);
      expect(error.message).toContain('report-tpl');
      expect(error.message).toContain('render');
    });

    it('should create template error with data', () => {
      const templateData = { key: 'value' };
      const error = ErrorFactory.templateError(
        'template',
        'compile',
        'error',
        templateData,
      );

      expect((error.enhancedDetails.details as Record<string, unknown>).templateData).toEqual(templateData);
    });
  });
});
