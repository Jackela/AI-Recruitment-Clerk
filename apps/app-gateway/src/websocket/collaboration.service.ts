import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

// Collaboration interfaces
export interface CollaborationRoom {
  id: string;
  participants: Participant[];
  createdAt: Date;
  lastActivity: Date;
  documentId?: string;
  type: 'analysis' | 'review' | 'discussion';
}

export interface Participant {
  userId: string;
  name: string;
  role: 'viewer' | 'editor' | 'owner';
  joinedAt: Date;
  lastSeen: Date;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

export interface CollaborationAction {
  type: 'join' | 'leave' | 'edit' | 'comment' | 'cursor_move';
  userId: string;
  roomId: string;
  data?: any;
  timestamp: Date;
}

export interface DocumentEdit {
  id: string;
  userId: string;
  roomId: string;
  operation: 'insert' | 'delete' | 'update';
  position: number;
  content: string;
  timestamp: Date;
}

export interface EditConflict {
  editId: string;
  conflictingEdits: DocumentEdit[];
  resolution: 'accept' | 'reject' | 'merge';
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private rooms = new Map<string, CollaborationRoom>();
  private userToRoom = new Map<string, string>();

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Create or join a collaboration room
   */
  async joinRoom(
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
  async leaveRoom(roomId: string, userId: string): Promise<void> {
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
  async trackUserAction(action: CollaborationAction): Promise<void> {
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
   * Handle document edit operations
   */
  async handleDocumentEdit(edit: DocumentEdit): Promise<void> {
    this.logger.debug(`Processing document edit in room ${edit.roomId}`);

    const room = this.rooms.get(edit.roomId);
    if (!room) {
      this.logger.warn(`Room ${edit.roomId} not found for document edit`);
      return;
    }

    // Store edit in cache for conflict resolution
    const editKey = `collaboration:edit:${edit.roomId}:${edit.id}`;
    await this.cacheService.set(editKey, edit, { ttl: 3600 }); // 1 hour TTL

    // Check for conflicts (simplified)
    const conflicts = await this.detectConflicts(edit);
    if (conflicts.length > 0) {
      this.logger.warn(`Conflicts detected for edit ${edit.id}:`, conflicts);
      // In a real implementation, you'd emit conflict events
    }

    room.lastActivity = new Date();
  }

  /**
   * Resolve edit conflicts
   */
  async resolveConflicts(conflicts: EditConflict[]): Promise<EditConflict[]> {
    this.logger.log(`Resolving ${conflicts.length} edit conflicts`);

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
  async getRoom(roomId: string): Promise<CollaborationRoom | null> {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get user's current room
   */
  async getUserRoom(userId: string): Promise<string | null> {
    return this.userToRoom.get(userId) || null;
  }

  /**
   * Get all active rooms
   */
  async getActiveRooms(): Promise<CollaborationRoom[]> {
    return Array.from(this.rooms.values());
  }

  /**
   * Update participant cursor position
   */
  async updateCursorPosition(
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
   * Detect edit conflicts (simplified implementation)
   */
  private async detectConflicts(edit: DocumentEdit): Promise<EditConflict[]> {
    // In a real implementation, this would check for overlapping edits
    // For now, return empty array (no conflicts)
    return [];
  }

  /**
   * Cleanup inactive rooms
   */
  async cleanupInactiveRooms(maxInactiveMinutes = 60): Promise<void> {
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
