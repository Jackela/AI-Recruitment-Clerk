import type { JobContracts } from '@ai-recruitment-clerk/api-contracts';

/**
 * Describes the job detail data transfer object.
 */
export class JobDetailDto {
  public id: string;
  public title: string;
  public jdText: string;
  public status: JobContracts.JobStatus;
  public createdAt: Date;
  public resumeCount: number;

  /**
   * Initializes a new instance of the Job Detail DTO.
   * @param id - The id.
   * @param title - The title.
   * @param jdText - The jd text.
   * @param status - The status.
   * @param createdAt - The created at.
   * @param resumeCount - The resume count.
   */
  constructor(
    id: string,
    title: string,
    jdText: string,
    status: JobContracts.JobStatus,
    createdAt: Date,
    resumeCount = 0,
  ) {
    this.id = id;
    this.title = title;
    this.jdText = jdText;
    this.status = status;
    this.createdAt = createdAt;
    this.resumeCount = resumeCount;
  }
}

/**
 * Describes the job list data transfer object.
 */
export class JobListDto {
  public id: string;
  public title: string;
  public status: JobContracts.JobStatus;
  public createdAt: Date;
  public resumeCount: number;

  /**
   * Initializes a new instance of the Job List DTO.
   * @param id - The id.
   * @param title - The title.
   * @param status - The status.
   * @param createdAt - The created at.
   * @param resumeCount - The resume count.
   */
  constructor(
    id: string,
    title: string,
    status: JobContracts.JobStatus,
    createdAt: Date,
    resumeCount = 0,
  ) {
    this.id = id;
    this.title = title;
    this.status = status;
    this.createdAt = createdAt;
    this.resumeCount = resumeCount;
  }
}

/**
 * Create Job Request contract (frontend parity)
 * Kept lightweight here to align field naming validation.
 */
export interface CreateJobRequestDto {
  jobTitle: string;
  jdText: string;
}

/**
 * Create Job Response contract (frontend parity)
 */
export interface CreateJobResponseDto {
  jobId: string;
}
