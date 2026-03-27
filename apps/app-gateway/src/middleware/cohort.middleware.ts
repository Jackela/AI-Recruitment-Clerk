import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, NextFunction } from 'express';

@Injectable()
export class CohortMiddleware implements NestMiddleware {
  public use(req: Request, _res: unknown, next: NextFunction): void {
    // OPTIONAL: attach cohort info if provided (e.g., header x-cohort or derived from user)
    const cohort = (req.headers['x-cohort'] as string) || undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).cohort = cohort;
    next();
  }
}

