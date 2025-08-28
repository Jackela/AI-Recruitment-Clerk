/**
 * @fileoverview JobsService Design by Contract Tests
 * @author AI Recruitment Team
 * @since 1.0.0
 * @version 1.0.0
 * @module JobsServiceContractTests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractViolationError, ContractTestUtils } from '@app/shared-dtos';
import { JobsServiceContracts } from './jobs.service.contracts';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import { NatsClient } from '../nats/nats.client';
import { CacheService } from '../cache/cache.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UserDto, UserRole, UserStatus } from '@app/shared-dtos';
import { MulterFile } from './types/multer.types';

describe('JobsServiceContracts', () => {
  let service: JobsServiceContracts;
  let storageService: jest.Mocked<InMemoryStorageService>;
  let natsClient: jest.Mocked<NatsClient>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser: UserDto = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    get name() { return `${this.firstName} ${this.lastName}`; },
    role: UserRole.RECRUITER,
    organizationId: 'org-456',
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAdminUser: UserDto = {
    id: 'admin-123',
    email: 'admin@example.com', 
    firstName: 'Admin',
    lastName: 'User',
    get name() { return `${this.firstName} ${this.lastName}`; },
    role: UserRole.ADMIN,
    organizationId: 'org-admin',
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const mockStorageService = {
      seedMockData: jest.fn(),
      createJob: jest.fn(),
      getJob: jest.fn(),
      getAllJobs: jest.fn().mockReturnValue([]),
      createResume: jest.fn(),
      getResume: jest.fn(),
      getResumesByJobId: jest.fn().mockReturnValue([]),
      getReportsByJobId: jest.fn().mockReturnValue([]),
      createReport: jest.fn()
    };

    const mockNatsClient = {
      publishJobJdSubmitted: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
      publishResumeSubmitted: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-456' })
    };

    const mockCacheService = {
      generateKey: jest.fn().mockReturnValue('cache-key'),
      wrap: jest.fn().mockImplementation((key, fn) => fn())
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsServiceContracts,
        { provide: InMemoryStorageService, useValue: mockStorageService },
        { provide: NatsClient, useValue: mockNatsClient },
        { provide: CacheService, useValue: mockCacheService }
      ],
    }).compile();

    service = module.get<JobsServiceContracts>(JobsServiceContracts);
    storageService = module.get(InMemoryStorageService);
    natsClient = module.get(NatsClient);
    cacheService = module.get(CacheService);
  });

  describe('Class Invariants', () => {
    it('should have all required dependencies injected', () => {
      expect(service['storageService']).toBeDefined();
      expect(service['natsClient']).toBeDefined();
      expect(service['cacheService']).toBeDefined();
    });
  });

  describe('createJob - Contract Validation', () => {
    const validCreateJobDto: CreateJobDto = {
      jobTitle: 'Senior Developer',
      jdText: 'We are looking for a senior developer with 5+ years experience...'
    };

    describe('Precondition Tests', () => {
      it('should reject empty job title', async () => {
        const invalidDto = { ...validCreateJobDto, jobTitle: '' };
        
        await ContractTestUtils.expectAsyncContractViolation(
          () => service.createJob(invalidDto, mockUser),
          'PRE',
          'Job creation requires valid title, JD text, and authenticated user with organization'
        );
      });

      it('should reject empty JD text', async () => {
        const invalidDto = { ...validCreateJobDto, jdText: '' };
        
        await ContractTestUtils.expectAsyncContractViolation(
          () => service.createJob(invalidDto, mockUser),
          'PRE',
          'Job creation requires valid title, JD text, and authenticated user with organization'
        );
      });

      it('should reject invalid user', async () => {
        const invalidUser = { ...mockUser, id: '', get name() { return `${this.firstName} ${this.lastName}`; } };
        
        await ContractTestUtils.expectAsyncContractViolation(
          () => service.createJob(validCreateJobDto, invalidUser),
          'PRE',
          'Job creation requires valid title, JD text, and authenticated user with organization'
        );
      });

      it('should reject user without organization', async () => {
        const invalidUser = { ...mockUser, organizationId: '', get name() { return `${this.firstName} ${this.lastName}`; } };
        
        await ContractTestUtils.expectAsyncContractViolation(
          () => service.createJob(validCreateJobDto, invalidUser),
          'PRE',
          'Job creation requires valid title, JD text, and authenticated user with organization'
        );
      });
    });

    describe('Postcondition Tests', () => {
      it('should return valid UUID job ID', async () => {
        const result = await service.createJob(validCreateJobDto, mockUser);
        
        expect(result.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(storageService.createJob).toHaveBeenCalled();
      });

      it('should publish NATS event for job processing', async () => {
        const result = await service.createJob(validCreateJobDto, mockUser);
        
        expect(natsClient.publishJobJdSubmitted).toHaveBeenCalledWith({
          jobId: result.jobId,
          jobTitle: validCreateJobDto.jobTitle,
          jdText: validCreateJobDto.jdText,
          timestamp: expect.any(String)
        });
      });
    });

    describe('Success Cases', () => {
      it('should create job with valid inputs', async () => {
        const result = await service.createJob(validCreateJobDto, mockUser);
        
        expect(result).toHaveProperty('jobId');
        expect(typeof result.jobId).toBe('string');
        expect(result.jobId.length).toBeGreaterThan(0);
      });

      it('should work for admin users', async () => {
        const result = await service.createJob(validCreateJobDto, mockAdminUser);
        
        expect(result).toHaveProperty('jobId');
        expect(storageService.createJob).toHaveBeenCalled();
      });
    });
  });

  describe('uploadResumes - Contract Validation', () => {
    const validJobId = 'job-123';
    const mockFiles: MulterFile[] = [
      {
        fieldname: 'resumes',
        originalname: 'john_doe_resume.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('mock pdf content')
      } as MulterFile,
      {
        fieldname: 'resumes',
        originalname: 'jane_smith_resume.pdf', 
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        buffer: Buffer.from('mock pdf content 2')
      } as MulterFile
    ];

    beforeEach(() => {
      storageService.getJob.mockReturnValue({
        id: validJobId,
        title: 'Test Job',
        status: 'processing',
        organizationId: mockUser.organizationId
      } as any);
    });

    describe('Precondition Tests', () => {
      it('should reject empty job ID', () => {
        expect(() => service.uploadResumes('', mockFiles, mockUser))
          .toThrow(ContractViolationError);
      });

      it('should reject empty file array', () => {
        expect(() => service.uploadResumes(validJobId, [], mockUser))
          .toThrow(ContractViolationError);
      });

      it('should reject files exceeding size limit', () => {
        const oversizedFiles = [{
          ...mockFiles[0],
          size: 11 * 1024 * 1024 // 11MB > 10MB limit
        }];
        
        expect(() => service.uploadResumes(validJobId, oversizedFiles, mockUser))
          .toThrow(ContractViolationError);
      });

      it('should reject invalid user', () => {
        const invalidUser = { ...mockUser, id: '', get name() { return `${this.firstName} ${this.lastName}`; } };
        
        expect(() => service.uploadResumes(validJobId, mockFiles, invalidUser))
          .toThrow(ContractViolationError);
      });
    });

    describe('Postcondition Tests', () => {
      it('should return correct upload count', () => {
        const result = service.uploadResumes(validJobId, mockFiles, mockUser);
        
        expect(result.jobId).toBe(validJobId);
        expect(result.submittedResumes).toBe(mockFiles.length);
      });
    });

    describe('Business Logic Tests', () => {
      it('should check job existence', () => {
        storageService.getJob.mockReturnValue(null);
        
        expect(() => service.uploadResumes(validJobId, mockFiles, mockUser))
          .toThrow(NotFoundException);
      });

      it('should check user access to job', () => {
        const differentOrgJob = {
          id: validJobId,
          organizationId: 'different-org'
        };
        storageService.getJob.mockReturnValue(differentOrgJob as any);
        
        expect(() => service.uploadResumes(validJobId, mockFiles, mockUser))
          .toThrow(ForbiddenException);
      });

      it('should allow admin access to any job', () => {
        const differentOrgJob = {
          id: validJobId, 
          organizationId: 'different-org'
        };
        storageService.getJob.mockReturnValue(differentOrgJob as any);
        
        const result = service.uploadResumes(validJobId, mockFiles, mockAdminUser);
        expect(result.submittedResumes).toBe(mockFiles.length);
      });
    });
  });

  describe('getAllJobs - Contract Validation', () => {
    describe('Postcondition Tests', () => {
      it('should return array even when empty', async () => {
        storageService.getAllJobs.mockReturnValue([]);
        
        const result = await service.getAllJobs();
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });

      it('should return valid job structure', async () => {
        const mockJobs = [{
          id: 'job-1',
          title: 'Test Job',
          status: 'completed',
          createdAt: new Date(),
          resumeCount: 5
        }];
        storageService.getAllJobs.mockReturnValue(mockJobs as any);
        
        const result = await service.getAllJobs();
        
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('title');
        expect(['processing', 'completed', 'failed']).toContain(result[0].status);
      });
    });

    describe('Caching Integration', () => {
      it('should use cache service', async () => {
        await service.getAllJobs();
        
        expect(cacheService.generateKey).toHaveBeenCalledWith('jobs', 'list');
        expect(cacheService.wrap).toHaveBeenCalled();
      });
    });
  });

  describe('getJobById - Contract Validation', () => {
    const validJobId = 'job-123';
    const mockJobDetail = {
      id: validJobId,
      title: 'Test Job',
      jdText: 'Job description',
      status: 'completed',
      createdAt: new Date(),
      resumeCount: 3
    };

    describe('Precondition Tests', () => {
      it('should reject empty job ID', async () => {
        await ContractTestUtils.expectAsyncContractViolation(
          () => service.getJobById(''),
          'PRE',
          'Job ID must be non-empty string'
        );
      });

      it('should reject null job ID', async () => {
        await ContractTestUtils.expectAsyncContractViolation(
          () => service.getJobById(null as any),
          'PRE',
          'Job ID must be non-empty string'
        );
      });
    });

    describe('Postcondition Tests', () => {
      beforeEach(() => {
        storageService.getJob.mockReturnValue(mockJobDetail as any);
      });

      it('should return valid job detail structure', async () => {
        const result = await service.getJobById(validJobId);
        
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(['processing', 'completed', 'failed']).toContain(result.status);
        expect(typeof result.id).toBe('string');
        expect(result.id.length).toBeGreaterThan(0);
      });
    });

    describe('Error Handling', () => {
      it('should throw NotFoundException for non-existent job', async () => {
        storageService.getJob.mockReturnValue(null);
        
        await expect(service.getJobById(validJobId))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('Caching Integration', () => {
      beforeEach(() => {
        storageService.getJob.mockReturnValue(mockJobDetail as any);
      });

      it('should use cache with job ID', async () => {
        await service.getJobById(validJobId);
        
        expect(cacheService.generateKey).toHaveBeenCalledWith('jobs', 'detail', validJobId);
        expect(cacheService.wrap).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle contract validation efficiently', async () => {
      const startTime = Date.now();
      
      // Run multiple contract validations
      for (let i = 0; i < 100; i++) {
        await service.createJob({
          jobTitle: `Test Job ${i}`,
          jdText: `Description ${i}`
        }, mockUser);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});