import { IsString, IsNotEmpty } from 'class-validator';

export class ResumeUploadDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}

export class ResumeUploadResponseDto {
  jobId: string;
  submittedResumes: number;
  // Backward/compat field used in tests
  get uploadedCount(): number {
    return this.submittedResumes;
  }

  constructor(jobId: string, submittedResumes: number) {
    this.jobId = jobId;
    this.submittedResumes = submittedResumes;
  }
}
