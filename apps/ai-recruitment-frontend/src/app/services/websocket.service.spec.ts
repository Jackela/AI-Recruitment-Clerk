import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import type {
  WebSocketMessage,
  ProgressUpdate,
  CompletionData,
  ErrorData,
  JobUpdateEvent,
  JobProgressEvent} from './websocket.service';
import {
  WebSocketService
} from './websocket.service';
import { ToastService } from './toast.service';
import { Subject } from 'rxjs';
import { take, filter } from 'rxjs/operators';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  disconnected: false,
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

describe('WebSocketService', () => {
  let service: WebSocketService;
  let toastService: ToastService;

  beforeEach(() => {
    // Reset mock
    mockSocket.connected = false;
    mockSocket.disconnected = false;
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.connect.mockClear();

    const toastServiceMock = {
      success: jest.fn(),
      error: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });

    service = TestBed.inject(WebSocketService);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.disconnect();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server', () => {
      const sessionId = 'test-session-123';

      service.connect(sessionId).subscribe();

      const { io } = require('socket.io-client');
      expect(io).toHaveBeenCalled();
    });

    it('should disconnect existing connection before reconnecting', () => {
      const sessionId = 'test-session-123';

      // First connection
      service.connect(sessionId).subscribe();
      mockSocket.connected = true;

      // Second connection should disconnect first
      service.connect('new-session-456').subscribe();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should emit connection status changes', (done) => {
      service
        .getConnectionStatus()
        .pipe(take(1))
        .subscribe((status) => {
          expect(status).toBe('disconnected');
          done();
        });
    });

    it('should handle connection error', fakeAsync(() => {
      const sessionId = 'test-session-123';

      service.connect(sessionId).subscribe();

      // Get the connect_error handler
      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'connect_error',
      )?.[1];

      if (connectErrorHandler) {
        connectErrorHandler(new Error('Connection failed'));
      }

      tick();

      expect(toastService.error).toHaveBeenCalledWith(
        '网络连接失败，请检查您的网络',
      );
    }));
  });

  describe('Message Handling', () => {
    it('should receive and emit WebSocket messages', (done) => {
      const sessionId = 'test-session-123';
      const messageHandler = jest.fn();

      service.connect(sessionId).subscribe((msg) => {
        messageHandler(msg);
      });

      // Get the message handler from socket.on
      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      const testMessage: WebSocketMessage = {
        type: 'progress',
        sessionId: 'test-session-123',
        data: { progress: 50 },
        timestamp: new Date(),
      };

      if (socketMessageHandler) {
        socketMessageHandler(testMessage);
      }

      setTimeout(() => {
        expect(messageHandler).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should filter messages by session ID', (done) => {
      const sessionId = 'test-session-123';
      const receivedMessages: WebSocketMessage[] = [];

      service.connect(sessionId).subscribe((msg) => {
        receivedMessages.push(msg);
      });

      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      // Message with correct session ID
      if (socketMessageHandler) {
        socketMessageHandler({
          type: 'progress',
          sessionId: 'test-session-123',
          data: { progress: 50 },
          timestamp: new Date(),
        });

        // Message with different session ID (should be filtered out)
        socketMessageHandler({
          type: 'progress',
          sessionId: 'different-session',
          data: { progress: 75 },
          timestamp: new Date(),
        });
      }

      setTimeout(() => {
        expect(receivedMessages.length).toBe(1);
        expect(receivedMessages[0].sessionId).toBe('test-session-123');
        done();
      }, 0);
    });

    it('should send messages to server', () => {
      mockSocket.connected = true;

      const eventName = 'test_event';
      const data = { message: 'Hello' };

      service.sendMessage(eventName, data);

      expect(mockSocket.emit).toHaveBeenCalledWith(eventName, data);
    });

    it('should not send message when socket is not connected', () => {
      mockSocket.connected = false;

      service.sendMessage('test_event', { message: 'Hello' });

      // Should not throw, just silently fail
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Progress Updates', () => {
    it('should emit progress updates', (done) => {
      const sessionId = 'test-session-123';
      const progressData: ProgressUpdate = {
        progress: 75,
        currentStep: 'processing',
        message: 'Processing resume...',
        estimatedTimeRemaining: 30,
      };

      service.onProgress(sessionId).subscribe((update) => {
        expect(update.progress).toBe(75);
        expect(update.currentStep).toBe('processing');
        done();
      });

      // Connect and trigger progress message
      service.connect(sessionId).subscribe();

      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      if (socketMessageHandler) {
        socketMessageHandler({
          type: 'progress',
          sessionId,
          data: progressData,
          timestamp: new Date(),
        });
      }
    });

    it('should handle progress completion', (done) => {
      const sessionId = 'test-session-123';

      service.onProgress(sessionId).subscribe((update) => {
        expect(update.progress).toBe(100);
        done();
      });

      service.connect(sessionId).subscribe();

      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      if (socketMessageHandler) {
        socketMessageHandler({
          type: 'progress',
          sessionId,
          data: { progress: 100, currentStep: 'completed' },
          timestamp: new Date(),
        });
      }
    });
  });

  describe('Completion Events', () => {
    it('should emit completion data', (done) => {
      const sessionId = 'test-session-123';
      const completionData: CompletionData = {
        analysisId: 'analysis-123',
        result: {
          analysisId: 'analysis-123',
          score: 85,
          summary: 'Good match',
          skills: ['TypeScript', 'Angular'],
          experience: {
            totalYears: 5,
            positions: [
              {
                title: 'Developer',
                company: 'Tech Corp',
                duration: '2020-present',
              },
            ],
          },
          strengths: ['Technical skills'],
          recommendations: ['Learn more'],
          generatedAt: new Date().toISOString(),
        },
        processingTime: 5000,
      };

      service.onCompletion(sessionId).subscribe((data) => {
        expect(data.analysisId).toBe('analysis-123');
        expect(data.processingTime).toBe(5000);
        done();
      });

      service.connect(sessionId).subscribe();

      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      if (socketMessageHandler) {
        socketMessageHandler({
          type: 'completed',
          sessionId,
          data: completionData,
          timestamp: new Date(),
        });
      }
    });
  });

  describe('Error Events', () => {
    it('should emit error data', (done) => {
      const sessionId = 'test-session-123';
      const errorData: ErrorData = {
        error: 'Processing failed',
        code: 'PROCESSING_ERROR',
      };

      service.onError(sessionId).subscribe((data) => {
        expect(data.error).toBe('Processing failed');
        expect(data.code).toBe('PROCESSING_ERROR');
        done();
      });

      service.connect(sessionId).subscribe();

      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      if (socketMessageHandler) {
        socketMessageHandler({
          type: 'error',
          sessionId,
          data: errorData,
          timestamp: new Date(),
        });
      }
    });
  });

  describe('Job Subscription', () => {
    it('should subscribe to job updates', () => {
      mockSocket.connected = true;
      const jobId = 'job-123';
      const organizationId = 'org-456';

      service.subscribeToJob(jobId, organizationId);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_job', {
        jobId,
        organizationId,
      });
    });

    it('should warn when subscribing without connection', () => {
      mockSocket.connected = false;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.subscribeToJob('job-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cannot subscribe to job job-123: WebSocket not connected',
      );
      consoleSpy.mockRestore();
    });

    it('should unsubscribe from job updates', () => {
      mockSocket.connected = true;
      const jobId = 'job-123';

      service.unsubscribeFromJob(jobId);

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe_job', {
        jobId,
      });
    });

    it('should receive job update events', (done) => {
      const jobId = 'job-123';
      const jobUpdate: JobUpdateEvent = {
        jobId,
        title: 'Software Engineer',
        status: 'processing',
        timestamp: new Date(),
        updatedBy: 'user-1',
      };

      service.onJobUpdated(jobId).subscribe((update) => {
        expect(update.jobId).toBe(jobId);
        expect(update.status).toBe('processing');
        done();
      });

      service.connect('session-123').subscribe();

      const jobUpdateHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'job_updated',
      )?.[1];

      if (jobUpdateHandler) {
        jobUpdateHandler({
          type: 'job_updated',
          data: jobUpdate,
          timestamp: new Date(),
        });
      }
    });

    it('should receive job progress events', (done) => {
      const jobId = 'job-123';
      const jobProgress: JobProgressEvent = {
        jobId,
        step: 'parsing',
        progress: 50,
        message: 'Parsing resume...',
        timestamp: new Date(),
      };

      service.onJobProgress(jobId).subscribe((progress) => {
        expect(progress.jobId).toBe(jobId);
        expect(progress.progress).toBe(50);
        done();
      });

      service.connect('session-123').subscribe();

      const jobProgressHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'job_progress',
      )?.[1];

      if (jobProgressHandler) {
        jobProgressHandler({
          type: 'job_progress',
          data: jobProgress,
          timestamp: new Date(),
        });
      }
    });

    it('should handle job subscription confirmation', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.connect('session-123').subscribe();

      const confirmationHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'job_subscription_confirmed',
      )?.[1];

      if (confirmationHandler) {
        confirmationHandler({
          jobId: 'job-123',
          message: 'Subscribed successfully',
          timestamp: new Date(),
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ Job subscription confirmed for job job-123',
      );
      consoleSpy.mockRestore();
    });

    it('should handle job subscription error', () => {
      service.connect('session-123').subscribe();

      const errorHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'job_subscription_error',
      )?.[1];

      if (errorHandler) {
        errorHandler({
          jobId: 'job-123',
          error: 'Access denied',
          timestamp: new Date(),
        });
      }

      expect(toastService.error).toHaveBeenCalledWith(
        'Failed to subscribe to job updates: Access denied',
      );
    });
  });

  describe('Reconnection', () => {
    it('should show success toast on reconnect', fakeAsync(() => {
      service.connect('session-123').subscribe();

      const reconnectHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'reconnect',
      )?.[1];

      if (reconnectHandler) {
        reconnectHandler(1);
      }

      tick();

      expect(toastService.success).toHaveBeenCalledWith('网络连接已恢复');
    }));

    it('should emit error status on reconnect error', fakeAsync(() => {
      let status: string | null = null;

      service.getConnectionStatus().subscribe((s) => {
        status = s;
      });

      service.connect('session-123').subscribe();

      const reconnectErrorHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'reconnect_error',
      )?.[1];

      if (reconnectErrorHandler) {
        reconnectErrorHandler(new Error('Reconnect failed'));
      }

      tick();

      expect(status).toBe('error');
    }));
  });

  describe('Connect with Job Subscription', () => {
    it('should auto-subscribe to job after connection', fakeAsync(() => {
      mockSocket.connected = true;

      service.connectWithJobSubscription('session-123', 'job-123', 'org-456');

      tick();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_job', {
        jobId: 'job-123',
        organizationId: 'org-456',
      });
    }));

    it('should wait for connection before subscribing', fakeAsync(() => {
      mockSocket.connected = false;

      service.connectWithJobSubscription('session-123', 'job-123');

      // Should not subscribe yet
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'subscribe_job',
        expect.anything(),
      );

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'connect',
      )?.[1];

      if (connectHandler) {
        mockSocket.connected = true;
        connectHandler();
      }

      tick();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_job', {
        jobId: 'job-123',
        organizationId: undefined,
      });
    }));
  });

  describe('Cleanup', () => {
    it('should disconnect on ngOnDestroy', () => {
      service.connect('session-123').subscribe();
      mockSocket.connected = true;

      service.ngOnDestroy();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should complete all observables on destroy', (done) => {
      const completed: boolean[] = [];

      service.getConnectionStatus().subscribe({
        complete: () => completed.push(true),
      });

      service.connect('session-123').subscribe({
        complete: () => completed.push(true),
      });

      service.ngOnDestroy();

      setTimeout(() => {
        expect(completed.length).toBeGreaterThan(0);
        done();
      }, 0);
    });
  });

  describe('Socket URL', () => {
    it('should use localhost:8080 for local development', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'localhost',
          host: 'localhost:4200',
        },
        writable: true,
      });

      service.connect('session-123').subscribe();

      const { io } = require('socket.io-client');
      expect(io).toHaveBeenCalledWith(
        expect.stringContaining('localhost:8080'),
        expect.any(Object),
      );
    });

    it('should use current host for production', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          hostname: 'app.example.com',
          host: 'app.example.com',
        },
        writable: true,
      });

      service.connect('session-123').subscribe();

      const { io } = require('socket.io-client');
      expect(io).toHaveBeenCalledWith(
        expect.stringContaining('https://app.example.com'),
        expect.any(Object),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle socket connection errors gracefully', () => {
      const { io } = require('socket.io-client');
      io.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      service.connect('session-123').subscribe();

      expect(toastService.error).toHaveBeenCalledWith(
        '网络连接失败，请检查您的网络',
      );
    });

    it('should handle malformed message data', () => {
      service.connect('session-123').subscribe();

      const socketMessageHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1];

      // Should not throw on invalid data
      if (socketMessageHandler) {
        expect(() => socketMessageHandler('invalid json')).not.toThrow();
      }
    });

    it('should handle job event parsing errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.connect('session-123').subscribe();

      const jobUpdateHandler = mockSocket.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'job_updated',
      )?.[1];

      if (jobUpdateHandler) {
        jobUpdateHandler({
          type: 'job_updated',
          data: null,
          timestamp: new Date(),
        });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
