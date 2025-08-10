import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFiles, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
import { Permission, UserDto } from '../../../../libs/shared-dtos/src';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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
  getAllJobs(@Request() req: AuthenticatedRequest): JobListDto[] {
    return this.jobsService.getAllJobs(req.user);
  }

  @Permissions(Permission.READ_JOB)
  @Get('jobs/:jobId')
  getJobById(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string): JobDetailDto {
    return this.jobsService.getJobById(jobId, req.user);
  }

  @Permissions(Permission.READ_RESUME)
  @Get('jobs/:jobId/resumes')
  getResumesByJobId(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string): ResumeListItemDto[] {
    return this.jobsService.getResumesByJobId(jobId, req.user);
  }

  @Permissions(Permission.GENERATE_REPORT)
  @Get('jobs/:jobId/reports')
  getReportsByJobId(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string): ReportsListDto {
    return this.jobsService.getReportsByJobId(jobId, req.user);
  }

  @Permissions(Permission.READ_RESUME)
  @Get('resumes/:resumeId')
  getResumeById(@Request() req: AuthenticatedRequest, @Param('resumeId') resumeId: string): ResumeDetailDto {
    return this.jobsService.getResumeById(resumeId, req.user);
  }

  @Permissions(Permission.READ_ANALYSIS)
  @Get('reports/:reportId')
  getReportById(@Request() req: AuthenticatedRequest, @Param('reportId') reportId: string): AnalysisReportDto {
    return this.jobsService.getReportById(reportId, req.user);
  }
}
