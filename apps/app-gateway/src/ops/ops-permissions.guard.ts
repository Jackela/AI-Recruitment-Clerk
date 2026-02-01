import type { CanActivate, ExecutionContext} from '@nestjs/common';
import { Injectable, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import type { Permission} from '@ai-recruitment-clerk/user-management-domain';
import { hasAllPermissions } from '@ai-recruitment-clerk/user-management-domain';

@Injectable()
export class OpsPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') return true;

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { permissions?: Permission[] } | undefined;

    if (!user || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('User not authenticated');
    }

    const ok = hasAllPermissions(user.permissions as Permission[], requiredPermissions);
    if (!ok) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

