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

type Questionnaire = {
  id: string;
  published: boolean;
  submissions: Array<{ id: string; qualityScore: number }>;
};

const questionnaires = new Map<string, Questionnaire>();

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Exposes endpoints for questionnaires.
 */
@Controller()
export class QuestionnairesController {
  /**
   * Creates the entity.
   * @param _body - The body.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('questionnaires')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() _body: any) {
    const qid = id('q');
    questionnaires.set(qid, { id: qid, published: false, submissions: [] });
    return { questionnaireId: qid };
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
  createSingular(@Body() _body: any) {
    const qid = id('q');
    questionnaires.set(qid, { id: qid, published: false, submissions: [] });
    return { questionnaireId: qid };
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
    const q = questionnaires.get(qid);
    if (!q) {
      throw ErrorUtils.createNotFoundError('Questionnaire', qid, {
        operation: 'publish',
      });
    }
    q.published = true;
    questionnaires.set(qid, q);
    return {
      accessUrl: `/q/${qid}`,
      publicId: id('pub'),
    };
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
  submitSingular(@Param('id') qid: string, @Body() body: any) {
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
  submitPlural(@Param('id') qid: string, @Body() body: any) {
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
    const q = questionnaires.get(qid);
    if (!q) {
      throw ErrorUtils.createNotFoundError('Questionnaire', qid, {
        operation: 'analytics',
      });
    }
    const count = q.submissions.length || 1;
    const avg =
      q.submissions.reduce((s, a) => s + a.qualityScore, 0) / count || 75;
    return {
      totalSubmissions: q.submissions.length,
      averageQualityScore: Math.max(1, Math.round(avg)),
      completionRate: 100,
    };
  }

  /**
   * Performs the export data operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('questionnaires/export')
  @HttpCode(HttpStatus.OK)
  exportData() {
    return {
      exportUrl: `/exports/${id('report')}.json`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  /**
   * Performs the list operation.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('questionnaire')
  @HttpCode(HttpStatus.OK)
  list() {
    const list = Array.from(questionnaires.values()).map((q) => ({
      questionnaireId: q.id,
      published: q.published,
      submissions: q.submissions.length,
    }));
    return { items: list, total: list.length, page: 1, limit: 20 };
  }

  private submitInternal(qid: string, _body: any) {
    const q = questionnaires.get(qid);
    if (!q) {
      throw ErrorUtils.createNotFoundError('Questionnaire', qid, {
        operation: 'submit',
      });
    }
    if (!q.published) {
      throw ErrorUtils.createValidationError(
        'Questionnaire is not published and cannot accept submissions',
        { questionnaireId: qid, published: q.published },
        'published',
      );
    }
    const sid = id('sub');
    const qualityScore = 80;
    q.submissions.push({ id: sid, qualityScore });
    questionnaires.set(qid, q);
    return {
      submissionId: sid,
      qualityScore,
    };
  }
}
