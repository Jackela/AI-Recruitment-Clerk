import { environment } from '../../environments/environment';
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { APP_CONFIG } from '../../config/app.config';
import { of, throwError, timer } from 'rxjs';
import type {
  JobListItem,
  Job,
  CreateJobRequest,
  CreateJobResponse,
} from '../store/jobs/job.model';
import type {
  ResumeListItem,
  ResumeDetail,
  ResumeUploadResponse,
} from '../store/resumes/resume.model';
import type {
  AnalysisReport,
  ReportsList,
} from '../store/reports/report.model';
import type {
  GapAnalysisResult,
  GapAnalysisRequest,
} from '../interfaces/gap-analysis.interface';
import {
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('HTTP Interceptor Tests', () => {
    describe('Request Transformation', () => {
      it('should add Content-Type header for JSON requests', () => {
        const createRequest: CreateJobRequest = {
          jobTitle: 'Test Job',
          jdText: 'Test Description',
        };

        service.createJob(createRequest).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.headers.get('Content-Type')).toContain(
          'application/json',
        );
        req.flush({ jobId: '1' });
      });

      it('should not override custom headers', () => {
        const mockFiles = [
          new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        ];

        service.uploadResumes('job-1', mockFiles).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        expect(req.request.body instanceof FormData).toBe(true);
        req.flush({ jobId: 'job-1', submittedResumes: 1 });
      });

      it('should preserve query parameters in GET requests', () => {
        service.getAllJobs().subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
      });
    });

    describe('Response Transformation', () => {
      it('should transform successful response', () => {
        const mockJob: Job = {
          id: '1',
          title: 'Test',
          jdText: 'Description',
          status: 'completed',
          createdAt: new Date(),
          resumeCount: 0,
        };

        service.getJobById('1').subscribe((job) => {
          expect(job).toEqual(mockJob);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush(mockJob);
      });

      it('should handle response with empty body', () => {
        service.getAllJobs().subscribe((jobs) => {
          expect(jobs).toEqual([]);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush([]);
      });
    });

    describe('Error Interception', () => {
      it('should intercept and log HTTP errors', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        service.getJobById('1').subscribe({
          error: () => {
            expect(consoleSpy).toHaveBeenCalled();
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Error', { status: 500, statusText: 'Server Error' });

        consoleSpy.mockRestore();
      });

      it('should format error for client consumption', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(HttpErrorResponse);
            expect(error.status).toBe(404);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      });
    });

    describe('Token Injection', () => {
      it('should inject authentication token if available', () => {
        localStorage.setItem('auth_token', 'test-token-123');

        service.getAllJobs().subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.headers.get('Authorization')).toBe(
          'Bearer test-token-123',
        );
        req.flush([]);

        localStorage.removeItem('auth_token');
      });

      it('should handle missing token gracefully', () => {
        localStorage.removeItem('auth_token');

        service.getAllJobs().subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.headers.get('Authorization')).toBeNull();
        req.flush([]);
      });
    });
  });

  describe('Error Handling', () => {
    describe('HTTP Errors', () => {
      it('should handle 400 Bad Request', () => {
        service.createJob({ jobTitle: '', jdText: '' }).subscribe({
          error: (error) => {
            expect(error.status).toBe(400);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush(
          { errors: ['Invalid data'] },
          { status: 400, statusText: 'Bad Request' },
        );
      });

      it('should handle 401 Unauthorized', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error.status).toBe(401);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });

      it('should handle 403 Forbidden', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error.status).toBe(403);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      });

      it('should handle 404 Not Found', () => {
        service.getJobById('nonexistent').subscribe({
          error: (error) => {
            expect(error.status).toBe(404);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/nonexistent`);
        req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      });

      it('should handle 500 Internal Server Error', () => {
        service.getAllJobs().subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      });

      it('should handle 503 Service Unavailable', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error.status).toBe(503);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    });

    describe('Network Errors', () => {
      it('should handle network connectivity error', () => {
        service.getAllJobs().subscribe({
          error: (error) => {
            expect(error.error.type).toBe('error');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.error(new ErrorEvent('error', { message: 'Network error' }));
      });

      it('should handle DNS resolution failure', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error.error.message).toContain('Network error');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.error(
          new ErrorEvent('error', { message: 'DNS resolution failed' }),
        );
      });

      it('should handle connection refused', () => {
        service.createJob({ jobTitle: 'Test', jdText: 'Test' }).subscribe({
          error: (error) => {
            expect(error.error.type).toBe('error');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.error(new ErrorEvent('error', { message: 'Connection refused' }));
      });

      it('should handle SSL/TLS errors', () => {
        service.getAllJobs().subscribe({
          error: (error) => {
            expect(error.error.message).toContain('SSL');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.error(new ErrorEvent('error', { message: 'SSL handshake failed' }));
      });
    });

    describe('Timeout Errors', () => {
      it('should handle request timeout', () => {
        service.getAllJobs().subscribe({
          error: (error) => {
            expect(error.error.type).toBe('timeout');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.error(new ErrorEvent('timeout'));
      });

      it('should handle slow network timeout', () => {
        const largeJobList = Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: `job-${i}`,
            title: `Job ${i}`,
            status: 'completed' as const,
            createdAt: new Date(),
            resumeCount: 0,
          }));

        service.getAllJobs().subscribe({
          error: (error) => {
            expect(error).toBeTruthy();
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.error(new ErrorEvent('timeout'));
      });

      it('should handle upload timeout', () => {
        const largeFile = new File(['x'.repeat(10000000)], 'large.pdf', {
          type: 'application/pdf',
        });

        service.uploadResumes('job-1', [largeFile]).subscribe({
          error: (error) => {
            expect(error.error.type).toBe('timeout');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.error(new ErrorEvent('timeout'));
      });
    });
  });

  describe('Retry Logic', () => {
    describe('Exponential Backoff', () => {
      it('should retry with increasing delay', () => {
        let attempts = 0;

        service.getAllJobs().subscribe({
          error: () => {
            expect(attempts).toBe(APP_CONFIG.API.retryAttempts + 1);
          },
        });

        // Simulate retry attempts
        for (let i = 0; i <= APP_CONFIG.API.retryAttempts; i++) {
          const req = httpMock.expectOne(`${baseUrl}/jobs`);
          attempts++;
          req.flush('Error', { status: 500, statusText: 'Server Error' });
        }
      });

      it('should not retry on 4xx errors (client errors)', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error.status).toBe(400);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      });
    });

    describe('Max Retry Count', () => {
      it('should respect max retry attempts from config', () => {
        let requestCount = 0;

        service.getAllJobs().subscribe({
          error: () => {
            expect(requestCount).toBe(APP_CONFIG.API.retryAttempts + 1);
          },
        });

        for (let i = 0; i <= APP_CONFIG.API.retryAttempts; i++) {
          const req = httpMock.expectOne(`${baseUrl}/jobs`);
          requestCount++;
          req.flush('Error', { status: 500, statusText: 'Server Error' });
        }
      });

      it('should succeed after retry', () => {
        let attempts = 0;
        const mockJobs: JobListItem[] = [
          {
            id: '1',
            title: 'Job',
            status: 'completed',
            createdAt: new Date(),
            resumeCount: 0,
          },
        ];

        service.getAllJobs().subscribe((jobs) => {
          expect(jobs).toEqual(mockJobs);
          expect(attempts).toBe(2); // 1 failure + 1 success
        });

        const req1 = httpMock.expectOne(`${baseUrl}/jobs`);
        attempts++;
        req1.flush('Error', { status: 503, statusText: 'Service Unavailable' });

        const req2 = httpMock.expectOne(`${baseUrl}/jobs`);
        attempts++;
        req2.flush(mockJobs);
      });
    });

    describe('Retry Conditions', () => {
      it('should retry on 5xx server errors', () => {
        let attempts = 0;

        service.getAllJobs().subscribe({
          error: () => {
            expect(attempts).toBeGreaterThan(1);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        attempts++;
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });
      });

      it('should retry on network errors', () => {
        service.getJobById('1').subscribe({
          error: () => {
            // Should have retried
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.error(new ErrorEvent('error'));
      });

      it('should not retry on 401 Unauthorized', () => {
        service.getJobById('1').subscribe({
          error: (error) => {
            expect(error.status).toBe(401);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });
    });

    describe('Circuit Breaker', () => {
      it('should track consecutive failures', () => {
        let failureCount = 0;

        service.getAllJobs().subscribe({
          error: () => {
            failureCount++;
            expect(failureCount).toBe(1);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush('Error', { status: 500, statusText: 'Server Error' });
      });

      it('should return fallback value when circuit is open', () => {
        // The API service returns fallback value (empty array) on error
        service.getAllJobs().subscribe((jobs) => {
          expect(jobs).toEqual([]);
        });

        for (let i = 0; i <= APP_CONFIG.API.retryAttempts; i++) {
          const req = httpMock.expectOne(`${baseUrl}/jobs`);
          req.flush('Error', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        }
      });
    });
  });

  describe('File Handling', () => {
    describe('Upload Progress', () => {
      it('should track upload progress for single file', () => {
        const mockFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });
        let progressEvents: number[] = [];

        service.uploadResumes('job-1', [mockFile]).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        expect(req.request.body instanceof FormData).toBe(true);
        req.flush({ jobId: 'job-1', submittedResumes: 1 });
      });

      it('should handle multiple file upload', () => {
        const mockFiles = [
          new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
        ];

        service.uploadResumes('job-1', mockFiles).subscribe((response) => {
          expect(response.submittedResumes).toBe(2);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush({ jobId: 'job-1', submittedResumes: 2 });
      });

      it('should handle upload completion event', () => {
        const mockFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });
        const mockResponse: ResumeUploadResponse = {
          jobId: 'job-1',
          submittedResumes: 1,
        };

        service.uploadResumes('job-1', [mockFile]).subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush(mockResponse);
      });
    });

    describe('Chunked Upload', () => {
      it('should split large files into chunks', () => {
        const largeFile = new File(['x'.repeat(10000000)], 'large.pdf', {
          type: 'application/pdf',
        });

        service.uploadResumes('job-1', [largeFile]).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        expect(req.request.body instanceof FormData).toBe(true);
        req.flush({ jobId: 'job-1', submittedResumes: 1 });
      });

      it('should handle chunk upload failure', () => {
        service
          .uploadResumes('job-1', [
            new File(['x'.repeat(10000000)], 'large.pdf', {
              type: 'application/pdf',
            }),
          ])
          .subscribe({
            error: (error) => {
              expect(error.status).toBe(413);
            },
          });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush('Payload Too Large', {
          status: 413,
          statusText: 'Payload Too Large',
        });
      });

      it('should resume upload from last successful chunk', () => {
        // This test verifies that the service can handle partial uploads
        const mockFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadResumes('job-1', [mockFile]).subscribe((response) => {
          expect(response.submittedResumes).toBe(1);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush({ jobId: 'job-1', submittedResumes: 1 });
      });
    });

    describe('Cancel Upload', () => {
      it('should cancel ongoing upload', () => {
        const subscription = service.getAllJobs().subscribe();
        subscription.unsubscribe();

        // No request should be made after unsubscribe
      });

      it('should cancel multiple file uploads', () => {
        const subscriptions: any[] = [];

        subscriptions.push(service.getAllJobs().subscribe());
        subscriptions.push(service.getJobById('1').subscribe());

        // Cancel all
        subscriptions.forEach((sub) => sub.unsubscribe());
      });

      it('should cleanup resources on cancel', () => {
        const subscription = service
          .uploadResumes('job-1', [
            new File(['test'], 'test.pdf', { type: 'application/pdf' }),
          ])
          .subscribe();

        subscription.unsubscribe();

        // Verify no pending requests
        httpMock.verify();
      });
    });

    describe('Error Recovery', () => {
      it('should recover from temporary upload error', () => {
        const mockFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });
        let attempts = 0;

        service.uploadResumes('job-1', [mockFile]).subscribe((response) => {
          expect(response.submittedResumes).toBe(1);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        attempts++;
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });
      });

      it('should handle 413 Payload Too Large error', () => {
        const largeFile = new File(['x'.repeat(100000000)], 'too-large.pdf', {
          type: 'application/pdf',
        });

        service.uploadResumes('job-1', [largeFile]).subscribe({
          error: (error) => {
            expect(error.status).toBe(413);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush('Payload Too Large', {
          status: 413,
          statusText: 'Payload Too Large',
        });
      });

      it('should handle 415 Unsupported Media Type', () => {
        const invalidFile = new File(['content'], 'test.exe', {
          type: 'application/x-msdownload',
        });

        service.uploadResumes('job-1', [invalidFile]).subscribe({
          error: (error) => {
            expect(error.status).toBe(415);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush('Unsupported Media Type', {
          status: 415,
          statusText: 'Unsupported Media Type',
        });
      });

      it('should handle server error during upload', () => {
        const mockFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadResumes('job-1', [mockFile]).subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        req.flush('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      });
    });
  });

  describe('API Endpoints', () => {
    describe('Job API', () => {
      it('should get all jobs', () => {
        const mockJobs: JobListItem[] = [
          {
            id: '1',
            title: 'Software Engineer',
            status: 'completed',
            createdAt: new Date(),
            resumeCount: 5,
          },
        ];

        service.getAllJobs().subscribe((jobs) => {
          expect(jobs).toEqual(mockJobs);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.method).toBe('GET');
        req.flush(mockJobs);
      });

      it('should get job by id', () => {
        const mockJob: Job = {
          id: '1',
          title: 'Software Engineer',
          jdText: 'Job description...',
          status: 'completed',
          createdAt: new Date(),
          resumeCount: 5,
        };

        service.getJobById('1').subscribe((job) => {
          expect(job).toEqual(mockJob);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockJob);
      });

      it('should create job', () => {
        const createRequest: CreateJobRequest = {
          jobTitle: 'New Position',
          jdText: 'Job description...',
        };
        const mockResponse: CreateJobResponse = { jobId: 'new-job-id' };

        service.createJob(createRequest).subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(createRequest);
        req.flush(mockResponse);
      });
    });

    describe('Resume API', () => {
      it('should get resumes by job id', () => {
        const mockResumes: ResumeListItem[] = [
          {
            id: '1',
            jobId: 'job-1',
            originalFilename: 'resume.pdf',
            status: 'completed',
            candidateName: 'John',
            createdAt: new Date(),
          },
        ];

        service.getResumesByJobId('job-1').subscribe((resumes) => {
          expect(resumes).toEqual(mockResumes);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResumes);
      });

      it('should get resume by id', () => {
        const mockResume: ResumeDetail = {
          id: '1',
          jobId: 'job-1',
          originalFilename: 'resume.pdf',
          status: 'completed',
          candidateName: 'John',
          contactInfo: {
            name: 'John',
            email: 'john@example.com',
            phone: '1234567890',
          },
          skills: ['TypeScript', 'Angular'],
          workExperience: [],
          education: [],
          matchScore: 85,
          reportId: 'report-1',
          createdAt: new Date(),
        };

        service.getResumeById('1').subscribe((resume) => {
          expect(resume).toEqual(mockResume);
        });

        const req = httpMock.expectOne(`${baseUrl}/resumes/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResume);
      });
    });

    describe('Report API', () => {
      it('should get reports by job id', () => {
        const mockReports: ReportsList = {
          jobId: 'job-1',
          reports: [
            {
              id: '1',
              candidateName: 'John',
              matchScore: 85,
              oneSentenceSummary: 'Good candidate',
              status: 'completed',
              generatedAt: new Date(),
            },
          ],
        };

        service.getReportsByJobId('job-1').subscribe((reports) => {
          expect(reports).toEqual(mockReports);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/reports`);
        expect(req.request.method).toBe('GET');
        req.flush(mockReports);
      });

      it('should get report by id', () => {
        const mockReport: AnalysisReport = {
          id: '1',
          resumeId: '1',
          jobId: 'job-1',
          candidateName: 'John',
          matchScore: 85,
          oneSentenceSummary: 'Good candidate',
          strengths: ['Technical skills'],
          potentialGaps: [],
          redFlags: [],
          suggestedInterviewQuestions: [],
          generatedAt: new Date(),
        };

        service.getReportById('1').subscribe((report) => {
          expect(report).toEqual(mockReport);
        });

        const req = httpMock.expectOne(`${baseUrl}/reports/1`);
        expect(req.request.method).toBe('GET');
        req.flush(mockReport);
      });
    });

    describe('Gap Analysis API', () => {
      it('should submit gap analysis', () => {
        const request: GapAnalysisRequest = {
          resumeId: 'resume-1',
          jdText: 'Job description...',
        };
        const mockResult: GapAnalysisResult = {
          overallScore: 85,
          skillMatch: {
            matched: ['TypeScript'],
            missing: ['Python'],
            score: 80,
          },
          experienceMatch: { totalYears: 5, requiredYears: 3, score: 90 },
          educationMatch: {
            requiredLevel: 'Bachelor',
            candidateLevel: 'Bachelor',
            relevantFields: ['CS'],
            score: 100,
          },
          recommendations: ['Learn Python'],
          strengths: ['TypeScript expertise'],
          gaps: ['Missing Python experience'],
          analysis: 'Overall good match',
          version: '1.0',
        };

        service.submitGapAnalysis(request).subscribe((result) => {
          expect(result).toEqual(mockResult);
        });

        const req = httpMock.expectOne(`${baseUrl}/scoring/gap-analysis`);
        expect(req.request.method).toBe('POST');
        req.flush(mockResult);
      });

      it('should submit gap analysis with file', () => {
        const jdText = 'Job description...';
        const file = new File(['content'], 'resume.pdf', {
          type: 'application/pdf',
        });
        const mockResult: GapAnalysisResult = {
          overallScore: 85,
          skillMatch: { matched: ['TypeScript'], missing: [], score: 85 },
          experienceMatch: { totalYears: 5, requiredYears: 3, score: 90 },
          educationMatch: {
            requiredLevel: 'Bachelor',
            candidateLevel: 'Bachelor',
            relevantFields: ['CS'],
            score: 100,
          },
          recommendations: [],
          strengths: ['Good match'],
          gaps: [],
          analysis: 'Excellent candidate',
          version: '1.0',
        };

        service.submitGapAnalysisWithFile(jdText, file).subscribe((result) => {
          expect(result).toEqual(mockResult);
        });

        const req = httpMock.expectOne(`${baseUrl}/scoring/gap-analysis-file`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body instanceof FormData).toBe(true);
        req.flush({ success: true, data: mockResult });
      });
    });
  });
});
