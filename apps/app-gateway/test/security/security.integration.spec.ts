import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('Security lightweight checks', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(true),
  } as unknown as Reflector;

  it('exposes JwtAuthGuard for security configuration smoke test', () => {
    const guard = new JwtAuthGuard(reflector);
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });
});
