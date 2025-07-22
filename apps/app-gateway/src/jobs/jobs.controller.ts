import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  createJob(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }
}
