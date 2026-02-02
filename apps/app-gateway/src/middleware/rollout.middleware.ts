import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { featureFlags } from '../config/feature-flags.config';

function hashToPct(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h % 100);
}

@Injectable()
export class RolloutMiddleware implements NestMiddleware {
  public use(req: Request, res: Response, next: NextFunction): void {
    if (featureFlags.killSwitch) {
      res.status(403).json({ message: 'Feature disabled by kill switch' });
      return;
    }
    const id = (req.headers['x-user-id'] as string) ?? (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'anon';
    const bucket = hashToPct(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).rolloutAllowed = bucket < featureFlags.rolloutPercentage;
    next();
  }
}

