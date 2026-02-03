import type {
  CanActivate,
  ExecutionContext} from '@nestjs/common';
import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type {
  Permission,
  UserDto} from '@ai-recruitment-clerk/user-management-domain';
import {
  hasAllPermissions,
} from '@ai-recruitment-clerk/user-management-domain';

/**
 * Implements the roles guard logic.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Initializes a new instance of the Roles Guard.
   * @param reflector - The reflector.
   */
  constructor(private reflector: Reflector) {}

  /**
   * Performs the can activate operation.
   * @param context - The context.
   * @returns The boolean value.
   */
  public canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user: UserDto = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPermission = hasAllPermissions(
      user.permissions,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
