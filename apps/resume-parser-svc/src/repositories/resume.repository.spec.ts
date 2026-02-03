import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { ResumeRepository } from './resume.repository';
import type { ResumeDocument } from '../schemas/resume.schema';
import { Resume } from '../schemas/resume.schema';
import { TestProviders } from '../testing/test-providers';

describe('ResumeRepository', () => {
  let repository: ResumeRepository;
  let mockResumeModel: jest.Mocked<Model<ResumeDocument>>;

  beforeEach(async () => {
    // Use TestProviders for consistent mock setup
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResumeRepository, TestProviders.getMockResumeModel()],
    }).compile();

    repository = module.get<ResumeRepository>(ResumeRepository);
    mockResumeModel = module.get(getModelToken(Resume.name, 'resume-parser'));

    // Mock logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new resume successfully', async () => {
      const resumeData = {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1-234-567-8900',
        },
        skills: ['JavaScript', 'TypeScript'],
        status: 'pending' as const,
      };

      const savedResume = {
        ...resumeData,
        _id: 'resume-123',
        save: jest.fn().mockResolvedValue({
          ...resumeData,
          _id: 'resume-123',
        }),
      };

      (mockResumeModel as any).mockImplementation(() => savedResume);

      const result = await repository.create(resumeData);

      expect(result).toEqual({
        ...resumeData,
        _id: 'resume-123',
      });
      expect(savedResume.save).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Created resume with ID: resume-123',
      );
    });

    it('should handle creation errors', async () => {
      const resumeData = { skills: [] };
      const error = new Error('Validation failed');

      const failingResume = {
        save: jest.fn().mockRejectedValue(error),
      };

      (mockResumeModel as any).mockImplementation(() => failingResume);

      await expect(repository.create(resumeData)).rejects.toThrow(
        'Validation failed',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error creating resume:',
        error,
      );
    });
  });

  describe('findById', () => {
    it('should find resume by ID successfully', async () => {
      const mockResume = {
        _id: 'resume-123',
        contactInfo: { name: 'John Doe' },
      };

      mockResumeModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResume),
      });

      const result = await repository.findById('resume-123');

      expect(result).toEqual(mockResume);
      expect(mockResumeModel.findById).toHaveBeenCalledWith('resume-123');
    });

    it('should return null when resume not found', async () => {
      mockResumeModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
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
  });

  describe('findByEmail', () => {
    it('should find resumes by email successfully', async () => {
      const mockResumes = [
        { _id: '1', contactInfo: { email: 'john@example.com' } },
        { _id: '2', contactInfo: { email: 'john@example.com' } },
      ];

      mockResumeModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResumes),
      });

      const result = await repository.findByEmail('john@example.com');

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        'contactInfo.email': 'john@example.com',
      });
    });

    it('should return empty array when no resumes found', async () => {
      mockResumeModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toEqual([]);
    });

    it('should handle errors when finding by email', async () => {
      const error = new Error('Query failed');
      mockResumeModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow(
        'Query failed',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error finding resumes by email test@example.com:',
        error,
      );
    });
  });

  describe('findByGridFsUrl', () => {
    it('should find resume by GridFS URL successfully', async () => {
      const mockResume = {
        _id: 'resume-123',
        gridFsUrl: 'gridfs://resume-file-123',
      };

      mockResumeModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResume),
      });

      const result = await repository.findByGridFsUrl(
        'gridfs://resume-file-123',
      );

      expect(result).toEqual(mockResume);
      expect(mockResumeModel.findOne).toHaveBeenCalledWith({
        gridFsUrl: 'gridfs://resume-file-123',
      });
    });

    it('should return null when no resume found by GridFS URL', async () => {
      mockResumeModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findByGridFsUrl('gridfs://nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors when finding by GridFS URL', async () => {
      const error = new Error('GridFS error');
      mockResumeModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.findByGridFsUrl('gridfs://test')).rejects.toThrow(
        'GridFS error',
      );
    });
  });

  describe('updateById', () => {
    it('should update resume by ID successfully', async () => {
      const updateData = { status: 'completed' };
      const updatedResume = {
        _id: 'resume-123',
        status: 'completed',
      };

      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedResume),
      });

      const result = await repository.updateById('resume-123', updateData);

      expect(result).toEqual(updatedResume);
      expect(mockResumeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'resume-123',
        updateData,
        { new: true, runValidators: true },
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Updated resume with ID: resume-123',
      );
    });

    it('should return null when updating non-existent resume', async () => {
      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.updateById('nonexistent', {
        status: 'completed',
      });

      expect(result).toBeNull();
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.updateById('resume-123', {})).rejects.toThrow(
        'Update failed',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error updating resume resume-123:',
        error,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const updatedResume = {
        _id: 'resume-123',
        status: 'completed',
        processedAt: new Date(),
      };

      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedResume),
      });

      const result = await repository.updateStatus('resume-123', 'completed');

      expect(result).toEqual(updatedResume);
      expect(mockResumeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'resume-123',
        expect.objectContaining({
          status: 'completed',
          processedAt: expect.any(Date),
        }),
        { new: true, runValidators: true },
      );
    });

    it('should update status with error message', async () => {
      const updatedResume = {
        _id: 'resume-123',
        status: 'failed',
        errorMessage: 'Parsing error',
      };

      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedResume),
      });

      const result = await repository.updateStatus(
        'resume-123',
        'failed',
        'Parsing error',
      );

      expect(result).toEqual(updatedResume);
      expect(mockResumeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'resume-123',
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Parsing error',
        }),
        { new: true, runValidators: true },
      );
    });

    it('should handle status update errors', async () => {
      const error = new Error('Status update failed');
      mockResumeModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(
        repository.updateStatus('resume-123', 'completed'),
      ).rejects.toThrow('Status update failed');
    });
  });

  describe('deleteById', () => {
    it('should delete resume successfully', async () => {
      const deletedResume = { _id: 'resume-123' };

      mockResumeModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedResume),
      });

      const result = await repository.deleteById('resume-123');

      expect(result).toBe(true);
      expect(mockResumeModel.findByIdAndDelete).toHaveBeenCalledWith(
        'resume-123',
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Deleted resume with ID: resume-123',
      );
    });

    it('should return false when deleting non-existent resume', async () => {
      mockResumeModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.deleteById('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      mockResumeModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.deleteById('resume-123')).rejects.toThrow(
        'Deletion failed',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error deleting resume resume-123:',
        error,
      );
    });
  });

  describe('findByStatus', () => {
    it('should find resumes by status with limit', async () => {
      const mockResumes = [
        { _id: '1', status: 'pending' },
        { _id: '2', status: 'pending' },
      ];

      const chainMock = {
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      const result = await repository.findByStatus('pending', 50);

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({ status: 'pending' });
      expect(chainMock.limit).toHaveBeenCalledWith(50);
      expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should use default limit when not provided', async () => {
      const chainMock = {
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      await repository.findByStatus('completed');

      expect(chainMock.limit).toHaveBeenCalledWith(100);
    });

    it('should handle errors when finding by status', async () => {
      const error = new Error('Status query failed');
      mockResumeModel.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.findByStatus('pending')).rejects.toThrow(
        'Status query failed',
      );
    });
  });

  describe('findPending', () => {
    it('should find pending resumes', async () => {
      const mockResumes = [{ _id: '1', status: 'pending' }];

      const chainMock = {
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      const result = await repository.findPending();

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({ status: 'pending' });
      expect(chainMock.limit).toHaveBeenCalledWith(50);
    });

    it('should use custom limit for finding pending resumes', async () => {
      const chainMock = {
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      await repository.findPending(25);

      expect(chainMock.limit).toHaveBeenCalledWith(25);
    });
  });

  describe('findCompleted', () => {
    it('should find completed resumes', async () => {
      const mockResumes = [{ _id: '1', status: 'completed' }];

      const chainMock = {
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      const result = await repository.findCompleted();

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        status: 'completed',
      });
      expect(chainMock.limit).toHaveBeenCalledWith(100);
    });

    it('should use custom limit for finding completed resumes', async () => {
      const chainMock = {
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      await repository.findCompleted(200);

      expect(chainMock.limit).toHaveBeenCalledWith(200);
    });
  });

  describe('countByStatus', () => {
    it('should count resumes by status', async () => {
      const aggregateResult = [
        { _id: 'pending', count: 10 },
        { _id: 'completed', count: 25 },
        { _id: 'failed', count: 3 },
      ];

      mockResumeModel.aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(aggregateResult),
      });

      const result = await repository.countByStatus();

      expect(result).toEqual({
        pending: 10,
        completed: 25,
        failed: 3,
      });

      expect(mockResumeModel.aggregate).toHaveBeenCalledWith([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);
    });

    it('should return empty object when no resumes exist', async () => {
      mockResumeModel.aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await repository.countByStatus();

      expect(result).toEqual({});
    });

    it('should handle aggregation errors', async () => {
      const error = new Error('Aggregation failed');
      mockResumeModel.aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.countByStatus()).rejects.toThrow(
        'Aggregation failed',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error counting resumes by status:',
        error,
      );
    });
  });

  describe('findWithSkills', () => {
    it('should find resumes with specified skills', async () => {
      const mockResumes = [
        { _id: '1', skills: ['JavaScript', 'React'] },
        { _id: '2', skills: ['TypeScript', 'React'] },
      ];

      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        hint: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResumes),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      const result = await repository.findWithSkills(['JavaScript', 'React']);

      expect(result).toEqual(mockResumes);
      expect(mockResumeModel.find).toHaveBeenCalledWith({
        skills: { $in: ['JavaScript', 'React'] },
        processingConfidence: { $gte: 0.0 },
        status: 'completed',
      });
    });

    it('should use custom options for skill search', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        hint: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockResumeModel.find = jest.fn().mockReturnValue(chainMock);

      await repository.findWithSkills(['Python'], {
        limit: 50,
        minConfidence: 0.8,
        includeInProgress: true,
        sortBy: 'date',
        projection: { name: 1, skills: 1 },
      });

      expect(mockResumeModel.find).toHaveBeenCalledWith({
        skills: { $in: ['Python'] },
        processingConfidence: { $gte: 0.8 },
        status: { $in: ['completed', 'processing'] },
      });
      expect(chainMock.limit).toHaveBeenCalledWith(50);
      expect(chainMock.select).toHaveBeenCalledWith({ name: 1, skills: 1 });
    });

    it('should handle errors in skill-based search', async () => {
      const error = new Error('Skill search failed');
      mockResumeModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        hint: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(repository.findWithSkills(['Java'])).rejects.toThrow(
        'Skill search failed',
      );
    });
  });

  describe('healthCheck', () => {
    it('should perform health check successfully', async () => {
      mockResumeModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(42),
      });

      const result = await repository.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        count: 42,
      });
    });

    it('should handle health check errors', async () => {
      const error = new Error('Health check failed');
      mockResumeModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      const result = await repository.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        count: 0,
        error: 'Health check failed',
      });
    });
  });
});
