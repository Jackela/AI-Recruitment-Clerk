import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import type { Model, ClientSession } from 'mongoose';
import type {
  FileMetadata,
  ResumeCreateData,
  ResumeUpdateData} from './resume.repository';
import {
  ResumeRepository
} from './resume.repository';
import { Resume } from '../schemas/resume.schema';
import type { ResumeDocument } from '../schemas/resume.schema';

describe('ResumeRepository', () => {
  let repository: ResumeRepository;
  let mockResumeModel: jest.Mocked<Model<ResumeDocument>>;

  const mockFileMetadata: FileMetadata = {
    filePath: '/uploads/resumes/test-resume.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    checksum: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    originalName: 'test-resume.pdf',
  };

  const mockResumeData: ResumeCreateData = {
    candidateId: 'candidate-123',
    candidateEmail: 'john.doe@example.com',
    candidatePhone: '+1234567890',
    candidateName: 'John Doe',
    fileMetadata: mockFileMetadata,
    status: 'pending',
  };

  beforeEach(async () => {
    const mockExec = jest.fn();
    const mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    // Create a constructor function that also has all the static methods
    const MockResumeModel = jest.fn() as unknown as jest.Mocked<
      Model<ResumeDocument>
    >;

    mockResumeModel = Object.assign(MockResumeModel, {
      findById: jest.fn().mockReturnValue({ exec: mockExec }),
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: mockExec,
      }),
      findOne: jest.fn().mockReturnValue({ exec: mockExec }),
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec: mockExec }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec: mockExec }),
      create: jest.fn(),
      save: jest.fn(),
      insertMany: jest.fn(),
      bulkWrite: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn().mockReturnValue({ exec: mockExec }),
      db: {
        startSession: jest
          .fn()
          .mockResolvedValue(mockSession as unknown as ClientSession),
      },
    }) as jest.Mocked<Model<ResumeDocument>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeRepository,
        {
          provide: getModelToken(Resume.name),
          useValue: mockResumeModel,
        },
      ],
    }).compile();

    repository = module.get<ResumeRepository>(ResumeRepository);

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should create a resume with file metadata', async () => {
      const savedResume = {
        _id: 'resume-123',
        ...mockResumeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedResume = {
        ...savedResume,
        save: jest.fn().mockResolvedValue(savedResume),
      };

      (mockResumeModel as any).mockImplementation(() => mockCreatedResume);

      const result = await repository.create(mockResumeData);

      expect(result).toEqual(savedResume);
      expect(mockCreatedResume.save).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Created resume with ID: resume-123',
      );
    });

    it('should find resume by ID with relations when populateRelations is true', async () => {
      const mockResume = {
        _id: 'resume-123',
        candidateName: 'John Doe',
        populate: jest.fn().mockReturnThis(),
      };

      mockResumeModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResume),
      });

      const result = await repository.findById('resume-123', true);

      expect(result).toEqual(mockResume);
      expect(mockResumeModel.findById).toHaveBeenCalledWith('resume-123');
    });

    it('should update parsing status successfully', async () => {
      const updatedResume = {
        _id: 'resume-123',
        status: 'completed',
        parsedData: { skills: ['JavaScript', 'TypeScript'] },
        parsedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedResume),
      });

      const result = await repository.updateParsingStatus(
        'resume-123',
        'completed',
        { skills: ['JavaScript', 'TypeScript'] },
      );

      expect(result).toEqual(updatedResume);
      expect(mockResumeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'resume-123',
        expect.objectContaining({
          status: 'completed',
          parsedData: { skills: ['JavaScript', 'TypeScript'] },
          parsedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        { new: true, runValidators: true },
      );
    });

    it('should perform soft delete on a resume', async () => {
      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ _id: 'resume-123', status: 'deleted' }),
      });

      const result = await repository.softDelete('resume-123');

      expect(result).toBe(true);
      expect(mockResumeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'resume-123',
        expect.objectContaining({
          deletedAt: expect.any(Date),
          status: 'deleted',
          updatedAt: expect.any(Date),
        }),
        { new: true },
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Soft deleted resume with ID: resume-123',
      );
    });
  });

  describe('File Metadata Storage', () => {
    it('should store file path correctly', async () => {
      const mockResume = {
        _id: 'resume-123',
        fileMetadata: {
          filePath: '/uploads/resumes/test-resume.pdf',
        },
      };

      mockResumeModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockResume]),
      });

      const result = await repository.findByFilePath(
        '/uploads/resumes/test-resume.pdf',
      );

      expect(result).toContain(mockResume);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        'fileMetadata.filePath': '/uploads/resumes/test-resume.pdf',
      });
    });

    it('should track file size in metadata', async () => {
      const mockResume = {
        _id: 'resume-123',
        fileMetadata: {
          fileSize: 1024000,
        },
      };

      const mockCreatedResume = {
        ...mockResume,
        save: jest.fn().mockResolvedValue(mockResume),
      };

      (mockResumeModel as any).mockImplementation(() => mockCreatedResume);

      const result = await repository.create({
        fileMetadata: { ...mockFileMetadata, fileSize: 1024000 },
      } as ResumeCreateData);

      expect(result.fileMetadata.fileSize).toBe(1024000);
    });

    it('should validate MIME type successfully', async () => {
      const validMetadata: FileMetadata = {
        ...mockFileMetadata,
        mimeType: 'application/pdf',
      };

      const result = await repository.validateFileMetadata(validMetadata);

      expect(result).toBe(true);
    });

    it('should reject invalid MIME type', async () => {
      const invalidMetadata: FileMetadata = {
        ...mockFileMetadata,
        mimeType: 'application/exe',
      };

      const result = await repository.validateFileMetadata(invalidMetadata);

      expect(result).toBe(false);
    });

    it('should store and retrieve checksum', async () => {
      const mockResume = {
        _id: 'resume-123',
        fileMetadata: {
          checksum: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
        },
      };

      mockResumeModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResume),
      });

      const result = await repository.findByChecksum(
        'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      );

      expect(result).toEqual(mockResume);
      expect(mockResumeModel.findOne).toHaveBeenCalledWith({
        'fileMetadata.checksum': 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      });
    });
  });

  describe('Search by Candidate', () => {
    it('should find resumes by candidate ID', async () => {
      const mockResumes = [
        { _id: 'resume-1', candidateId: 'candidate-123' },
        { _id: 'resume-2', candidateId: 'candidate-123' },
      ];

      mockResumeModel.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      });

      const result = await repository.findByCandidateId('candidate-123');

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        candidateId: 'candidate-123',
      });
    });

    it('should find resumes by email', async () => {
      const mockResumes = [
        { _id: 'resume-1', candidateEmail: 'john@example.com' },
      ];

      mockResumeModel.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      });

      const result = await repository.findByEmail('john@example.com');

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        candidateEmail: 'john@example.com',
      });
    });

    it('should find resumes by phone', async () => {
      const mockResumes = [{ _id: 'resume-1', candidatePhone: '+1234567890' }];

      mockResumeModel.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      });

      const result = await repository.findByPhone('+1234567890');

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        candidatePhone: '+1234567890',
      });
    });

    it('should find resumes by name with partial match', async () => {
      const mockResumes = [
        { _id: 'resume-1', candidateName: 'John Doe' },
        { _id: 'resume-2', candidateName: 'Johnny Smith' },
      ];

      mockResumeModel.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      });

      const result = await repository.findByName('John');

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        candidateName: { $regex: 'John', $options: 'i' },
      });
    });

    it('should search by multiple candidate criteria', async () => {
      const mockResumes = [
        { _id: 'resume-1', candidateEmail: 'john@example.com' },
      ];

      mockResumeModel.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      });

      const result = await repository.searchByCandidate({
        candidateId: 'candidate-123',
        email: 'john@example.com',
        limit: 10,
        skip: 0,
      });

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        candidateId: 'candidate-123',
        candidateEmail: 'john@example.com',
      });
    });
  });

  describe('Batch Operations', () => {
    it('should batch insert multiple resumes', async () => {
      const resumes: ResumeCreateData[] = [
        { ...mockResumeData, candidateEmail: 'user1@example.com' },
        { ...mockResumeData, candidateEmail: 'user2@example.com' },
      ];

      const mockInsertedResumes = [
        { _id: 'resume-1', ...resumes[0] },
        { _id: 'resume-2', ...resumes[1] },
      ];

      mockResumeModel.insertMany = jest
        .fn()
        .mockResolvedValue(mockInsertedResumes);

      const result = await repository.batchInsert(resumes);

      expect(result).toEqual(mockInsertedResumes);
      expect(mockResumeModel.insertMany).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Batch inserted 2 resumes',
      );
    });

    it('should batch update multiple resumes', async () => {
      const updates = [
        { id: 'resume-1', data: { status: 'completed' } as ResumeUpdateData },
        { id: 'resume-2', data: { status: 'processing' } as ResumeUpdateData },
      ];

      mockResumeModel.bulkWrite = jest
        .fn()
        .mockResolvedValue({ modifiedCount: 2 });

      const result = await repository.batchUpdate(updates);

      expect(result).toBe(2);
      expect(mockResumeModel.bulkWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updateOne: {
              filter: { _id: 'resume-1' },
              update: expect.any(Object),
            },
          }),
          expect.objectContaining({
            updateOne: {
              filter: { _id: 'resume-2' },
              update: expect.any(Object),
            },
          }),
        ]),
      );
    });

    it('should batch soft delete multiple resumes', async () => {
      const ids = ['resume-1', 'resume-2', 'resume-3'];

      mockResumeModel.updateMany = jest
        .fn()
        .mockResolvedValue({ modifiedCount: 3 });

      const result = await repository.batchSoftDelete(ids);

      expect(result).toBe(3);
      expect(mockResumeModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ids } },
        {
          $set: expect.objectContaining({
            deletedAt: expect.any(Date),
            status: 'deleted',
            updatedAt: expect.any(Date),
          }),
        },
      );
    });

    it('should handle transaction rollback on error', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      mockResumeModel.db.startSession = jest
        .fn()
        .mockResolvedValue(mockSession as unknown as ClientSession);

      const error = new Error('Transaction failed');
      const operations = jest.fn().mockRejectedValue(error);

      await expect(repository.withTransaction(operations)).rejects.toThrow(
        'Transaction failed',
      );

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Transaction failed:',
        error,
      );
    });

    it('should execute transaction successfully', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      };

      mockResumeModel.db.startSession = jest
        .fn()
        .mockResolvedValue(mockSession as unknown as ClientSession);

      const operations = jest.fn().mockResolvedValue('success');

      const result = await repository.withTransaction(operations);

      expect(result).toBe('success');
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle create errors', async () => {
      const error = new Error('Validation failed');
      const failingResume = {
        save: jest.fn().mockRejectedValue(error),
      };

      (mockResumeModel as any).mockImplementation(() => failingResume);

      await expect(repository.create(mockResumeData)).rejects.toThrow(
        'Validation failed',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error creating resume:',
        error,
      );
    });

    it('should handle find errors', async () => {
      const error = new Error('Database error');
      mockResumeModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.findById('resume-123')).rejects.toThrow(
        'Database error',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error finding resume by ID resume-123:',
        error,
      );
    });

    it('should return null when resume not found', async () => {
      mockResumeModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return false when soft deleting non-existent resume', async () => {
      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      mockResumeModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(42),
      });

      const result = await repository.healthCheck();

      expect(result).toEqual({ status: 'healthy', count: 42 });
    });

    it('should return unhealthy status on error', async () => {
      mockResumeModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await repository.healthCheck();

      expect(result).toEqual({ status: 'unhealthy', count: -1 });
    });
  });
});
