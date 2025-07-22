import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobsService {
  async createJob(dto: CreateJobDto): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    // Here we would publish the event to NATS
    Logger.log(`Published job.jd.submitted for ${jobId}`);
    return { jobId };
  }
}
