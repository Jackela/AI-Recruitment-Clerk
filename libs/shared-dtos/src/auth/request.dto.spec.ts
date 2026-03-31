import type { AuthenticatedRequest } from './request.dto';
import { UserRole, UserStatus } from './user.dto';

describe('RequestDto', () => {
  describe('AuthenticatedRequest interface', () => {
    it('should accept valid authenticated request', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        role: UserRole.RECRUITER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: AuthenticatedRequest = {
        user: mockUser,
      } as unknown as AuthenticatedRequest;

      expect(request.user).toBeDefined();
      expect(request.user.id).toBe('user-123');
      expect(request.user.role).toBe(UserRole.RECRUITER);
    });

    it('should allow user with organization', () => {
      const mockUser = {
        id: 'user-456',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        role: UserRole.ADMIN,
        organizationId: 'org-123',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const request: AuthenticatedRequest = {
        user: mockUser,
      } as unknown as AuthenticatedRequest;

      expect(request.user.organizationId).toBe('org-123');
    });
  });
});
