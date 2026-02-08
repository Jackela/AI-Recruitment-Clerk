/**
 * AI Recruitment Clerk - JD Extractor Service Bootstrap
 */
import { bootstrapWithErrorHandling, bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
import { AppModule } from './app/app.module';

bootstrapWithErrorHandling(
  () =>
    bootstrapNestJsMicroservice(AppModule, {
      serviceName: 'JdExtractorSvc',
      queueName: 'jd-extractor-workers',
    }),
  'JdExtractorSvc',
);
