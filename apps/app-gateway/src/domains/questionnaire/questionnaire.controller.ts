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
import {
  QuestionnaireDto,
  QuestionnaireStatus,
} from '@ai-recruitment-clerk/shared-dtos';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type {
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
} from '@ai-recruitment-clerk/shared-dtos';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { QuestionnaireIntegrationService } from './questionnaire-integration.service';

/**
 * Exposes endpoints for questionnaire management.
 */
@ApiTags('questionnaire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('questionnaire')
export class QuestionnaireController {
  /**
   * Initializes a new instance of the Questionnaire Controller.
   * @param questionnaireService - The questionnaire service.
   */
  constructor(
    private readonly questionnaireService: QuestionnaireIntegrationService,
  ) {}

  /**
   * Creates questionnaire.
   * @param req - The req.
   * @param createDto - The create dto.
   * @returns The result of the operation.
   */
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
  @Permissions(Permission.CREATE_QUESTIONNAIRE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async createQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Body() createDto: CreateQuestionnaireDto,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      questionnaireId: string;
      title: string;
      status: string;
      totalQuestions: number;
      createdAt: string;
    };
    error?: string;
  }> {
    try {
      const questionnaire = await this.questionnaireService.createQuestionnaire({
        ...createDto,
        createdBy: req.user.id,
        organizationId: req.user.organizationId,
      });

      return {
        success: true,
        message: 'Questionnaire created successfully',
        data: {
          questionnaireId: questionnaire.id,
          title: questionnaire.title,
          status: questionnaire.status,
          totalQuestions: questionnaire.questions?.length || 0,
          createdAt: questionnaire.createdAt instanceof Date ? questionnaire.createdAt.toISOString() : String(questionnaire.createdAt),
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

  /**
   * Retrieves questionnaires.
   * @param req - The req.
   * @param page - The page.
   * @param limit - The limit.
   * @param status - The status.
   * @param search - The search.
   * @returns The result of the operation.
   */
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
  public async getQuestionnaires(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: QuestionnaireStatus,
    @Query('search') search?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
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

  /**
   * Retrieves questionnaire.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @returns The result of the operation.
   */
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
  public async getQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
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

  /**
   * Updates questionnaire.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param updateDto - The update dto.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '更新问卷',
    description: '更新问卷信息，包括问题、配置和状态',
  })
  @ApiResponse({ status: 200, description: '问卷更新成功' })
  @ApiResponse({ status: 404, description: '问卷未找到' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.UPDATE_QUESTIONNAIRE)
  @Put(':questionnaireId')
  @HttpCode(HttpStatus.OK)
  public async updateQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body() updateDto: UpdateQuestionnaireDto,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const updatedQuestionnaire =
        await this.questionnaireService.updateQuestionnaire(
          questionnaireId,
          updateDto as Record<string, unknown>,
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

  /**
   * Performs the publish questionnaire operation.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param publishOptions - The publish options.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '发布问卷',
    description: '将问卷状态更改为发布，用户可以开始提交回答',
  })
  @ApiResponse({ status: 200, description: '问卷发布成功' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.PUBLISH_QUESTIONNAIRE)
  @Post(':questionnaireId/publish')
  @HttpCode(HttpStatus.OK)
  public async publishQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body()
    publishOptions?: {
      publishDate?: string;
      expirationDate?: string;
      targetAudience?: string[];
      notifyUsers?: boolean;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const publishResult =
        await this.questionnaireService.publishQuestionnaire(
          questionnaireId,
          req.user.id,
          publishOptions ?? {},
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

  /**
   * Performs the duplicate questionnaire operation.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param duplicateOptions - The duplicate options.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '复制问卷',
    description: '基于现有问卷创建副本',
  })
  @ApiResponse({ status: 201, description: '问卷复制成功' })
  @ApiParam({ name: 'questionnaireId', description: '原问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.CREATE_QUESTIONNAIRE)
  @Post(':questionnaireId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  public async duplicateQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body()
    duplicateOptions: {
      title?: string;
      includeSubmissions?: boolean;
      modifyQuestions?: {
        exclude?: string[];
        include?: string[];
        reorder?: string[];
      };
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
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

  /**
   * Removes questionnaire.
   * @param req - The req.
   * @param questionnaireId - The questionnaire id.
   * @param deleteRequest - The delete request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '删除问卷',
    description: '软删除指定问卷（保留提交记录用于审计）',
  })
  @ApiResponse({ status: 200, description: '问卷删除成功' })
  @ApiParam({ name: 'questionnaireId', description: '问卷ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.DELETE_QUESTIONNAIRE)
  @Delete(':questionnaireId')
  @HttpCode(HttpStatus.OK)
  public async deleteQuestionnaire(
    @Request() req: AuthenticatedRequest,
    @Param('questionnaireId') questionnaireId: string,
    @Body() deleteRequest: { reason?: string; hardDelete?: boolean },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
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

  /**
   * Performs the health check operation.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '服务健康检查',
    description: '检查问卷服务的健康状态',
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  public async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    service: string;
    details?: {
      database: string;
      templates: string;
      submissions: string;
    };
    error?: string;
  }> {
    try {
      const health = await this.questionnaireService.getHealthStatus();

      return {
        status: health.overall,
        timestamp: new Date().toISOString(),
        service: 'questionnaire-management',
        details: {
          database: health.database ?? 'unknown',
          templates: health.templates ?? 'unknown',
          submissions: health.submissions ?? 'unknown',
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
