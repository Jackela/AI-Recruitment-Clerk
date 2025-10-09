import { Module } from '@nestjs/common';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireIntegrationService } from './questionnaire-integration.service';

/**
 * Configures the questionnaire module.
 */
@Module({
  controllers: [QuestionnaireController],
  providers: [QuestionnaireIntegrationService],
  exports: [QuestionnaireIntegrationService],
})
export class QuestionnaireModule {}
