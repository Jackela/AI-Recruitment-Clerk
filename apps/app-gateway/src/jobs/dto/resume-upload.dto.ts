import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Describes the resume upload data transfer object.
 */
export class ResumeUploadDto {
  @IsString()
  @IsNotEmpty()
  public jobId!: string;
}

/**
 * Describes the resume upload response data transfer object.
 */
export class ResumeUploadResponseDto {
  public jobId: string;
  public submittedResumes: number;
  // Backward/compat field used in tests
  /**
   * Performs the uploaded count operation.
   * @returns The number value.
   */
  public get uploadedCount(): number {
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
