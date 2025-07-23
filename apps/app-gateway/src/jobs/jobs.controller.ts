import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
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

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  createJob(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @Post('jobs/:jobId/resumes')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FilesInterceptor('resumes', 10)) // Max 10 files
  uploadResumes(
    @Param() params: JobParamsDto,
    @UploadedFiles(new FileValidationPipe()) files: MulterFile[]
  ): ResumeUploadResponseDto {
    return this.jobsService.uploadResumes(params.jobId, files);
  }

  // GET endpoints for frontend
  @Get('jobs')
  getAllJobs(): JobListDto[] {
    return this.jobsService.getAllJobs();
  }

  @Get('jobs/:jobId')
  getJobById(@Param('jobId') jobId: string): JobDetailDto {
    return this.jobsService.getJobById(jobId);
  }

  @Get('jobs/:jobId/resumes')
  getResumesByJobId(@Param('jobId') jobId: string): ResumeListItemDto[] {
    return this.jobsService.getResumesByJobId(jobId);
  }

  @Get('jobs/:jobId/reports')
  getReportsByJobId(@Param('jobId') jobId: string): ReportsListDto {
    return this.jobsService.getReportsByJobId(jobId);
  }

  @Get('resumes/:resumeId')
  getResumeById(@Param('resumeId') resumeId: string): ResumeDetailDto {
    return this.jobsService.getResumeById(resumeId);
  }

  @Get('reports/:reportId')
  getReportById(@Param('reportId') reportId: string): AnalysisReportDto {
    return this.jobsService.getReportById(reportId);
  }
}
