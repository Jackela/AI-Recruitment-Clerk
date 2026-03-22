/**
 * Infrastructure Shared Module Integration Tests
 */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication} from '@nestjs/common';
import { Logger, BadRequestException } from '@nestjs/common';
import { DtoValidationPipe } from './pipes/dto-validation.pipe';
import { IsString, IsEmail, MinLength } from 'class-validator';

class TestDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;
}

describe('Infrastructure Shared Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create a minimal NestJS application for integration testing
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [DtoValidationPipe],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('DtoValidationPipe Integration', () => {
    it('should be available as a provider', () => {
      const pipe = app.get(DtoValidationPipe);
      expect(pipe).toBeInstanceOf(DtoValidationPipe);
    });

    it('should validate DTO correctly through pipe', async () => {
      const pipe = app.get(DtoValidationPipe);

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await pipe.transform(validData, {
        type: 'body',
        metatype: TestDto,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe');
    });

    it('should throw validation error through pipe', async () => {
      const pipe = app.get(DtoValidationPipe);

      const invalidData = {
        name: 'J',
        email: 'invalid-email',
      };

      await expect(
        pipe.transform(invalidData, {
          type: 'body',
          metatype: TestDto,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Export Verification', () => {
    it('should export all required utilities', async () => {
      // Verify that index exports all necessary items
      const index = await import('./index');

      // Error handling exports
      expect(index.asyncErrorBoundary).toBeDefined();
      expect(index.errorBoundary).toBeDefined();
      expect(index.successResponse).toBeDefined();
      expect(index.errorResponse).toBeDefined();
      expect(index.AppError).toBeDefined();
      expect(index.ValidationError).toBeDefined();
      expect(index.NotFoundError).toBeDefined();

      // Validation exports
      expect(index.EmailValidator).toBeDefined();
      expect(index.PhoneValidator).toBeDefined();
      expect(index.IdValidator).toBeDefined();
      expect(index.SchemaValidator).toBeDefined();

      // Pipe exports
      expect(index.DtoValidationPipe).toBeDefined();
      expect(index.createDtoValidationPipe).toBeDefined();

      // Bootstrap exports
      expect(index.bootstrapNestJsMicroservice).toBeDefined();
      expect(index.bootstrapNestJsGateway).toBeDefined();
      expect(index.bootstrapWithErrorHandling).toBeDefined();

      // Logger exports
      expect(index.Logger).toBeDefined();
      expect(index.createLogger).toBeDefined();
      expect(index.logger).toBeDefined();
    });
  });

  describe('Logger Integration', () => {
    it('should create logger instance', () => {
      const testLogger = new Logger('TestLogger');
      expect(testLogger).toBeDefined();
      expect(testLogger.log).toBeDefined();
      expect(testLogger.error).toBeDefined();
      expect(testLogger.warn).toBeDefined();
      expect(testLogger.debug).toBeDefined();
    });
  });
});
