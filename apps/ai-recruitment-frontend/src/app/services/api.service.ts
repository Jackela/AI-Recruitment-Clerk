import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Job,
  JobListItem,
  CreateJobRequest,
  CreateJobResponse,
} from '../store/jobs/job.model';
import {
  ResumeListItem,
  ResumeDetail,
  ResumeUploadResponse,
} from '../store/resumes/resume.model';
import { AnalysisReport, ReportsList } from '../store/reports/report.model';
import {
  GapAnalysisRequest,
  GapAnalysisResult,
} from '../interfaces/gap-analysis.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // Use environment-driven base URL for dev/prod consistency
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Job API endpoints
  getAllJobs(): Observable<JobListItem[]> {
    return this.http.get<JobListItem[]>(`${this.baseUrl}/jobs`);
  }

  getJobById(jobId: string): Observable<Job> {
    return this.http.get<Job>(`${this.baseUrl}/jobs/${jobId}`);
  }

  createJob(request: CreateJobRequest): Observable<CreateJobResponse> {
    return this.http.post<CreateJobResponse>(`${this.baseUrl}/jobs`, request);
  }

  // Resume API endpoints
  getResumesByJobId(jobId: string): Observable<ResumeListItem[]> {
    return this.http.get<ResumeListItem[]>(
      `${this.baseUrl}/jobs/${jobId}/resumes`,
    );
  }

  getResumeById(resumeId: string): Observable<ResumeDetail> {
    return this.http.get<ResumeDetail>(`${this.baseUrl}/resumes/${resumeId}`);
  }

  uploadResumes(
    jobId: string,
    files: File[],
  ): Observable<ResumeUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('resumes', file, file.name);
    });

    return this.http.post<ResumeUploadResponse>(
      `${this.baseUrl}/jobs/${jobId}/resumes`,
      formData,
    );
  }

  // Report API endpoints
  getReportsByJobId(jobId: string): Observable<ReportsList> {
    return this.http.get<ReportsList>(`${this.baseUrl}/jobs/${jobId}/reports`);
  }

  getReportById(reportId: string): Observable<AnalysisReport> {
    return this.http.get<AnalysisReport>(`${this.baseUrl}/reports/${reportId}`);
  }

  // Coach/GAP Analysis
  submitGapAnalysis(req: GapAnalysisRequest): Observable<GapAnalysisResult> {
    // Route through API gateway if available; otherwise proxy path should map to scoring service
    return this.http.post<GapAnalysisResult>(
      `${this.baseUrl}/scoring/gap-analysis`,
      req,
    );
  }

  submitGapAnalysisWithFile(
    jdText: string,
    file: File,
  ): Observable<GapAnalysisResult> {
    const form = new FormData();
    form.append('jdText', jdText);
    form.append('resume', file, file.name);
    return this.http.post<GapAnalysisResult>(
      `${this.baseUrl}/scoring/gap-analysis-file`,
      form,
    );
  }
}
