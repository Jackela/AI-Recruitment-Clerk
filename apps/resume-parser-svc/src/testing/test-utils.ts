import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestDatabaseModule } from './test-database.module';
import { TestNatsModule } from './test-nats.module';
import {
  NatsConnectionManager,
  NatsStreamManager,
} from '@app/shared-nats-client';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import type { DynamicModule, Type, ForwardReference, Provider } from '@nestjs/common';

/**
 * Defines the shape of the test module options.
 */
export interface TestModuleOptions {
  useDocker?: boolean;
  imports?: Array<DynamicModule | Type<unknown> | ForwardReference<unknown> | Promise<DynamicModule>>;
  providers?: Provider[];
  controllers?: Array<Type<unknown>>;
  exports?: Array<Type<unknown> | DynamicModule>;
}

/**
 * Create a test module with proper database and NATS connections
 */
export async function createTestModule(
  options: TestModuleOptions = {},
): Promise<TestingModule> {
  const {
    useDocker = process.env.USE_DOCKER === 'true',
    imports = [],
    providers = [],
    controllers = [],
  } = options;

  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        envFilePath: '.env.test',
        isGlobal: true,
      }),
      await TestDatabaseModule.forRoot(useDocker),
      await TestNatsModule.forRoot(useDocker),
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
 * Config value type for mock config service
 */
type MockConfigValue = string | number | boolean | undefined;

/**
 * Create mock providers for common services
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createMockProviders = () => ({
  configService: {
    provide: ConfigService,
    useValue: {
      get: jest.fn((key: string): MockConfigValue => {
        const config: Record<string, MockConfigValue> = {
          MONGODB_URI:
            'mongodb://testuser:testpass@localhost:27018/resume-parser-test',
          NATS_SERVERS: 'nats://testuser:testpass@localhost:4223',
          SERVICE_NAME: 'resume-parser-svc-test',
          GRIDFS_BUCKET_NAME: 'test-resumes',
          GRIDFS_CHUNK_SIZE: 261120,
        };
        return config[key];
      }),
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
});

/**
 * Mock document returned by MongoDB operations
 */
interface MockMongoDocument {
  _id: string;
  save: jest.Mock;
  toObject: jest.Mock;
  [key: string]: unknown;
}

/**
 * Mock MongoDB model with static methods
 */
interface MockMongoModel {
  (data: Record<string, unknown>): MockMongoDocument;
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  countDocuments: jest.Mock;
  deleteMany: jest.Mock;
  updateMany: jest.Mock;
  aggregate: jest.Mock;
  create: jest.Mock;
}

/**
 * Create a mock MongoDB model
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createMockMongoModel = (modelName: string) => {
  const mockFn = jest.fn().mockImplementation((data: Record<string, unknown>): MockMongoDocument => ({
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

  // Create the model object with static methods
  const mockModel = Object.assign(mockFn, {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    }),
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    aggregate: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      toObject: jest.fn().mockReturnValue({}),
    }),
  }) as MockMongoModel;

  return {
    provide: getModelToken(modelName, 'resume-parser'),
    useValue: mockModel,
  };
};

/**
 * Create a mock GridFS connection
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
export const flushPromises = (): Promise<void> => new Promise(setImmediate);

/**
 * Test job object type
 */
export interface TestJob {
  jobId: string;
  title: string;
  description: string;
  requirements: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a test job object
 */
export const createTestJob = (overrides: Partial<TestJob> = {}): TestJob => ({
  jobId: 'job-123',
  title: 'Senior Software Engineer',
  description: 'Test job description',
  requirements: ['JavaScript', 'TypeScript', 'Node.js'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Test resume contact info type
 */
interface TestResumeContactInfo {
  name: string;
  email: string;
  phone: string;
}

/**
 * Test resume experience type
 */
interface TestResumeExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

/**
 * Test resume education type
 */
interface TestResumeEducation {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
}

/**
 * Test resume object type
 */
export interface TestResume {
  resumeId: string;
  contactInfo: TestResumeContactInfo;
  skills: string[];
  experience: TestResumeExperience[];
  education: TestResumeEducation[];
}

/**
 * Create a test resume object
 */
export const createTestResume = (overrides: Partial<TestResume> = {}): TestResume => ({
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
