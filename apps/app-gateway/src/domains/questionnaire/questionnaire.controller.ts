import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import {
  UserDto,
  Permission,
  QuestionnaireDto,
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
  QuestionnaireSubmissionDto,
  QuestionnaireResponseDto,
  QuestionnaireAnalyticsDto,
  QuestionnaireTemplateDto,
  QuestionType,
  QuestionnaireStatus,
} from '../../common/interfaces/fallback-types';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { QuestionnaireIntegrationService } from './questionnaire-integration.service';

// Use imported interface instead of local definition

@ApiTags('questionnaire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('questionnaire')
export class QuestionnaireController {
  constructor(
    private readonly questionnaireService: QuestionnaireIntegrationService,
  ) {}

  @ApiOperation({
    summary: '创建问卷',
    description: '创建新的问卷，包含问题定义、配置和发布设置',
  })
  @ApiResponse({
    status: 201,
    description: '问卷创建成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            questionnaireId: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @UseGuards(RolesGuard)
  @Permissions('create_questionnaire' as any)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Body() createDto: CreateQuestionnaireDto,
  ) {
    try {
      const questionnaire = await this.questionnaireService.createQuestionnaire(
        {
          ...createDto,
          createdBy: req.user.id,
          organizationId: req.user.organizationId,
        },
      );

      return {
        success: true,
        message: 'Questionnaire created successfully',
        data: {
          questionnaireId: questionnaire.id,
          title: questionnaire.title,
          status: questionnaire.status,
          totalQuestions: questionnaire.questions?.length || 0,
          createdAt: questionnaire.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '获取问卷列表',
    description: '获取当前组织的问卷列表，支持分页和筛选',
  })
  @ApiResponse({
    status: 200,
    description: '问卷列表获取成功',
    type: [QuestionnaireDto],
  })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: QuestionnaireStatus,
    description: '状态筛选',
  })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @Get()
  async getQuestionnaires(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: QuestionnaireStatus,
    @Query('search') search?: string,
  ) {
    try {
      const questionnaires = await this.questionnaireService.getQuestionnaires(
        req.user.organizationId,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
          status,
          search,
          includeStats: true,
        },
      );

      return {
        success: true,
        data: {
          questionnaires: questionnaires.items,
          totalCount: questionnaires.totalCount,
          page: page,
          totalPages: Math.ceil(questionnaires.totalCount / limit),
          hasNext: page * limit < questionnaires.totalCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve questionnaires',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '获取问卷详情',
    description: '获取指定问卷的详细信息，包括所有问题和配置',
  })
  @ApiResponse({
    status: 200,
    description: '问卷详情获取成功',
    type: QuestionnaireDto,
  })
  @ApiResponse({ status: 404, description: '问卷未找到' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @Get(':questionnaireId')
  async getQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
  ) {
    try {
      const questionnaire = await this.questionnaireService.getQuestionnaire(
        questionnaireId,
        req.user.organizationId,
      );

      if (!questionnaire) {
        throw new NotFoundException('Questionnaire not found');
      }

      return {
        success: true,
        data: questionnaire,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '更新问卷',
    description: '更新问卷信息，包括问题、配置和状态',
  })
  @ApiResponse({ status: 200, description: '问卷更新成功' })
  @ApiResponse({ status: 404, description: '问卷未找到' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions('update_questionnaire' as any)
  @Put(':questionnaireId')
  @HttpCode(HttpStatus.OK)
  async updateQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body() updateDto: UpdateQuestionnaireDto,
  ) {
    try {
      const updatedQuestionnaire =
        await this.questionnaireService.updateQuestionnaire(
          questionnaireId,
          updateDto,
          req.user.id,
        );

      return {
        success: true,
        message: 'Questionnaire updated successfully',
        data: {
          questionnaireId: updatedQuestionnaire.id,
          updatedFields: Object.keys(updateDto),
          lastModifiedBy: req.user.id,
          lastModifiedAt: updatedQuestionnaire.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '发布问卷',
    description: '将问卷状态更改为发布，用户可以开始提交回答',
  })
  @ApiResponse({ status: 200, description: '问卷发布成功' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions('publish_questionnaire' as any)
  @Post(':questionnaireId/publish')
  @HttpCode(HttpStatus.OK)
  async publishQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body()
    publishOptions?: {
      publishDate?: string;
      expirationDate?: string;
      targetAudience?: string[];
      notifyUsers?: boolean;
    },
  ) {
    try {
      const publishResult =
        await this.questionnaireService.publishQuestionnaire(
          questionnaireId,
          req.user.id,
          publishOptions,
        );

      return {
        success: true,
        message: 'Questionnaire published successfully',
        data: {
          questionnaireId,
          publishedAt: publishResult.publishedAt,
          publishedBy: req.user.id,
          accessUrl: publishResult.accessUrl,
          expirationDate: publishResult.expirationDate,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to publish questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

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
  async submitQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body() submission: QuestionnaireSubmissionDto,
  ) {
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

  @ApiOperation({
    summary: '获取问卷提交记录',
    description: '获取指定问卷的所有提交记录',
  })
  @ApiResponse({
    status: 200,
    description: '提交记录获取成功',
    type: [QuestionnaireResponseDto],
  })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @UseGuards(RolesGuard)
  @Permissions('read_questionnaire_responses' as any)
  @Get(':questionnaireId/submissions')
  async getQuestionnaireSubmissions(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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

  @ApiOperation({
    summary: '获取问卷分析报告',
    description: '获取问卷的分析报告，包括回答统计、质量分析等',
  })
  @ApiResponse({
    status: 200,
    description: '分析报告获取成功',
    type: QuestionnaireAnalyticsDto,
  })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions('read_questionnaire_analytics' as any)
  @Get(':questionnaireId/analytics')
  async getQuestionnaireAnalytics(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
  ) {
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

  @ApiOperation({
    summary: '复制问卷',
    description: '基于现有问卷创建副本',
  })
  @ApiResponse({ status: 201, description: '问卷复制成功' })
  @ApiParam({ name: 'questionnaireId', description: '原问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions('create_questionnaire' as any)
  @Post(':questionnaireId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body()
    duplicateOptions: {
      title?: string;
      includeSubmissions?: boolean;
      modifyQuestions?: any;
    },
  ) {
    try {
      const duplicatedQuestionnaire =
        await this.questionnaireService.duplicateQuestionnaire(
          questionnaireId,
          req.user.id,
          duplicateOptions,
        );

      return {
        success: true,
        message: 'Questionnaire duplicated successfully',
        data: {
          newQuestionnaireId: duplicatedQuestionnaire.id,
          originalQuestionnaireId: questionnaireId,
          title: duplicatedQuestionnaire.title,
          createdBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to duplicate questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '删除问卷',
    description: '软删除指定问卷（保留提交记录用于审计）',
  })
  @ApiResponse({ status: 200, description: '问卷删除成功' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions('delete_questionnaire' as any)
  @Delete(':questionnaireId')
  @HttpCode(HttpStatus.OK)
  async deleteQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body() deleteRequest: { reason?: string; hardDelete?: boolean },
  ) {
    try {
      await this.questionnaireService.deleteQuestionnaire(
        questionnaireId,
        req.user.id,
        deleteRequest.reason,
        deleteRequest.hardDelete || false,
      );

      return {
        success: true,
        message: 'Questionnaire deleted successfully',
        data: {
          questionnaireId,
          deletedAt: new Date().toISOString(),
          deletedBy: req.user.id,
          hardDelete: deleteRequest.hardDelete || false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete questionnaire',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '获取问卷模板',
    description: '获取可用的问卷模板列表',
  })
  @ApiResponse({
    status: 200,
    description: '模板列表获取成功',
    type: [QuestionnaireTemplateDto],
  })
  @ApiQuery({ name: 'category', required: false, description: '模板分类' })
  @Get('templates/list')
  async getQuestionnaireTemplates(
    @Request() req: AuthenticatedRequest,
    @Query('category') category?: string,
  ) {
    try {
      const templates =
        await this.questionnaireService.getQuestionnaireTemplates(
          category,
          req.user.organizationId,
        );

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve templates',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @ApiOperation({
    summary: '从模板创建问卷',
    description: '基于指定模板创建新问卷',
  })
  @ApiResponse({ status: 201, description: '从模板创建成功' })
  @ApiParam({ name: 'templateId', description: '模板ID' })
  @UseGuards(RolesGuard)
  @Permissions('create_questionnaire' as any)
  @Post('templates/:templateId/create')
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @Request() req: AuthenticatedRequest,
    @Param('templateId') templateId: string,
    @Body()
    createOptions: {
      title: string;
      customizations?: any;
      organizationId?: string;
    },
  ) {
    try {
      const questionnaire = await this.questionnaireService.createFromTemplate(
        templateId,
        {
          ...createOptions,
          createdBy: req.user.id,
          organizationId: req.user.organizationId,
        },
      );

      return {
        success: true,
        message: 'Questionnaire created from template successfully',
        data: {
          questionnaireId: questionnaire.id,
          templateId,
          title: questionnaire.title,
          totalQuestions: questionnaire.questions?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create questionnaire from template',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

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
  @Permissions('export_questionnaire_data' as any)
  @Post(':questionnaireId/export')
  @HttpCode(HttpStatus.OK)
  async exportQuestionnaireData(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Body()
    exportOptions?: {
      includeResponses?: boolean;
      includeAnalytics?: boolean;
      dateRange?: { startDate: string; endDate: string };
    },
  ) {
    try {
      const exportResult =
        await this.questionnaireService.exportQuestionnaireData(
          questionnaireId,
          format,
          req.user.id,
          exportOptions,
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

  @ApiOperation({
    summary: '服务健康检查',
    description: '检查问卷服务的健康状态',
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  async healthCheck() {
    try {
      const health = await this.questionnaireService.getHealthStatus();

      return {
        status: health.overall,
        timestamp: new Date().toISOString(),
        service: 'questionnaire-management',
        details: {
          database: health.database,
          templates: health.templates,
          submissions: health.submissions,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'questionnaire-management',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
