import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Allow local auth in UAT environment; real validation handled in AuthController
    return true;
  }
}
