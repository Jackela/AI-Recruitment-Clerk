import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { WebSocketGateway } from './websocket.gateway';
import type { GuestUsageService } from '../guest/services/guest-usage.service';
import type { CollaborationService } from './collaboration.service';
import type { PresenceService } from './presence.service';
import type { NotificationService } from './notification.service';
import type { CacheService } from '../cache/cache.service';
import type { Server, Socket } from 'socket.io';

describe('WebSocketGateway', () => {
  let gateway: WebSocketGateway;
  let guestUsageServiceMock: jest.Mocked<GuestUsageService>;
  let collaborationServiceMock: jest.Mocked<CollaborationService>;
  let presenceServiceMock: jest.Mocked<PresenceService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let cacheServiceMock: jest.Mocked<CacheService>;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      },
    } as unknown as jest.Mocked<Server>;

    mockSocket = {
      id: 'socket-123',
      handshake: {
        query: { sessionId: 'session-456' },
      },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    guestUsageServiceMock = {} as jest.Mocked<GuestUsageService>;
    collaborationServiceMock = {} as jest.Mocked<CollaborationService>;
    presenceServiceMock = {} as jest.Mocked<PresenceService>;
    notificationServiceMock = {} as jest.Mocked<NotificationService>;
    cacheServiceMock = {} as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketGateway,
        {
          provide: GuestUsageService,
          useValue: guestUsageServiceMock,
        },
        {
          provide: CollaborationService,
          useValue: collaborationServiceMock,
        },
        {
          provide: PresenceService,
          useValue: presenceServiceMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
        {
          provide: CacheService,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    gateway = module.get<WebSocketGateway>(WebSocketGateway);
    gateway.server = mockServer;
  });

  describe('Gateway Creation', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });
  });

  describe('afterInit', () => {
    it('should log initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      gateway.afterInit(mockServer);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleConnection', () => {
    it('should handle connection with sessionId', () => {
      gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session_session-456');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          type: 'status_update',
          sessionId: 'session-456',
          data: expect.objectContaining({
            status: 'connected',
          }),
        }),
      );
    });

    it('should handle connection without sessionId', () => {
      const socketWithoutSession = {
        ...mockSocket,
        handshake: { query: {} },
      } as unknown as jest.Mocked<Socket>;

      gateway.handleConnection(socketWithoutSession);

      expect(socketWithoutSession.join).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect with session', () => {
      // First connect
      gateway.handleConnection(mockSocket);

      // Then disconnect
      gateway.handleDisconnect(mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('session_session-456');
    });

    it('should handle disconnect without session', () => {
      const socketWithoutSession = {
        ...mockSocket,
        id: 'socket-no-session',
        handshake: { query: {} },
      } as unknown as jest.Mocked<Socket>;

      gateway.handleDisconnect(socketWithoutSession);

      expect(socketWithoutSession.leave).not.toHaveBeenCalled();
    });
  });

  describe('sendProgressUpdate', () => {
    it('should send progress update to session', () => {
      const sessionId = 'session-456';
      const update = {
        sessionId,
        progress: 50,
        currentStep: 'parsing',
      };

      gateway.sendProgressUpdate(sessionId, update);

      expect(mockServer.to).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          type: 'progress',
          sessionId,
          data: update,
        }),
      );
    });
  });

  describe('sendStepChange', () => {
    it('should send step change notification', () => {
      const sessionId = 'session-456';
      const step = 'matching';
      const message = 'Processing matches';

      gateway.sendStepChange(sessionId, step, message);

      expect(mockServer.to).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          type: 'step_change',
          sessionId,
          data: { currentStep: step, message },
        }),
      );
    });
  });

  describe('sendCompletion', () => {
    it('should send completion notification', () => {
      const sessionId = 'session-456';
      const data = {
        sessionId,
        analysisId: 'analysis-789',
        result: { score: 85 },
        processingTime: 30,
      };

      gateway.sendCompletion(sessionId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          type: 'completed',
          sessionId,
          data,
        }),
      );
    });
  });

  describe('sendError', () => {
    it('should send error notification', () => {
      const sessionId = 'session-456';
      const error = 'Processing failed';
      const code = 'ERR_001';

      gateway.sendError(sessionId, error, code);

      expect(mockServer.to).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          type: 'error',
          sessionId,
          data: { error, code },
        }),
      );
    });

    it('should send error without code', () => {
      const sessionId = 'session-456';
      const error = 'Processing failed';

      gateway.sendError(sessionId, error);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          data: { error, code: undefined },
        }),
      );
    });
  });

  describe('sendStatusUpdate', () => {
    it('should send status update', () => {
      const sessionId = 'session-456';
      const status = { step: 'analyzing', progress: 75 };

      gateway.sendStatusUpdate(sessionId, status);

      expect(mockServer.to).toHaveBeenCalledWith(`session_${sessionId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'message',
        expect.objectContaining({
          type: 'status_update',
          sessionId,
          data: status,
        }),
      );
    });
  });

  describe('handleSubscribeSession', () => {
    it('should handle session subscription', () => {
      const data = { sessionId: 'new-session-789' };

      gateway.handleSubscribeSession(data, mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('session_new-session-789');
    });
  });

  describe('handleUnsubscribeSession', () => {
    it('should handle session unsubscription', () => {
      const data = { sessionId: 'session-456' };

      gateway.handleUnsubscribeSession(data, mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('session_session-456');
    });
  });

  describe('broadcastSystemStatus', () => {
    it('should broadcast system status to all clients', () => {
      const status = { healthy: true, version: '1.0.0' };

      gateway.broadcastSystemStatus(status);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'system_status',
        expect.objectContaining({
          type: 'system_status',
          data: status,
        }),
      );
    });
  });

  describe('emitJobUpdated', () => {
    it('should emit job update to organization room', () => {
      const jobUpdate = {
        jobId: 'job-123',
        title: 'Software Engineer',
        status: 'active' as const,
        timestamp: new Date(),
        organizationId: 'org-456',
      };

      gateway.emitJobUpdated(jobUpdate);

      expect(mockServer.to).toHaveBeenCalledWith('org_org-456');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'job_updated',
        expect.objectContaining({
          type: 'job_updated',
          data: jobUpdate,
        }),
      );
    });

    it('should broadcast to all when no organizationId', () => {
      const jobUpdate = {
        jobId: 'job-123',
        title: 'Software Engineer',
        status: 'active' as const,
        timestamp: new Date(),
      };

      gateway.emitJobUpdated(jobUpdate);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'job_updated',
        expect.objectContaining({
          type: 'job_updated',
          data: jobUpdate,
        }),
      );
    });
  });

  describe('emitJobProgress', () => {
    it('should emit job progress update', () => {
      const progress = {
        jobId: 'job-123',
        step: 'parsing',
        progress: 50,
        timestamp: new Date(),
      };

      gateway.emitJobProgress(progress);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'job_progress',
        expect.objectContaining({
          type: 'job_progress',
          data: progress,
        }),
      );
    });
  });

  describe('joinOrganizationRoom', () => {
    it('should join client to organization room', () => {
      const mockClientSocket = {
        join: jest.fn(),
      } as unknown as Socket;

      mockServer.sockets.sockets.set('client-123', mockClientSocket);

      gateway.joinOrganizationRoom('client-123', 'org-456');

      expect(mockClientSocket.join).toHaveBeenCalledWith('org_org-456');
    });

    it('should handle non-existent client', () => {
      expect(() => {
        gateway.joinOrganizationRoom('non-existent', 'org-456');
      }).not.toThrow();
    });
  });

  describe('leaveOrganizationRoom', () => {
    it('should remove client from organization room', () => {
      const mockClientSocket = {
        leave: jest.fn(),
      } as unknown as Socket;

      mockServer.sockets.sockets.set('client-123', mockClientSocket);

      gateway.leaveOrganizationRoom('client-123', 'org-456');

      expect(mockClientSocket.leave).toHaveBeenCalledWith('org_org-456');
    });

    it('should handle non-existent client', () => {
      expect(() => {
        gateway.leaveOrganizationRoom('non-existent', 'org-456');
      }).not.toThrow();
    });
  });

  describe('handleSubscribeJob', () => {
    it('should handle job subscription', () => {
      const data = { jobId: 'job-123', organizationId: 'org-456' };

      gateway.handleSubscribeJob(data, mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('job_job-123');
    });

    it('should join organization room when provided', () => {
      const mockClientSocket = {
        id: 'socket-123',
        join: jest.fn(),
      } as unknown as Socket;

      mockServer.sockets.sockets.set('socket-123', mockClientSocket);

      const data = { jobId: 'job-123', organizationId: 'org-456' };

      gateway.handleSubscribeJob(data, mockClientSocket);

      expect(mockClientSocket.join).toHaveBeenCalledWith('org_org-456');
    });

    it('should emit subscription confirmation', () => {
      const data = { jobId: 'job-123' };

      gateway.handleSubscribeJob(data, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'job_subscription_confirmed',
        expect.objectContaining({
          jobId: 'job-123',
          message: expect.any(String),
        }),
      );
    });
  });

  describe('handleUnsubscribeJob', () => {
    it('should handle job unsubscription', () => {
      const data = { jobId: 'job-123' };

      gateway.handleUnsubscribeJob(data, mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('job_job-123');
    });

    it('should emit unsubscription confirmation', () => {
      const data = { jobId: 'job-123' };

      gateway.handleUnsubscribeJob(data, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'job_unsubscription_confirmed',
        expect.objectContaining({
          jobId: 'job-123',
          message: expect.any(String),
        }),
      );
    });
  });
});
