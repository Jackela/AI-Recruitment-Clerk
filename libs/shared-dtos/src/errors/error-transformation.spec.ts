import { ErrorSeverity, ErrorType } from '../common/error-handling.patterns';
import { ErrorTransformer } from './error-transformation';

describe('ErrorTransformer', () => {
  describe('HTTP to app error transformation', () => {
    it.each([
      [400, ErrorType.VALIDATION],
      [401, ErrorType.AUTHENTICATION],
      [403, ErrorType.AUTHORIZATION],
      [404, ErrorType.NOT_FOUND],
      [409, ErrorType.CONFLICT],
      [422, ErrorType.VALIDATION],
      [429, ErrorType.RATE_LIMIT],
      [500, ErrorType.SYSTEM],
      [502, ErrorType.EXTERNAL_SERVICE],
      [503, ErrorType.EXTERNAL_SERVICE],
      [504, ErrorType.EXTERNAL_SERVICE],
      [599, ErrorType.SYSTEM],
    ])('transforms HTTP %s to %s', (status, type) => {
      const error = ErrorTransformer.fromHttpStatus(status, 'HTTP failed');

      expect(error.enhancedDetails.type).toBe(type);
      expect(error.getStatus()).toBe(status);
    });
  });

  describe('Database error transformation', () => {
    it('transforms connection error to user-friendly message', () => {
      const error = ErrorTransformer.fromDatabaseError(
        new Error('postgres connection refused'),
      );

      expect(error.enhancedDetails.type).toBe(ErrorType.DATABASE);
      expect(error.enhancedDetails.message).toBe('Database connection failed');
    });

    it('transforms query timeout to user-friendly message', () => {
      const error = ErrorTransformer.fromDatabaseError(
        new Error('query timeout exceeded'),
      );

      expect(error.enhancedDetails.code).toBe('DATABASE_QUERY_TIMEOUT');
      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.HIGH);
    });

    it('transforms unique constraint violation to validation error', () => {
      const error = ErrorTransformer.fromDatabaseError(
        new Error('duplicate key violates unique constraint'),
      );

      expect(error.enhancedDetails.type).toBe(ErrorType.VALIDATION);
      expect(error.enhancedDetails.code).toBe('DATABASE_UNIQUE_CONSTRAINT');
    });

    it('transforms foreign key violation to validation error', () => {
      const error = ErrorTransformer.fromDatabaseError(
        new Error('insert violates foreign key constraint'),
      );

      expect(error.enhancedDetails.type).toBe(ErrorType.VALIDATION);
      expect(error.enhancedDetails.code).toBe(
        'DATABASE_FOREIGN_KEY_CONSTRAINT',
      );
    });

    it('transforms serialization failure to retryable error', () => {
      const error = ErrorTransformer.fromDatabaseError(
        new Error('could not serialize access due to concurrent update'),
      );

      expect(error.enhancedDetails.code).toBe('DATABASE_SERIALIZATION_FAILURE');
      expect(error.enhancedDetails.recoveryStrategies).toContain(
        'Retry transaction',
      );
    });
  });

  describe('Validation error transformation', () => {
    it('transforms single field validation error', () => {
      const error = ErrorTransformer.fromValidationErrors([
        { field: 'email', message: 'Invalid email' },
      ]);

      expect(error.enhancedDetails.type).toBe(ErrorType.VALIDATION);
      expect(error.enhancedDetails.details).toEqual({
        fields: [{ field: 'email', message: 'Invalid email' }],
      });
    });

    it('transforms multiple field validation errors', () => {
      const error = ErrorTransformer.fromValidationErrors([
        { field: 'email', message: 'Invalid email' },
        { field: 'name', message: 'Required' },
      ]);

      expect(
        (error.enhancedDetails.details as { fields: unknown[] }).fields,
      ).toHaveLength(2);
    });

    it('transforms nested object validation errors', () => {
      const error = ErrorTransformer.fromValidationErrors([
        {
          field: 'profile',
          message: 'Invalid profile',
          children: [{ field: 'profile.name', message: 'Required' }],
        },
      ]);

      expect(error.enhancedDetails.details).toEqual({
        fields: [
          {
            field: 'profile',
            message: 'Invalid profile',
            children: [{ field: 'profile.name', message: 'Required' }],
          },
        ],
      });
    });

    it('transforms array validation errors', () => {
      const error = ErrorTransformer.fromValidationErrors([
        { field: 'items[0].id', message: 'Required' },
      ]);

      expect(error.enhancedDetails.details).toEqual({
        fields: [{ field: 'items[0].id', message: 'Required' }],
      });
    });
  });

  describe('Unknown error transformation', () => {
    it('transforms standard Error to generic app error', () => {
      const error = ErrorTransformer.fromUnknown(new Error('Boom'));

      expect(error.enhancedDetails.type).toBe(ErrorType.SYSTEM);
      expect(error.enhancedDetails.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('transforms string thrown as error', () => {
      const error = ErrorTransformer.fromUnknown('string failure');

      expect(error.enhancedDetails.details).toEqual({
        originalError: 'string failure',
      });
    });

    it.each([null, undefined])(
      'transforms null/undefined thrown as error',
      (thrown) => {
        const error = ErrorTransformer.fromUnknown(thrown);

        expect(error.enhancedDetails.type).toBe(ErrorType.SYSTEM);
      },
    );

    it('transforms object thrown as error', () => {
      const thrown = { reason: 'bad-state' };
      const error = ErrorTransformer.fromUnknown(thrown);

      expect(error.enhancedDetails.details).toEqual({
        originalError: thrown,
      });
    });

    it('preserves stack trace when transforming errors', () => {
      const original = new Error('Keep stack');
      original.stack = 'stack trace';

      const error = ErrorTransformer.fromUnknown(original);

      expect(error.stack).toBe('stack trace');
    });
  });
});
