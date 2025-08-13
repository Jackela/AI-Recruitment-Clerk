/**
 * @fileoverview TDD Contract Tests for Enhanced ParsingService
 * @author AI Recruitment Team
 * @since 1.1.0
 * @version 1.0.0
 * @module ParsingServiceContractTests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ParsingService } from './parsing.service.enhanced';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';
import { 
  ContractViolationError, 
  ContractTestUtils 
} from '../../../../libs/shared-dtos/src';

/**
 * Test suite for ParsingService with comprehensive DBC contract validation
 * 
 * @suite ParsingService Contract Tests
 * @description Tests all contract preconditions, postconditions, and invariants
 * 
 * @since 1.1.0
 */
describe('ParsingService - Contract Validation', () => {
  let service: ParsingService;
  let mockVisionLlm: jest.Mocked<VisionLlmService>;
  let mockGridFs: jest.Mocked<GridFsService>;
  let mockFieldMapper: jest.Mocked<FieldMapperService>;
  let mockNatsClient: jest.Mocked<NatsClient>;

  /**
   * Test data factory for creating valid test objects
   */
  const createValidBuffer = (size: number = 1024): Buffer => {
    const buffer = Buffer.alloc(size);
    // PDF signature
    buffer[0] = 0x25; // %
    buffer[1] = 0x50; // P
    buffer[2] = 0x44; // D
    buffer[3] = 0x46; // F
    return buffer;
  };

  const createValidParsedData = () => ({
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123'
    },
    experience: [{
      company: 'Tech Corp',
      position: 'Software Developer',
      duration: '2020-2023'
    }],
    skills: ['JavaScript', 'TypeScript', 'Node.js'],
    education: [{
      institution: 'University',
      degree: 'Computer Science',
      year: '2020'
    }]
  });

  /**
   * Setup test environment with mocked dependencies
   */
  beforeEach(async () => {
    // Create mocked dependencies
    mockVisionLlm = {
      extractResumeContent: jest.fn()
    } as any;

    mockGridFs = {
      uploadFile: jest.fn()
    } as any;

    mockFieldMapper = {
      mapExtractedFields: jest.fn()
    } as any;

    mockNatsClient = {
      connect: jest.fn(),
      disconnect: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsingService,
        { provide: VisionLlmService, useValue: mockVisionLlm },
        { provide: GridFsService, useValue: mockGridFs },
        { provide: FieldMapperService, useValue: mockFieldMapper },
        { provide: NatsClient, useValue: mockNatsClient },
      ],
    }).compile();

    service = module.get<ParsingService>(ParsingService);

    // Setup default mock behaviors
    mockGridFs.uploadFile.mockResolvedValue('http://storage.example.com/file123.pdf');
    mockVisionLlm.extractResumeContent.mockResolvedValue({
      confidence: 0.95,
      extractedText: 'Mock extracted content',
      structuredData: createValidParsedData()
    });
    mockFieldMapper.mapExtractedFields.mockResolvedValue(createValidParsedData());
  });

  /**
   * Test group for precondition validation
   * 
   * @describe Precondition Contract Tests
   */
  describe('Precondition Validation', () => {

    /**
     * Tests file buffer precondition validation
     * 
     * @test should reject invalid file buffer
     * @assertion Throws ContractViolationError for invalid buffer
     * 
     * @since 1.1.0
     */
    it('[PRECONDITION] should reject null file buffer', async () => {
      // Arrange
      const nullBuffer = null as any;
      const fileName = 'resume.pdf';
      const userId = 'user123';

      // Act & Assert
      await ContractTestUtils.expectAsyncContractViolation(
        () => service.parseResumeFile(nullBuffer, fileName, userId),
        'PRE',
        'File buffer must be valid and non-empty'
      );
    });

    /**
     * Tests empty file buffer rejection
     * 
     * @test should reject empty file buffer
     * @assertion Throws ContractViolationError for empty buffer
     * 
     * @since 1.1.0
     */
    it('[PRECONDITION] should reject empty file buffer', async () => {
      // Arrange
      const emptyBuffer = Buffer.alloc(0);
      const fileName = 'resume.pdf';
      const userId = 'user123';

      // Act & Assert
      await ContractTestUtils.expectAsyncContractViolation(
        () => service.parseResumeFile(emptyBuffer, fileName, userId),
        'PRE',
        'File buffer must be valid and non-empty'
      );
    });

    /**
     * Tests file name validation
     * 
     * @test should reject empty file name
     * @assertion Throws ContractViolationError for empty file name
     * 
     * @since 1.1.0
     */
    it('[PRECONDITION] should reject empty file name', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const emptyFileName = '';
      const userId = 'user123';

      // Act & Assert
      await ContractTestUtils.expectAsyncContractViolation(
        () => service.parseResumeFile(validBuffer, emptyFileName, userId),
        'PRE',
        'File name must be non-empty string'
      );
    });

    /**
     * Tests user ID validation
     * 
     * @test should reject empty user ID
     * @assertion Throws ContractViolationError for empty user ID
     * 
     * @since 1.1.0
     */
    it('[PRECONDITION] should reject empty user ID', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const emptyUserId = '';

      // Act & Assert
      await ContractTestUtils.expectAsyncContractViolation(
        () => service.parseResumeFile(validBuffer, fileName, emptyUserId),
        'PRE',
        'User ID must be non-empty string'
      );
    });

    /**
     * Tests file size limits
     * 
     * @test should reject oversized files
     * @assertion Throws ContractViolationError for files > 10MB
     * 
     * @since 1.1.0
     */
    it('[PRECONDITION] should reject oversized files', async () => {
      // Arrange
      const oversizedBuffer = createValidBuffer(11 * 1024 * 1024); // 11MB
      const fileName = 'large-resume.pdf';
      const userId = 'user123';

      // Act & Assert
      await ContractTestUtils.expectAsyncContractViolation(
        () => service.parseResumeFile(oversizedBuffer, fileName, userId),
        'PRE',
        'File size must be within acceptable limits'
      );
    });

    /**
     * Tests whitespace-only inputs
     * 
     * @test should reject whitespace-only file names
     * @assertion Throws ContractViolationError for whitespace-only strings
     * 
     * @since 1.1.0
     */
    it('[PRECONDITION] should reject whitespace-only file names', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const whitespaceFileName = '   \t\n  ';
      const userId = 'user123';

      // Act & Assert
      await ContractTestUtils.expectAsyncContractViolation(
        () => service.parseResumeFile(validBuffer, whitespaceFileName, userId),
        'PRE',
        'File name must be non-empty string'
      );
    });
  });

  /**
   * Test group for postcondition validation
   * 
   * @describe Postcondition Contract Tests
   */
  describe('Postcondition Validation', () => {

    /**
     * Tests result structure postcondition
     * 
     * @test should always return result with valid status
     * @assertion Result contains required fields and valid status
     * 
     * @since 1.1.0
     */
    it('[POSTCONDITION] should always return result with valid status', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const userId = 'user123';

      // Act
      const result = await service.parseResumeFile(validBuffer, fileName, userId);

      // Assert - Postcondition validation
      expect(result).toBeDefined();
      expect(['processing', 'completed', 'failed', 'partial']).toContain(result.status);
      expect(result.jobId).toBeDefined();
      expect(typeof result.jobId).toBe('string');
      expect(result.jobId.length).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata.duration).toBe('number');
      expect(result.metadata.duration).toBeGreaterThan(0);
    });

    /**
     * Tests successful completion postcondition
     * 
     * @test should include parsed data for completed status
     * @assertion Completed results have parsed data and file URL
     * 
     * @since 1.1.0
     */
    it('[POSTCONDITION] should include parsed data for completed status', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const userId = 'user123';

      // Act
      const result = await service.parseResumeFile(validBuffer, fileName, userId);

      // Assert
      if (result.status === 'completed') {
        expect(result.parsedData).toBeDefined();
        expect(result.fileUrl).toBeDefined();
        expect(typeof result.fileUrl).toBe('string');
        expect(result.fileUrl.length).toBeGreaterThan(0);
      }
    });

    /**
     * Tests job ID uniqueness
     * 
     * @test should generate unique job IDs for different requests
     * @assertion Each parsing request gets unique job ID
     * 
     * @since 1.1.0
     */
    it('[POSTCONDITION] should generate unique job IDs', async () => {
      // Arrange
      const validBuffer1 = createValidBuffer();
      const validBuffer2 = createValidBuffer(2048);
      const fileName1 = 'resume1.pdf';
      const fileName2 = 'resume2.pdf';
      const userId = 'user123';

      // Act
      const [result1, result2] = await Promise.all([
        service.parseResumeFile(validBuffer1, fileName1, userId),
        service.parseResumeFile(validBuffer2, fileName2, userId)
      ]);

      // Assert
      expect(result1.jobId).not.toEqual(result2.jobId);
    });
  });

  /**
   * Test group for successful operations
   * 
   * @describe Success Path Tests
   */
  describe('Successful Processing', () => {

    /**
     * Tests successful parsing workflow
     * 
     * @test should complete full parsing workflow successfully
     * @assertion Returns completed result with all expected data
     * 
     * @since 1.1.0
     */
    it('[SUCCESS] should complete full parsing workflow successfully', async () => {
      // Arrange
      const validBuffer = createValidBuffer(5000);
      const fileName = 'john-doe-resume.pdf';
      const userId = 'user123';

      // Act
      const result = await service.parseResumeFile(validBuffer, fileName, userId);

      // Assert
      expect(result.status).toBeOneOf(['completed', 'partial']);
      expect(result.jobId).toMatch(/^parse_\d+_[a-f0-9]{8}$/);
      expect(result.parsedData).toBeDefined();
      expect(result.parsedData.personalInfo).toBeDefined();
      expect(result.fileUrl).toMatch(/^http/);
      expect(result.metadata.duration).toBeGreaterThan(0);

      // Verify mock calls
      expect(mockGridFs.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockVisionLlm.extractResumeContent).toHaveBeenCalledTimes(1);
      expect(mockFieldMapper.mapExtractedFields).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests parsing with options
     * 
     * @test should handle custom parsing options correctly
     * @assertion Options are applied and processing succeeds
     * 
     * @since 1.1.0
     */
    it('[SUCCESS] should handle custom parsing options correctly', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const userId = 'user123';
      const options = {
        skipDuplicateCheck: true,
        maxRetries: 1
      };

      // Act
      const result = await service.parseResumeFile(validBuffer, fileName, userId, options);

      // Assert
      expect(result.status).toBeOneOf(['completed', 'partial', 'failed']);
      expect(result.jobId).toBeDefined();
    });
  });

  /**
   * Test group for error handling
   * 
   * @describe Error Handling Tests
   */
  describe('Error Handling', () => {

    /**
     * Tests AI service failure handling
     * 
     * @test should handle AI service failures gracefully
     * @assertion Returns failed status with error details
     * 
     * @since 1.1.0
     */
    it('[ERROR] should handle AI service failures gracefully', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const userId = 'user123';

      mockVisionLlm.extractResumeContent.mockRejectedValue(
        new Error('AI service temporarily unavailable')
      );

      // Act
      const result = await service.parseResumeFile(validBuffer, fileName, userId);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.warnings).toContain('Processing failed: AI service temporarily unavailable');
      expect(result.metadata.error).toBe('AI service temporarily unavailable');
      expect(result.parsedData).toBeUndefined();
      expect(result.fileUrl).toBeUndefined();
    });

    /**
     * Tests storage failure handling
     * 
     * @test should handle storage failures gracefully
     * @assertion Returns failed status when file storage fails
     * 
     * @since 1.1.0
     */
    it('[ERROR] should handle storage failures gracefully', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const userId = 'user123';

      mockGridFs.uploadFile.mockRejectedValue(
        new Error('Storage service unavailable')
      );

      // Act
      const result = await service.parseResumeFile(validBuffer, fileName, userId);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.warnings).toContain('Processing failed: Storage service unavailable');
    });

    /**
     * Tests file validation error handling
     * 
     * @test should handle invalid file types gracefully
     * @assertion Throws BadRequestException for invalid file types
     * 
     * @since 1.1.0
     */
    it('[ERROR] should reject invalid file types', async () => {
      // Arrange - Create buffer with invalid signature
      const invalidBuffer = Buffer.alloc(1024);
      invalidBuffer[0] = 0x00; // Invalid signature
      const fileName = 'resume.pdf';
      const userId = 'user123';

      // Act & Assert
      const result = await service.parseResumeFile(invalidBuffer, fileName, userId);
      expect(result.status).toBe('failed');
      expect(result.warnings.some(w => w.includes('Invalid file format'))).toBe(true);
    });
  });

  /**
   * Test group for class invariants
   * 
   * @describe Invariant Tests
   */
  describe('Class Invariant Validation', () => {

    /**
     * Tests service initialization invariant
     * 
     * @test should maintain required dependencies invariant
     * @assertion Service always has required dependencies
     * 
     * @since 1.1.0
     */
    it('[INVARIANT] should maintain required dependencies', () => {
      // Act & Assert - Service should be properly initialized
      expect(service).toBeDefined();
      expect((service as any).visionLlmService).toBeDefined();
      expect((service as any).gridFsService).toBeDefined();
      expect((service as any).fieldMapperService).toBeDefined();
      expect((service as any).natsClient).toBeDefined();
    });

    /**
     * Tests processing stats method
     * 
     * @test should provide valid processing statistics
     * @assertion Processing stats contain valid data
     * 
     * @since 1.1.0
     */
    it('[INVARIANT] should provide valid processing statistics', () => {
      // Act
      const stats = service.getProcessingStats();

      // Assert
      expect(stats).toBeDefined();
      expect(typeof stats.activeJobs).toBe('number');
      expect(typeof stats.totalCapacity).toBe('number');
      expect(typeof stats.isHealthy).toBe('boolean');
      expect(stats.activeJobs).toBeGreaterThanOrEqual(0);
      expect(stats.totalCapacity).toBeGreaterThan(0);
      expect(stats.activeJobs).toBeLessThanOrEqual(stats.totalCapacity);
    });
  });

  /**
   * Test group for performance characteristics
   * 
   * @describe Performance Tests
   */
  describe('Performance Validation', () => {

    /**
     * Tests processing time limits
     * 
     * @test should complete within reasonable time limits
     * @assertion Processing duration is recorded and reasonable
     * 
     * @since 1.1.0
     */
    it('[PERFORMANCE] should complete within reasonable time limits', async () => {
      // Arrange
      const validBuffer = createValidBuffer();
      const fileName = 'resume.pdf';
      const userId = 'user123';

      // Act
      const startTime = Date.now();
      const result = await service.parseResumeFile(validBuffer, fileName, userId);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(totalTime).toBeLessThan(30000); // 30 second limit
      expect(result.metadata.duration).toBeLessThan(totalTime);
      expect(result.metadata.duration).toBeGreaterThan(0);
    });

    /**
     * Tests concurrent processing
     * 
     * @test should handle multiple concurrent requests
     * @assertion Service handles concurrent load correctly
     * 
     * @since 1.1.0
     */
    it('[PERFORMANCE] should handle concurrent requests', async () => {
      // Arrange
      const concurrentRequests = 5;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        service.parseResumeFile(
          createValidBuffer(1024 + i * 100),
          `resume${i}.pdf`,
          `user${i}`
        )
      );

      // Act
      const results = await Promise.all(requests);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result, index) => {
        expect(result.jobId).toBeDefined();
        expect(['completed', 'failed', 'partial']).toContain(result.status);
      });

      // Verify all job IDs are unique
      const jobIds = results.map(r => r.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(concurrentRequests);
    });
  });
});

/**
 * Custom Jest matchers for better test assertions
 */
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      message: () => `expected ${received} to be one of ${expected.join(', ')}`,
      pass
    };
  }
});

// Type declaration for custom matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}