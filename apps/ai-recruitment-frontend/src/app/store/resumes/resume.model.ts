export interface ResumeListItem {
  id: string;
  jobId: string;
  originalFilename: string;
  status: 'pending' | 'parsing' | 'scoring' | 'completed' | 'failed';
  matchScore?: number;
  candidateName?: string;
  createdAt: Date;
  uploadedAt?: Date;
  analysis?: {
    overallScore: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
  };
}

export interface ResumeDetail {
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
}

export interface ResumeUploadResponse {
  jobId: string;
  submittedResumes: number;
}
