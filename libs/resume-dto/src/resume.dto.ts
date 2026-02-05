/**
 * @description Resume DTOs - Consolidated from shared-dtos and resume-processing-domain
 *
 * This library contains all Resume-related DTOs organized by domain:
 * - Core Resume DTO (parsed resume structure)
 * - Resume Analysis DTO (analysis results)
 * - Resume Upload DTO (upload metadata)
 * - Resume Status Update DTO (status transitions)
 * - Resume Search DTO (search criteria)
 * - Resume Skills Analysis DTO (detailed skills breakdown)
 */

/**
 * @description 从简历中解析出的结构化数据
 */
export interface ResumeDTO {
  contactInfo: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  summary?: string;
  skills: string[];
  workExperience: {
    company: string;
    position: string;
    startDate: string; // ISO 8601 Date
    endDate: string; // ISO 8601 Date or "present"
    summary: string;
  }[];
  education: {
    school: string;
    degree: string;
    major: string | null;
  }[];
  certifications?: string[];
  languages?: string[];
}

/**
 * Resume analysis result DTO
 */
export interface ResumeAnalysisDto {
  resumeId: string;
  matchScore: number;
  skillsMatch: {
    matched: string[];
    missing: string[];
    additional: string[];
  };
  experienceAnalysis: {
    totalYears: number;
    relevantYears: number;
    industries: string[];
  };
  recommendations: string[];
  analysisDate: string;
}

/**
 * Resume upload request DTO
 */
export interface ResumeUploadDto {
  fileName: string;
  fileSize: number;
  mimeType: string;
  jobId?: string;
  candidateEmail?: string;
  candidateName?: string;
  source?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Resume status update DTO
 */
export interface ResumeStatusUpdateDto {
  status: 'pending' | 'processing' | 'analyzed' | 'rejected' | 'archived';
  notes?: string;
  updatedBy?: string;
  reason?: string;
}

/**
 * Resume search query DTO
 */
export interface ResumeSearchDto {
  query?: string;
  skills?: string[];
  minExperience?: number;
  maxExperience?: number;
  education?: string[];
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Resume skills analysis DTO
 */
export interface ResumeSkillsAnalysisDto {
  resumeId: string;
  technicalSkills: {
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsOfExperience: number;
    lastUsed?: string;
  }[];
  softSkills: string[];
  certifications: {
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
  }[];
  languages: {
    language: string;
    proficiency: 'basic' | 'conversational' | 'professional' | 'native';
  }[];
}

// Type aliases for backward compatibility
export type ResumeDto = ResumeDTO;
