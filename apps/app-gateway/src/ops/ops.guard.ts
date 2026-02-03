import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpsGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const required = process.env.OPS_API_KEY;
    if (!required || required.length === 0) {
      // If no key configured, allow by default (development-friendly)
      return true;
    }
    const headerValue = req.headers['x-ops-key'];
    const provided = (typeof headerValue === 'string' ? headerValue : '') ?? '';
    return provided === required;
  }
}

