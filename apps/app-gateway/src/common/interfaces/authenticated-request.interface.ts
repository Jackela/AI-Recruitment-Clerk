import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    id?: string;
    organizationId?: string;
    permissions?: string[];
    [key: string]: any;
  };
  fingerprint?: string;
  // ip is already available on Express Request, no need to redeclare
}