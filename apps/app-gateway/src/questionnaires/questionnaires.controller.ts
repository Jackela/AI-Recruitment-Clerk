import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// Standardized Error Handling
import { HandleErrors, ErrorUtils } from '@ai-recruitment-clerk/shared-dtos';
import {
  QuestionnairesService,
  QuestionnaireNotFoundError,
  QuestionnaireNotPublishedError,
} from './questionnaires.service';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

/**
 * Exposes endpoints for questionnaires.
 */
@Controller()
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}
  /**
   * Creates the entity.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaires')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() _body: Record<string, unknown>) {
    return this.questionnairesService.createQuestionnaire();
  }

  // singular create for performance tests
  /**
   * Creates singular.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaire')
  @HttpCode(HttpStatus.CREATED)
  createSingular(@Body() _body: Record<string, unknown>) {
    return this.questionnairesService.createQuestionnaire();
  }

  /**
   * Performs the publish operation.
   * @param qid - The qid.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaires/:id/publish')
  @HttpCode(HttpStatus.OK)
  @HandleErrors({
    defaultErrorType: 'NOT_FOUND_ERROR',
    defaultErrorCode: 'QUESTIONNAIRE_NOT_FOUND',
    defaultSeverity: 'low',
    businessImpact: 'low',
    userImpact: 'minimal',
    recoveryStrategies: [
      'Check the questionnaire ID and try again',
      'Verify the questionnaire exists',
      'Create a new questionnaire if needed',
    ],
  })
  publish(@Param('id') qid: string) {
    try {
      return this.questionnairesService.publishQuestionnaire(qid);
    } catch (error) {
      if (error instanceof QuestionnaireNotFoundError) {
        throw ErrorUtils.createNotFoundError('Questionnaire', qid, {
          operation: 'publish',
        });
      }
      throw error;
    }
  }

  /**
   * Performs the publish singular operation.
   * @param qid - The qid.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaire/:id/publish')
  @HttpCode(HttpStatus.OK)
  publishSingular(@Param('id') qid: string) {
    return this.publish(qid);
  }

  /**
   * Performs the submit singular operation.
   * @param qid - The qid.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaire/:id/submit')
  @HttpCode(HttpStatus.CREATED)
  submitSingular(
    @Param('id') qid: string,
    @Body() body: SubmitQuestionnaireDto,
  ) {
    return this.submitInternal(qid, body);
  }

  /**
   * Performs the submit plural operation.
   * @param qid - The qid.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaires/:id/submit')
  @HttpCode(HttpStatus.CREATED)
  submitPlural(
    @Param('id') qid: string,
    @Body() body: SubmitQuestionnaireDto,
  ) {
    return this.submitInternal(qid, body);
  }

  /**
   * Performs the analytics operation.
   * @param qid - The qid.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('questionnaires/:id/analytics')
  @HttpCode(HttpStatus.OK)
  @HandleErrors({
    defaultErrorType: 'NOT_FOUND_ERROR',
    defaultErrorCode: 'QUESTIONNAIRE_NOT_FOUND',
    defaultSeverity: 'low',
    businessImpact: 'low',
    userImpact: 'minimal',
  })
  analytics(@Param('id') qid: string) {
    try {
      return this.questionnairesService.getAnalytics(qid);
    } catch (error) {
      if (error instanceof QuestionnaireNotFoundError) {
        throw ErrorUtils.createNotFoundError('Questionnaire', qid, {
          operation: 'analytics',
        });
      }
      throw error;
    }
  }

  /**
   * Performs the export data operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('questionnaires/export')
  @HttpCode(HttpStatus.OK)
  exportData() {
    return this.questionnairesService.exportQuestionnaireData();
  }

  /**
   * Performs the list operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('questionnaire')
  @HttpCode(HttpStatus.OK)
  list() {
    return this.questionnairesService.listQuestionnaires();
  }

  private submitInternal(qid: string, _body: SubmitQuestionnaireDto) {
    try {
      return this.questionnairesService.submitQuestionnaire(qid);
    } catch (error) {
      if (error instanceof QuestionnaireNotFoundError) {
        throw ErrorUtils.createNotFoundError('Questionnaire', qid, {
          operation: 'submit',
        });
      }
      if (error instanceof QuestionnaireNotPublishedError) {
        throw ErrorUtils.createValidationError(
          'Questionnaire is not published and cannot accept submissions',
          { questionnaireId: qid, published: false },
          'published',
        );
      }
      throw error;
    }
  }
}
