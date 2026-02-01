import type {
  ExecutionContext} from '@nestjs/common';
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

/**
 * Implements the optional jwt auth guard logic.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  /**
   * Initializes a new instance of the Optional Jwt Auth Guard.
   * @param reflector - The reflector.
   */
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Performs the can activate operation.
   * @param context - The context.
   * @returns A promise that resolves to boolean value.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    try {
      // Try to validate JWT token
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      // If JWT validation fails, allow the request to continue
      // The guest guard or service will handle guest-specific logic
      this.logger.debug(
        'JWT validation failed, proceeding without authentication',
      );
      return true;
    }
  }

  /**
   * Handles request.
   * @param err - The err.
   * @param user - The user.
   * @param info - The info.
   * @param context - The context.
   * @returns The result of the operation.
   */
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (err) {
      // Log the error but don't throw - let guest mode handle it
      this.logger.debug(`JWT error: ${err.message}`);
      return null;
    }

    if (user) {
      // Authenticated user found
      request.user = user;
      request.isAuthenticated = true;
      return user;
    }

    // No authenticated user, but that's okay for optional auth
    request.isAuthenticated = false;
    return null;
  }
}
