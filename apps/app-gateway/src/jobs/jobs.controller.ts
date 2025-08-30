import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFiles, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { JobParamsDto } from './dto/job-params.dto';
import { MulterFile } from './types/multer.types';
import { JobListDto, JobDetailDto } from './dto/job-response.dto';
import { ResumeListItemDto, ResumeDetailDto } from './dto/resume-response.dto';
import { AnalysisReportDto, ReportsListDto } from './dto/report-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission, UserDto } from '@ai-recruitment-clerk/user-management-domain';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: '创建新职位', description: '创建一个新的职位招聘信息，需要CREATE_JOB权限' })
  @ApiResponse({ status: 202, description: '职位创建请求已接受，正在处理中', type: JobDetailDto })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @Permissions(Permission.CREATE_JOB)
  @Post('jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  createJob(@Request() req: AuthenticatedRequest, @Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto, req.user);
  }

  @Permissions(Permission.UPLOAD_RESUME)
  @Post('jobs/:jobId/resumes')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FilesInterceptor('resumes', 10)) // Max 10 files
  uploadResumes(
    @Request() req: AuthenticatedRequest,
    @Param() params: JobParamsDto,
    @UploadedFiles(new FileValidationPipe()) files: MulterFile[]
  ): ResumeUploadResponseDto {
    return this.jobsService.uploadResumes(params.jobId, files, req.user);
  }

  // GET endpoints for frontend
  @Permissions(Permission.READ_JOB)
  @Get('jobs')
  getAllJobs(@Request() req: AuthenticatedRequest): Promise<JobListDto[]> {
    return this.jobsService.getAllJobs();
  }

  @Permissions(Permission.READ_JOB)
  @Get('jobs/:jobId')
  getJobById(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string): Promise<JobDetailDto> {
    return this.jobsService.getJobById(jobId);
  }

  @Permissions(Permission.READ_RESUME)
  @Get('jobs/:jobId/resumes')
  getResumesByJobId(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string): Promise<ResumeListItemDto[]> {
    return this.jobsService.getResumesByJobId(jobId);
  }

  @Permissions(Permission.GENERATE_REPORT)
  @Get('jobs/:jobId/reports')
  getReportsByJobId(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string): Promise<ReportsListDto> {
    return this.jobsService.getReportsByJobId(jobId);
  }

  @Permissions(Permission.READ_RESUME)
  @Get('resumes/:resumeId')
  getResumeById(@Request() req: AuthenticatedRequest, @Param('resumeId') resumeId: string): Promise<ResumeDetailDto> {
    return this.jobsService.getResumeById(resumeId);
  }

  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports/:reportId')
  getReportById(@Request() req: AuthenticatedRequest, @Param('reportId') reportId: string): Promise<AnalysisReportDto> {
    return this.jobsService.getReportById(reportId);
  }
}
