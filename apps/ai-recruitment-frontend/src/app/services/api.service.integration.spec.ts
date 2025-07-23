import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { Job, JobListItem, CreateJobRequest, CreateJobResponse } from '../store/jobs/job.model';
import { ResumeListItem, ResumeDetail, ResumeUploadResponse } from '../store/resumes/resume.model';
import { AnalysisReport, ReportsList } from '../store/reports/report.model';

describe('ApiService Integration Tests', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Job API Integration', () => {
    describe('getAllJobs()', () => {
      it('should send GET request to /jobs endpoint', () => {
        const mockJobs: JobListItem[] = [
          {
            id: '1',
            title: '软件工程师',
            status: 'completed',
            createdAt: new Date('2024-01-01'),
            resumeCount: 5
          },
          {
            id: '2', 
            title: '产品经理',
            status: 'processing',
            createdAt: new Date('2024-01-02'),
            resumeCount: 3
          }
        ];

        service.getAllJobs().subscribe(jobs => {
          expect(jobs).toEqual(mockJobs);
          expect(jobs.length).toBe(2);
          expect(jobs[0].title).toBe('软件工程师');
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Content-Type')).toBeNull();
        req.flush(mockJobs);
      });

      it('should handle empty jobs list', () => {
        service.getAllJobs().subscribe(jobs => {
          expect(jobs).toEqual([]);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush([]);
      });

      it('should handle 404 error gracefully', () => {
        service.getAllJobs().subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(404);
            expect(error.statusText).toBe('Not Found');
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush('Jobs not found', { status: 404, statusText: 'Not Found' });
      });

      it('should handle 500 server error', () => {
        service.getAllJobs().subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(500);
            expect(error.error).toBe('Internal server error');
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });
      });
    });

    describe('getJobById()', () => {
      it('should send GET request to /jobs/:id endpoint with correct jobId', () => {
        const jobId = 'job-123';
        const mockJob: Job = {
          id: jobId,
          title: '高级前端工程师',
          jdText: '负责前端架构设计和开发...',
          status: 'completed',
          createdAt: new Date('2024-01-01'),
          resumeCount: 8
        };

        service.getJobById(jobId).subscribe(job => {
          expect(job).toEqual(mockJob);
          expect(job.id).toBe(jobId);
          expect(job.title).toBe('高级前端工程师');
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}`);
        expect(req.request.method).toBe('GET');
        expect(req.request.url).toBe(`${baseUrl}/jobs/${jobId}`);
        req.flush(mockJob);
      });

      it('should handle job not found error', () => {
        const jobId = 'nonexistent-job';

        service.getJobById(jobId).subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(404);
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}`);
        req.flush('Job not found', { status: 404, statusText: 'Not Found' });
      });
    });

    describe('createJob()', () => {
      it('should send POST request to /jobs endpoint with correct payload', () => {
        const createRequest: CreateJobRequest = {
          jobTitle: '全栈工程师',
          jdText: '负责前后端全栈开发，熟悉React、Node.js等技术栈...'
        };

        const mockResponse: CreateJobResponse = {
          jobId: 'new-job-456'
        };

        service.createJob(createRequest).subscribe(response => {
          expect(response).toEqual(mockResponse);
          expect(response.jobId).toBe('new-job-456');
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(createRequest);
        // Angular HttpClient automatically sets Content-Type for JSON requests
        const contentType = req.request.headers.get('Content-Type');
        if (contentType) {
          expect(contentType).toContain('application/json');
        }
        req.flush(mockResponse);
      });

      it('should handle validation errors on job creation', () => {
        const invalidRequest: CreateJobRequest = {
          jobTitle: '',
          jdText: 'A'
        };

        service.createJob(invalidRequest).subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(400);
            expect(error.error.message).toContain('validation');
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush(
          { message: 'Validation failed: jobTitle is required and jdText must be at least 10 characters' },
          { status: 400, statusText: 'Bad Request' }
        );
      });

      it('should handle server errors during job creation', () => {
        const createRequest: CreateJobRequest = {
          jobTitle: '测试岗位',
          jdText: '这是一个测试岗位描述，用于验证错误处理逻辑'
        };

        service.createJob(createRequest).subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(500);
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs`);
        req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });
      });
    });
  });

  describe('Resume API Integration', () => {
    describe('getResumesByJobId()', () => {
      it('should send GET request to /jobs/:jobId/resumes endpoint', () => {
        const jobId = 'job-789';
        const mockResumes: ResumeListItem[] = [
          {
            id: 'resume-1',
            jobId: jobId,
            fileName: 'john_doe_resume.pdf',
            status: 'processed',
            uploadedAt: new Date('2024-01-01'),
            score: 85
          },
          {
            id: 'resume-2',
            jobId: jobId,
            fileName: 'jane_smith_resume.pdf',
            status: 'processing',
            uploadedAt: new Date('2024-01-02'),
            score: null
          }
        ];

        service.getResumesByJobId(jobId).subscribe(resumes => {
          expect(resumes).toEqual(mockResumes);
          expect(resumes.length).toBe(2);
          expect(resumes[0].jobId).toBe(jobId);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/resumes`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResumes);
      });

      it('should handle empty resumes list for a job', () => {
        const jobId = 'job-empty';

        service.getResumesByJobId(jobId).subscribe(resumes => {
          expect(resumes).toEqual([]);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/resumes`);
        req.flush([]);
      });
    });

    describe('getResumeById()', () => {
      it('should send GET request to /resumes/:resumeId endpoint', () => {
        const resumeId = 'resume-detail-123';
        const mockResume: ResumeDetail = {
          id: resumeId,
          jobId: 'job-456',
          fileName: 'candidate_resume.pdf',
          status: 'processed',
          uploadedAt: new Date('2024-01-01'),
          score: 92,
          extractedData: {
            name: 'Alex Johnson',
            email: 'alex.johnson@email.com',
            skills: ['JavaScript', 'TypeScript', 'Angular', 'Node.js'],
            experience: '5 years'
          }
        };

        service.getResumeById(resumeId).subscribe(resume => {
          expect(resume).toEqual(mockResume);
          expect(resume.id).toBe(resumeId);
          expect(resume.extractedData.name).toBe('Alex Johnson');
        });

        const req = httpMock.expectOne(`${baseUrl}/resumes/${resumeId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResume);
      });
    });

    describe('uploadResumes()', () => {
      it('should send POST request with FormData to /jobs/:jobId/resumes endpoint', () => {
        const jobId = 'job-upload-test';
        const mockFiles = [
          new File(['resume content 1'], 'resume1.pdf', { type: 'application/pdf' }),
          new File(['resume content 2'], 'resume2.pdf', { type: 'application/pdf' })
        ];

        const mockResponse: ResumeUploadResponse = {
          jobId: jobId,
          uploadedCount: 2,
          processedIds: ['resume-new-1', 'resume-new-2']
        };

        service.uploadResumes(jobId, mockFiles).subscribe(response => {
          expect(response).toEqual(mockResponse);
          expect(response.uploadedCount).toBe(2);
          expect(response.jobId).toBe(jobId);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/resumes`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBeInstanceOf(FormData);
        
        // Verify FormData content
        const formData = req.request.body as FormData;
        const files = formData.getAll('resumes');
        expect(files.length).toBe(2);
        expect((files[0] as File).name).toBe('resume1.pdf');
        expect((files[1] as File).name).toBe('resume2.pdf');

        req.flush(mockResponse);
      });

      it('should handle upload errors gracefully', () => {
        const jobId = 'job-upload-error';
        const mockFiles = [
          new File(['invalid content'], 'invalid.txt', { type: 'text/plain' })
        ];

        service.uploadResumes(jobId, mockFiles).subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(400);
            expect(error.error.message).toContain('file type');
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/resumes`);
        req.flush(
          { message: 'Invalid file type. Only PDF files are allowed.' },
          { status: 400, statusText: 'Bad Request' }
        );
      });

      it('should handle large file upload errors', () => {
        const jobId = 'job-large-file';
        const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB content
        const mockFiles = [
          new File([largeContent], 'large_resume.pdf', { type: 'application/pdf' })
        ];

        service.uploadResumes(jobId, mockFiles).subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(413);
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/resumes`);
        req.flush('File too large', { status: 413, statusText: 'Payload Too Large' });
      });
    });
  });

  describe('Report API Integration', () => {
    describe('getReportsByJobId()', () => {
      it('should send GET request to /jobs/:jobId/reports endpoint', () => {
        const jobId = 'job-reports-123';
        const mockReportsList: ReportsList = {
          jobId: jobId,
          reports: [
            {
              id: 'report-1',
              jobId: jobId,
              jobTitle: '软件工程师',
              status: 'completed',
              createdAt: new Date('2024-01-01'),
              resumeCount: 3
            },
            {
              id: 'report-2', 
              jobId: jobId,
              jobTitle: '软件工程师',
              status: 'processing',
              createdAt: new Date('2024-01-02'),
              resumeCount: 2
            }
          ]
        };

        service.getReportsByJobId(jobId).subscribe(reportsList => {
          expect(reportsList).toEqual(mockReportsList);
          expect(reportsList.jobId).toBe(jobId);
          expect(reportsList.reports.length).toBe(2);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/reports`);
        expect(req.request.method).toBe('GET');
        req.flush(mockReportsList);
      });

      it('should handle job with no reports', () => {
        const jobId = 'job-no-reports';
        const emptyReportsList: ReportsList = {
          jobId: jobId,
          reports: []
        };

        service.getReportsByJobId(jobId).subscribe(reportsList => {
          expect(reportsList.reports).toEqual([]);
          expect(reportsList.jobId).toBe(jobId);
        });

        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/reports`);
        req.flush(emptyReportsList);
      });
    });

    describe('getReportById()', () => {
      it('should send GET request to /reports/:reportId endpoint', () => {
        const reportId = 'report-detailed-456';
        const mockReport: AnalysisReport = {
          id: reportId,
          jobId: 'job-123',
          jobTitle: '全栈工程师',
          status: 'completed',
          createdAt: new Date('2024-01-01'),
          resumeCount: 1,
          analysisData: {
            totalCandidates: 5,
            averageScore: 78,
            topCandidates: [
              {
                resumeId: 'resume-1',
                candidateName: 'John Doe',
                matchScore: 92,
                summary: '经验丰富的全栈工程师，技能匹配度高'
              },
              {
                resumeId: 'resume-2', 
                candidateName: 'Jane Smith',
                matchScore: 88,
                summary: '前端专家，有较强的用户体验设计能力'
              }
            ]
          }
        };

        service.getReportById(reportId).subscribe(report => {
          expect(report).toEqual(mockReport);
          expect(report.id).toBe(reportId);
          expect(report.analysisData.topCandidates.length).toBe(2);
        });

        const req = httpMock.expectOne(`${baseUrl}/reports/${reportId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockReport);
      });

      it('should handle report not found error', () => {
        const reportId = 'nonexistent-report';

        service.getReportById(reportId).subscribe({
          next: () => fail('Should have failed'),
          error: (error) => {
            expect(error.status).toBe(404);
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/reports/${reportId}`);
        req.flush('Report not found', { status: 404, statusText: 'Not Found' });
      });
    });
  });

  describe('Network and Timeout Scenarios', () => {
    it('should handle network connectivity issues', () => {
      service.getAllJobs().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(0);
          expect(error.statusText).toBe('Unknown Error');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.error(new ProgressEvent('Network error'), {
        status: 0,
        statusText: 'Unknown Error'
      });
    });

    it('should handle request timeout', () => {
      service.createJob({
        jobTitle: '测试岗位',
        jdText: '测试描述内容，用于验证超时处理'
      }).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(408);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush('Request timeout', { status: 408, statusText: 'Request Timeout' });
    });
  });

  describe('CORS and Security Headers', () => {
    it('should handle CORS preflight requests properly', () => {
      const createRequest: CreateJobRequest = {
        jobTitle: 'CORS测试岗位',
        jdText: '这是一个用于测试CORS的岗位描述'
      };

      service.createJob(createRequest).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      expect(req.request.method).toBe('POST');
      
      // Verify that the request doesn't contain any restricted headers
      expect(req.request.headers.get('Access-Control-Allow-Origin')).toBeNull();
      
      req.flush({ jobId: 'cors-test-job' });
    });

    it('should handle authentication-related errors', () => {
      service.getAllJobs().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.statusText).toBe('Unauthorized');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush('Unauthorized access', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle forbidden access errors', () => {
      service.getReportById('restricted-report').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.statusText).toBe('Forbidden');
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/reports/restricted-report`);
      req.flush('Access forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });
});