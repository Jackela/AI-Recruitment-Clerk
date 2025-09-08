import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GridFsService } from './gridfs.service';
import { MongodbTestSetup } from '../testing/mongodb-test-setup';

describe('GridFsService Integration', () => {
  let service: GridFsService;
  let module: TestingModule;
  let mockConnection: any;

  beforeAll(async () => {
    // Create mock connection with GridFS support
    const mockGridFSBucket = {
      openDownloadStream: jest.fn().mockImplementation((_id) => {
        const stream = {
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('test-pdf-content'));
            }
            if (event === 'end') {
              setTimeout(callback, 10);
            }
            return stream;
          }),
          read: jest.fn(),
        };
        return stream;
      }),
      openUploadStream: jest.fn().mockImplementation((_filename) => {
        const stream = {
          id: '507f1f77bcf86cd799439011',
          write: jest.fn((_chunk, callback) => callback && callback()),
          end: jest.fn((callback) => callback && callback()),
          on: jest.fn(),
        };
        return stream;
      }),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      readyState: 1,
      db: {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              {
                _id: '507f1f77bcf86cd799439011',
                filename: 'test-file.pdf',
                length: 1024,
                uploadDate: new Date(),
              },
            ]),
          }),
          findOne: jest.fn().mockResolvedValue({
            _id: '507f1f77bcf86cd799439011',
            filename: 'test-file.pdf',
            length: 1024,
            uploadDate: new Date(),
          }),
        }),
      },
      GridFSBucket: jest.fn().mockReturnValue(mockGridFSBucket),
    };

    // Mock the GridFSBucket constructor directly
    jest.mock('mongodb', () => ({
      ...jest.requireActual('mongodb'),
      GridFSBucket: jest.fn().mockImplementation(() => mockGridFSBucket),
    }));

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
      ],
      providers: [
        GridFsService,
        {
          provide: 'resume-parserConnection',
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<GridFsService>(GridFsService);
    
    // Mock the internal GridFS bucket
    (service as any).gridFSBucket = mockGridFSBucket;
  }, 30000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    await MongodbTestSetup.stopMongoMemoryServer();
  });

  describe('Health Check', () => {
    it('should return healthy status when connected', async () => {
      const healthStatus = await service.healthCheck();
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.connected).toBe(true);
    });
  });

  describe('File Operations', () => {
    let uploadedFileUrl: string;
    const testFileName = 'test-resume.pdf';
    const testFileContent = Buffer.from('This is a test PDF content');

    it('should upload a file to GridFS', async () => {
      const result = await service.uploadFile(testFileContent, testFileName, {
        contentType: 'application/pdf',
        originalName: testFileName,
      });

      expect(result).toBeDefined();
      expect(result).toMatch(/^gridfs:\/\/resume-files\/[a-f0-9]{24}$/);
      uploadedFileUrl = result;
    }, 10000);

    it('should check if uploaded file exists', async () => {
      const exists = await service.fileExists(uploadedFileUrl);
      expect(exists).toBe(true);
    });

    it('should get file info for uploaded file', async () => {
      const fileInfo = await service.getFileInfo(uploadedFileUrl);

      expect(fileInfo).toBeDefined();
      expect(fileInfo.filename).toBe(testFileName);
      expect(fileInfo.length).toBe(testFileContent.length);
      expect(fileInfo.uploadDate).toBeDefined();
    });

    it('should download the uploaded file', async () => {
      const downloadedBuffer = await service.downloadFile(uploadedFileUrl);

      expect(downloadedBuffer).toBeDefined();
      expect(downloadedBuffer.length).toBe(testFileContent.length);
      expect(downloadedBuffer.toString()).toBe(testFileContent.toString());
    });

    it('should delete the uploaded file', async () => {
      await service.deleteFile(uploadedFileUrl);

      const exists = await service.fileExists(uploadedFileUrl);
      expect(exists).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when downloading non-existent file', async () => {
      const fakeUrl = 'gridfs://resume-files/507f1f77bcf86cd799439011';

      await expect(service.downloadFile(fakeUrl)).rejects.toThrow();
    });

    it('should throw error when getting info for non-existent file', async () => {
      const fakeUrl = 'gridfs://resume-files/507f1f77bcf86cd799439011';

      await expect(service.getFileInfo(fakeUrl)).rejects.toThrow();
    });

    it('should handle invalid GridFS URL format', async () => {
      const invalidUrl = 'invalid-url';

      await expect(service.downloadFile(invalidUrl)).rejects.toThrow();
    });

    it('should not throw when deleting non-existent file', async () => {
      const fakeUrl = 'gridfs://resume-files/507f1f77bcf86cd799439011';

      // Should not throw, just log warning
      await expect(service.deleteFile(fakeUrl)).resolves.toBeUndefined();
    });
  });
});
