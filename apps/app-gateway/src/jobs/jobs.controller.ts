import { Body, Controller, HttpCode, HttpStatus, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { JobParamsDto } from './dto/job-params.dto';
import { MulterFile } from './types/multer.types';

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
}
