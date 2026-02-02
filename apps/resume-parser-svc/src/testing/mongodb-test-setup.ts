import { MongoMemoryServer } from 'mongodb-memory-server';
import type { MongooseModuleOptions } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { ModuleMetadata } from '@nestjs/common';

/**
 * MongoDB test setup utilities for integration tests
 */
export class MongodbTestSetup {
  private static mongoServer: MongoMemoryServer;
  private static mongoUri: string;

  /**
   * Start MongoDB memory server
   */
  public static async startMongoMemoryServer(): Promise<string> {
    if (!this.mongoServer) {
      this.mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'test-db',
          port: 27018, // Use different port to avoid conflicts
        },
      });
      this.mongoUri = this.mongoServer.getUri();
    }
    return this.mongoUri;
  }

  /**
   * Stop MongoDB memory server
   */
  public static async stopMongoMemoryServer(): Promise<void> {
    if (this.mongoServer) {
      await this.mongoServer.stop();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.mongoServer = null as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.mongoUri = null as any;
    }
  }

  /**
   * Get Mongoose module for testing with proper connection name
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public static async getMongooseTestModule(
    connectionName = 'resume-parser',
    options: MongooseModuleOptions = {},
  ) {
    const uri = await this.startMongoMemoryServer();
    return MongooseModule.forRoot(uri, {
      connectionName,
      ...options,
    });
  }

  /**
   * Get Mongoose feature module for schemas
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public static getMongooseFeatureModule(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    models: Array<{ name: string; schema: any }>,
    connectionName = 'resume-parser',
  ) {
    return MongooseModule.forFeature(models, connectionName);
  }

  /**
   * Create mock connection provider for dependency injection
   */
  public static getMockConnectionProvider(connectionName = 'resume-parser'): { provide: string; useValue: unknown } {
    const mockConnection = {
      readyState: 1,
      db: {
        collection: jest.fn().mockReturnValue({
          openDownloadStream: jest.fn().mockReturnValue({
            on: jest.fn(),
            pipe: jest.fn(),
            read: jest.fn(),
          }),
          openUploadStream: jest.fn().mockReturnValue({
            write: jest.fn(),
            end: jest.fn(),
            on: jest.fn(),
          }),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          findOne: jest.fn().mockResolvedValue(null),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
        }),
      },
      createConnection: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    return {
      provide: `${connectionName}Connection`,
      useValue: mockConnection,
    };
  }

  /**
   * Get complete test module metadata with MongoDB setup
   */
  public static async getTestModuleMetadata(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalProviders: any[] = [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalImports: any[] = [],
    connectionName = 'resume-parser',
  ): Promise<ModuleMetadata> {
    const mongooseModule = await this.getMongooseTestModule(connectionName);

    return {
      imports: [mongooseModule, ...additionalImports],
      providers: additionalProviders,
    };
  }

  /**
   * Clean up all test collections
   */
  public static async cleanupCollections(connection: Connection): Promise<void> {
    if (!connection || connection.readyState !== 1) {
      return;
    }

    const collections = connection.collections;
    for (const key in collections) {
      if (Object.prototype.hasOwnProperty.call(collections, key)) {
        await collections[key].deleteMany({});
      }
    }
  }
}
