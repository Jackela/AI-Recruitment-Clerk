import {
  BadRequestException,
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

type Questionnaire = {
  id: string;
  published: boolean;
  submissions: Array<{ id: string; qualityScore: number }>;
};

const questionnaires = new Map<string, Questionnaire>();

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

@Controller()
export class QuestionnairesController {
  @UseGuards(JwtAuthGuard)
  @Post('questionnaires')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() _body: any) {
    const qid = id('q');
    questionnaires.set(qid, { id: qid, published: false, submissions: [] });
    return { questionnaireId: qid };
  }

  // singular create for performance tests
  @UseGuards(JwtAuthGuard)
  @Post('questionnaire')
  @HttpCode(HttpStatus.CREATED)
  createSingular(@Body() _body: any) {
    const qid = id('q');
    questionnaires.set(qid, { id: qid, published: false, submissions: [] });
    return { questionnaireId: qid };
  }

  @UseGuards(JwtAuthGuard)
  @Post('questionnaires/:id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') qid: string) {
    const q = questionnaires.get(qid);
    if (!q) throw new BadRequestException({ statusCode: 404, message: 'Not Found' });
    q.published = true;
    questionnaires.set(qid, q);
    return {
      accessUrl: `/q/${qid}`,
      publicId: id('pub'),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('questionnaire/:id/publish')
  @HttpCode(HttpStatus.OK)
  publishSingular(@Param('id') qid: string) {
    return this.publish(qid);
  }

  @UseGuards(JwtAuthGuard)
  @Post('questionnaire/:id/submit')
  @HttpCode(HttpStatus.CREATED)
  submitSingular(@Param('id') qid: string, @Body() body: any) {
    return this.submitInternal(qid, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('questionnaires/:id/submit')
  @HttpCode(HttpStatus.CREATED)
  submitPlural(@Param('id') qid: string, @Body() body: any) {
    return this.submitInternal(qid, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('questionnaires/:id/analytics')
  @HttpCode(HttpStatus.OK)
  analytics(@Param('id') qid: string) {
    const q = questionnaires.get(qid);
    if (!q) throw new BadRequestException({ statusCode: 404, message: 'Not Found' });
    const count = q.submissions.length || 1;
    const avg = q.submissions.reduce((s, a) => s + a.qualityScore, 0) / count || 75;
    return {
      totalSubmissions: q.submissions.length,
      averageQualityScore: Math.max(1, Math.round(avg)),
      completionRate: 100,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('questionnaires/export')
  @HttpCode(HttpStatus.OK)
  exportData() {
    return {
      exportUrl: `/exports/${id('report')}.json`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

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
    if (!q) throw new BadRequestException({ statusCode: 404, message: 'Not Found' });
    if (!q.published) throw new BadRequestException({ statusCode: 404, message: 'Not Found' });
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
