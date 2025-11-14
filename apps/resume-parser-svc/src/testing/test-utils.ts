import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestDatabaseModule } from './test-database.module';
import { TestNatsModule } from './test-nats.module';
import {
  NatsConnectionManager,
  NatsStreamManager,
} from '@app/shared-nats-client';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { getTestingEnvironment } from '@ai-recruitment-clerk/configuration';
import { getConfig } from '@ai-recruitment-clerk/configuration';

/**
 * Defines the shape of the test module options.
 */
export interface TestModuleOptions {
  useDocker?: boolean;
  imports?: any[];
  providers?: any[];
  controllers?: any[];
  exports?: any[];
}

/**
 * Create a test module with proper database and NATS connections
 */
export async function createTestModule(
  options: TestModuleOptions = {},
): Promise<TestingModule> {
  const runtimeConfig = getConfig({ forceReload: true });
  const testingEnv = getTestingEnvironment({
    useDocker: options.useDocker,
    serviceName: 'resume-parser-svc-test',
  });
  const resolvedUseDocker = testingEnv.useDocker;
  const { imports = [], providers = [], controllers = [] } = options;

  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        envFilePath: '.env.test',
        isGlobal: true,
      }),
      await TestDatabaseModule.forRoot({
        useDocker: resolvedUseDocker,
        mongoUri: testingEnv.mongoUri,
      }),
      await TestNatsModule.forRoot({
        useDocker: resolvedUseDocker,
        natsUrl: testingEnv.natsUrl,
      }),
      ...imports,
    ],
    providers: [...providers],
    controllers: [...controllers],
  });

  // Override logger to prevent console output during tests
  moduleBuilder.overrideProvider(Logger).useValue({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  });

  const module = await moduleBuilder.compile();

  return module;
}

/**
 * Create mock providers for common services
 */
export const createMockProviders = () => {
  const testingEnv = getTestingEnvironment({
    serviceName: 'resume-parser-svc-test',
  });
  const configMap: Record<string, any> = {
    MONGODB_URI: testingEnv.mongoUri,
    NATS_SERVERS: testingEnv.natsUrl,
    SERVICE_NAME: testingEnv.serviceName,
    GRIDFS_BUCKET_NAME: testingEnv.gridFsBucket,
    GRIDFS_CHUNK_SIZE: testingEnv.gridFsChunkSize,
  };

  return {
    configService: {
      provide: ConfigService,
      useValue: {
        get: jest.fn((key: string) => configMap[key]),
      },
    },

    natsConnectionManager: {
      provide: NatsConnectionManager,
      useValue: {
        getConnection: jest.fn().mockResolvedValue({
          jetstream: jest.fn().mockReturnValue({
            publish: jest.fn().mockResolvedValue({ success: true }),
            subscribe: jest.fn().mockResolvedValue({}),
          }),
          close: jest.fn(),
        }),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
      },
    },

    natsStreamManager: {
      provide: NatsStreamManager,
      useValue: {
        ensureStream: jest.fn().mockResolvedValue(undefined),
        createConsumer: jest.fn().mockResolvedValue(undefined),
        getStreamInfo: jest.fn().mockResolvedValue({}),
        deleteStream: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
};

/**
 * Create a mock MongoDB model
 */
export const createMockMongoModel = (modelName: string) => {
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
  mockModel.create = jest.fn().mockResolvedValue({
    _id: '507f1f77bcf86cd799439011',
    toObject: jest.fn().mockReturnValue({}),
  });

  return {
    provide: getModelToken(modelName, 'resume-parser'),
    useValue: mockModel,
  };
};

/**
 * Create a mock GridFS connection
 */
export const createMockGridFSConnection = () => {
  const mockGridFSBucket = {
    openDownloadStream: jest.fn().mockImplementation((_id) => ({
      on: jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('mock file data'));
        if (event === 'end') setTimeout(callback, 10);
        if (event === 'error') return;
      }),
      pipe: jest.fn(),
      read: jest.fn(),
    })),
    openUploadStream: jest.fn().mockImplementation((_filename, _options) => ({
      id: '507f1f77bcf86cd799439011',
      write: jest.fn(),
      end: jest.fn((callback) => callback && callback()),
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
      }),
    },
    once: jest.fn((event, callback) => {
      if (event === 'open') setTimeout(callback, 10);
    }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    provide: 'GridFSConnection',
    useValue: {
      connection: mockConnection,
      bucket: mockGridFSBucket,
    },
  };
};

/**
 * Wait for async operations to complete
 */
export const flushPromises = () => new Promise(setImmediate);

/**
 * Create a test job object
 */
export const createTestJob = (overrides = {}) => ({
  jobId: 'job-123',
  title: 'Senior Software Engineer',
  description: 'Test job description',
  requirements: ['JavaScript', 'TypeScript', 'Node.js'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a test resume object
 */
export const createTestResume = (overrides = {}) => ({
  resumeId: 'resume-456',
  contactInfo: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
  },
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Developer',
      startDate: '2020-01-01',
      endDate: 'present',
      description: 'Developed web applications',
    },
  ],
  education: [
    {
      institution: 'University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduationDate: '2019-06-01',
    },
  ],
  ...overrides,
});
