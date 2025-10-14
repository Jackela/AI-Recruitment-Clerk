import { UserSession, UsageStats } from '../domains/user-management.dto';

// Repository interface for other agents to depend on
/**
 * Defines the shape of the i user session repository.
 */
export interface IUserSessionRepository {
  save(session: UserSession): Promise<void>;
  findByIP(ip: string): Promise<UserSession | null>;
  findById(id: string): Promise<UserSession | null>;
  findExpiredSessions(): Promise<UserSession[]>;
}

// Service interface for other agents to depend on
/**
 * Defines the shape of the i user session service.
 */
export interface IUserSessionService {
  createOrRetrieveSession(ip: string): Promise<UserSession>;
  recordUsage(
    sessionId: string,
  ): Promise<{ success: boolean; remaining: number }>;
  getUsageStats(sessionId: string): Promise<UsageStats>;
  expireOldSessions(): Promise<number>;
}

// Result types for service methods
/**
 * Defines the shape of the usage result.
 */
export interface UsageResult {
  success: boolean;
  remaining: number;
  error?: string;
}
