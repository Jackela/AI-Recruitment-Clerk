import { Module } from '@nestjs/common';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireIntegrationService } from './questionnaire-integration.service';

@Module({
  controllers: [QuestionnaireController],
  providers: [QuestionnaireIntegrationService],
  exports: [QuestionnaireIntegrationService],
})
export class QuestionnaireModule {}
