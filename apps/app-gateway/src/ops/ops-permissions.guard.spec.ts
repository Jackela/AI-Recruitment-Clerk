import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';
import { resetConfigCache } from '@ai-recruitment-clerk/configuration';

const createContext = (user?: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        user,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('OpsPermissionsGuard', () => {
  const requiredPermission = 'ops.manage' as Permission;
  const otherPermission = 'ops.view' as Permission;
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const buildGuard = () => new OpsPermissionsGuard(reflectorMock);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    resetConfigCache();
  });

  it('allows all access in test environment', () => {
    const guard = buildGuard();
    reflectorMock.getAllAndOverride = jest
      .fn()
      .mockReturnValue([requiredPermission]);

    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });

  it('enforces permissions outside of test env', () => {
    process.env.NODE_ENV = 'development';
    resetConfigCache();
    const guard = buildGuard();
    reflectorMock.getAllAndOverride = jest
      .fn()
      .mockReturnValue([requiredPermission]);

    const ctx = createContext({
      permissions: [requiredPermission],
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws when user lacks required permissions', () => {
    process.env.NODE_ENV = 'development';
    resetConfigCache();
    const guard = buildGuard();
    reflectorMock.getAllAndOverride = jest
      .fn()
      .mockReturnValue([requiredPermission]);

    const ctx = createContext({
      permissions: [otherPermission],
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
