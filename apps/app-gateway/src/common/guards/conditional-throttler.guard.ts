import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Wraps the framework throttler guard so we can toggle rate limiting centrally.
 */
@Injectable()
export class ConditionalThrottlerGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly throttlerGuard: ThrottlerGuard,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const enabled =
      this.configService.get<string>('ENABLE_THROTTLE') === 'true';
    if (!enabled) {
      return true;
    }
    return this.throttlerGuard.canActivate(context);
  }
}
