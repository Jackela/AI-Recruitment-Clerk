import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateJobDto } from './dto/create-job.dto';
import { ResumeUploadResponseDto } from './dto/resume-upload.dto';
import { MulterFile } from './types/multer.types';

@Injectable()
export class JobsService {
  async createJob(dto: CreateJobDto): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    // Here we would publish the event to NATS
    Logger.log(`Published job.jd.submitted for ${jobId}`);
    return { jobId };
  }

  uploadResumes(jobId: string, files: MulterFile[]): ResumeUploadResponseDto {
    if (!files || files.length === 0) {
      return new ResumeUploadResponseDto(jobId, 0);
    }

    // Process each uploaded resume file
    files.forEach((file) => {
      const resumeId = randomUUID();
      const tempGridFsUrl = `gridfs://temp/${resumeId}`;
      
      // Here we would publish the NATS event for each resume
      Logger.log(`Published resume.submitted for jobId: ${jobId}, resumeId: ${resumeId}, filename: ${file.originalname}`);
    });

    return new ResumeUploadResponseDto(jobId, files.length);
  }
}
