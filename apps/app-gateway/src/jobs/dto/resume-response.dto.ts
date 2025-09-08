export class ResumeListItemDto {
  id: string;
  jobId: string;
  originalFilename: string;
  status: 'pending' | 'parsing' | 'scoring' | 'completed' | 'failed';
  matchScore?: number;
  candidateName?: string;
  createdAt: Date;

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
