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
  type: 'user_join' | 'user_leave' | 'document_edit' | 'comment' | 'vote' | 'decision' | 'status_change';
  userId: string;
  userName: string;
  action: string;
  contextId?: string;
  contextType?: string;
  timestamp: Date;
  metadata?: any;
}

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
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('WebSocketGateway');
  private clientSessions = new Map<string, string>(); // clientId -> sessionId
  private clientUsers = new Map<string, UserPresence>(); // clientId -> user info
  private activeRooms = new Map<string, Set<string>>(); // roomId -> Set<clientId>
  private documentSessions = new Map<string, Set<string>>(); // documentId -> Set<clientId>
  private collaborationRooms = new Map<string, {
    participants: Map<string, UserPresence>;
    messages: CollaborationMessage[];
    lastActivity: Date;
  }>();

  constructor(
    private readonly guestUsageService: GuestUsageService,
    private readonly collaborationService: CollaborationService,
    private readonly presenceService: PresenceService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

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
        data: { status: 'connected', message: 'WebSocket connected successfully' },
        timestamp: new Date(),
      });
    }
  }

  handleDisconnect(client: Socket) {
    const sessionId = this.clientSessions.get(client.id);
    this.logger.log(`Client disconnected: ${client.id}, SessionId: ${sessionId}`);
    
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

  @SubscribeMessage('unsubscribe_session')
  handleUnsubscribeSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId } = data;
    this.logger.log(`Client ${client.id} unsubscribing from session ${sessionId}`);
    
    client.leave(`session_${sessionId}`);
    this.clientSessions.delete(client.id);
  }

  /**
   * 发送当前状态给新连接的客户端
   */
  private async sendCurrentStatus(sessionId: string, client: Socket): Promise<void> {
    try {
      // 这里可以查询当前会话状态并发送给客户端
      client.emit('message', {
        type: 'status_update',
        sessionId,
        data: { status: 'monitoring', message: 'Monitoring session progress...' },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to send current status for session ${sessionId}:`, error);
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
}