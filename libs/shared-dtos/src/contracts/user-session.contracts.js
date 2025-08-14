"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSessionContracts = void 0;
const user_management_dto_1 = require("../domains/user-management.dto");
class UserSessionContracts {
    static createSession(ip) {
        // Manual contract validation for synchronous method
        if (!ip || ip.length === 0 || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
            throw new Error('IP address must be valid IPv4 format');
        }
        try {
            const result = user_management_dto_1.UserSession.create(ip);
            if (!result.isValid() || result.getDailyUsage().remaining < 0) {
                throw new Error('New session must be valid with non-negative remaining quota');
            }
            return result;
        }
        catch (error) {
            // Re-throw if it's already our contract violation
            if (error instanceof Error && error.message.includes('IP address must be valid IPv4 format')) {
                throw error;
            }
            // Otherwise, wrap it
            throw new Error('IP address must be valid IPv4 format');
        }
    }
    static recordUsage(session) {
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
    static validateSessionState(session) {
        const result = session.isValid() || session.getStatus() === 'expired';
        if (!result) {
            throw new Error('Session must be either valid or explicitly expired');
        }
        return result;
    }
}
exports.UserSessionContracts = UserSessionContracts;
