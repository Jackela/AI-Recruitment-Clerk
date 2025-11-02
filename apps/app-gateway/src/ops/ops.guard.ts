import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class OpsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const required = process.env.OPS_API_KEY;
    if (!required || required.length === 0) {
      // If no key configured, allow by default (development-friendly)
      return true;
    }
    const provided = (req.headers['x-ops-key'] as string) || '';
    return provided === required;
  }
}

