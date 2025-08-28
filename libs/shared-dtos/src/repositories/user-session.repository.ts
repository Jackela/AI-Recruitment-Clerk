import { UserSession, UsageStats } from '../domains/user-management.dto';

// Repository interface for other agents to depend on
export interface IUserSessionRepository {
  save(session: UserSession): Promise<void>;
  findByIP(ip: string): Promise<UserSession | null>;
  findById(id: string): Promise<UserSession | null>;
  findExpiredSessions(): Promise<UserSession[]>;
}

// Service interface for other agents to depend on
export interface IUserSessionService {
  createOrRetrieveSession(ip: string): Promise<UserSession>;
  recordUsage(sessionId: string): Promise<{ success: boolean; remaining: number }>;
  getUsageStats(sessionId: string): Promise<UsageStats>;
  expireOldSessions(): Promise<number>;
}

// Result types for service methods
export interface UsageResult {
  success: boolean;
  remaining: number;
  error?: string;
}
