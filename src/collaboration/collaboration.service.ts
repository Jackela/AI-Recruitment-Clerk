import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheService } from '../cache/cache.service';

export interface CollaborationRoom {
  id: string;
  name: string;
  type: 'candidate_review' | 'job_planning' | 'team_meeting' | 'client_presentation';
  contextId: string; // candidateId, jobId, etc.
  participants: Participant[];
  settings: RoomSettings;
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'archived' | 'closed';
}

export interface Participant {
  userId: string;
  username: string;
  role: 'hr_manager' | 'recruiter' | 'interviewer' | 'client' | 'admin';
  permissions: Permission[];
  joinedAt: Date;
  lastSeen: Date;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface Permission {
  action: 'read' | 'write' | 'comment' | 'vote' | 'moderate' | 'manage';
  resource: 'messages' | 'documents' | 'decisions' | 'participants';
}

export interface RoomSettings {
  isPrivate: boolean;
  allowGuestAccess: boolean;
  recordingEnabled: boolean;
  autoArchiveAfterDays: number;
  notificationSettings: {
    mentions: boolean;
    allMessages: boolean;
    decisions: boolean;
    statusChanges: boolean;
  };
}

export interface CollaborationMessage {
  id: string;
  roomId: string;
  type: 'text' | 'file' | 'image' | 'annotation' | 'system' | 'vote_created' | 'decision_made';
  content: string;
  authorId: string;
  authorName: string;
  contextData?: {
    candidateId?: string;
    documentId?: string;
    annotationPosition?: { x: number; y: number };
    voteId?: string;
    decisionId?: string;
  };
  mentions: string[];
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  threadId?: string;
  replyToId?: string;
  timestamp: Date;
  editedAt?: Date;
  isDeleted: boolean;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface DecisionRecord {
  id: string;
  roomId: string;
  title: string;
  description: string;
  type: 'vote' | 'consensus' | 'approval' | 'ranking';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  contextId: string;
  contextType: 'candidate' | 'job' | 'policy' | 'budget';
  options: DecisionOption[];
  participants: string[];
  settings: DecisionSettings;
  result?: DecisionResult;
  createdAt: Date;
  deadline?: Date;
  completedAt?: Date;
}

export interface DecisionOption {
  id: string;
  text: string;
  description?: string;
  votes: VoteRecord[];
  score: number;
}

export interface VoteRecord {
  userId: string;
  value: number | string; // numeric for ranking, string for selection
  comment?: string;
  timestamp: Date;
  weight: number;
}

export interface DecisionSettings {
  anonymous: boolean;
  allowComments: boolean;
  requireJustification: boolean;
  allowChangeVote: boolean;
  weightedVoting: boolean;
  minimumParticipation: number; // percentage
}

export interface DecisionResult {
  winningOption: string;
  totalVotes: number;
  participationRate: number;
  breakdown: { [optionId: string]: number };
  consensus: boolean;
  confidenceScore: number;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private readonly cacheService: CacheService
  ) {}

  /**
   * Create a new collaboration room
   */
  async createRoom(roomData: Partial<CollaborationRoom>): Promise<CollaborationRoom> {
    const room: CollaborationRoom = {
      id: this.generateId(),
      name: roomData.name || 'Untitled Room',
      type: roomData.type || 'candidate_review',
      contextId: roomData.contextId || '',
      participants: roomData.participants || [],
      settings: {
        isPrivate: false,
        allowGuestAccess: true,
        recordingEnabled: false,
        autoArchiveAfterDays: 30,
        notificationSettings: {
          mentions: true,
          allMessages: false,
          decisions: true,
          statusChanges: true,
        },
        ...roomData.settings,
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active',
    };

    await this.cacheService.set(`room:${room.id}`, room, 24 * 60 * 60 * 1000); // 24 hours
    return room;
  }

  /**
   * Join a collaboration room
   */
  async joinRoom(roomId: string, participant: Participant): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    // Check if user is already in room
    const existingParticipant = room.participants.find(p => p.userId === participant.userId);
    if (existingParticipant) {
      existingParticipant.status = 'online';
      existingParticipant.lastSeen = new Date();
    } else {
      room.participants.push({
        ...participant,
        joinedAt: new Date(),
        lastSeen: new Date(),
        status: 'online',
      });
    }

    room.lastActivity = new Date();
    await this.cacheService.set(`room:${roomId}`, room, 24 * 60 * 60 * 1000);
    
    // Log activity
    await this.logActivity(roomId, {
      type: 'user_join',
      userId: participant.userId,
      userName: participant.username,
      action: 'joined the room',
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Leave a collaboration room
   */
  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    const participant = room.participants.find(p => p.userId === userId);
    if (participant) {
      participant.status = 'offline';
      participant.lastSeen = new Date();
    }

    room.lastActivity = new Date();
    await this.cacheService.set(`room:${roomId}`, room, 24 * 60 * 60 * 1000);

    // Log activity
    await this.logActivity(roomId, {
      type: 'user_leave',
      userId: userId,
      userName: participant?.username || 'Unknown',
      action: 'left the room',
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Send a message to collaboration room
   */
  async sendMessage(roomId: string, message: Partial<CollaborationMessage>): Promise<CollaborationMessage> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const newMessage: CollaborationMessage = {
      id: this.generateId(),
      roomId,
      type: message.type || 'text',
      content: message.content || '',
      authorId: message.authorId || '',
      authorName: message.authorName || '',
      contextData: message.contextData,
      mentions: message.mentions || [],
      attachments: message.attachments || [],
      reactions: [],
      threadId: message.threadId,
      replyToId: message.replyToId,
      timestamp: new Date(),
      isDeleted: false,
    };

    // Store message
    const messageKey = `room:${roomId}:messages`;
    const existingMessages = await this.cacheService.get<CollaborationMessage[]>(messageKey) || [];
    existingMessages.push(newMessage);
    
    // Keep only last 1000 messages in cache
    if (existingMessages.length > 1000) {
      existingMessages.splice(0, existingMessages.length - 1000);
    }
    
    await this.cacheService.set(messageKey, existingMessages, 24 * 60 * 60 * 1000);

    // Update room activity
    room.lastActivity = new Date();
    await this.cacheService.set(`room:${roomId}`, room, 24 * 60 * 60 * 1000);

    // Process mentions for notifications
    if (newMessage.mentions.length > 0) {
      await this.processMentions(roomId, newMessage);
    }

    return newMessage;
  }

  /**
   * Create a decision/voting session
   */
  async createDecision(decisionData: Partial<DecisionRecord>): Promise<DecisionRecord> {
    const decision: DecisionRecord = {
      id: this.generateId(),
      roomId: decisionData.roomId || '',
      title: decisionData.title || 'Untitled Decision',
      description: decisionData.description || '',
      type: decisionData.type || 'vote',
      status: 'draft',
      createdBy: decisionData.createdBy || '',
      contextId: decisionData.contextId || '',
      contextType: decisionData.contextType || 'candidate',
      options: decisionData.options || [],
      participants: decisionData.participants || [],
      settings: {
        anonymous: false,
        allowComments: true,
        requireJustification: false,
        allowChangeVote: true,
        weightedVoting: false,
        minimumParticipation: 50,
        ...decisionData.settings,
      },
      createdAt: new Date(),
      deadline: decisionData.deadline,
    };

    await this.cacheService.set(`decision:${decision.id}`, decision, 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Add to room's decisions list
    const decisionsKey = `room:${decision.roomId}:decisions`;
    const existingDecisions = await this.cacheService.get<string[]>(decisionsKey) || [];
    existingDecisions.push(decision.id);
    await this.cacheService.set(decisionsKey, existingDecisions, 7 * 24 * 60 * 60 * 1000);

    return decision;
  }

  /**
   * Cast a vote in a decision
   */
  async castVote(decisionId: string, userId: string, optionId: string, value: number | string, comment?: string): Promise<boolean> {
    const decision = await this.getDecision(decisionId);
    if (!decision || decision.status !== 'active') return false;

    const option = decision.options.find(o => o.id === optionId);
    if (!option) return false;

    // Remove existing vote if changing vote is allowed
    if (decision.settings.allowChangeVote) {
      option.votes = option.votes.filter(v => v.userId !== userId);
    } else {
      // Check if user already voted
      if (option.votes.some(v => v.userId === userId)) return false;
    }

    // Add new vote
    const vote: VoteRecord = {
      userId,
      value,
      comment,
      timestamp: new Date(),
      weight: decision.settings.weightedVoting ? this.getUserVoteWeight(userId) : 1,
    };

    option.votes.push(vote);
    
    // Recalculate scores
    this.calculateDecisionScores(decision);

    await this.cacheService.set(`decision:${decisionId}`, decision, 7 * 24 * 60 * 60 * 1000);

    // Check if decision should be auto-completed
    await this.checkDecisionCompletion(decision);

    return true;
  }

  /**
   * Get collaboration room
   */
  async getRoom(roomId: string): Promise<CollaborationRoom | null> {
    return await this.cacheService.get<CollaborationRoom>(`room:${roomId}`);
  }

  /**
   * Get room messages
   */
  async getRoomMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<CollaborationMessage[]> {
    const messages = await this.cacheService.get<CollaborationMessage[]>(`room:${roomId}:messages`) || [];
    return messages.slice(offset, offset + limit);
  }

  /**
   * Get decision
   */
  async getDecision(decisionId: string): Promise<DecisionRecord | null> {
    return await this.cacheService.get<DecisionRecord>(`decision:${decisionId}`);
  }

  /**
   * Get user's active rooms
   */
  async getUserRooms(userId: string): Promise<CollaborationRoom[]> {
    // This would typically query a database
    // For now, return cached rooms where user is a participant
    const rooms: CollaborationRoom[] = [];
    // Implementation would scan cache or database for user's rooms
    return rooms;
  }

  /**
   * Update user presence
   */
  async updatePresence(roomId: string, userId: string, presence: Partial<UserPresence>): Promise<void> {
    const presenceKey = `presence:${roomId}:${userId}`;
    const existingPresence = await this.cacheService.get<UserPresence>(presenceKey);
    
    const updatedPresence: UserPresence = {
      userId,
      username: presence.username || '',
      role: presence.role || '',
      status: presence.status || 'online',
      currentPage: presence.currentPage,
      cursor: presence.cursor,
      lastActivity: new Date(),
      ...existingPresence,
      ...presence,
    };

    await this.cacheService.set(presenceKey, updatedPresence, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get room presence
   */
  async getRoomPresence(roomId: string): Promise<UserPresence[]> {
    const room = await this.getRoom(roomId);
    if (!room) return [];

    const presenceList: UserPresence[] = [];
    
    for (const participant of room.participants) {
      const presence = await this.cacheService.get<UserPresence>(`presence:${roomId}:${participant.userId}`);
      if (presence) {
        presenceList.push(presence);
      }
    }

    return presenceList;
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processMentions(roomId: string, message: CollaborationMessage): Promise<void> {
    // Process @mentions and send notifications
    for (const mentionedUserId of message.mentions) {
      await this.notifyUser(mentionedUserId, {
        type: 'mention',
        title: `${message.authorName} mentioned you`,
        content: message.content,
        roomId,
        messageId: message.id,
      });
    }
  }

  private async logActivity(roomId: string, activity: any): Promise<void> {
    const activityKey = `room:${roomId}:activity`;
    const existingActivity = await this.cacheService.get<any[]>(activityKey) || [];
    existingActivity.push(activity);
    
    // Keep only last 100 activities
    if (existingActivity.length > 100) {
      existingActivity.splice(0, existingActivity.length - 100);
    }
    
    await this.cacheService.set(activityKey, existingActivity, 24 * 60 * 60 * 1000);
  }

  private getUserVoteWeight(userId: string): number {
    // Implement role-based vote weighting
    // HR Managers might have higher weight than interns
    return 1; // Default weight
  }

  private calculateDecisionScores(decision: DecisionRecord): void {
    for (const option of decision.options) {
      option.score = option.votes.reduce((sum, vote) => {
        const numericValue = typeof vote.value === 'number' ? vote.value : 1;
        return sum + (numericValue * vote.weight);
      }, 0);
    }
  }

  private async checkDecisionCompletion(decision: DecisionRecord): Promise<void> {
    const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
    const participationRate = (totalVotes / decision.participants.length) * 100;

    if (participationRate >= decision.settings.minimumParticipation) {
      decision.status = 'completed';
      decision.completedAt = new Date();
      
      // Calculate final result
      decision.result = this.calculateFinalResult(decision);
      
      await this.cacheService.set(`decision:${decision.id}`, decision, 7 * 24 * 60 * 60 * 1000);
      
      // Notify participants of completion
      await this.notifyDecisionCompletion(decision);
    }
  }

  private calculateFinalResult(decision: DecisionRecord): DecisionResult {
    const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
    const winningOption = decision.options.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );

    const breakdown: { [optionId: string]: number } = {};
    decision.options.forEach(option => {
      breakdown[option.id] = option.score;
    });

    return {
      winningOption: winningOption.id,
      totalVotes,
      participationRate: (totalVotes / decision.participants.length) * 100,
      breakdown,
      consensus: this.calculateConsensus(decision),
      confidenceScore: this.calculateConfidenceScore(decision),
    };
  }

  private calculateConsensus(decision: DecisionRecord): boolean {
    const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
    const highestScore = Math.max(...decision.options.map(o => o.score));
    const consensusThreshold = totalVotes * 0.7; // 70% consensus
    
    return highestScore >= consensusThreshold;
  }

  private calculateConfidenceScore(decision: DecisionRecord): number {
    // Calculate confidence based on participation rate and vote distribution
    const totalVotes = decision.options.reduce((sum, option) => sum + option.votes.length, 0);
    const participationRate = totalVotes / decision.participants.length;
    
    // Higher participation = higher confidence
    const participationFactor = Math.min(participationRate, 1) * 50;
    
    // More uniform distribution = lower confidence
    const scores = decision.options.map(o => o.score);
    const variance = this.calculateVariance(scores);
    const distributionFactor = Math.min(variance / 10, 50);
    
    return Math.min(participationFactor + distributionFactor, 100);
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, sqDiff) => sum + sqDiff, 0) / numbers.length;
  }

  private async notifyUser(userId: string, notification: any): Promise<void> {
    // Implement user notification
    // Could send email, push notification, in-app notification, etc.
    this.logger.log(`Notifying user ${userId}: ${notification.title}`);
  }

  private async notifyDecisionCompletion(decision: DecisionRecord): Promise<void> {
    // Notify all participants about decision completion
    for (const participantId of decision.participants) {
      await this.notifyUser(participantId, {
        type: 'decision_completed',
        title: `Decision "${decision.title}" has been completed`,
        content: `The decision has reached the required participation threshold.`,
        roomId: decision.roomId,
        decisionId: decision.id,
      });
    }
  }
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