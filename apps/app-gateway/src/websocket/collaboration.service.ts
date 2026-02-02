import { Injectable, Logger } from '@nestjs/common';
import type { CacheService } from '../cache/cache.service';

// Collaboration interfaces
/**
 * Defines the shape of the collaboration room.
 */
export interface CollaborationRoom {
  id: string;
  participants: Participant[];
  createdAt: Date;
  lastActivity: Date;
  documentId?: string;
  type: 'analysis' | 'review' | 'discussion';
}

/**
 * Defines the shape of the participant.
 */
export interface Participant {
  userId: string;
  name: string;
  role: 'viewer' | 'editor' | 'owner';
  joinedAt: Date;
  lastSeen: Date;
  cursor?: CursorPosition;
}

/**
 * Defines the shape of the cursor position.
 */
export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

/**
 * Defines the shape of the collaboration action.
 */
export interface CollaborationAction {
  type: 'join' | 'leave' | '_edit' | 'comment' | 'cursor_move';
  userId: string;
  roomId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- action data can be any shape
  data?: any;
  timestamp: Date;
}

/**
 * Defines the shape of the document _edit.
 */
export interface DocumentEdit {
  id: string;
  userId: string;
  roomId: string;
  operation: 'insert' | 'delete' | 'update';
  position: number;
  content: string;
  timestamp: Date;
}

/**
 * Defines the shape of the _edit conflict.
 */
export interface EditConflict {
  editId: string;
  conflictingEdits: DocumentEdit[];
  resolution: 'accept' | 'reject' | 'merge';
}

/**
 * Provides collaboration functionality.
 */
@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly rooms = new Map<string, CollaborationRoom>();
  private readonly userToRoom = new Map<string, string>();

  /**
   * Initializes a new instance of the Collaboration Service.
   * @param cacheService - The cache service.
   */
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Create or join a collaboration room
   */
  public async joinRoom(
    roomId: string,
    participant: Participant,
  ): Promise<CollaborationRoom> {
    this.logger.log(`User ${participant.userId} joining room ${roomId}`);

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        participants: [],
        createdAt: new Date(),
        lastActivity: new Date(),
        type: 'analysis',
      };
      this.rooms.set(roomId, room);
    }

    // Remove user from previous room if exists
    const previousRoomId = this.userToRoom.get(participant.userId);
    if (previousRoomId && previousRoomId !== roomId) {
      await this.leaveRoom(previousRoomId, participant.userId);
    }

    // Add participant to room
    const existingIndex = room.participants.findIndex(
      (p) => p.userId === participant.userId,
    );
    if (existingIndex >= 0) {
      room.participants[existingIndex] = participant;
    } else {
      room.participants.push(participant);
    }

    this.userToRoom.set(participant.userId, roomId);
    room.lastActivity = new Date();

    // Cache room state
    await this.cacheRoomState(room);

    return room;
  }

  /**
   * Leave a collaboration room
   */
  public async leaveRoom(roomId: string, userId: string): Promise<void> {
    this.logger.log(`User ${userId} leaving room ${roomId}`);

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants = room.participants.filter((p) => p.userId !== userId);
    this.userToRoom.delete(userId);
    room.lastActivity = new Date();

    // Remove empty rooms
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
      await this.cacheService.del(`collaboration:room:${roomId}`);
    } else {
      await this.cacheRoomState(room);
    }
  }

  /**
   * Track user action in collaboration
   */
  public async trackUserAction(action: CollaborationAction): Promise<void> {
    this.logger.debug(
      `Tracking action: ${action.type} by ${action.userId} in ${action.roomId}`,
    );

    const room = this.rooms.get(action.roomId);
    if (!room) {
      this.logger.warn(`Room ${action.roomId} not found for action tracking`);
      return;
    }

    // Update participant's last seen
    const participant = room.participants.find(
      (p) => p.userId === action.userId,
    );
    if (participant) {
      participant.lastSeen = new Date();

      // Handle cursor position updates
      if (action.type === 'cursor_move' && action.data) {
        participant.cursor = action.data as CursorPosition;
      }
    }

    room.lastActivity = new Date();
    await this.cacheRoomState(room);
  }

  /**
   * Handle document _edit operations
   */
  public async handleDocumentEdit(_edit: DocumentEdit): Promise<void> {
    this.logger.debug(`Processing document _edit in room ${_edit.roomId}`);

    const room = this.rooms.get(_edit.roomId);
    if (!room) {
      this.logger.warn(`Room ${_edit.roomId} not found for document _edit`);
      return;
    }

    // Store _edit in cache for conflict resolution
    const editKey = `collaboration:_edit:${_edit.roomId}:${_edit.id}`;
    await this.cacheService.set(editKey, _edit, { ttl: 3600 }); // 1 hour TTL

    // Check for conflicts (simplified)
    const conflicts = await this.detectConflicts(_edit);
    if (conflicts.length > 0) {
      this.logger.warn(`Conflicts detected for _edit ${_edit.id}:`, conflicts);
      // In a real implementation, you'd emit conflict events
    }

    room.lastActivity = new Date();
  }

  /**
   * Resolve _edit conflicts
   */
  public async resolveConflicts(conflicts: EditConflict[]): Promise<EditConflict[]> {
    this.logger.log(`Resolving ${conflicts.length} _edit conflicts`);

    const resolved: EditConflict[] = [];

    for (const conflict of conflicts) {
      // Simple last-write-wins resolution strategy
      conflict.resolution = 'accept';
      resolved.push(conflict);
    }

    return resolved;
  }

  /**
   * Get room information
   */
  public async getRoom(roomId: string): Promise<CollaborationRoom | null> {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get user's current room
   */
  public async getUserRoom(userId: string): Promise<string | null> {
    return this.userToRoom.get(userId) || null;
  }

  /**
   * Get all active rooms
   */
  public async getActiveRooms(): Promise<CollaborationRoom[]> {
    return Array.from(this.rooms.values());
  }

  /**
   * Update participant cursor position
   */
  public async updateCursorPosition(
    roomId: string,
    userId: string,
    position: CursorPosition,
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.cursor = position;
      participant.lastSeen = new Date();
      await this.cacheRoomState(room);
    }
  }

  /**
   * Cache room state for persistence
   */
  private async cacheRoomState(room: CollaborationRoom): Promise<void> {
    try {
      const cacheKey = `collaboration:room:${room.id}`;
      await this.cacheService.set(cacheKey, room, { ttl: 7200 }); // 2 hours TTL
    } catch (error) {
      this.logger.error('Failed to cache room state:', error);
    }
  }

  /**
   * Detect _edit conflicts (simplified implementation)
   */
  private async detectConflicts(_edit: DocumentEdit): Promise<EditConflict[]> {
    // In a real implementation, this would check for overlapping edits
    // For now, return empty array (no conflicts)
    return [];
  }

  /**
   * Cleanup inactive rooms
   */
  public async cleanupInactiveRooms(maxInactiveMinutes = 60): Promise<void> {
    const cutoff = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    const roomsToDelete: string[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.lastActivity < cutoff) {
        roomsToDelete.push(roomId);
      }
    }

    for (const roomId of roomsToDelete) {
      this.logger.log(`Cleaning up inactive room: ${roomId}`);
      this.rooms.delete(roomId);
      await this.cacheService.del(`collaboration:room:${roomId}`);
    }

    if (roomsToDelete.length > 0) {
      this.logger.log(`Cleaned up ${roomsToDelete.length} inactive rooms`);
    }
  }
}
