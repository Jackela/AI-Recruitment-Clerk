/**
 * Infrastructure Shared Module Integration Tests
 */
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
  describe('DtoValidationPipe Integration', () => {
    it('should be available as a provider', () => {
      const pipe = new DtoValidationPipe();
      expect(pipe).toBeInstanceOf(DtoValidationPipe);
    });

    it('should validate DTO correctly through pipe', async () => {
      const pipe = new DtoValidationPipe();

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = (await pipe.transform(validData, {
        type: 'body',
        metatype: TestDto,
      })) as TestDto;

      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe');
    });

    it('should throw validation error through pipe', async () => {
      const pipe = new DtoValidationPipe();

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
