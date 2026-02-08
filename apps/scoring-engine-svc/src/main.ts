/**
 * AI Recruitment Clerk - Scoring Engine Service Bootstrap
 */
import { bootstrapWithErrorHandling, bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
import { AppModule } from './app/app.module';

bootstrapWithErrorHandling(
  () =>
    bootstrapNestJsMicroservice(AppModule, {
      serviceName: 'ScoringEngineSvc',
      queueName: 'scoring-engine-workers',
    }),
  'ScoringEngineSvc',
);
