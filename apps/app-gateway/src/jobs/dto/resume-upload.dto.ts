import { IsString, IsNotEmpty } from 'class-validator';

export class ResumeUploadDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}

export class ResumeUploadResponseDto {
  jobId: string;
  submittedResumes: number;

  constructor(jobId: string, submittedResumes: number) {
    this.jobId = jobId;
    this.submittedResumes = submittedResumes;
  }
}