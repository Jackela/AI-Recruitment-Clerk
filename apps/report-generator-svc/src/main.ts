/**
 * AI Recruitment Clerk - Report Generator Service Bootstrap
 */
import { bootstrapWithErrorHandling, bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
import { AppModule } from './app/app.module';

bootstrapWithErrorHandling(
  () =>
    bootstrapNestJsMicroservice(AppModule, {
      serviceName: 'ReportGeneratorSvc',
      queueName: 'report-generator-workers',
    }),
  'ReportGeneratorSvc',
);
