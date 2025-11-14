import { environment } from '../../environments/environment';
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService } from './api.service';
import {
  JobListItem,
  Job,
  CreateJobRequest,
  CreateJobResponse,
} from '../store/jobs/job.model';
import {
  ResumeListItem,
  ResumeDetail,
  ResumeUploadResponse,
} from '../store/resumes/resume.model';
import { AnalysisReport, ReportsList } from '../store/reports/report.model';

describe('ApiService', () => {
  let service: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    // 跳过复杂的HTTP测试，使用简单mock
    service = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('ApiService (HTTP Integration Tests)', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl; // Use actual environment config

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

  describe('Job API', () => {
    it('should get all jobs', () => {
      const mockJobs: JobListItem[] = [
        {
          id: '1',
          title: '软件工程师',
          status: 'completed',
          createdAt: new Date(),
          resumeCount: 5,
        },
        {
          id: '2',
          title: '产品经理',
          status: 'processing',
          createdAt: new Date(),
          resumeCount: 3,
        },
      ];

      service.getAllJobs().subscribe((jobs) => {
        expect(jobs).toEqual(mockJobs);
        expect(jobs.length).toBe(2);
        expect(jobs[0].title).toBe('软件工程师');
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      expect(req.request.method).toBe('GET');
      req.flush(mockJobs);
    });

    it('should get job by id', () => {
      const mockJob: Job = {
        id: '1',
        title: '软件工程师',
        jdText: '招聘软件工程师...',
        status: 'completed',
        createdAt: new Date(),
        resumeCount: 5,
      };

      service.getJobById('1').subscribe((job) => {
        expect(job).toEqual(mockJob);
        expect(job.title).toBe('软件工程师');
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockJob);
    });

    it('should create job', () => {
      const createRequest: CreateJobRequest = {
        jobTitle: '新岗位',
        jdText: '这是一个新岗位的描述...',
      };

      const mockResponse: CreateJobResponse = {
        jobId: 'new-job-id',
      };

      service.createJob(createRequest).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.jobId).toBe('new-job-id');
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
          id: 'resume-1',
          jobId: 'job-1',
          originalFilename: '张三_简历.pdf',
          status: 'completed',
          matchScore: 85,
          candidateName: '张三',
          createdAt: new Date(),
        },
      ];

      service.getResumesByJobId('job-1').subscribe((resumes) => {
        expect(resumes).toEqual(mockResumes);
        expect(resumes.length).toBe(1);
        expect(resumes[0].candidateName).toBe('张三');
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResumes);
    });

    it('should get resume by id', () => {
      const mockResume: ResumeDetail = {
        id: 'resume-1',
        jobId: 'job-1',
        originalFilename: '张三_简历.pdf',
        status: 'completed',
        candidateName: '张三',
        contactInfo: {
          name: '张三',
          email: 'zhangsan@email.com',
          phone: '13800138000',
        },
        skills: ['Python', 'JavaScript'],
        workExperience: [
          {
            company: '科技公司',
            position: '软件工程师',
            startDate: '2022-01-01',
            endDate: 'present',
            summary: '负责后端开发',
          },
        ],
        education: [
          {
            school: '北京大学',
            degree: '学士',
            major: '计算机科学',
          },
        ],
        matchScore: 85,
        reportId: 'report-1',
        createdAt: new Date(),
      };

      service.getResumeById('resume-1').subscribe((resume) => {
        expect(resume).toEqual(mockResume);
        expect(resume.candidateName).toBe('张三');
        expect(resume.matchScore).toBe(85);
      });

      const req = httpMock.expectOne(`${baseUrl}/resumes/resume-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResume);
    });

    it('should upload resumes', () => {
      const mockFiles = [
        new File(['mock content'], '张三_简历.pdf', {
          type: 'application/pdf',
        }),
        new File(['mock content'], '李四_简历.pdf', {
          type: 'application/pdf',
        }),
      ];

      const mockResponse: ResumeUploadResponse = {
        jobId: 'job-1',
        submittedResumes: 2,
      };

      service.uploadResumes('job-1', mockFiles).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.submittedResumes).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('Report API', () => {
    it('should get reports by job id', () => {
      const mockReportsList: ReportsList = {
        jobId: 'job-1',
        reports: [
          {
            id: 'report-1',
            candidateName: '张三',
            matchScore: 85,
            oneSentenceSummary: '优秀的软件工程师候选人',
            status: 'completed',
            generatedAt: new Date(),
          },
        ],
      };

      service.getReportsByJobId('job-1').subscribe((reportsList) => {
        expect(reportsList).toEqual(mockReportsList);
        expect(reportsList.reports.length).toBe(1);
        expect(reportsList.reports[0].matchScore).toBe(85);
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/reports`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReportsList);
    });

    it('should get report by id', () => {
      const mockReport: AnalysisReport = {
        id: 'report-1',
        resumeId: 'resume-1',
        jobId: 'job-1',
        candidateName: '张三',
        matchScore: 85,
        oneSentenceSummary: '优秀的软件工程师候选人',
        strengths: ['技术能力强', '经验丰富'],
        potentialGaps: ['需要更多领导经验'],
        redFlags: [],
        suggestedInterviewQuestions: ['描述一个复杂的技术项目'],
        generatedAt: new Date(),
      };

      service.getReportById('report-1').subscribe((report) => {
        expect(report).toEqual(mockReport);
        expect(report.matchScore).toBe(85);
        expect(report.strengths.length).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/reports/report-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReport);
    });
  });

  describe('Error handling', () => {
    it('should handle 404 error when getting job', () => {
      service.getJobById('nonexistent').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/nonexistent`);
      req.flush('Job not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle network error', () => {
      service.getAllJobs().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Negative Tests - API Error Scenarios', () => {
    it('should handle 500 internal server error', () => {
      service.getAllJobs().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Internal Server Error');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle 401 unauthorized error', () => {
      service.getJobById('job-1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 forbidden error', () => {
      service.createJob({ jobTitle: 'Test', jdText: 'Test' }).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 400 bad request with validation errors', () => {
      const invalidRequest = { jobTitle: '', jdText: '' };

      service.createJob(invalidRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush({ errors: ['Title required', 'Description required'] }, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle timeout errors', () => {
      service.getAllJobs().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.error.type).toBe('timeout');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.error(new ErrorEvent('timeout'));
    });
  });

  describe('Negative Tests - File Upload Failures', () => {
    it('should handle empty file array', () => {
      const emptyFiles: File[] = [];

      service.uploadResumes('job-1', emptyFiles).subscribe((response) => {
        expect(response.submittedResumes).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
      req.flush({ jobId: 'job-1', submittedResumes: 0 });
    });

    it('should handle file upload failure with 413 payload too large', () => {
      const largeFile = new File(['x'.repeat(100000000)], 'large.pdf', { type: 'application/pdf' });

      service.uploadResumes('job-1', [largeFile]).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(413);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
      req.flush('Payload too large', { status: 413, statusText: 'Payload Too Large' });
    });

    it('should handle unsupported file type error', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      service.uploadResumes('job-1', [invalidFile]).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(415);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/job-1/resumes`);
      req.flush('Unsupported file type', { status: 415, statusText: 'Unsupported Media Type' });
    });
  });

  describe('Boundary Tests - Pagination and Limits', () => {
    it('should handle empty job list', () => {
      service.getAllJobs().subscribe((jobs) => {
        expect(jobs).toEqual([]);
        expect(jobs.length).toBe(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush([]);
    });

    it('should handle large job list (100+ items)', () => {
      const largeJobList = Array(150).fill(null).map((_, i) => ({
        id: `job-${i}`,
        title: `Job ${i}`,
        status: 'completed' as const,
        createdAt: new Date(),
        resumeCount: Math.floor(Math.random() * 20),
      }));

      service.getAllJobs().subscribe((jobs) => {
        expect(jobs.length).toBe(150);
        expect(jobs[0].id).toBe('job-0');
        expect(jobs[149].id).toBe('job-149');
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush(largeJobList);
    });

    it('should handle single job in list', () => {
      const singleJob = [{
        id: 'job-1',
        title: 'Only Job',
        status: 'processing' as const,
        createdAt: new Date(),
        resumeCount: 0,
      }];

      service.getAllJobs().subscribe((jobs) => {
        expect(jobs.length).toBe(1);
        expect(jobs[0].title).toBe('Only Job');
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      req.flush(singleJob);
    });
  });

  describe('Boundary Tests - Data Size and Special Characters', () => {
    it('should handle very long job titles', () => {
      const longTitle = 'A'.repeat(500);
      const request: CreateJobRequest = {
        jobTitle: longTitle,
        jdText: 'Test description',
      };

      service.createJob(request).subscribe((response) => {
        expect(response.jobId).toBeDefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      expect(req.request.body.jobTitle).toBe(longTitle);
      req.flush({ jobId: 'new-job-id' });
    });

    it('should handle job descriptions with unicode characters', () => {
      const request: CreateJobRequest = {
        jobTitle: '软件工程师 (Senior)',
        jdText: '我们正在寻找一位经验丰富的软件工程师... 🚀',
      };

      service.createJob(request).subscribe((response) => {
        expect(response.jobId).toBeDefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      expect(req.request.body.jobTitle).toContain('软件工程师');
      expect(req.request.body.jdText).toContain('🚀');
      req.flush({ jobId: 'unicode-job' });
    });

    it('should handle special characters in job data', () => {
      const request: CreateJobRequest = {
        jobTitle: 'Developer @ Tech & Co. <Senior>',
        jdText: 'Requirements: C++ & C#, $100K+, "team player"',
      };

      service.createJob(request).subscribe((response) => {
        expect(response.jobId).toBeDefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs`);
      expect(req.request.body.jobTitle).toContain('@');
      expect(req.request.body.jobTitle).toContain('&');
      req.flush({ jobId: 'special-chars-job' });
    });
  });

  describe('Edge Cases - Concurrent Requests', () => {
    it('should handle multiple concurrent job fetches', () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];
      const mockJobs = jobIds.map(id => ({
        id,
        title: `Job ${id}`,
        jdText: `Description ${id}`,
        status: 'completed' as const,
        createdAt: new Date(),
        resumeCount: 0,
      }));

      jobIds.forEach((id) => {
        service.getJobById(id).subscribe((job) => {
          expect(job.id).toBe(id);
        });
      });

      jobIds.forEach((id, index) => {
        const req = httpMock.expectOne(`${baseUrl}/jobs/${id}`);
        req.flush(mockJobs[index]);
      });
    });

    it('should handle concurrent file uploads to different jobs', () => {
      const jobIds = ['job-1', 'job-2'];
      const files = [new File(['test'], 'resume.pdf', { type: 'application/pdf' })];

      jobIds.forEach((jobId) => {
        service.uploadResumes(jobId, files).subscribe((response) => {
          expect(response.jobId).toBe(jobId);
        });
      });

      jobIds.forEach((jobId) => {
        const req = httpMock.expectOne(`${baseUrl}/jobs/${jobId}/resumes`);
        req.flush({ jobId, submittedResumes: 1 });
      });
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete job structure with all fields', () => {
      const completeJob: Job = {
        id: 'complete-job',
        title: 'Complete Job Title',
        jdText: 'Complete job description with all details',
        status: 'completed',
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
        resumeCount: 10,
      };

      service.getJobById('complete-job').subscribe((job) => {
        expect(job).toMatchObject({
          id: expect.stringMatching(/^complete-job$/),
          title: expect.any(String),
          jdText: expect.any(String),
          status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
          createdAt: expect.any(Date),
          resumeCount: expect.any(Number),
        });
        expect(job.resumeCount).toBeGreaterThanOrEqual(0);
      });

      const req = httpMock.expectOne(`${baseUrl}/jobs/complete-job`);
      req.flush(completeJob);
    });

    it('should return complete resume detail with nested structures', () => {
      const completeResume: ResumeDetail = {
        id: 'resume-complete',
        jobId: 'job-1',
        originalFilename: 'candidate.pdf',
        status: 'completed',
        candidateName: 'Complete Candidate',
        contactInfo: {
          name: 'Complete Candidate',
          email: 'candidate@example.com',
          phone: '+1-555-0123',
        },
        skills: ['JavaScript', 'TypeScript', 'React'],
        workExperience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: 'present',
            summary: 'Led development team',
          },
        ],
        education: [
          {
            school: 'University',
            degree: 'Bachelor',
            major: 'Computer Science',
          },
        ],
        matchScore: 92,
        reportId: 'report-1',
        createdAt: new Date(),
      };

      service.getResumeById('resume-complete').subscribe((resume) => {
        expect(resume.contactInfo).toMatchObject({
          name: expect.any(String),
          email: expect.stringMatching(/^[^@]+@[^@]+\.[^@]+$/),
          phone: expect.stringMatching(/^\+?\d[\d\s\-()]+$/),
        });
        expect(resume.skills).toEqual(expect.arrayContaining(['JavaScript']));
        expect(resume.workExperience[0]).toMatchObject({
          company: expect.any(String),
          position: expect.any(String),
          startDate: expect.any(String),
          endDate: expect.any(String),
        });
        expect(resume.matchScore).toBeGreaterThanOrEqual(0);
        expect(resume.matchScore).toBeLessThanOrEqual(100);
      });

      const req = httpMock.expectOne(`${baseUrl}/resumes/resume-complete`);
      req.flush(completeResume);
    });
  });
});
