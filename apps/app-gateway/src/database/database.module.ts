import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const isTestEnv = 
          process.env.NODE_ENV === 'test' || 
          !!process.env.JEST_WORKER_ID || 
          process.env.CI === 'true';

        if (isTestEnv) {
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
          const mongoUri = configService.get<string>('MONGO_URL') || process.env.MONGO_URL;
          
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
