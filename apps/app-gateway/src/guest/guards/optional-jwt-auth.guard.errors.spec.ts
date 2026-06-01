import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

const createContext = (): ExecutionContext => {
  const request: Record<string, unknown> = { headers: {} };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('OptionalJwtAuthGuard error paths', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches user when valid token provided', () => {
    const guard = new OptionalJwtAuthGuard(reflector);
    const context = createContext();
    const user = { id: 'user-1', email: 'user@example.com' };

    expect(guard.handleRequest(null, user, null, context)).toBe(user);
    expect(context.switchToHttp().getRequest()).toMatchObject({
      user,
      isAuthenticated: true,
    });
  });

  it('continues as guest when no token provided', () => {
    const guard = new OptionalJwtAuthGuard(reflector);
    const context = createContext();

    expect(guard.handleRequest(null, null, null, context)).toBeNull();
    expect(context.switchToHttp().getRequest()).toMatchObject({
      isAuthenticated: false,
    });
  });

  it('continues as guest when token is invalid', () => {
    const guard = new OptionalJwtAuthGuard(reflector);
    const context = createContext();

    expect(
      guard.handleRequest(new Error('invalid token'), null, null, context),
    ).toBeNull();
    expect(context.switchToHttp().getRequest()).not.toHaveProperty('user');
  });
});
