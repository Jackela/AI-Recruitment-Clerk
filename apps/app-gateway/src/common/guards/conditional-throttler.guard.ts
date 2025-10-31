import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Wraps the framework throttler guard so we can toggle rate limiting centrally.
 */
@Injectable()
export class ConditionalThrottlerGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly throttlerGuard: ThrottlerGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const enabled =
      this.configService.get<string>('ENABLE_THROTTLE') === 'true';
    if (!enabled) {
      return true;
    }
    return this.throttlerGuard.canActivate(context);
  }
}
