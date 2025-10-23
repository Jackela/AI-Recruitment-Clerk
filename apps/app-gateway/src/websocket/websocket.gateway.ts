import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { GuestUsageService } from '../guest/services/guest-usage.service';
import { CollaborationService } from './collaboration.service';
import { PresenceService } from './presence.service';
import { NotificationService } from './notification.service';
import { CacheService } from '../cache/cache.service';

// Enhanced types for real-time collaboration
interface ProgressUpdate {
  sessionId: string;
  progress: number;
  currentStep: string;
  message?: string;
  estimatedTimeRemaining?: number;
}

interface CompletionData {
  sessionId: string;
  analysisId: string;
  result: any;
  processingTime: number;
}

interface UserPresence {
  userId: string;
  username: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
  cursor?: { x: number; y: number };
  lastActivity: Date;
}

interface CollaborationMessage {
  id: string;
  type: 'chat' | 'comment' | 'annotation' | 'mention' | 'vote' | 'decision';
  content: string;
  authorId: string;
  authorName: string;
  contextId?: string; // e.g., candidateId, jobId
  contextType?: 'candidate' | 'job' | 'document' | 'decision';
  timestamp: Date;
  threadId?: string;
  mentions?: string[];
  attachments?: any[];
}

interface DocumentEdit {
  documentId: string;
  userId: string;
  operation: 'insert' | 'delete' | 'format' | 'annotate';
  position: number;
  content?: string;
  length?: number;
  metadata?: any;
  timestamp: Date;
}

interface VotingSession {
  id: string;
  title: string;
  description: string;
  options: VotingOption[];
  createdBy: string;
  contextId: string;
  contextType: string;
  deadline?: Date;
  status: 'active' | 'closed' | 'draft';
  settings: {
    anonymous: boolean;
    allowComments: boolean;
    requireJustification: boolean;
  };
}

interface VotingOption {
  id: string;
  text: string;
  votes: Vote[];
}

interface Vote {
  userId: string;
  timestamp: Date;
  comment?: string;
  weight?: number;
}

interface ActivityFeedItem {
  id: string;
  type:
    | 'user_join'
    | 'user_leave'
    | 'document_edit'
    | 'comment'
    | 'vote'
    | 'decision'
    | 'status_change';
  userId: string;
  userName: string;
  action: string;
  contextId?: string;
  contextType?: string;
  timestamp: Date;
  metadata?: any;
}

// Job-related WebSocket event interfaces
interface JobUpdateEvent {
  jobId: string;
  title: string;
  status: 'processing' | 'completed' | 'failed' | 'active' | 'draft' | 'closed';
  timestamp: Date;
  updatedBy?: string;
  organizationId?: string;
  metadata?: {
    confidence?: number;
    extractedKeywords?: string[];
    processingTime?: number;
    errorMessage?: string;
  };
}

interface JobProgressEvent {
  jobId: string;
  step: string;
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
  timestamp: Date;
}

/**
 * Represents the web socket gateway.
 */
@WSGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:4201'],
    credentials: true,
  },
  namespace: '/ws',
})
@Injectable()
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('WebSocketGateway');
  private clientSessions = new Map<string, string>(); // clientId -> sessionId
  private _clientUsers = new Map<string, UserPresence>(); // clientId -> user info
  private _activeRooms = new Map<string, Set<string>>(); // roomId -> Set<clientId>
  private _documentSessions = new Map<string, Set<string>>(); // documentId -> Set<clientId>
  private _collaborationRooms = new Map<
    string,
    {
      participants: Map<string, UserPresence>;
      messages: CollaborationMessage[];
      lastActivity: Date;
    }
  >();

  /**
   * Initializes a new instance of the Web Socket Gateway.
   * @param guestUsageService - The guest usage service.
   * @param collaborationService - The collaboration service.
   * @param presenceService - The presence service.
   * @param notificationService - The notification service.
   * @param cacheService - The cache service.
   */
  constructor(
    private readonly guestUsageService: GuestUsageService,
    private readonly collaborationService: CollaborationService,
    private readonly presenceService: PresenceService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Performs the after init operation.
   * @param server - The server.
   * @returns The result of the operation.
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Handles connection.
   * @param client - The client.
   * @param args - The args.
   * @returns The result of the operation.
   */
  handleConnection(client: Socket, ...args: any[]) {
    const sessionId = client.handshake.query.sessionId as string;
    this.logger.log(`Client connected: ${client.id}, SessionId: ${sessionId}`);

    if (sessionId) {
      this.clientSessions.set(client.id, sessionId);
      client.join(`session_${sessionId}`);

      // 发送连接确认
      client.emit('connected', {
        type: 'status_update',
        sessionId,
        data: {
          status: 'connected',
          message: 'WebSocket connected successfully',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handles disconnect.
   * @param client - The client.
   * @returns The result of the operation.
   */
  handleDisconnect(client: Socket) {
    const sessionId = this.clientSessions.get(client.id);
    this.logger.log(
      `Client disconnected: ${client.id}, SessionId: ${sessionId}`,
    );

    if (sessionId) {
      client.leave(`session_${sessionId}`);
      this.clientSessions.delete(client.id);
    }
  }

  /**
   * 发送进度更新到特定会话
   */
  sendProgressUpdate(sessionId: string, update: ProgressUpdate): void {
    this.server.to(`session_${sessionId}`).emit('message', {
      type: 'progress',
      sessionId,
      data: update,
      timestamp: new Date(),
    });
  }

  /**
   * 发送步骤变更通知
   */
  sendStepChange(sessionId: string, step: string, message?: string): void {
    this.server.to(`session_${sessionId}`).emit('message', {
      type: 'step_change',
      sessionId,
      data: { currentStep: step, message },
      timestamp: new Date(),
    });
  }

  /**
   * 发送完成通知
   */
  sendCompletion(sessionId: string, data: CompletionData): void {
    this.server.to(`session_${sessionId}`).emit('message', {
      type: 'completed',
      sessionId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * 发送错误通知
   */
  sendError(sessionId: string, error: string, code?: string): void {
    this.server.to(`session_${sessionId}`).emit('message', {
      type: 'error',
      sessionId,
      data: { error, code },
      timestamp: new Date(),
    });
  }

  /**
   * 发送状态更新
   */
  sendStatusUpdate(sessionId: string, status: any): void {
    this.server.to(`session_${sessionId}`).emit('message', {
      type: 'status_update',
      sessionId,
      data: status,
      timestamp: new Date(),
    });
  }

  /**
   * Handles subscribe session.
   * @param data - The data.
   * @param client - The client.
   */
  @SubscribeMessage('subscribe_session')
  handleSubscribeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId } = data;
    this.logger.log(`Client ${client.id} subscribing to session ${sessionId}`);

    this.clientSessions.set(client.id, sessionId);
    client.join(`session_${sessionId}`);

    // 发送当前状态（如果有的话）
    this.sendCurrentStatus(sessionId, client);
  }

  /**
   * Handles unsubscribe session.
   * @param data - The data.
   * @param client - The client.
   */
  @SubscribeMessage('unsubscribe_session')
  handleUnsubscribeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId } = data;
    this.logger.log(
      `Client ${client.id} unsubscribing from session ${sessionId}`,
    );

    client.leave(`session_${sessionId}`);
    this.clientSessions.delete(client.id);
  }

  /**
   * 发送当前状态给新连接的客户端
   */
  private async sendCurrentStatus(
    sessionId: string,
    client: Socket,
  ): Promise<void> {
    try {
      // 这里可以查询当前会话状态并发送给客户端
      client.emit('message', {
        type: 'status_update',
        sessionId,
        data: {
          status: 'monitoring',
          message: 'Monitoring session progress...',
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send current status for session ${sessionId}:`,
        error,
      );
    }
  }

  /**
   * 广播系统状态更新
   */
  broadcastSystemStatus(status: any): void {
    this.server.emit('system_status', {
      type: 'system_status',
      data: status,
      timestamp: new Date(),
    });
  }

  // Job-specific WebSocket event methods

  /**
   * Emits a job_updated event when a job's status changes.
   * Supports multi-tenant broadcasting to organization-specific rooms.
   *
   * @param jobUpdate - The job update event data
   */
  emitJobUpdated(jobUpdate: JobUpdateEvent): void {
    try {
      const eventData = {
        type: 'job_updated',
        data: jobUpdate,
        timestamp: new Date(),
      };

      // Broadcast to organization-specific room for multi-tenant security
      if (jobUpdate.organizationId) {
        const orgRoom = `org_${jobUpdate.organizationId}`;
        this.server.to(orgRoom).emit('job_updated', eventData);

        this.logger.log(
          `📡 Emitted job_updated event for job ${jobUpdate.jobId} to organization ${jobUpdate.organizationId} - Status: ${jobUpdate.status}`,
        );
      } else {
        // Fallback: broadcast to all connected clients (less secure)
        this.server.emit('job_updated', eventData);

        this.logger.log(
          `📡 Emitted job_updated event for job ${jobUpdate.jobId} to all clients - Status: ${jobUpdate.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit job_updated event for job ${jobUpdate.jobId}:`,
        error,
      );
    }
  }

  /**
   * Emits a job_progress event for real-time progress updates during AI processing.
   *
   * @param progress - The job progress event data
   */
  emitJobProgress(progress: JobProgressEvent): void {
    try {
      const eventData = {
        type: 'job_progress',
        data: progress,
        timestamp: new Date(),
      };

      // Send progress updates to session-based rooms for real-time tracking
      this.server.emit('job_progress', eventData);

      this.logger.debug(
        `📊 Emitted job_progress event for job ${progress.jobId} - Step: ${progress.step}, Progress: ${progress.progress}%`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to emit job_progress event for job ${progress.jobId}:`,
        error,
      );
    }
  }

  /**
   * Handles clients joining organization-specific rooms for multi-tenant security.
   * Called when a client authenticates and we know their organization.
   *
   * @param clientId - Socket client ID
   * @param organizationId - Organization ID for multi-tenant room assignment
   */
  joinOrganizationRoom(clientId: string, organizationId: string): void {
    try {
      const client = this.server.sockets.sockets.get(clientId);
      if (client) {
        const orgRoom = `org_${organizationId}`;
        client.join(orgRoom);

        this.logger.log(
          `👥 Client ${clientId} joined organization room: ${orgRoom}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to join organization room for client ${clientId}:`,
        error,
      );
    }
  }

  /**
   * Handles clients leaving organization-specific rooms.
   *
   * @param clientId - Socket client ID
   * @param organizationId - Organization ID
   */
  leaveOrganizationRoom(clientId: string, organizationId: string): void {
    try {
      const client = this.server.sockets.sockets.get(clientId);
      if (client) {
        const orgRoom = `org_${organizationId}`;
        client.leave(orgRoom);

        this.logger.log(
          `👥 Client ${clientId} left organization room: ${orgRoom}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to leave organization room for client ${clientId}:`,
        error,
      );
    }
  }

  /**
   * Subscribe to job updates for a specific job.
   * Allows clients to subscribe to updates for jobs they're interested in.
   */
  @SubscribeMessage('subscribe_job')
  handleSubscribeJob(
    @MessageBody() data: { jobId: string; organizationId?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const { jobId, organizationId } = data;
      this.logger.log(`Client ${client.id} subscribing to job ${jobId}`);

      // Join job-specific room
      const jobRoom = `job_${jobId}`;
      client.join(jobRoom);

      // Join organization room if provided
      if (organizationId) {
        this.joinOrganizationRoom(client.id, organizationId);
      }

      // Send subscription confirmation
      client.emit('job_subscription_confirmed', {
        jobId,
        message: 'Successfully subscribed to job updates',
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to subscribe client ${client.id} to job ${data.jobId}:`,
        error,
      );

      client.emit('job_subscription_error', {
        jobId: data.jobId,
        error: 'Failed to subscribe to job updates',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Unsubscribe from job updates.
   */
  @SubscribeMessage('unsubscribe_job')
  handleUnsubscribeJob(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const { jobId } = data;
      this.logger.log(`Client ${client.id} unsubscribing from job ${jobId}`);

      const jobRoom = `job_${jobId}`;
      client.leave(jobRoom);

      client.emit('job_unsubscription_confirmed', {
        jobId,
        message: 'Successfully unsubscribed from job updates',
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to unsubscribe client ${client.id} from job ${data.jobId}:`,
        error,
      );
    }
  }
}
