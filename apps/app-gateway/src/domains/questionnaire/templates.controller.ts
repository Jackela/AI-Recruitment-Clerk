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
import { QuestionnaireTemplateDto } from '@ai-recruitment-clerk/shared-dtos';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { QuestionnaireIntegrationService } from './questionnaire-integration.service';

/**
 * Exposes endpoints for questionnaire template management.
 */
@ApiTags('questionnaire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('questionnaire')
export class TemplatesController {
  /**
   * Initializes a new instance of the Templates Controller.
   * @param questionnaireService - The questionnaire service.
   */
  constructor(
    private readonly questionnaireService: QuestionnaireIntegrationService,
  ) {}

  /**
   * Retrieves questionnaire templates.
   * @param req - The req.
   * @param category - The category.
   * @returns The result of the operation.
   */
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
  public async getQuestionnaireTemplates(
    @Request() req: AuthenticatedRequest,
    @Query('category') category?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
    try {
      const templates =
        await this.questionnaireService.getQuestionnaireTemplates(
          category ?? '',
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

  /**
   * Creates from template.
   * @param req - The req.
   * @param templateId - The template id.
   * @param createOptions - The create options.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '从模板创建问卷',
    description: '基于指定模板创建新问卷',
  })
  @ApiResponse({ status: 201, description: '从模板创建成功' })
  @ApiParam({ name: 'templateId', description: '模板ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.CREATE_QUESTIONNAIRE)
  @Post('templates/:templateId/create')
  @HttpCode(HttpStatus.CREATED)
  public async createFromTemplate(
    @Request() req: AuthenticatedRequest,
    @Param('templateId') templateId: string,
    @Body()
    createOptions: {
      title: string;
      customizations?: {
        timeLimit?: number;
        shuffleQuestions?: boolean;
        showProgressBar?: boolean;
        allowSaveAndResume?: boolean;
        theme?: string;
        customInstructions?: string;
      };
      organizationId?: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  }> {
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
          totalQuestions: Array.isArray(questionnaire.questions) ? questionnaire.questions.length : 0,
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
}
