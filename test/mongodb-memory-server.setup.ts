import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

export class MongoTestHelper {
  private static instance: MongoMemoryServer;

  static async start(): Promise<string> {
    if (!this.instance) {
      this.instance = await MongoMemoryServer.create({
        binary: {
          version: '7.0.0',
        },
        instance: {
          dbName: 'test-db',
        },
      });
    }
    return this.instance.getUri();
  }

  static async stop(): Promise<void> {
    if (this.instance) {
      await this.instance.stop();
      this.instance = null;
    }
  }

  static getMongooseTestModule() {
    return MongooseModule.forRootAsync({
      useFactory: async () => ({
        uri: await this.start(),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    });
  }
}

// Global setup and teardown for Jest
export const setupMongoDB = async () => {
  await MongoTestHelper.start();
};

export const teardownMongoDB = async () => {
  await MongoTestHelper.stop();
};