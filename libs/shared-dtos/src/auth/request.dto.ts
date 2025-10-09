import { Request } from 'express';
import { UserDto } from './user.dto';

/**
 * Defines the shape of the authenticated request.
 */
export interface AuthenticatedRequest extends Request {
  user: UserDto;
}