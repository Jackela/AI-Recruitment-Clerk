/**
 * Describes the resume list item data transfer object.
 */
export class ResumeListItemDto {
  id: string;
  jobId: string;
  originalFilename: string;
  status: 'pending' | 'parsing' | 'scoring' | 'completed' | 'failed';
  matchScore?: number;
  candidateName?: string;
  createdAt: Date;

  /**
   * Initializes a new instance of the Resume List Item DTO.
   * @param id - The id.
   * @param jobId - The job id.
   * @param originalFilename - The original filename.
   * @param status - The status.
   * @param createdAt - The created at.
   * @param matchScore - The match score.
   * @param candidateName - The candidate name.
   */
  constructor(
    id: string,
    jobId: string,
    originalFilename: string,
    status: 'pending' | 'parsing' | 'scoring' | 'completed' | 'failed',
    createdAt: Date,
    matchScore?: number,
    candidateName?: string,
  ) {
    this.id = id;
    this.jobId = jobId;
    this.originalFilename = originalFilename;
    this.status = status;
    this.createdAt = createdAt;
    this.matchScore = matchScore;
    this.candidateName = candidateName;
  }
}

/**
 * Describes the resume detail data transfer object.
 */
export class ResumeDetailDto {
  id: string;
  jobId: string;
  originalFilename: string;
  status: 'pending' | 'parsing' | 'scoring' | 'completed' | 'failed';
  candidateName?: string;
  contactInfo?: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  skills?: string[];
  workExperience?: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    summary: string;
  }[];
  education?: {
    school: string;
    degree: string;
    major: string | null;
  }[];
  matchScore?: number;
  reportId?: string;
  createdAt: Date;

  /**
   * Initializes a new instance of the Resume Detail DTO.
   * @param id - The id.
   * @param jobId - The job id.
   * @param originalFilename - The original filename.
   * @param status - The status.
   * @param createdAt - The created at.
   * @param candidateName - The candidate name.
   * @param contactInfo - The contact info.
   * @param skills - The skills.
   * @param workExperience - The work experience.
   * @param education - The education.
   * @param matchScore - The match score.
   * @param reportId - The report id.
   */
  constructor(
    id: string,
    jobId: string,
    originalFilename: string,
    status: 'pending' | 'parsing' | 'scoring' | 'completed' | 'failed',
    createdAt: Date,
    candidateName?: string,
    contactInfo?: {
      name: string | null;
      email: string | null;
      phone: string | null;
    },
    skills?: string[],
    workExperience?: {
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      summary: string;
    }[],
    education?: {
      school: string;
      degree: string;
      major: string | null;
    }[],
    matchScore?: number,
    reportId?: string,
  ) {
    this.id = id;
    this.jobId = jobId;
    this.originalFilename = originalFilename;
    this.status = status;
    this.createdAt = createdAt;
    this.candidateName = candidateName;
    this.contactInfo = contactInfo;
    this.skills = skills;
    this.workExperience = workExperience;
    this.education = education;
    this.matchScore = matchScore;
    this.reportId = reportId;
  }
}
