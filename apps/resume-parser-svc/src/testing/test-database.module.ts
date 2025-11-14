import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { getConfig } from '@ai-recruitment-clerk/configuration';

let mongod: MongoMemoryServer;

/**
 * Test Database Module for Integration Testing
 * Provides either in-memory MongoDB or Docker MongoDB connection
 */
@Global()
@Module({})
export class TestDatabaseModule {
  static async forRoot(options: {
    useDocker?: boolean;
    mongoUri?: string;
  } = {}): Promise<DynamicModule> {
    const runtimeConfig = getConfig({ forceReload: true });
    const useDocker =
      options.useDocker ?? runtimeConfig.testing?.useDocker ?? false;
    let mongoUri = options.mongoUri;

    if (!mongoUri) {
      if (useDocker) {
        mongoUri = runtimeConfig.database.url;
      } else {
        if (!mongod) {
          mongod = await MongoMemoryServer.create({
            instance: {
              dbName: 'resume-parser-test',
            },
          });
        }
        mongoUri = mongod.getUri();
      }
    }

    if (!mongoUri) {
      throw new Error('Failed to resolve Mongo URI for tests');
    }

    return {
      module: TestDatabaseModule,
      imports: [
        MongooseModule.forRoot(mongoUri, {
          connectionName: 'resume-parser',
          autoCreate: true,
          autoIndex: true,
        }),
      ],
      exports: [MongooseModule],
    };
  }

  /**
   * Performs the close connection operation.
   * @param connection - The connection.
   * @returns A promise that resolves when the operation completes.
   */
  static async closeConnection(connection?: Connection): Promise<void> {
    if (connection) {
      await connection.close();
    }
    if (mongod) {
      await mongod.stop();
      mongod = undefined as any;
    }
  }

  /**
   * Performs the clear database operation.
   * @param connection - The connection.
   * @returns A promise that resolves when the operation completes.
   */
  static async clearDatabase(connection: Connection): Promise<void> {
    if (!connection) return;

    const collections = connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
}
