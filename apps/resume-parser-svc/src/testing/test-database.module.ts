import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

let mongod: MongoMemoryServer;

/**
 * Test Database Module for Integration Testing
 * Provides either in-memory MongoDB or Docker MongoDB connection
 */
@Global()
@Module({})
export class TestDatabaseModule {
  /**
   * Performs the for root operation.
   * @param useDocker - The use docker.
   * @returns A promise that resolves to DynamicModule.
   */
  static async forRoot(useDocker = false): Promise<DynamicModule> {
    let mongoUri: string;

    if (useDocker) {
      // Use Docker MongoDB for integration tests
      mongoUri =
        process.env.MONGODB_URI ||
        'mongodb://testuser:testpass@localhost:27018/resume-parser-test?authSource=admin';
    } else {
      // Use in-memory MongoDB for unit tests
      if (!mongod) {
        mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'resume-parser-test',
          },
        });
      }
      mongoUri = mongod.getUri();
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
