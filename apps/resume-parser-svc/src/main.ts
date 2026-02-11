/**
 * AI Recruitment Clerk - Resume Parser Service Bootstrap
 */
import { bootstrapWithErrorHandling, bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
import { AppModule } from './app/app.module';

bootstrapWithErrorHandling(
  () =>
    bootstrapNestJsMicroservice(AppModule, {
      serviceName: 'ResumeParserSvc',
      queueName: 'resume-parser-workers',
    }),
  'ResumeParserSvc',
);
