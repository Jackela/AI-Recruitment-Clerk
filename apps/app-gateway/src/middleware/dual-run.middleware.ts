import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { featureFlags } from '../config/feature-flags.config';
import fs from 'fs';
import path from 'path';
import { getConfig } from '@ai-recruitment-clerk/configuration';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha1(s: string) {
  const crypto = require('crypto');
  return crypto.createHash('sha1').update(s).digest('hex');
}

@Injectable()
export class DualRunMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Only for scoring endpoints and POST JSON requests
    if (!featureFlags.dualRun || req.method !== 'POST' || !req.path.startsWith('/scoring/')) {
      return next();
    }

    const config = getConfig();
    const primaryBase =
      config.integrations.scoring.baseUrl || 'http://scoring-engine-svc:3000';
    const altBase = config.integrations.scoring.altBaseUrl || '';
    if (!altBase) {
      return next();
    }

    const target = `${primaryBase.replace(/\/$/, '')}${req.originalUrl.replace(/^\/scoring/, '')}`;
    const alt = `${altBase.replace(/\/$/, '')}${req.originalUrl.replace(/^\/scoring/, '')}`;

    const start = Date.now();
    // Clone request body if available
    const body = (req as any).body ? JSON.stringify((req as any).body) : undefined;

    // Fire alt request in background and log comparison; do not block primary flow
    (async () => {
      const logsDir = path.resolve('tools/logs/migration');
      ensureDir(logsDir);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const record: any = {
        id,
        route: req.originalUrl,
        method: req.method,
        time: new Date().toISOString(),
      };
      try {
        const headers = { 'Content-Type': 'application/json' } as any;
        const p0 = Date.now();
        const r1 = await fetch(target, { method: 'POST', headers, body });
        const t1 = Date.now() - p0;
        const j1: any = await r1.json().catch(() => ({}));
        const p1 = Date.now();
        const r2 = await fetch(alt, { method: 'POST', headers, body });
        const t2 = Date.now() - p1;
        const j2: any = await r2.json().catch(() => ({}));
        // Minimal comparison without storing PII: hash responses and extract numeric scores if present
        const s1 = typeof j1 === 'object' && j1 ? (j1.totalScore ?? j1.total ?? j1.score ?? null) : null;
        const s2 = typeof j2 === 'object' && j2 ? (j2.totalScore ?? j2.total ?? j2.score ?? null) : null;
        record.primary = { status: r1.status, ms: t1, hash: sha1(JSON.stringify(j1).slice(0, 1000)), score: s1 };
        record.alternate = { status: r2.status, ms: t2, hash: sha1(JSON.stringify(j2).slice(0, 1000)), score: s2 };
      } catch (e) {
        record.error = (e as Error).message;
      } finally {
        fs.writeFileSync(path.join(logsDir, `${id}.json`), JSON.stringify(record));
      }
    })();

    return next();
  }
}

