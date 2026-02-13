import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type {
  ResumeUploadDto,
  ResumeStatusUpdateDto,
  ResumeSearchDto,
} from '@ai-recruitment-clerk/resume-dto';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import type { ResumeService } from './resume.service';

const resumeFileValidator: {
  isValid: (file?: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size: number;
  }) => boolean;
  buildErrorMessage: () => string;
  validationOptions?: Record<string, unknown>;
} = {
  buildErrorMessage: () =>
    'Invalid file type. Only PDF, DOC, and DOCX files are allowed.',
  isValid: (file?: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size: number;
  }): boolean => {
    if (!file) return false;
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = /\.(pdf|doc|docx)$/i;
    const mimeTypeValid = file.mimetype ? allowedMimeTypes.includes(file.mimetype) : false;
    const extensionValid = allowedExtensions.test(file.originalname);
    return mimeTypeValid && extensionValid;
  },
};

// Use imported interface instead of local definition

/**
 * Exposes endpoints for resume.
 */
@ApiTags('resume-processing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumeController {
  /**
   * Initializes a new instance of the Resume Controller.
   * @param resumeService - The resume service.
   */
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * Performs the upload resume operation.
   * @param req - The req.
   * @param file - The file.
   * @param uploadData - The upload data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '上传简历文件',
    description: '上传PDF/DOC/DOCX格式的简历文件进行解析和分析',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: '简历上传成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            resumeId: { type: 'string' },
            filename: { type: 'string' },
            uploadedAt: { type: 'string' },
            status: { type: 'string' },
            processingEstimate: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '文件格式不支持或文件过大' })
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('resume'))
  public async uploadResume(
    @Request() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
          resumeFileValidator,
        ],
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: Express.Multer.File,
    @Body() uploadData: ResumeUploadDto,
    ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        resumeId: string;
        filename: string;
        uploadedAt: string;
        status: string;
        processingEstimate: string;
        fileSize: number;
        fileType: string;
      };
      error?: string;
    }> {
    try {
      const uploadResult = await this.resumeService.uploadResume({
        file: file,
        uploadedBy: req.user.id,
        jobId: uploadData.jobId,
        candidateName: uploadData.candidateName,
        candidateEmail: uploadData.candidateEmail,
        notes: uploadData.notes,
        tags: uploadData.tags || [],
      });

      return {
        success: true,
        message: 'Resume uploaded successfully',
        data: {
          resumeId: uploadResult.resumeId,
          filename: file.originalname,
          uploadedAt: uploadResult.uploadedAt,
          status: uploadResult.status,
          processingEstimate: uploadResult.processingEstimate,
          fileSize: file.size,
          fileType: file.mimetype,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to upload resume',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves resume.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取简历解析结果',
    description: '获取指定简历的解析结果和分析数据',
  })
  @ApiResponse({
    status: 200,
    description: '简历数据获取成功',
  })
  @ApiResponse({ status: 404, description: '简历未找到' })
  @ApiParam({ name: 'resumeId', description: '简历ID' })
  @Get(':resumeId')
  public async getResume(
    @Request() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
  ): Promise<{
      success: boolean;
      data?: unknown;
      error?: string;
      message?: string;
    }> {
    try {
      const resume = await this.resumeService.getResume(resumeId);

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      // Check if user has access to this resume
      const hasAccess = await this.resumeService.checkResumeAccess(
        resumeId,
        req.user.id,
        req.user.organizationId,
      );

      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this resume');
      }

      return {
        success: true,
        data: resume,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve resume',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves resume analysis.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @param jobId - The job id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取简历分析结果',
    description: '获取简历的详细分析，包括技能匹配、经验评估等',
  })
  @ApiResponse({
    status: 200,
    description: '分析结果获取成功',
  })
  @ApiParam({ name: 'resumeId', description: '简历ID' })
  @ApiQuery({
    name: 'jobId',
    required: false,
    description: '职位ID（用于匹配度分析）',
  })
  @Get(':resumeId/analysis')
  public async getResumeAnalysis(
    @Request() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
    @Query('jobId') jobId?: string,
  ): Promise<{
      success: boolean;
      data?: unknown;
      error?: string;
      message?: string;
    }> {
    try {
      const analysis = await this.resumeService.getResumeAnalysis(
        resumeId,
        jobId,
        req.user.id,
      );

      if (!analysis) {
        throw new NotFoundException('Resume analysis not found');
      }

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve resume analysis',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves resume skills.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取简历技能分析',
    description: '获取简历中识别的技能和技能评级',
  })
  @ApiResponse({
    status: 200,
    description: '技能分析获取成功',
  })
  @ApiParam({ name: 'resumeId', description: '简历ID' })
  @Get(':resumeId/skills')
  public async getResumeSkills(
    @Request() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
  ): Promise<{
      success: boolean;
      data?: unknown;
      error?: string;
      message?: string;
    }> {
    try {
      const skillsAnalysis = await this.resumeService.getResumeSkillsAnalysis(
        resumeId,
        req.user.id,
      );

      return {
        success: true,
        data: skillsAnalysis,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve skills analysis',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates resume status.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @param statusUpdate - The status update.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '更新简历状态',
    description: '更新简历的处理状态或审核状态',
  })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  @ApiParam({ name: 'resumeId', description: '简历ID' })
  @Put(':resumeId/status')
  @HttpCode(HttpStatus.OK)
  public async updateResumeStatus(
    @Request() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
    @Body() statusUpdate: ResumeStatusUpdateDto,
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        resumeId: string;
        newStatus: string;
        updatedBy: string;
        timestamp: string;
      };
      error?: string;
    }> {
    try {
      await this.resumeService.updateResumeStatus(
        resumeId,
        statusUpdate.status,
        req.user.id,
        statusUpdate.reason,
      );

      return {
        success: true,
        message: 'Resume status updated successfully',
        data: {
          resumeId,
          newStatus: statusUpdate.status,
          updatedBy: req.user.id,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update resume status',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the batch process resumes operation.
   * @param req - The req.
   * @param batchRequest - The batch request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '批量处理简历',
    description: '批量操作多个简历（状态更新、分析等）',
  })
  @ApiResponse({ status: 200, description: '批量处理成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.PROCESS_RESUME)
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  public async batchProcessResumes(
    @Request() req: AuthenticatedRequest,
    @Body()
    batchRequest: {
      resumeIds: string[];
      operation: 'analyze' | 'approve' | 'reject' | 'archive';
      parameters?: {
        reason?: string;
        bonusType?: string;
        bonusAmount?: number;
        newQuotaAmount?: number;
      };
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        totalProcessed: number;
        successful: number;
        failed: number;
        results: unknown[];
        action: string;
        operatedBy: string;
      };
      error?: string;
    }> {
    try {
      const batchResult = await this.resumeService.batchProcessResumes(
        batchRequest.resumeIds,
        batchRequest.operation,
        req.user.id,
        batchRequest.parameters,
      );

      return {
        success: true,
        message: 'Batch processing completed',
        data: {
          totalProcessed: batchResult.totalProcessed,
          successful: batchResult.successful,
          failed: batchResult.failed,
          results: batchResult.results,
          action: batchRequest.operation,
          operatedBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Batch processing failed',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the search resumes operation.
   * @param req - The req.
   * @param searchCriteria - The search criteria.
   * @param page - The page.
   * @param limit - The limit.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '搜索简历',
    description: '根据技能、经验、关键词等搜索简历',
  })
  @ApiResponse({ status: 200, description: '搜索结果返回成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.SEARCH_RESUME)
  @Post('search')
  @HttpCode(HttpStatus.OK)
  public async searchResumes(
    @Request() req: AuthenticatedRequest,
    @Body() searchCriteria: ResumeSearchDto,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<{
      success: boolean;
      data?: {
        resumes: unknown[];
        totalCount: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
      };
      error?: string;
      message?: string;
    }> {
    try {
      const searchResults = await this.resumeService.searchResumes(
        searchCriteria,
        req.user.organizationId,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
        },
      );

      return {
        success: true,
        data: {
          resumes: searchResults.resumes,
          totalCount: searchResults.totalCount,
          page: page,
          totalPages: Math.ceil(searchResults.totalCount / limit),
          hasNext: page * limit < searchResults.totalCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the reprocess resume operation.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @param reprocessOptions - The reprocess options.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '重新处理简历',
    description: '重新分析和处理已上传的简历',
  })
  @ApiResponse({ status: 200, description: '重新处理已启动' })
  @ApiParam({ name: 'resumeId', description: '简历ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.PROCESS_RESUME)
  @Post(':resumeId/reprocess')
  @HttpCode(HttpStatus.OK)
  public async reprocessResume(
    @Request() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
    @Body()
    reprocessOptions?: {
      forceReparse?: boolean;
      updateSkillsOnly?: boolean;
      analysisOptions?: {
        includeDetailedSkills?: boolean;
        includeSoftSkills?: boolean;
        includeCertifications?: boolean;
      };
    },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        resumeId: string;
        jobId: string;
        estimatedTime: string;
        requestedBy: string;
      };
      error?: string;
    }> {
    try {
      const reprocessResult = await this.resumeService.reprocessResume(
        resumeId,
        req.user.id,
        reprocessOptions,
      );

      return {
        success: true,
        message: 'Resume reprocessing started',
        data: {
          resumeId,
          jobId: reprocessResult.jobId,
          estimatedTime: reprocessResult.estimatedTime,
          requestedBy: req.user.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to start reprocessing',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Removes resume.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @param deleteRequest - The delete request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '删除简历',
    description: '软删除指定的简历记录',
  })
  @ApiResponse({ status: 200, description: '简历删除成功' })
  @ApiParam({ name: 'resumeId', description: '简历ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.DELETE_RESUME)
  @Delete(':resumeId')
  @HttpCode(HttpStatus.OK)
  public async deleteResume(
    @Request() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
    @Body() deleteRequest: { reason?: string; hardDelete?: boolean },
  ): Promise<{
      success: boolean;
      message?: string;
      data?: {
        resumeId: string;
        deletedAt: string;
        deletedBy: string;
        hardDelete: boolean;
      };
      error?: string;
    }> {
    try {
      await this.resumeService.deleteResume(
        resumeId,
        req.user.id,
        deleteRequest.reason,
        deleteRequest.hardDelete || false,
      );

      return {
        success: true,
        message: 'Resume deleted successfully',
        data: {
          resumeId,
          deletedAt: new Date().toISOString(),
          deletedBy: req.user.id,
          hardDelete: deleteRequest.hardDelete || false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete resume',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves processing stats.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取简历处理统计',
    description: '获取组织的简历处理统计信息',
  })
  @ApiResponse({ status: 200, description: '统计信息获取成功' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_ANALYTICS)
  @Get('stats/processing')
  public async getProcessingStatistics(
    @Request() req: AuthenticatedRequest,
  ): Promise<{
      success: boolean;
      data?: {
        totalResumes: number;
        processingStatus: {
          pending: number;
          inProgress: number;
          completed: number;
          failed: number;
        };
        averageProcessingTime: number;
        skillsDistribution: unknown;
        monthlyTrends: unknown;
        qualityMetrics: unknown;
      };
      error?: string;
      message?: string;
    }> {
    try {
      const stats = await this.resumeService.getProcessingStats(
        req.user.organizationId,
      );

      return {
        success: true,
        data: {
          totalResumes: stats.totalResumes,
          processingStatus: stats.processingStatus,
          averageProcessingTime: stats.averageProcessingTime,
          skillsDistribution: stats.skillsDistribution,
          monthlyTrends: stats.monthlyTrends,
          qualityMetrics: stats.qualityMetrics,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve processing stats',
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
    description: '检查简历处理服务的健康状态',
  })
  @ApiResponse({ status: 200, description: '服务状态' })
  @Get('health')
  public async healthCheck(): Promise<{
      status: string;
      timestamp: string;
      service: string;
      details?: {
        database: string;
        storage: string;
        parser: string;
        queue: string;
      };
      error?: string;
    }> {
    try {
      const health = await this.resumeService.getHealthStatus();

      return {
        status: health.overall,
        timestamp: new Date().toISOString(),
        service: 'resume-processing',
        details: {
          database: health.database,
          storage: health.storage,
          parser: health.parser,
          queue: health.queue,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'resume-processing',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
