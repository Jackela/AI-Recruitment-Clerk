import {
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { GuestGuard } from './guest.guard';

const createContext = (
  headers: Record<string, string> = {},
): ExecutionContext => {
  const request = {
    headers,
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('GuestGuard error paths', () => {
  const reflector = {} as Reflector;
  const originalSetInterval = global.setInterval;

  beforeEach(() => {
    global.setInterval = jest.fn().mockReturnValue(1) as never;
  });

  afterEach(() => {
    global.setInterval = originalSetInterval;
    jest.restoreAllMocks();
  });

  it('allows access for guest users within limits', async () => {
    const guard = new GuestGuard(reflector);
    const context = createContext({ 'x-device-id': 'guest-device-12345' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest()).toMatchObject({
      deviceId: 'guest-device-12345',
      isGuest: true,
    });
  });

  it('rejects guest access without required device identity', async () => {
    const guard = new GuestGuard(reflector);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects invalid guest device identifiers', async () => {
    const guard = new GuestGuard(reflector);

    await expect(
      guard.canActivate(createContext({ 'x-device-id': 'bad!' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('handles guest quota exceeded', async () => {
    const guard = new GuestGuard(reflector);
    const headers = { 'x-device-id': 'quota-device-12345' };

    for (let i = 0; i < 30; i++) {
      await guard.canActivate(createContext(headers));
    }

    await expect(guard.canActivate(createContext(headers))).rejects.toThrow(
      new HttpException(
        'Too many requests from this device. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });
});
