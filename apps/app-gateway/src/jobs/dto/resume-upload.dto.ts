import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Describes the resume upload data transfer object.
 */
export class ResumeUploadDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  // Optional metadata fields used by controllers
  @IsString()
  @IsNotEmpty()
  candidateName?: string;

  @IsString()
  candidateEmail?: string;

  @IsString()
  notes?: string;

  @IsString({ each: true })
  tags?: string[];
}

/**
 * Describes the resume upload response data transfer object.
 */
export class ResumeUploadResponseDto {
  jobId: string;
  submittedResumes: number;
  // Backward/compat field used in tests
  /**
   * Performs the uploaded count operation.
   * @returns The number value.
   */
  get uploadedCount(): number {
    return this.submittedResumes;
  }

  /**
   * Initializes a new instance of the Resume Upload Response DTO.
   * @param jobId - The job id.
   * @param submittedResumes - The submitted resumes.
   */
  constructor(jobId: string, submittedResumes: number) {
    this.jobId = jobId;
    this.submittedResumes = submittedResumes;
  }
}
