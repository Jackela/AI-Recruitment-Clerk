/**
 * DTO Validation Pipe Tests
 */
import {
  DtoValidationPipe,
  createDtoValidationPipe,
} from './dto-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  MinLength,
} from 'class-validator';

class TestUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsNumber()
  @IsOptional()
  age?: number;
}

class TestNestedDto {
  @IsString()
  title!: string;

  @IsOptional()
  user?: TestUserDto;
}

describe('DtoValidationPipe', () => {
  let pipe: DtoValidationPipe;

  beforeEach(() => {
    pipe = new DtoValidationPipe();
  });

  describe('transform', () => {
    it('should validate and transform valid DTO', async () => {
      const value = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = (await pipe.transform(value, {
        type: 'body',
        metatype: TestUserDto,
      })) as TestUserDto;

      expect(result).toBeInstanceOf(TestUserDto);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(30);
    });

    it('should validate without optional fields', async () => {
      const value = {
        name: 'Jane Doe',
        email: 'jane@example.com',
      };

      const result = (await pipe.transform(value, {
        type: 'body',
        metatype: TestUserDto,
      })) as TestUserDto;

      expect(result).toBeInstanceOf(TestUserDto);
      expect(result.name).toBe('Jane Doe');
      expect(result.age).toBeUndefined();
    });

    it('should throw BadRequestException for invalid email', async () => {
      const value = {
        name: 'Invalid User',
        email: 'invalid-email',
      };

      await expect(
        pipe.transform(value, {
          type: 'body',
          metatype: TestUserDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for short name', async () => {
      const value = {
        name: 'A',
        email: 'test@example.com',
      };

      await expect(
        pipe.transform(value, {
          type: 'body',
          metatype: TestUserDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with formatted errors', async () => {
      const value = {
        name: '',
        email: 'invalid',
      };

      try {
        await pipe.transform(value, {
          type: 'body',
          metatype: TestUserDto,
        });
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          message: string;
          errors: Array<{
            property: string;
            constraints?: Record<string, string>;
          }>;
          statusCode: number;
        };
        expect(response.message).toBe('Validation failed');
        expect(response.statusCode).toBe(400);
        expect(response.errors).toHaveLength(2);
        expect(response.errors[0].property).toBeDefined();
      }
    });

    it('should skip validation for primitive types', async () => {
      const stringValue = 'test string';
      const result = await pipe.transform(stringValue, {
        type: 'body',
        metatype: String,
      });
      expect(result).toBe(stringValue);
    });

    it('should skip validation for null metatype', async () => {
      const value = { test: 'value' };
      const result = await pipe.transform(value, {
        type: 'body',
        metatype: null as unknown as new (...args: unknown[]) => unknown,
      });
      expect(result).toBe(value);
    });

    it('should strip non-whitelisted properties', async () => {
      const value = {
        name: 'John Doe',
        email: 'john@example.com',
        extraField: 'should be removed',
        anotherExtra: 123,
      };

      const result = await pipe.transform(value, {
        type: 'body',
        metatype: TestUserDto,
      });

      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('anotherExtra');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
    });

    it('should throw when non-whitelisted properties present with forbidNonWhitelisted', async () => {
      const strictPipe = new DtoValidationPipe({
        forbidNonWhitelisted: true,
      });

      const value = {
        name: 'John Doe',
        email: 'john@example.com',
        extraField: 'should fail',
      };

      await expect(
        strictPipe.transform(value, {
          type: 'body',
          metatype: TestUserDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('options', () => {
    it('should use default options when none provided', () => {
      const defaultPipe = new DtoValidationPipe();
      expect(defaultPipe).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customPipe = new DtoValidationPipe({
        whitelist: false,
        transform: false,
      });
      expect(customPipe).toBeDefined();
    });

    it('should disable transformation when transform is false', async () => {
      const noTransformPipe = new DtoValidationPipe({
        transform: false,
      });

      const value = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await noTransformPipe.transform(value, {
        type: 'body',
        metatype: TestUserDto,
      });

      expect(result).not.toBeInstanceOf(TestUserDto);
    });
  });

  describe('nested validation', () => {
    it('should validate nested DTOs', async () => {
      const value = {
        title: 'Test Title',
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const result = (await pipe.transform(value, {
        type: 'body',
        metatype: TestNestedDto,
      })) as TestNestedDto;

      expect(result).toBeInstanceOf(TestNestedDto);
      expect(result.title).toBe('Test Title');
      expect(result.user).toBeDefined();
    });
  });
});

describe('createDtoValidationPipe', () => {
  it('should create pipe with default options', () => {
    const pipe = createDtoValidationPipe();
    expect(pipe).toBeInstanceOf(DtoValidationPipe);
  });

  it('should create pipe with custom options', () => {
    const pipe = createDtoValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    });
    expect(pipe).toBeInstanceOf(DtoValidationPipe);
  });
});
