import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

/**
 * Provides api functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // Use environment-driven base URL for dev/prod consistency
  private baseUrl = environment.apiUrl;

  private http = inject(HttpClient);

  // Job API endpoints
  /**
   * Retrieves all jobs.
   * @returns The Observable<JobListItem[]>.
   */
  getAllJobs(): Observable<JobListItem[]> {
    return this.http.get<JobListItem[]>(`${this.baseUrl}/jobs`);
  }

  /**
   * Retrieves job by id.
   * @param jobId - The job id.
   * @returns The Observable<Job>.
   */
  getJobById(jobId: string): Observable<Job> {
    return this.http.get<Job>(`${this.baseUrl}/jobs/${jobId}`);
  }

  /**
   * Creates job.
   * @param request - The request.
   * @returns The Observable<CreateJobResponse>.
   */
  createJob(request: CreateJobRequest): Observable<CreateJobResponse> {
    return this.http.post<CreateJobResponse>(`${this.baseUrl}/jobs`, request);
  }

  // Resume API endpoints
  /**
   * Retrieves resumes by job id.
   * @param jobId - The job id.
   * @returns The Observable<ResumeListItem[]>.
   */
  getResumesByJobId(jobId: string): Observable<ResumeListItem[]> {
    return this.http.get<ResumeListItem[]>(
      `${this.baseUrl}/jobs/${jobId}/resumes`,
    );
  }

  /**
   * Retrieves resume by id.
   * @param resumeId - The resume id.
   * @returns The Observable<ResumeDetail>.
   */
  getResumeById(resumeId: string): Observable<ResumeDetail> {
    return this.http.get<ResumeDetail>(`${this.baseUrl}/resumes/${resumeId}`);
  }

  /**
   * Performs the upload resumes operation.
   * @param jobId - The job id.
   * @param files - The files.
   * @returns The Observable<ResumeUploadResponse>.
   */
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
  /**
   * Retrieves reports by job id.
   * @param jobId - The job id.
   * @returns The Observable<ReportsList>.
   */
  getReportsByJobId(jobId: string): Observable<ReportsList> {
    return this.http.get<ReportsList>(`${this.baseUrl}/jobs/${jobId}/reports`);
  }

  /**
   * Retrieves report by id.
   * @param reportId - The report id.
   * @returns The Observable<AnalysisReport>.
   */
  getReportById(reportId: string): Observable<AnalysisReport> {
    return this.http.get<AnalysisReport>(`${this.baseUrl}/reports/${reportId}`);
  }

  // Coach/GAP Analysis
  /**
   * Performs the submit gap analysis operation.
   * @param req - The req.
   * @returns The Observable<GapAnalysisResult>.
   */
  submitGapAnalysis(req: GapAnalysisRequest): Observable<GapAnalysisResult> {
    // Route through API gateway if available; otherwise proxy path should map to scoring service
    return this.http.post<GapAnalysisResult>(
      `${this.baseUrl}/scoring/gap-analysis`,
      req,
    );
  }

  /**
   * Performs the submit gap analysis with file operation.
   * @param jdText - The jd text.
   * @param file - The file.
   * @returns The Observable<GapAnalysisResult>.
   */
  submitGapAnalysisWithFile(
    jdText: string,
    file: File,
  ): Observable<GapAnalysisResult> {
    const form = new FormData();
    form.append('jdText', jdText);
    form.append('resume', file, file.name);
    return this.http.post<{success: boolean, data: GapAnalysisResult}>(
      `${this.baseUrl}/scoring/gap-analysis-file`,
      form,
    ).pipe(
      map(response => response.data)
    );
  }
}
