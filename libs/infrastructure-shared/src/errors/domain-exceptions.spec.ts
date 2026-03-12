import {
  ResumeParserException,
  JDExtractorException,
  ReportGeneratorException,
  ErrorContext,
} from './domain-exceptions';

describe('Domain Exceptions', () => {
  describe('ResumeParserException', () => {
    it('should create exception with code only', () => {
      const exception = new ResumeParserException('PARSE_ERROR');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(ResumeParserException);
      expect(exception.code).toBe('PARSE_ERROR');
      expect(exception.message).toBe('Resume parser error: PARSE_ERROR');
      expect(exception.name).toBe('ResumeParserException');
      expect(exception.context).toBeUndefined();
    });

    it('should create exception with code and context', () => {
      const context: ErrorContext = { fileName: 'resume.pdf', line: 10 };
      const exception = new ResumeParserException('INVALID_FORMAT', context);

      expect(exception.code).toBe('INVALID_FORMAT');
      expect(exception.context).toEqual(context);
    });

    it('should capture stack trace', () => {
      const exception = new ResumeParserException('ERROR');
      expect(exception.stack).toBeDefined();
    });

    it('should be throwable', () => {
      expect(() => {
        throw new ResumeParserException('TEST_ERROR');
      }).toThrow(ResumeParserException);
    });

    it('should be catchable', () => {
      try {
        throw new ResumeParserException('CATCH_TEST');
      } catch (e) {
        expect(e).toBeInstanceOf(ResumeParserException);
        expect((e as ResumeParserException).code).toBe('CATCH_TEST');
      }
    });

    it('should handle empty code', () => {
      const exception = new ResumeParserException('');
      expect(exception.code).toBe('');
      expect(exception.message).toBe('Resume parser error: ');
    });

    it('should handle complex context', () => {
      const context: ErrorContext = {
        files: ['file1.pdf', 'file2.pdf'],
        metadata: { size: 1024, type: 'pdf' },
        nested: { deep: { value: true } },
      };
      const exception = new ResumeParserException('COMPLEX_ERROR', context);

      expect(exception.context).toEqual(context);
    });
  });

  describe('JDExtractorException', () => {
    it('should create exception with code only', () => {
      const exception = new JDExtractorException('EXTRACTION_FAILED');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(JDExtractorException);
      expect(exception.code).toBe('EXTRACTION_FAILED');
      expect(exception.message).toBe('JD extractor error: EXTRACTION_FAILED');
      expect(exception.name).toBe('JDExtractorException');
    });

    it('should create exception with context', () => {
      const context: ErrorContext = {
        jdId: 'jd-123',
        url: 'http://example.com',
      };
      const exception = new JDExtractorException('FETCH_ERROR', context);

      expect(exception.code).toBe('FETCH_ERROR');
      expect(exception.context).toEqual(context);
    });

    it('should have distinct name from ResumeParserException', () => {
      const resumeException = new ResumeParserException('ERROR');
      const jdException = new JDExtractorException('ERROR');

      expect(resumeException.name).not.toBe(jdException.name);
    });

    it('should be identifiable by instanceof', () => {
      const exception = new JDExtractorException('TEST');

      expect(exception instanceof JDExtractorException).toBe(true);
      expect(exception instanceof ResumeParserException).toBe(false);
      expect(exception instanceof Error).toBe(true);
    });
  });

  describe('ReportGeneratorException', () => {
    it('should create exception with code only', () => {
      const exception = new ReportGeneratorException('GENERATION_FAILED');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(ReportGeneratorException);
      expect(exception.code).toBe('GENERATION_FAILED');
      expect(exception.message).toBe(
        'Report generator error: GENERATION_FAILED',
      );
      expect(exception.name).toBe('ReportGeneratorException');
    });

    it('should create exception with context', () => {
      const context: ErrorContext = { reportType: 'pdf', template: 'standard' };
      const exception = new ReportGeneratorException(
        'TEMPLATE_MISSING',
        context,
      );

      expect(exception.code).toBe('TEMPLATE_MISSING');
      expect(exception.context).toEqual(context);
    });

    it('should be distinguishable from other exceptions', () => {
      const resumeEx = new ResumeParserException('ERROR');
      const jdEx = new JDExtractorException('ERROR');
      const reportEx = new ReportGeneratorException('ERROR');

      expect(resumeEx.name).toBe('ResumeParserException');
      expect(jdEx.name).toBe('JDExtractorException');
      expect(reportEx.name).toBe('ReportGeneratorException');
    });
  });

  describe('ErrorContext handling', () => {
    it('should accept various context types', () => {
      const stringContext: ErrorContext = { key: 'value' };
      const numberContext: ErrorContext = { count: 42 };
      const booleanContext: ErrorContext = { valid: true };
      const arrayContext: ErrorContext = { items: [1, 2, 3] };
      const nestedContext: ErrorContext = { nested: { key: 'value' } };

      const ex1 = new ResumeParserException('TEST', stringContext);
      const ex2 = new ResumeParserException('TEST', numberContext);
      const ex3 = new ResumeParserException('TEST', booleanContext);
      const ex4 = new ResumeParserException('TEST', arrayContext);
      const ex5 = new ResumeParserException('TEST', nestedContext);

      expect(ex1.context).toEqual(stringContext);
      expect(ex2.context).toEqual(numberContext);
      expect(ex3.context).toEqual(booleanContext);
      expect(ex4.context).toEqual(arrayContext);
      expect(ex5.context).toEqual(nestedContext);
    });

    it('should handle empty context', () => {
      const exception = new ResumeParserException('TEST', {});
      expect(exception.context).toEqual({});
    });
  });

  describe('Exception inheritance', () => {
    it('all exceptions should inherit from Error', () => {
      const exceptions = [
        new ResumeParserException('TEST'),
        new JDExtractorException('TEST'),
        new ReportGeneratorException('TEST'),
      ];

      exceptions.forEach((ex) => {
        expect(ex).toBeInstanceOf(Error);
        expect(ex.stack).toBeDefined();
      });
    });
  });

  describe('Multiple exceptions handling', () => {
    it('should handle multiple exceptions in sequence', () => {
      const exceptions: Error[] = [];

      try {
        throw new ResumeParserException('ERROR1');
      } catch (e) {
        exceptions.push(e as Error);
      }

      try {
        throw new JDExtractorException('ERROR2');
      } catch (e) {
        exceptions.push(e as Error);
      }

      try {
        throw new ReportGeneratorException('ERROR3');
      } catch (e) {
        exceptions.push(e as Error);
      }

      expect(exceptions).toHaveLength(3);
      expect(exceptions[0]).toBeInstanceOf(ResumeParserException);
      expect(exceptions[1]).toBeInstanceOf(JDExtractorException);
      expect(exceptions[2]).toBeInstanceOf(ReportGeneratorException);
    });
  });
});
