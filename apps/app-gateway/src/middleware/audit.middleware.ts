import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      // Only audit ops endpoints and mutating methods
      if (!req.originalUrl.startsWith('/ops/')) return;
      const actor = (req.headers['x-user-id'] as string) || 'system';
      const target = req.originalUrl;
      const action = `${req.method}`.toLowerCase();
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        actor,
        action,
        target,
        status: res.statusCode,
        ms: Date.now() - start,
      });
      const dir = path.resolve('tools/logs/audit');
      ensureDir(dir);
      fs.appendFileSync(path.join(dir, `audit-${new Date().toISOString().slice(0,10)}.jsonl`), line + '\n');
    });
    next();
  }
}

