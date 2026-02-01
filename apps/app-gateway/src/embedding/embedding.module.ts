import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { EmbeddingController } from './embedding.controller';
import type {
  IEmbeddingProvider} from './interfaces/embedding-provider.interface';
import {
  EMBEDDING_PROVIDER
} from './interfaces/embedding-provider.interface';
import { OpenAIEmbeddingProvider } from './providers/openai-embedding.provider';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawTimeout =
          configService.get<string | number>('OPENAI_EMBEDDING_TIMEOUT_MS');
        const timeout =
          typeof rawTimeout === 'string'
            ? Number.parseInt(rawTimeout, 10)
            : typeof rawTimeout === 'number'
              ? rawTimeout
              : 10000;

        return {
          timeout: Number.isFinite(timeout) ? timeout : 10000,
          maxRedirects: 3,
        };
      },
    }),
  ],
  controllers: [EmbeddingController],
  providers: [
    EmbeddingService,
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (
        httpService: HttpService,
        configService: ConfigService,
      ): IEmbeddingProvider =>
        new OpenAIEmbeddingProvider(httpService, configService),
      inject: [HttpService, ConfigService],
    },
  ],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
