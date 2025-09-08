import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { GuestApiService } from './guest-api.service';
import { DeviceIdService } from './device-id.service';

describe('GuestApiService', () => {
  let service: GuestApiService;
  let httpMock: HttpTestingController;
  let mockDeviceIdService: jest.Mocked<DeviceIdService>;

  beforeEach(() => {
    const deviceIdServiceMock = {
      getDeviceId: jest.fn(() => 'test-device-123'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GuestApiService,
        {
          provide: DeviceIdService,
          useValue: deviceIdServiceMock,
        },
      ],
    });

    service = TestBed.inject(GuestApiService);
    httpMock = TestBed.inject(HttpTestingController);
    mockDeviceIdService = TestBed.inject(
      DeviceIdService,
    ) as jest.Mocked<DeviceIdService>;
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('HTTP Headers', () => {
    it('should include X-Device-ID header in all requests', () => {
      service.getUsageStatus().subscribe();

      const req = httpMock.expectOne('/api/guest/status');
      expect(req.request.headers.get('X-Device-ID')).toBe('test-device-123');
      expect(mockDeviceIdService.getDeviceId).toHaveBeenCalled();

      req.flush({ canUse: true, remainingCount: 5, needsFeedbackCode: false });
    });
  });

  describe('getUsageStatus', () => {
    it('should get usage status successfully', () => {
      const mockResponse = {
        canUse: true,
        remainingCount: 3,
        needsFeedbackCode: false,
      };

      service.getUsageStatus().subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/status');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle error response', () => {
      service.getUsageStatus().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne('/api/guest/status');
      req.flush(
        { message: 'Internal server error' },
        { status: 500, statusText: 'Server Error' },
      );
    });
  });

  describe('getGuestDetails', () => {
    it('should get guest details successfully', () => {
      const mockResponse = {
        deviceId: 'test-device-123',
        usageCount: 2,
        maxUsage: 5,
        isLimited: false,
        lastUsed: new Date(),
      };

      service.getGuestDetails().subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/details');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('generateFeedbackCode', () => {
    it('should generate feedback code successfully', () => {
      const mockResponse = {
        feedbackCode: 'fb-test-12345',
        surveyUrl: 'https://wj.qq.com/s2/test?code=fb-test-12345',
        message: 'Feedback code generated',
      };

      service.generateFeedbackCode().subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/feedback-code');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle generation error', () => {
      service.generateFeedbackCode().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne('/api/guest/feedback-code');
      req.flush(
        { message: 'Feedback code not needed' },
        { status: 400, statusText: 'Bad Request' },
      );
    });
  });

  describe('redeemFeedbackCode', () => {
    it('should redeem feedback code successfully', () => {
      const feedbackCode = 'fb-test-12345';
      const mockResponse = {
        success: true,
        message: 'Feedback code redeemed successfully',
      };

      service.redeemFeedbackCode(feedbackCode).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/redeem');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ feedbackCode });
      req.flush(mockResponse);
    });

    it('should handle invalid feedback code', () => {
      const invalidCode = 'invalid-code';

      service.redeemFeedbackCode(invalidCode).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne('/api/guest/redeem');
      req.flush(
        { message: 'Invalid feedback code' },
        { status: 400, statusText: 'Bad Request' },
      );
    });
  });

  describe('checkUsage', () => {
    it('should check usage successfully', () => {
      const mockResponse = {
        canUse: true,
        message: 'Service usage allowed',
      };

      service.checkUsage().subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/check-usage');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle usage limit exceeded', () => {
      service.checkUsage().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(429);
        },
      });

      const req = httpMock.expectOne('/api/guest/check-usage');
      req.flush(
        {
          canUse: false,
          message: 'Usage limit exceeded',
          needsFeedbackCode: true,
        },
        { status: 429, statusText: 'Too Many Requests' },
      );
    });
  });

  describe('analyzeResume', () => {
    it('should upload and analyze resume successfully', () => {
      const mockFile = new File(['test content'], 'test-resume.pdf', {
        type: 'application/pdf',
      });
      const candidateName = 'John Doe';
      const candidateEmail = 'john@example.com';
      const notes = 'Test notes';

      const mockResponse = {
        success: true,
        data: {
          analysisId: 'guest-analysis-12345',
          filename: 'test-resume.pdf',
          uploadedAt: '2024-01-01T00:00:00.000Z',
          estimatedCompletionTime: '2-3 minutes',
          isGuestMode: true,
          fileSize: 1024,
          remainingUsage: 3,
        },
      };

      service
        .analyzeResume(mockFile, candidateName, candidateEmail, notes)
        .subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

      const req = httpMock.expectOne('/api/guest/resume/analyze');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);

      const formData = req.request.body as FormData;
      expect(formData.get('resume')).toBe(mockFile);
      expect(formData.get('candidateName')).toBe(candidateName);
      expect(formData.get('candidateEmail')).toBe(candidateEmail);
      expect(formData.get('notes')).toBe(notes);

      req.flush(mockResponse);
    });

    it('should handle upload without optional parameters', () => {
      const mockFile = new File(['test content'], 'test-resume.pdf', {
        type: 'application/pdf',
      });

      const mockResponse = {
        success: true,
        data: {
          analysisId: 'guest-analysis-12345',
          filename: 'test-resume.pdf',
          uploadedAt: '2024-01-01T00:00:00.000Z',
          estimatedCompletionTime: '2-3 minutes',
          isGuestMode: true,
          fileSize: 1024,
        },
      };

      service.analyzeResume(mockFile).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/resume/analyze');
      const formData = req.request.body as FormData;
      expect(formData.get('resume')).toBe(mockFile);
      expect(formData.get('candidateName')).toBeNull();
      expect(formData.get('candidateEmail')).toBeNull();
      expect(formData.get('notes')).toBeNull();

      req.flush(mockResponse);
    });
  });

  describe('getAnalysisResults', () => {
    it('should get analysis results successfully', () => {
      const analysisId = 'guest-analysis-12345';
      const mockResponse = {
        success: true,
        data: {
          analysisId,
          status: 'completed' as const,
          progress: 100,
          results: {
            personalInfo: { name: 'John Doe', email: 'john@example.com' },
            skills: [
              {
                name: 'JavaScript',
                category: 'Programming',
                proficiency: 'Advanced',
              },
            ],
            experience: { totalYears: 5, positions: [] },
            education: [],
            summary: { overallScore: 85, strengths: [], recommendations: [] },
          },
          completedAt: '2024-01-01T00:05:00.000Z',
        },
      };

      service.getAnalysisResults(analysisId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `/api/guest/resume/analysis/${analysisId}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle processing status', () => {
      const analysisId = 'guest-analysis-12345';
      const mockResponse = {
        success: true,
        data: {
          analysisId,
          status: 'processing' as const,
          progress: 50,
        },
      };

      service.getAnalysisResults(analysisId).subscribe((response) => {
        expect(response.data.status).toBe('processing');
        expect(response.data.progress).toBe(50);
      });

      const req = httpMock.expectOne(
        `/api/guest/resume/analysis/${analysisId}`,
      );
      req.flush(mockResponse);
    });
  });

  describe('getDemoAnalysis', () => {
    it('should get demo analysis successfully', () => {
      const mockResponse = {
        success: true,
        data: {
          analysisId: 'demo-analysis-12345',
          status: 'completed' as const,
          filename: 'demo-resume.pdf',
          results: {
            personalInfo: { name: 'Alice Chen', email: 'alice@example.com' },
            skills: [
              {
                name: 'Python',
                category: 'Programming',
                proficiency: 'Expert',
              },
              {
                name: 'Machine Learning',
                category: 'AI/ML',
                proficiency: 'Advanced',
              },
            ],
            experience: { totalYears: 7, positions: [] },
            education: [],
            summary: { overallScore: 92, strengths: [], recommendations: [] },
          },
          isGuestMode: true,
          completedAt: '2024-01-01T00:00:00.000Z',
          remainingUsage: 3,
        },
      };

      service.getDemoAnalysis().subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.data.results.personalInfo.name).toBe('Alice Chen');
        expect(response.data.results.summary.overallScore).toBe(92);
      });

      const req = httpMock.expectOne('/api/guest/resume/demo-analysis');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getServiceStats', () => {
    it('should get service statistics successfully', () => {
      const mockResponse = {
        totalGuests: 1000,
        activeGuests: 250,
        pendingFeedbackCodes: 50,
        redeemedFeedbackCodes: 150,
      };

      service.getServiceStats().subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/guest/stats');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      service.getUsageStatus().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.name).toBe('HttpErrorResponse');
        },
      });

      const req = httpMock.expectOne('/api/guest/status');
      req.error(new ErrorEvent('Network error'), {
        status: 0,
        statusText: 'Unknown Error',
      });
    });

    it('should handle server errors with proper status codes', () => {
      const errorCodes = [400, 401, 403, 404, 429, 500, 503];

      errorCodes.forEach((statusCode) => {
        service.getUsageStatus().subscribe({
          next: () => fail(`Should have failed with ${statusCode}`),
          error: (error) => {
            expect(error.status).toBe(statusCode);
          },
        });

        const req = httpMock.expectOne('/api/guest/status');
        req.flush(
          { message: `Error ${statusCode}` },
          { status: statusCode, statusText: `Error ${statusCode}` },
        );
      });
    });
  });
});
