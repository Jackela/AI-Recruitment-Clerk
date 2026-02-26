/**
 * AI Recruitment Clerk - Resume Parser Service Bootstrap
 */
import { Logger } from '@nestjs/common';
import { bootstrapWithErrorHandling, bootstrapNestJsMicroservice } from '@ai-recruitment-clerk/infrastructure-shared';
import { validateEnv } from '@ai-recruitment-clerk/configuration';
import { AppModule } from './app/app.module';

bootstrapWithErrorHandling(
  () => {
    // Fail-fast env validation using shared configuration validator
    Logger.log('🔍 [FAIL-FAST] Validating environment variables...');
    const env = validateEnv('resumeParser');
    const natsUrl = env.getString('NATS_URL', false) ?? 'nats://localhost:4222';
    Logger.log(`✅ [FAIL-FAST] Environment validated (NATS_URL=${natsUrl})`);

    return bootstrapNestJsMicroservice(AppModule, {
      serviceName: 'ResumeParserSvc',
      queueName: 'resume-parser-workers',
    });
  },
  'ResumeParserSvc',
);
