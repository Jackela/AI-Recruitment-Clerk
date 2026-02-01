import type { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Resume } from '../schemas/resume.schema';

/**
 * Common test providers for resume-parser-svc tests
 */
export class TestProviders {
  /**
   * Get mock Mongoose model provider
   */
  static getMockMongooseModel(modelName: string): Provider {
    const mockModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: '507f1f77bcf86cd799439011',
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: '507f1f77bcf86cd799439011',
        toObject: jest.fn().mockReturnValue({
          ...data,
          _id: '507f1f77bcf86cd799439011',
        }),
      }),
      toObject: jest.fn().mockReturnValue({
        ...data,
        _id: '507f1f77bcf86cd799439011',
      }),
    }));

    // Add static methods
    mockModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    });

    mockModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    mockModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
    mockModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    mockModel.aggregate = jest.fn().mockResolvedValue([]);

    return {
      provide: getModelToken(modelName, 'resume-parser'),
      useValue: mockModel,
    };
  }

  /**
   * Get mock Resume model
   */
  static getMockResumeModel(): Provider {
    return this.getMockMongooseModel(Resume.name);
  }

  /**
   * Get mock GridFS connection
   */
  static getMockGridFsConnection(): Provider {
    const mockGridFSBucket = {
      openDownloadStream: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        pipe: jest.fn(),
        read: jest.fn(),
      })),
      openUploadStream: jest.fn().mockImplementation(() => ({
        id: '507f1f77bcf86cd799439011',
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      })),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockConnection = {
      readyState: 1,
      db: {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          findOne: jest.fn().mockResolvedValue(null),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
        }),
      },
      GridFSBucket: jest.fn().mockReturnValue(mockGridFSBucket),
      close: jest.fn().mockResolvedValue(undefined),
    };

    return {
      provide: 'resume-parserConnection',
      useValue: mockConnection,
    };
  }

  /**
   * Get mock NATS client
   */
  static getMockNatsClient(): Provider {
    return {
      provide: 'ResumeParserNatsService',
      useValue: {
        publishAnalysisResumeParsed: jest.fn().mockResolvedValue({
          success: true,
          messageId: 'msg-123',
        }),
        publishJobResumeFailed: jest.fn().mockResolvedValue({
          success: true,
          messageId: 'msg-456',
        }),
        publishProcessingError: jest.fn().mockResolvedValue({
          success: true,
          messageId: 'msg-789',
        }),
        subscribeToResumeSubmissions: jest.fn().mockResolvedValue(undefined),
        getServiceHealthStatus: jest.fn().mockResolvedValue({
          connected: true,
          service: 'resume-parser-svc',
          lastActivity: new Date(),
          subscriptions: ['job.resume.submitted'],
          messagesSent: 0,
          messagesReceived: 0,
        }),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: true,
      },
    };
  }

  /**
   * Get mock Vision LLM service
   */
  static getMockVisionLlmService(): Provider {
    return {
      provide: 'VisionLlmService',
      useValue: {
        parseResumePdf: jest.fn().mockResolvedValue({
          contactInfo: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1-555-0123',
          },
          skills: ['JavaScript', 'TypeScript'],
          workExperience: [],
          education: [],
        }),
        parseResumePdfAdvanced: jest.fn().mockResolvedValue({
          extractedData: {
            contactInfo: {
              name: 'Test User',
              email: 'test@example.com',
              phone: '+1-555-0123',
            },
            skills: ['JavaScript', 'TypeScript'],
            workExperience: [],
            education: [],
          },
          confidence: 0.95,
          processingTimeMs: 1000,
        }),
        healthCheck: jest.fn().mockResolvedValue(true),
      },
    };
  }

  /**
   * Get mock Field Mapper service
   */
  static getMockFieldMapperService(): Provider {
    return {
      provide: 'FieldMapperService',
      useValue: {
        normalizeToResumeDto: jest.fn().mockResolvedValue({
          contactInfo: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1-555-0123',
          },
          skills: ['JavaScript', 'TypeScript'],
          workExperience: [],
          education: [],
        }),
        normalizeWithValidation: jest.fn().mockResolvedValue({
          resumeDto: {
            contactInfo: {
              name: 'Test User',
              email: 'test@example.com',
              phone: '+1-555-0123',
            },
            skills: ['JavaScript', 'TypeScript'],
            workExperience: [],
            education: [],
          },
          validationErrors: [],
          mappingConfidence: 0.95,
        }),
        normalizeSkills: jest
          .fn()
          .mockResolvedValue(['JavaScript', 'TypeScript']),
        calculateExperience: jest.fn().mockResolvedValue({
          totalYears: 5,
          relevantYears: 3,
          seniorityLevel: 'Mid',
          confidenceScore: 0.85,
        }),
      },
    };
  }

  /**
   * Get mock GridFS service
   */
  static getMockGridFsService(): Provider {
    return {
      provide: 'GridFsService',
      useValue: {
        uploadFile: jest
          .fn()
          .mockResolvedValue('gridfs://resume-files/507f1f77bcf86cd799439011'),
        downloadFile: jest
          .fn()
          .mockResolvedValue(Buffer.from('test-pdf-content')),
        fileExists: jest.fn().mockResolvedValue(true),
        getFileInfo: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          filename: 'test.pdf',
          length: 1024,
          uploadDate: new Date(),
        }),
        deleteFile: jest.fn().mockResolvedValue(true),
        healthCheck: jest.fn().mockResolvedValue({
          status: 'healthy',
          connected: true,
        }),
        onModuleInit: jest.fn().mockResolvedValue(undefined),
        onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      },
    };
  }

  /**
   * Get all common mock providers
   */
  static getAllMockProviders(): Provider[] {
    return [
      this.getMockResumeModel(),
      this.getMockGridFsConnection(),
      this.getMockNatsClient(),
      this.getMockVisionLlmService(),
      this.getMockFieldMapperService(),
      this.getMockGridFsService(),
    ];
  }
}
