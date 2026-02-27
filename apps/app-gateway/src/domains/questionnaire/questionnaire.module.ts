import { Module } from '@nestjs/common';
import { QuestionnaireController } from './questionnaire.controller';
import { TemplatesController } from './templates.controller';
import { ResponsesController } from './responses.controller';
import { QuestionnaireIntegrationService } from './questionnaire-integration.service';

/**
 * Configures the questionnaire module.
 */
@Module({
  controllers: [QuestionnaireController, TemplatesController, ResponsesController],
  providers: [QuestionnaireIntegrationService],
  exports: [QuestionnaireIntegrationService],
})
export class QuestionnaireModule {}
