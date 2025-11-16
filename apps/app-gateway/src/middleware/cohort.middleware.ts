import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

type RequestWithCohort = Request & { cohort?: string };

@Injectable()
export class CohortMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // OPTIONAL: attach cohort info if provided (e.g., header x-cohort or derived from user)
    const cohortHeader = req.headers['x-cohort'];
    const requestWithCohort = req as RequestWithCohort;
    requestWithCohort.cohort =
      typeof cohortHeader === 'string' ? cohortHeader : undefined;
    next();
  }
}

