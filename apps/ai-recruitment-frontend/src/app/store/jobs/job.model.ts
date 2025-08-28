export interface Job {
  id: string;
  title: string;
  jdText: string;
  status: 'draft' | 'active' | 'processing' | 'completed' | 'closed';
  createdAt: Date;
  resumeCount: number;
}

export interface JobListItem {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'processing' | 'completed' | 'closed';
  createdAt: Date;
  resumeCount: number;
}

export interface CreateJobRequest {
  jobTitle: string;
  jdText: string;
}

export interface CreateJobResponse {
  jobId: string;
}
