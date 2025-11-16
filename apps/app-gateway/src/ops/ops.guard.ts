import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { getConfig } from '@ai-recruitment-clerk/configuration';

@Injectable()
export class OpsGuard implements CanActivate {
  private readonly config = getConfig();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const required = this.config.security.opsApiKey;
    if (!required || required.length === 0) {
      // If no key configured, allow by default (development-friendly)
      return true;
    }
    const provided = (req.headers['x-ops-key'] as string) || '';
    return provided === required;
  }
}

