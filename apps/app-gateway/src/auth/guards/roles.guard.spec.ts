import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, UserDto } from '@ai-recruitment-clerk/user-management-domain';

/**
 * Creates a mock ExecutionContext for testing.
 */
const createExecutionContext = (
  requestOverrides: Record<string, unknown> = {},
): ExecutionContext => {
  const request = {
    headers: {},
    ip: '127.0.0.1',
    path: '/api/test',
    user: undefined,
    ...requestOverrides,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

/**
 * Creates a mock user with specified permissions.
 */
const createMockUser = (permissions: Permission[]): Partial<UserDto> => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  permissions,
  role: 'user',
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should return true when no permissions are required', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
      const context = createExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        PERMISSIONS_KEY,
        expect.any(Array),
      );
    });

    it('should return true when required permissions is empty array', () => {
      // Empty permissions array means no specific permissions required
      // The guard checks if requiredPermissions is falsy or empty before checking user
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);
      const user = createMockUser([Permission.READ_USERS]);
      const context = createExecutionContext({ user });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Permission.READ_USERS]);
      const context = createExecutionContext({ user: undefined });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user is null', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Permission.READ_USERS]);
      const context = createExecutionContext({ user: null });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should return true when user has all required permissions', () => {
      const requiredPermissions = [Permission.READ_USERS];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = createMockUser([Permission.READ_USERS, Permission.CREATE_JOB]);
      const context = createExecutionContext({ user });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has exact required permissions', () => {
      const requiredPermissions = [Permission.READ_USERS, Permission.CREATE_JOB];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = createMockUser([Permission.READ_USERS, Permission.CREATE_JOB]);
      const context = createExecutionContext({ user });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permissions', () => {
      const requiredPermissions = [Permission.MANAGE_USER];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = createMockUser([Permission.READ_USERS]);
      const context = createExecutionContext({ user });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/Insufficient permissions/);
    });

    it('should throw ForbiddenException when user has some but not all permissions', () => {
      const requiredPermissions = [Permission.READ_USERS, Permission.MANAGE_USER];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = createMockUser([Permission.READ_USERS]);
      const context = createExecutionContext({ user });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no permissions', () => {
      const requiredPermissions = [Permission.READ_USERS];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = createMockUser([]);
      const context = createExecutionContext({ user });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should include required permissions in error message', () => {
      const requiredPermissions = [Permission.MANAGE_USER, Permission.READ_USERS];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = createMockUser([]);
      const context = createExecutionContext({ user });

      try {
        guard.canActivate(context);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toContain('manage_user');
        expect((error as ForbiddenException).message).toContain('read:users');
      }
    });
  });

  describe('reflector interaction', () => {
    it('should call reflector with handler and class', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
      const context = createExecutionContext();

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should check handler-level permissions first', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Permission.READ_USERS]);
      const user = createMockUser([Permission.READ_USERS]);
      const context = createExecutionContext({ user });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle user with undefined permissions array', () => {
      const requiredPermissions = [Permission.READ_USERS];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = { id: 'user-123', email: 'test@example.com', permissions: undefined };
      const context = createExecutionContext({ user });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle user with null permissions array', () => {
      const requiredPermissions = [Permission.READ_USERS];
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(requiredPermissions);

      const user = { id: 'user-123', email: 'test@example.com', permissions: null };
      const context = createExecutionContext({ user });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should be synchronous', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
      const context = createExecutionContext();

      const result = guard.canActivate(context);

      expect(typeof result).toBe('boolean');
      expect(result).not.toBeInstanceOf(Promise);
    });
  });
});
