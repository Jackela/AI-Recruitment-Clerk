export interface Job {
  id: string;
  title: string;
  jdText: string;
  status: 'processing' | 'completed';
  createdAt: Date;
  resumeCount: number;
}

export interface JobListItem {
  id: string;
  title: string;
  status: 'processing' | 'completed';
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
