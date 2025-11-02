import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CohortMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // OPTIONAL: attach cohort info if provided (e.g., header x-cohort or derived from user)
    const cohort = (req.headers['x-cohort'] as string) || undefined;
    (req as any).cohort = cohort;
    next();
  }
}

