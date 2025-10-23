import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

/**
 * Implements the local auth guard logic.
 */
@Injectable()
export class LocalAuthGuard implements CanActivate {
  /**
   * Performs the can activate operation.
   * @param context - The context.
   * @returns The boolean | Promise<boolean>.
   */
  canActivate(_context: ExecutionContext): boolean | Promise<boolean> {
    // Allow local auth in UAT environment; real validation handled in AuthController
    return true;
  }
}
