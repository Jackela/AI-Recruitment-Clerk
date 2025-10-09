import { Requires, Ensures, Invariant } from '../contracts/dbc.decorators';
import { UserSession, UsageResult } from '../domains/user-management.dto';

/**
 * Represents the user session contracts.
 */
export class UserSessionContracts {
  
  /**
   * Creates session.
   * @param ip - The ip.
   * @returns The UserSession.
   */
  static createSession(ip: string): UserSession {
    // Manual contract validation for synchronous method
    if (!ip || ip.length === 0 || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      throw new Error('IP address must be valid IPv4 format');
    }
    
    try {
      const result = UserSession.create(ip);
      
      if (!result.isValid() || result.getDailyUsage().remaining < 0) {
        throw new Error('New session must be valid with non-negative remaining quota');
      }
      
      return result;
    } catch (error) {
      // Re-throw if it's already our contract violation
      if (error instanceof Error && error.message.includes('IP address must be valid IPv4 format')) {
        throw error;
      }
      // Otherwise, wrap it
      throw new Error('IP address must be valid IPv4 format');
    }
  }

  /**
   * Performs the record usage operation.
   * @param session - The session.
   * @returns The UsageResult.
   */
  static recordUsage(session: UserSession): UsageResult {
    // Manual contract validation for synchronous method
    if (!session.isValid() || !session.canUse()) {
      throw new Error('Can only record usage for valid sessions with available quota');
    }
    
    const result = session.recordUsage();
    
    if (!result.success && !result.quotaExceeded) {
      throw new Error('Usage recording must return clear success or quota exceeded status');
    }
    
    return result;
  }
  
  /**
   * Validates session state.
   * @param session - The session.
   * @returns The boolean value.
   */
  static validateSessionState(session: UserSession): boolean {
    const result = session.isValid() || session.getStatus() === 'expired';
    
    if (!result) {
      throw new Error('Session must be either valid or explicitly expired');
    }
    
    return result;
  }
}
