import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  
  
} from '@nestjs/swagger';
import type { JobsService } from './jobs.service';
import type { CreateJobDto } from './dto/create-job.dto';
import type { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import type { JobParamsDto } from './dto/job-params.dto';
import type { MulterFile } from './types/multer.types';
import type { JobListDto} from './dto/job-response.dto';
import { JobDetailDto } from './dto/job-response.dto';
import type { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import type { AnalysisReportDto, ReportsListDto } from './dto/report-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type {
  UserDto} from '@ai-recruitment-clerk/user-management-domain';
import {
  Permission
} from '@ai-recruitment-clerk/user-management-domain';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

/**
 * Exposes endpoints for jobs.
 */
@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class JobsController {
  /**
   * Initializes a new instance of the Jobs Controller.
   * @param jobsService - The jobs service.
   */
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Creates job.
   * @param req - The req.
   * @param dto - The dto.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '创建新职位',
    description: '创建一个新的职位招聘信息，需要CREATE_JOB权限',
  })
  @ApiResponse({
    status: 202,
    description: '职位创建请求已接受，正在处理中',
    type: JobDetailDto,
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @Permissions(Permission.CREATE_JOB)
  @Post('jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  public createJob(@Request() req: AuthenticatedRequest, @Body() dto: CreateJobDto): Promise<{ jobId: string }> {
    return this.jobsService.createJob(dto, req.user);
  }

  /**
   * Performs the upload resumes operation.
   * @param req - The req.
   * @param params - The params.
   * @param files - The files.
   * @returns The ResumeUploadResponseDto.
   */
  @Permissions(Permission.UPLOAD_RESUME)
  @Post('jobs/:jobId/resumes')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FilesInterceptor('resumes', 10)) // Max 10 files
  public uploadResumes(
    @Request() req: AuthenticatedRequest,
    @Param() params: JobParamsDto,
    @UploadedFiles(new FileValidationPipe()) files: MulterFile[],
  ): Promise<ResumeUploadResponseDto> {
    return this.jobsService.uploadResumes(params.jobId, files, req.user);
  }

  // GET endpoints for frontend
  /**
   * Retrieves all jobs.
   * @param req - The req.
   * @returns A promise that resolves to an array of JobListDto.
   */
  @Permissions(Permission.READ_JOB)
  @Get('jobs')
  public getAllJobs(@Request() _req: AuthenticatedRequest): Promise<JobListDto[]> {
    return this.jobsService.getAllJobs();
  }

  /**
   * Retrieves job by id.
   * @param req - The req.
   * @param jobId - The job id.
   * @returns The JobDetailDto.
   */
  @Permissions(Permission.READ_JOB)
  @Get('jobs/:jobId')
  public getJobById(
    @Request() _req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ): Promise<JobDetailDto> {
    return this.jobsService.getJobById(jobId);
  }

  /**
   * Retrieves resumes by job id.
   * @param req - The req.
   * @param jobId - The job id.
   * @returns A promise that resolves to an array of ResumeListItemDto.
   */
  @Permissions(Permission.READ_RESUME)
  @Get('jobs/:jobId/resumes')
  public getResumesByJobId(
    @Request() _req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ): Promise<ResumeListItemDto[]> {
    return this.jobsService.getResumesByJobId(jobId);
  }

  /**
   * Retrieves reports by job id.
   * @param req - The req.
   * @param jobId - The job id.
   * @returns A promise that resolves to ReportsListDto.
   */
  @Permissions(Permission.GENERATE_REPORT)
  @Get('jobs/:jobId/reports')
  public getReportsByJobId(
    @Request() _req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ): Promise<ReportsListDto> {
    return this.jobsService.getReportsByJobId(jobId);
  }

  /**
   * Retrieves resume by id.
   * @param req - The req.
   * @param resumeId - The resume id.
   * @returns A promise that resolves to ResumeDetailDto.
   */
  @Permissions(Permission.READ_RESUME)
  @Get('resumes/:resumeId')
  public getResumeById(
    @Request() _req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
  ): Promise<ResumeDetailDto> {
    return this.jobsService.getResumeById(resumeId);
  }

  /**
   * Retrieves report by id.
   * @param req - The req.
   * @param reportId - The report id.
   * @returns A promise that resolves to AnalysisReportDto.
   */
  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports/:reportId')
  public getReportById(
    @Request() _req: AuthenticatedRequest,
    @Param('reportId') reportId: string,
  ): Promise<AnalysisReportDto> {
    return this.jobsService.getReportById(reportId);
  }
}
