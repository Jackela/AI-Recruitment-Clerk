import { OpsGuard } from './ops.guard';
import { ExecutionContext } from '@nestjs/common';
import { resetConfigCache } from '@ai-recruitment-clerk/configuration';

const createContext = (headers: Record<string, string> = {}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
  }) as unknown as ExecutionContext;

describe('OpsGuard', () => {
  beforeEach(() => {
    delete process.env.OPS_API_KEY;
    resetConfigCache();
  });

  it('allows requests when no ops api key is configured', () => {
    const guard = new OpsGuard();
    const ctx = createContext();

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('validates provided ops key against configuration', () => {
    process.env.OPS_API_KEY = 'ops-secret';
    resetConfigCache();
    const guard = new OpsGuard();

    expect(
      guard.canActivate(createContext({ 'x-ops-key': 'ops-secret' })),
    ).toBe(true);
    expect(
      guard.canActivate(createContext({ 'x-ops-key': 'invalid' })),
    ).toBe(false);
  });
});
