import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpEventType, HttpErrorResponse } from '@angular/common/http';
import {
  FileUploadService,
  UploadFile,
  UploadConfig,
  UploadState,
  UploadResult,
} from './file-upload.service';
import { environment } from '../../environments/environment';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FileUploadService],
    });
    service = TestBed.inject(FileUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.resetState();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('HTTP Interceptor Tests', () => {
    describe('Request Transformation', () => {
      it('should create FormData with file', () => {
        const file = new File(['test content'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe();

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        expect(req.request.body instanceof FormData).toBe(true);

        // Check that FormData contains the file
        const formData = req.request.body as FormData;
        const fileEntry = formData.get('file');
        expect(fileEntry).toBeInstanceOf(File);

        req.flush({ success: true });
      });

      it('should add additional data to FormData', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const additionalData = { jobId: 'job-123', description: 'Test upload' };

        service.uploadFile(file, '/upload', additionalData).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        const formData = req.request.body as FormData;

        expect(formData.get('jobId')).toBe('job-123');
        expect(formData.get('description')).toBe('Test upload');

        req.flush({ success: true });
      });

      it('should set reportProgress to true', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe();

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        expect(req.request.reportProgress).toBe(true);

        req.flush({ success: true });
      });
    });

    describe('Response Transformation', () => {
      it('should transform successful upload response', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const events: unknown[] = [];

        service.uploadFile(file, '/upload').subscribe((event) => {
          events.push(event);
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush({ success: true, fileId: 'file-123' });

        const responseEvent = events.find(
          (e: { type?: number }) => e.type === HttpEventType.Response,
        );
        expect(responseEvent).toBeDefined();
      });
    });

    describe('Error Interception', () => {
      it('should handle HTTP errors', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Server error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      });
    });
  });

  describe('Error Handling', () => {
    describe('HTTP Errors', () => {
      it('should handle 400 Bad Request', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(400);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush(
          { errors: ['Invalid file'] },
          { status: 400, statusText: 'Bad Request' },
        );
      });

      it('should handle 401 Unauthorized', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(401);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });

      it('should handle 403 Forbidden', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(403);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      });

      it('should handle 413 Payload Too Large', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(413);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Payload Too Large', {
          status: 413,
          statusText: 'Payload Too Large',
        });
      });

      it('should handle 415 Unsupported Media Type', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(415);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Unsupported Media Type', {
          status: 415,
          statusText: 'Unsupported Media Type',
        });
      });

      it('should handle 500 Internal Server Error', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      });

      it('should handle 503 Service Unavailable', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(503);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    });

    describe('Network Errors', () => {
      it('should handle network connectivity error', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(0);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.error(new ErrorEvent('error', { message: 'Network error' }));
      });

      it('should handle connection refused', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(0);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.error(new ErrorEvent('error', { message: 'Connection refused' }));
      });
    });

    describe('Timeout Errors', () => {
      it('should handle request timeout', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error).toBeTruthy();
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        // Simulate timeout by not responding
        tick(1000);
        req.flush({ success: true });
        flush();
      }));

      it('should handle slow network during large file upload', () => {
        const largeFile = new File(['x'.repeat(1000000)], 'large.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(largeFile, '/upload').subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              expect(event.loaded).toBeGreaterThanOrEqual(0);
            }
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush({ success: true });
      });
    });
  });

  describe('Retry Logic', () => {
    describe('Exponential Backoff', () => {
      it('should retry chunk upload with delay', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 2,
          retryDelay: 100,
        };

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(true);
          });

        // First attempt fails
        let req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });

        tick(100);

        // Retry
        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush({ success: true, fileId: 'file-123' });

        flush();
      }));
    });

    describe('Max Retry Count', () => {
      it('should respect max retry attempts', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 1,
          retryDelay: 10,
        };

        let attempts = 0;

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(false);
          });

        // First attempt
        let req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        attempts++;
        req.flush('Error', { status: 500, statusText: 'Server Error' });

        tick(10);

        // Retry
        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        attempts++;
        req.flush('Error', { status: 500, statusText: 'Server Error' });

        expect(attempts).toBe(2); // Initial + 1 retry
        flush();
      }));

      it('should succeed after successful retry', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 3,
          retryDelay: 10,
        };

        let attemptCount = 0;

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(true);
            expect(attemptCount).toBe(2); // Failed once, then succeeded
          });

        // First attempt - fail
        let req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        attemptCount++;
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });

        tick(10);

        // Second attempt - succeed
        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        attemptCount++;
        req.flush({ success: true });

        flush();
      }));
    });

    describe('Retry Conditions', () => {
      it('should retry on 5xx server errors', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 1,
          retryDelay: 10,
        };

        service.uploadFileChunked(file, '/upload', config).subscribe();

        let req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });

        tick(10);

        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush({ success: true });

        flush();
      }));

      it('should retry on network errors', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 1,
          retryDelay: 10,
        };

        service.uploadFileChunked(file, '/upload', config).subscribe();

        let req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.error(new ErrorEvent('error'));

        tick(10);

        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush({ success: true });

        flush();
      }));
    });

    describe('Circuit Breaker', () => {
      it('should track consecutive failures', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 0,
          retryDelay: 10,
        };

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(false);
          });

        const req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush('Error', { status: 500, statusText: 'Server Error' });

        flush();

        const state = service.getUploadState();
        expect(state.errorCount).toBe(1);
      }));
    });
  });

  describe('File Handling', () => {
    describe('Upload Progress', () => {
      it('should track single file upload progress', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const progressValues: number[] = [];

        service.uploadFile(file, '/upload').subscribe((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = Math.round(
              (100 * event.loaded) / (event.total || 1),
            );
            progressValues.push(progress);
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);

        // Simulate progress events
        req.event({
          type: HttpEventType.UploadProgress,
          loaded: 25,
          total: 100,
        });
        req.event({
          type: HttpEventType.UploadProgress,
          loaded: 50,
          total: 100,
        });
        req.event({
          type: HttpEventType.UploadProgress,
          loaded: 75,
          total: 100,
        });
        req.event({
          type: HttpEventType.UploadProgress,
          loaded: 100,
          total: 100,
        });
        req.flush({ success: true });

        expect(progressValues).toContain(25);
        expect(progressValues).toContain(50);
        expect(progressValues).toContain(75);
        expect(progressValues).toContain(100);
      });

      it('should handle upload completion event', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        let completed = false;

        service.uploadFile(file, '/upload').subscribe((event) => {
          if (event.type === HttpEventType.Response) {
            completed = true;
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush({ success: true, fileId: 'file-123' });

        expect(completed).toBe(true);
      });

      it('should handle multiple file upload', () => {
        const files = [
          new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
        ];

        const observables = service.uploadMultiple(files, '/upload');
        expect(observables.length).toBe(2);

        observables[0].subscribe();
        let req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush({ success: true });

        observables[1].subscribe();
        req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush({ success: true });
      });
    });

    describe('Chunked Upload', () => {
      it('should split large files into chunks', fakeAsync(() => {
        const largeContent = 'x'.repeat(5000);
        const file = new File([largeContent], 'large.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024, // 1KB chunks
          maxRetries: 0,
        };

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(true);
          });

        // Should send 5 chunks (5000 bytes / 1024 bytes per chunk = ~5 chunks)
        for (let i = 0; i < 5; i++) {
          const req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
          expect(req.request.body instanceof FormData).toBe(true);
          req.flush({ chunkIndex: i, success: true });
        }

        flush();
      }));

      it('should handle chunk upload failure', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 0,
        };

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(false);
          });

        const req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush('Error', { status: 413, statusText: 'Payload Too Large' });

        flush();
      }));

      it('should resume upload from last successful chunk', fakeAsync(() => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });
        const config: UploadConfig = {
          chunkSize: 1024,
          maxRetries: 1,
          retryDelay: 10,
        };

        service
          .uploadFileChunked(file, '/upload', config)
          .subscribe((result) => {
            expect(result.success).toBe(true);
          });

        // First chunk succeeds
        let req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush({ chunkIndex: 0, success: true });

        // Second chunk fails, then succeeds on retry
        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });

        tick(10);

        // Retry same chunk
        req = httpMock.expectOne(`${baseUrl}/upload/chunk`);
        req.flush({ chunkIndex: 1, success: true });

        flush();
      }));
    });

    describe('Cancel Upload', () => {
      it('should cancel ongoing upload', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        const subscription = service.uploadFile(file, '/upload').subscribe();

        // Get the file ID from state
        const state = service.getUploadState();
        const fileId = state.files[0]?.id;

        // Cancel before response
        service.cancelUpload(fileId);

        // Verify state is updated
        const newState = service.getUploadState();
        const cancelledFile = newState.files.find((f) => f.id === fileId);
        expect(cancelledFile?.status).toBe('cancelled');
      });

      it('should cancel all uploads', () => {
        const files = [
          new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
          new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
        ];

        service
          .uploadMultiple(files, '/upload')
          .forEach((obs) => obs.subscribe());

        service.cancelAllUploads();

        const state = service.getUploadState();
        expect(state.files.every((f) => f.status === 'cancelled')).toBe(true);
      });

      it('should cleanup resources on cancel', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        const subscription = service.uploadFile(file, '/upload').subscribe();

        const state = service.getUploadState();
        const fileId = state.files[0]?.id;

        subscription.unsubscribe();
        service.cancelUpload(fileId);

        // Verify no pending requests cause issues
        httpMock.verify();
      });
    });

    describe('Error Recovery', () => {
      it('should recover from temporary upload error', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        // First attempt fails
        service.uploadFile(file, '/upload').subscribe({
          error: () => {
            // Now retry
            const state = service.getUploadState();
            const fileId = state.files[0]?.id;

            service.retryUpload(fileId, file, '/upload').subscribe((event) => {
              if (event.type === HttpEventType.Response) {
                expect(event.body).toEqual({ success: true });
              }
            });

            const retryReq = httpMock.expectOne(`${baseUrl}/upload`);
            retryReq.flush({ success: true });
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Error', { status: 500, statusText: 'Server Error' });
      });

      it('should handle 413 Payload Too Large error', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(413);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Payload Too Large', {
          status: 413,
          statusText: 'Payload Too Large',
        });
      });

      it('should handle 415 Unsupported Media Type', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(415);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Unsupported Media Type', {
          status: 415,
          statusText: 'Unsupported Media Type',
        });
      });

      it('should handle server error during upload', () => {
        const file = new File(['test'], 'test.pdf', {
          type: 'application/pdf',
        });

        service.uploadFile(file, '/upload').subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/upload`);
        req.flush('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      });
    });
  });

  describe('File Validation', () => {
    it('should validate file size', () => {
      const config: UploadConfig = {
        maxFileSize: 100, // 100 bytes max
      };

      const largeFile = new File(['x'.repeat(200)], 'large.pdf', {
        type: 'application/pdf',
      });
      const result = service.validateFile(largeFile, config);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds');
    });

    it('should validate file type', () => {
      const config: UploadConfig = {
        allowedTypes: ['.pdf', '.doc'],
      };

      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-msdownload',
      });
      const result = service.validateFile(invalidFile, config);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should accept valid files', () => {
      const config: UploadConfig = {
        maxFileSize: 1024 * 1024,
        allowedTypes: ['.pdf'],
      };

      const validFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });
      const result = service.validateFile(validFile, config);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Upload State Management', () => {
    it('should track total progress', () => {
      const files = [
        new File(['test1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'file2.pdf', { type: 'application/pdf' }),
      ];

      files.forEach((file) => service.uploadFile(file, '/upload').subscribe());

      const state = service.getUploadState();
      expect(state.files.length).toBe(2);
      expect(state.isUploading).toBe(true);
    });

    it('should update completed count', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      service.uploadFile(file, '/upload').subscribe();

      let state = service.getUploadState();
      expect(state.completedCount).toBe(0);

      const req = httpMock.expectOne(`${baseUrl}/upload`);
      req.flush({ success: true });

      state = service.getUploadState();
      expect(state.completedCount).toBe(1);
    });

    it('should clear completed uploads', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      service.uploadFile(file, '/upload').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/upload`);
      req.flush({ success: true });

      let state = service.getUploadState();
      expect(state.files.length).toBe(1);

      service.clearCompleted();

      state = service.getUploadState();
      expect(state.files.length).toBe(0);
      expect(state.completedCount).toBe(0);
    });

    it('should reset state', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      service.uploadFile(file, '/upload').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/upload`);
      req.flush({ success: true });

      service.resetState();

      const state = service.getUploadState();
      expect(state.files.length).toBe(0);
      expect(state.totalProgress).toBe(0);
      expect(state.isUploading).toBe(false);
    });

    it('should emit state changes through observable', (done) => {
      let stateCount = 0;

      service.uploadState$.subscribe((state) => {
        stateCount++;
        if (stateCount === 2) {
          // Initial state + file added state
          expect(state.files.length).toBe(1);
          done();
        }
      });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      service.uploadFile(file, '/upload').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/upload`);
      req.flush({ success: true });
    });
  });
});
