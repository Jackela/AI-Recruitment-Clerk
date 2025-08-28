import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ResumeEventsController } from './resume-events.controller';
import { ParsingService } from '../parsing/parsing.service';
import { VisionLlmService } from '../vision-llm/vision-llm.service';
import { GridFsService } from '../gridfs/gridfs.service';
import { FieldMapperService } from '../field-mapper/field-mapper.service';
import { NatsClient } from '../nats/nats.client';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { ResumeRepository } from '../repositories/resume.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production']
    }),
    MongooseModule.forRoot(process.env.MONGODB_URL || 'mongodb://admin:password123@localhost:27017/ai-recruitment?authSource=admin', {
      connectionName: 'resume-parser'
    }),
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema }
    ], 'resume-parser')
  ],
  controllers: [AppController, ResumeEventsController],
  providers: [
    AppService,
    ParsingService,
    VisionLlmService,
    GridFsService,
    FieldMapperService,
    NatsClient,
    ResumeRepository,
  ],
  exports: [
    ParsingService,
    VisionLlmService,
    GridFsService,
    FieldMapperService,
    NatsClient,
    ResumeRepository,
  ],
})
export class AppModule {}
