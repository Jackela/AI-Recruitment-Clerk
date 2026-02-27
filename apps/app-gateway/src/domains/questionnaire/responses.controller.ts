import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { QuestionnaireSubmissionDto } from '@ai-recruitment-clerk/shared-dtos';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { QuestionnaireIntegrationService } from './questionnaire-integration.service';

/**
 * Exposes endpoints for questionnaire response/submission handling.
 */
@ApiTags('questionnaire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('questionnaire')
export class ResponsesController {
  /**
   * Initializes a new instance of the Responses Controller.
   * @param questionnaireService - The questionnaire service.
   */
  constructor(
    private readonly questionnaireService: QuestionnaireIntegrationService,
  ) {}

  /**
   * Performs the submit questionnaire operation.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param submission - The submission.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '提交问卷回答',
    description: '用户提交问卷的回答和响应',
  })
  @ApiResponse({
    status: 201,
    description: '问卷提交成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            submissionId: { type: 'string' },
            questionnaireId: { type: 'string' },
            submittedAt: { type: 'string' },
            qualityScore: { type: 'number' },
            completionTime: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @Post(':questionnaireId/submit')
  @HttpCode(HttpStatus.CREATED)
  public async submitQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body() submission: QuestionnaireSubmissionDto,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const submissionResult =
        await this.questionnaireService.submitQuestionnaire(questionnaireId, {
          ...submission,
          submittedBy: req.user.id,
          userIP:
            req.socket?.remoteAddress ||
            req.headers['x-forwarded-for'] ||
            'unknown',
          userAgent: req.headers['user-agent'],
        });

      return {
        success: true,
        message: 'Questionnaire submitted successfully',
        data: {
          submissionId: submissionResult.submissionId,
          questionnaireId,
          submittedAt: submissionResult.submittedAt,
          qualityScore: submissionResult.qualityScore,
          completionTime: submissionResult.completionTime,
          incentiveEligible: submissionResult.incentiveEligible,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to submit questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves questionnaire submissions.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param page - The page.
   * @param limit - The limit.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取问卷提交记录',
    description: '获取指定问卷的所有提交记录',
  })
  @ApiResponse({
    status: 200,
    description: '提交记录获取成功',
  })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_QUESTIONNAIRE_RESPONSES)
  @Get(':questionnaireId/submissions')
  public async getQuestionnaireSubmissions(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const submissions =
        await this.questionnaireService.getQuestionnaireSubmissions(
          questionnaireId,
          req.user.organizationId,
          {
            page: Math.max(page, 1),
            limit: Math.min(limit, 100),
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          },
        );

      return {
        success: true,
        data: {
          submissions: submissions.items,
          totalCount: submissions.totalCount,
          averageQualityScore: submissions.averageQualityScore,
          averageCompletionTime: submissions.averageCompletionTime,
          page: page,
          totalPages: Math.ceil(submissions.totalCount / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve submissions',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves questionnaire analytics.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取问卷分析报告',
    description: '获取问卷的分析报告，包括回答统计、质量分析等',
  })
  @ApiResponse({
    status: 200,
    description: '分析报告获取成功',
  })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_QUESTIONNAIRE_ANALYTICS)
  @Get(':questionnaireId/analytics')
  public async getQuestionnaireAnalytics(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const analytics =
        await this.questionnaireService.getQuestionnaireAnalytics(
          questionnaireId,
          req.user.organizationId,
        );

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve analytics',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the export questionnaire data operation.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param format - The format.
   * @param exportOptions - The export options.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '导出问卷数据',
    description: '导出问卷及其提交数据为CSV/Excel格式',
  })
  @ApiResponse({ status: 200, description: '数据导出成功' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel'],
    description: '导出格式',
  })
  @UseGuards(RolesGuard)
  @Permissions(Permission.EXPORT_QUESTIONNAIRE_DATA)
  @Post(':questionnaireId/export')
  @HttpCode(HttpStatus.OK)
  public async exportQuestionnaireData(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Body()
    exportOptions?: {
      includeResponses?: boolean;
      includeAnalytics?: boolean;
      dateRange?: { startDate: string; endDate: string };
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const exportResult =
        await this.questionnaireService.exportQuestionnaireData(
          questionnaireId,
          format,
          req.user.id,
          exportOptions ?? {},
        );

      return {
        success: true,
        message: 'Data export started successfully',
        data: {
          exportId: exportResult.exportId,
          estimatedTime: exportResult.estimatedTime,
          downloadUrl: exportResult.downloadUrl,
          format: format,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
