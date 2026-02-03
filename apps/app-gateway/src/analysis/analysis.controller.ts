import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import type { AnalysisService } from './analysis.service';
import type { AnalysisRequestDto } from './dto/analysis-request.dto';
import { AnalysisInitiatedResponseDto } from './dto/analysis-response.dto';
import type { MulterFile } from '../jobs/types/multer.types';
// Standardized Error Handling
import { HandleErrors, ErrorUtils } from '@ai-recruitment-clerk/shared-dtos';

/**
 * Exposes endpoints for analysis.
 */
@ApiTags('analysis')
@Controller('jobs')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  /**
   * Initializes a new instance of the Analysis Controller.
   * @param analysisService - The analysis service.
   */
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * Performs the start analysis operation.
   * @param analysisRequest - The analysis request.
   * @param resumeFile - The resume file.
   * @returns A promise that resolves to AnalysisInitiatedResponseDto.
   */
  @ApiOperation({
    summary: '启动简历分析流程',
    description:
      '接收职位描述和简历文件，启动完整的简历分析流程，包括JD提取、简历解析、技能匹配和评分',
  })
  @ApiResponse({
    status: 202,
    description: '分析流程已启动，正在处理中',
    type: AnalysisInitiatedResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 413, description: '文件过大' })
  @ApiResponse({ status: 415, description: '不支持的文件类型' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '分析请求，包含JD文本和简历文件',
    schema: {
      type: 'object',
      properties: {
        jdText: {
          type: 'string',
          description: '职位描述文本',
          example: 'Senior Cloud Architect role requiring AWS, Kubernetes...',
        },
        sessionId: {
          type: 'string',
          description: '分析会话ID（可选）',
          example: 'session_abc123',
        },
        options: {
          type: 'string',
          description: '分析配置选项JSON（可选）',
          example: '{"extractSkills": true, "matchThreshold": 0.7}',
        },
        resume: {
          type: 'string',
          format: 'binary',
          description: '简历文件（PDF格式）',
        },
      },
      required: ['jdText', 'resume'],
    },
  })
  @Public()
  @Post('analysis')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('resume'))
  @HandleErrors({
    defaultErrorType: 'VALIDATION_ERROR',
    defaultErrorCode: 'ANALYSIS_REQUEST_INVALID',
    defaultSeverity: 'medium',
    businessImpact: 'low',
    userImpact: 'moderate',
    recoveryStrategies: [
      'Check that all required fields are provided',
      'Ensure file is in PDF format and under 10MB',
      'Verify job description is not empty',
      'Try uploading the file again',
    ],
    operationContext: 'Analysis.startAnalysis',
  })
  public async startAnalysis(
    @Body() analysisRequest: AnalysisRequestDto,
    @UploadedFile() resumeFile: MulterFile,
  ): Promise<AnalysisInitiatedResponseDto> {
    this.logger.log('🔍 Starting analysis pipeline...');

    // Use standardized validation utilities
    ErrorUtils.validateAndThrow([
      {
        condition: !!(analysisRequest.jdText && analysisRequest.jdText.trim()),
        field: 'jdText',
        message: '职位描述不能为空',
        value: analysisRequest.jdText,
      },
      {
        condition: !!resumeFile,
        field: 'resume',
        message: '简历文件是必需的',
        value: resumeFile?.originalname,
      },
      {
        condition: !resumeFile || resumeFile.mimetype.includes('pdf'),
        field: 'resume.mimetype',
        message: '只支持PDF格式的简历文件',
        value: resumeFile?.mimetype,
      },
      {
        condition: !resumeFile || resumeFile.size <= 10 * 1024 * 1024,
        field: 'resume.size',
        message: '简历文件大小不能超过10MB',
        value: resumeFile?.size,
      },
    ]);

    this.logger.log(
      `📄 Received JD (${analysisRequest.jdText.length} chars) and resume (${resumeFile.originalname}, ${Math.round(resumeFile.size / 1024)}KB)`,
    );

    // Use withErrorHandling wrapper for the service call
    return await ErrorUtils.withErrorHandling(
      () =>
        this.analysisService.initiateAnalysis(
          analysisRequest.jdText,
          resumeFile,
          analysisRequest.sessionId,
          analysisRequest.options,
        ),
      {
        operationName: 'Analysis.initiateAnalysis',
        defaultErrorType: 'EXTERNAL_SERVICE_ERROR',
        defaultErrorCode: 'ANALYSIS_SERVICE_FAILED',
        severity: 'high',
        businessImpact: 'high',
        userImpact: 'moderate',
        recoveryStrategies: [
          'Try the analysis again in a few moments',
          'Check that the file is not corrupted',
          'Contact support if the problem persists',
        ],
        logger: this.logger,
      },
    );
  }
}
