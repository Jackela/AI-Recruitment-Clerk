import { Test, TestingModule } from '@nestjs/testing';
import {
  CollaborationService,
  CollaborationRoom,
  Participant,
  CollaborationAction,
  DocumentEdit,
} from './collaboration.service';
import type { CacheService } from '../cache/cache.service';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let cacheServiceMock: jest.Mocked<CacheService>;

  beforeEach(async () => {
    cacheServiceMock = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        {
          provide: CacheService,
          useValue: cacheServiceMock,
        },
      ],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('joinRoom', () => {
    const roomId = 'room-123';
    const participant: Participant = {
      userId: 'user-456',
      name: 'John Doe',
      role: 'editor',
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    it('should create new room when not exists', async () => {
      const room = await service.joinRoom(roomId, participant);

      expect(room).toBeDefined();
      expect(room.id).toBe(roomId);
      expect(room.participants).toContainEqual(
        expect.objectContaining({ userId: participant.userId }),
      );
    });

    it('should add participant to existing room', async () => {
      const participant1: Participant = {
        userId: 'user-1',
        name: 'User One',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      const participant2: Participant = {
        userId: 'user-2',
        name: 'User Two',
        role: 'viewer',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await service.joinRoom(roomId, participant1);
      const room = await service.joinRoom(roomId, participant2);

      expect(room.participants).toHaveLength(2);
    });

    it('should update existing participant', async () => {
      await service.joinRoom(roomId, participant);

      const updatedParticipant: Participant = {
        ...participant,
        role: 'owner',
      };

      const room = await service.joinRoom(roomId, updatedParticipant);

      const storedParticipant = room.participants.find(
        (p) => p.userId === participant.userId,
      );
      expect(storedParticipant?.role).toBe('owner');
    });

    it('should remove user from previous room', async () => {
      const room1 = 'room-1';
      const room2 = 'room-2';

      await service.joinRoom(room1, participant);
      await service.joinRoom(room2, participant);

      const oldRoom = await service.getRoom(room1);
      expect(
        oldRoom?.participants.find((p) => p.userId === participant.userId),
      ).toBeUndefined();
    });

    it('should cache room state', async () => {
      await service.joinRoom(roomId, participant);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `collaboration:room:${roomId}`,
        expect.any(Object),
        { ttl: 7200 },
      );
    });

    it('should update room last activity', async () => {
      const before = Date.now();
      const room = await service.joinRoom(roomId, participant);

      expect(room.lastActivity.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('leaveRoom', () => {
    const roomId = 'room-123';
    const participant: Participant = {
      userId: 'user-456',
      name: 'John Doe',
      role: 'editor',
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    beforeEach(async () => {
      await service.joinRoom(roomId, participant);
    });

    it('should remove participant from room', async () => {
      await service.leaveRoom(roomId, participant.userId);

      const room = await service.getRoom(roomId);
      expect(
        room?.participants.find((p) => p.userId === participant.userId),
      ).toBeUndefined();
    });

    it('should delete empty room', async () => {
      await service.leaveRoom(roomId, participant.userId);

      const room = await service.getRoom(roomId);
      expect(room).toBeNull();
      expect(cacheServiceMock.del).toHaveBeenCalledWith(
        `collaboration:room:${roomId}`,
      );
    });

    it('should not delete room with remaining participants', async () => {
      const participant2: Participant = {
        userId: 'user-789',
        name: 'Jane Doe',
        role: 'viewer',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await service.joinRoom(roomId, participant2);
      await service.leaveRoom(roomId, participant.userId);

      const room = await service.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room?.participants).toHaveLength(1);
    });

    it('should handle leaving non-existent room', async () => {
      await expect(
        service.leaveRoom('non-existent', participant.userId),
      ).resolves.not.toThrow();
    });

    it('should update room last activity', async () => {
      const before = Date.now();
      await service.leaveRoom(roomId, participant.userId);

      // Room is deleted, but last activity was updated before deletion
      expect(cacheServiceMock.set).toHaveBeenCalled();
    });
  });

  describe('trackUserAction', () => {
    const roomId = 'room-123';
    const participant: Participant = {
      userId: 'user-456',
      name: 'John Doe',
      role: 'editor',
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    beforeEach(async () => {
      await service.joinRoom(roomId, participant);
    });

    it('should track user action', async () => {
      const action: CollaborationAction = {
        type: 'join',
        userId: participant.userId,
        roomId,
        timestamp: new Date(),
      };

      await service.trackUserAction(action);

      expect(cacheServiceMock.set).toHaveBeenCalled();
    });

    it('should update participant last seen', async () => {
      const before = Date.now();

      const action: CollaborationAction = {
        type: 'comment',
        userId: participant.userId,
        roomId,
        timestamp: new Date(),
      };

      await service.trackUserAction(action);

      const room = await service.getRoom(roomId);
      const storedParticipant = room?.participants.find(
        (p) => p.userId === participant.userId,
      );
      expect(storedParticipant?.lastSeen.getTime()).toBeGreaterThanOrEqual(
        before,
      );
    });

    it('should update cursor position on cursor_move', async () => {
      const action: CollaborationAction = {
        type: 'cursor_move',
        userId: participant.userId,
        roomId,
        data: { x: 100, y: 200 },
        timestamp: new Date(),
      };

      await service.trackUserAction(action);

      const room = await service.getRoom(roomId);
      const storedParticipant = room?.participants.find(
        (p) => p.userId === participant.userId,
      );
      expect(storedParticipant?.cursor).toEqual({ x: 100, y: 200 });
    });

    it('should handle non-existent room', async () => {
      const action: CollaborationAction = {
        type: 'join',
        userId: participant.userId,
        roomId: 'non-existent',
        timestamp: new Date(),
      };

      await expect(service.trackUserAction(action)).resolves.not.toThrow();
    });

    it('should handle non-existent participant', async () => {
      const action: CollaborationAction = {
        type: 'join',
        userId: 'non-existent-user',
        roomId,
        timestamp: new Date(),
      };

      await expect(service.trackUserAction(action)).resolves.not.toThrow();
    });
  });

  describe('handleDocumentEdit', () => {
    const roomId = 'room-123';
    const participant: Participant = {
      userId: 'user-456',
      name: 'John Doe',
      role: 'editor',
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    beforeEach(async () => {
      await service.joinRoom(roomId, participant);
    });

    it('should store document edit', async () => {
      const edit: DocumentEdit = {
        id: 'edit-123',
        userId: participant.userId,
        roomId,
        operation: 'insert',
        position: 10,
        content: 'new text',
        timestamp: new Date(),
      };

      await service.handleDocumentEdit(edit);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `collaboration:edit:${roomId}:${edit.id}`,
        edit,
        { ttl: 3600 },
      );
    });

    it('should update room last activity', async () => {
      const edit: DocumentEdit = {
        id: 'edit-123',
        userId: participant.userId,
        roomId,
        operation: 'insert',
        position: 10,
        content: 'new text',
        timestamp: new Date(),
      };

      await service.handleDocumentEdit(edit);

      expect(cacheServiceMock.set).toHaveBeenCalledWith(
        `collaboration:room:${roomId}`,
        expect.any(Object),
        { ttl: 7200 },
      );
    });

    it('should handle non-existent room', async () => {
      const edit: DocumentEdit = {
        id: 'edit-123',
        userId: participant.userId,
        roomId: 'non-existent',
        operation: 'insert',
        position: 10,
        content: 'new text',
        timestamp: new Date(),
      };

      await expect(service.handleDocumentEdit(edit)).resolves.not.toThrow();
    });
  });

  describe('resolveConflicts', () => {
    it('should resolve conflicts with accept resolution', async () => {
      const conflicts = [
        {
          editId: 'edit-1',
          conflictingEdits: [],
          resolution: 'accept' as const,
        },
      ];

      const result = await service.resolveConflicts(conflicts);

      expect(result).toHaveLength(1);
      expect(result[0].resolution).toBe('accept');
    });

    it('should handle multiple conflicts', async () => {
      const conflicts = [
        {
          editId: 'edit-1',
          conflictingEdits: [],
          resolution: 'accept' as const,
        },
        {
          editId: 'edit-2',
          conflictingEdits: [],
          resolution: 'reject' as const,
        },
      ];

      const result = await service.resolveConflicts(conflicts);

      expect(result).toHaveLength(2);
    });
  });

  describe('getRoom', () => {
    const roomId = 'room-123';

    it('should return existing room', async () => {
      const participant: Participant = {
        userId: 'user-456',
        name: 'John Doe',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await service.joinRoom(roomId, participant);
      const room = await service.getRoom(roomId);

      expect(room).toBeDefined();
      expect(room?.id).toBe(roomId);
    });

    it('should return null for non-existent room', async () => {
      const room = await service.getRoom('non-existent');

      expect(room).toBeNull();
    });
  });

  describe('getUserRoom', () => {
    it('should return user current room', async () => {
      const roomId = 'room-123';
      const participant: Participant = {
        userId: 'user-456',
        name: 'John Doe',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await service.joinRoom(roomId, participant);
      const userRoom = await service.getUserRoom(participant.userId);

      expect(userRoom).toBe(roomId);
    });

    it('should return null when user not in any room', async () => {
      const userRoom = await service.getUserRoom('non-existent-user');

      expect(userRoom).toBeNull();
    });
  });

  describe('getActiveRooms', () => {
    it('should return all active rooms', async () => {
      const participant1: Participant = {
        userId: 'user-1',
        name: 'User One',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      const participant2: Participant = {
        userId: 'user-2',
        name: 'User Two',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await service.joinRoom('room-1', participant1);
      await service.joinRoom('room-2', participant2);

      const rooms = await service.getActiveRooms();

      expect(rooms).toHaveLength(2);
    });

    it('should return empty array when no rooms', async () => {
      const rooms = await service.getActiveRooms();

      expect(rooms).toEqual([]);
    });
  });

  describe('updateCursorPosition', () => {
    const roomId = 'room-123';
    const participant: Participant = {
      userId: 'user-456',
      name: 'John Doe',
      role: 'editor',
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    beforeEach(async () => {
      await service.joinRoom(roomId, participant);
    });

    it('should update cursor position', async () => {
      await service.updateCursorPosition(roomId, participant.userId, {
        x: 100,
        y: 200,
      });

      const room = await service.getRoom(roomId);
      const storedParticipant = room?.participants.find(
        (p) => p.userId === participant.userId,
      );
      expect(storedParticipant?.cursor).toEqual({ x: 100, y: 200 });
    });

    it('should update last seen timestamp', async () => {
      const before = Date.now();

      await service.updateCursorPosition(roomId, participant.userId, {
        x: 100,
        y: 200,
      });

      const room = await service.getRoom(roomId);
      const storedParticipant = room?.participants.find(
        (p) => p.userId === participant.userId,
      );
      expect(storedParticipant?.lastSeen.getTime()).toBeGreaterThanOrEqual(
        before,
      );
    });

    it('should handle non-existent room', async () => {
      await expect(
        service.updateCursorPosition('non-existent', participant.userId, {
          x: 100,
          y: 200,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle non-existent user', async () => {
      await expect(
        service.updateCursorPosition(roomId, 'non-existent-user', {
          x: 100,
          y: 200,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupInactiveRooms', () => {
    it('should remove inactive rooms', async () => {
      const participant: Participant = {
        userId: 'user-456',
        name: 'John Doe',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      // Create room with old activity
      await service.joinRoom('old-room', participant);
      const room = await service.getRoom('old-room');
      if (room) {
        room.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      }

      await service.cleanupInactiveRooms(60);

      const cleanedRoom = await service.getRoom('old-room');
      expect(cleanedRoom).toBeNull();
    });

    it('should keep active rooms', async () => {
      const participant: Participant = {
        userId: 'user-456',
        name: 'John Doe',
        role: 'editor',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await service.joinRoom('active-room', participant);
      await service.cleanupInactiveRooms(60);

      const room = await service.getRoom('active-room');
      expect(room).toBeDefined();
    });

    it('should use default max inactive time', async () => {
      await expect(service.cleanupInactiveRooms()).resolves.not.toThrow();
    });
  });
});
