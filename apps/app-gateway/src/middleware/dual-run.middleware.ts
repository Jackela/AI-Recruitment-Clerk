import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { featureFlags } from '../config/feature-flags.config';
import fs from 'fs';
import path from 'path';
import { getConfig } from '@ai-recruitment-clerk/configuration';
import crypto from 'crypto';

interface DualRunRecordEndpoint {
  status: number;
  ms: number;
  hash: string;
  score: number | null;
}

interface DualRunRecord {
  id: string;
  route: string;
  method: string;
  time: string;
  primary?: DualRunRecordEndpoint;
  alternate?: DualRunRecordEndpoint;
  error?: string;
}

type RequestWithBody = Request & { body?: unknown };

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

const extractScore = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const result = payload as Record<string, unknown>;
  const scoreCandidate =
    result.totalScore ?? result.total ?? result.score ?? null;
  return typeof scoreCandidate === 'number' ? scoreCandidate : null;
};

@Injectable()
export class DualRunMiddleware implements NestMiddleware {
  async use(req: RequestWithBody, _res: Response, next: NextFunction) {
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

    const body =
      req.body && typeof req.body === 'object'
        ? JSON.stringify(req.body)
        : undefined;

    // Fire alt request in background and log comparison; do not block primary flow
    (async () => {
      const logsDir = path.resolve('tools/logs/migration');
      ensureDir(logsDir);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const record: DualRunRecord = {
        id,
        route: req.originalUrl,
        method: req.method,
        time: new Date().toISOString(),
      };
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const p0 = Date.now();
        const r1 = await fetch(target, { method: 'POST', headers, body });
        const t1 = Date.now() - p0;
        const j1 = (await r1.json().catch(() => ({}))) as unknown;
        const p1 = Date.now();
        const r2 = await fetch(alt, { method: 'POST', headers, body });
        const t2 = Date.now() - p1;
        const j2 = (await r2.json().catch(() => ({}))) as unknown;
        // Minimal comparison without storing PII: hash responses and extract numeric scores if present
        record.primary = {
          status: r1.status,
          ms: t1,
          hash: sha1(JSON.stringify(j1).slice(0, 1000)),
          score: extractScore(j1),
        };
        record.alternate = {
          status: r2.status,
          ms: t2,
          hash: sha1(JSON.stringify(j2).slice(0, 1000)),
          score: extractScore(j2),
        };
      } catch (e) {
        record.error = (e as Error).message;
      } finally {
        fs.writeFileSync(path.join(logsDir, `${id}.json`), JSON.stringify(record));
      }
    })();

    return next();
  }
}

