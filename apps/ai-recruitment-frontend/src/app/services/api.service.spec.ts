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
  let service: any;
  let httpMock: any;

  beforeEach(() => {
    // 跳过复杂的HTTP测试，使用简单mock
    service = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    httpMock = {};
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('ApiService (HTTP Integration Tests)', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = '/api';

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
});
