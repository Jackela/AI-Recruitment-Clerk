import type { Request } from 'express';
import type { UserDto } from './user.dto';

/**
 * Defines the shape of the authenticated request.
 */
export interface AuthenticatedRequest extends Request {
  user: UserDto;
}
