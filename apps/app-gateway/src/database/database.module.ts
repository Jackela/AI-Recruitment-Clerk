import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getConfig } from '@ai-recruitment-clerk/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        const logger = new Logger('DatabaseModule');
        const runtimeConfig = getConfig();
        const isTestEnv =
          runtimeConfig.env.isTest ||
          runtimeConfig.env.isCi ||
          Boolean(runtimeConfig.env.jestWorkerId);
        const forceInMemory =
          process.env.GATEWAY_SERVE_CHECK === 'true' ||
          process.env.SKIP_DB === 'true';

        if (isTestEnv || forceInMemory) {
          logger.log('Test environment detected - using MongoDB Memory Server');
          const mongod = await MongoMemoryServer.create({
            instance: {
              port: 27018,
              dbName: 'test',
            },
          });
          const uri = mongod.getUri();
          logger.log(`MongoDB Memory Server started at ${uri}`);
          
          return {
            uri,
            autoCreate: true,
            autoIndex: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
          };
        } else {
          const mongoUri = runtimeConfig.database.url;

          if (!mongoUri) {
            logger.error('MONGO_URL not configured - Production deployment requires MongoDB');
            throw new Error('MONGO_URL not configured - Production deployment requires MongoDB');
          }

          logger.log(`Connecting to production MongoDB at ${mongoUri.replace(/\/\/.*@/, '//*****@')}`);
          
          return {
            uri: mongoUri,
            retryAttempts: 3,
            retryDelay: 3000,
            connectionFactory: (connection: any) => {
              connection.on('connected', () => {
                logger.log('MongoDB connected successfully');
              });
              connection.on('error', (error: Error) => {
                logger.error('MongoDB connection error', error);
              });
              connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
              });
              return connection;
            },
            poolSize: 10,
            keepAlive: true,
            keepAliveInitialDelay: 300000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            useNewUrlParser: true,
            useUnifiedTopology: true,
          };
        }
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
