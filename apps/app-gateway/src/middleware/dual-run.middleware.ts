import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, NextFunction } from 'express';
import { featureFlags } from '../config/feature-flags.config';
import fs from 'fs';
import path from 'path';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha1(s: string): string {
  const cryptoModule = require('crypto');
  return cryptoModule.createHash('sha1').update(s).digest('hex') as string;
}

@Injectable()
export class DualRunMiddleware implements NestMiddleware {
  public async use(req: Request, _res: unknown, next: NextFunction): Promise<void> {
    // Only for scoring endpoints and POST JSON requests
    if (!featureFlags.dualRun || req.method !== 'POST' || !req.path.startsWith('/scoring/')) {
      return next();
    }

    const primaryBase = process.env.SCORING_ENGINE_URL || 'http://scoring-engine-svc:3000';
    const altBase = process.env.SCORING_ENGINE_URL_ALT || process.env.MATCH_SVC_URL || '';
    if (!altBase) {
      return next();
    }

    const target = `${primaryBase.replace(/\/$/, '')}${req.originalUrl.replace(/^\/scoring/, '')}`;
    const alt = `${altBase.replace(/\/$/, '')}${req.originalUrl.replace(/^\/scoring/, '')}`;

    // Clone request body if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (req as any).body ? JSON.stringify((req as any).body) : undefined;

    // Fire alt request in background and log comparison; do not block primary flow
    (async () => {
      const logsDir = path.resolve('tools/logs/migration');
      ensureDir(logsDir);

      // Sanitize ID to prevent path traversal attacks
      // Only allow alphanumeric characters, underscore, and hyphen
      const safeId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(logsDir, `${safeId}.json`);

      // Validate path is within logs directory to prevent directory traversal
      const resolvedFilePath = path.resolve(filePath);
      const resolvedLogsDir = path.resolve(logsDir);
      if (!resolvedFilePath.startsWith(resolvedLogsDir)) {
        // Log error but don't block the request
        return;
      }

      const record: Record<string, unknown> = {
        id: safeId,
        route: req.originalUrl,
        method: req.method,
        time: new Date().toISOString(),
      };
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const p0 = Date.now();
        const r1 = await fetch(target, { method: 'POST', headers, body });
        const t1 = Date.now() - p0;
        const j1: Record<string, unknown> = await r1.json().catch(() => ({})) as Record<string, unknown>;
        const p1 = Date.now();
        const r2 = await fetch(alt, { method: 'POST', headers, body });
        const t2 = Date.now() - p1;
        const j2: Record<string, unknown> = await r2.json().catch(() => ({})) as Record<string, unknown>;
        // Minimal comparison without storing PII: hash responses and extract numeric scores if present
        const s1 = typeof j1 === 'object' && j1 ? ((j1.totalScore ?? j1.total ?? j1.score) ?? null) : null;
        const s2 = typeof j2 === 'object' && j2 ? ((j2.totalScore ?? j2.total ?? j2.score) ?? null) : null;
        record.primary = { status: r1.status, ms: t1, hash: sha1(JSON.stringify(j1).slice(0, 1000)), score: s1 };
        record.alternate = { status: r2.status, ms: t2, hash: sha1(JSON.stringify(j2).slice(0, 1000)), score: s2 };
      } catch (e) {
        // Sanitize error message to remove sensitive data before writing to file
        let errorMsg = (e as Error).message;
        if (typeof errorMsg === 'string') {
          errorMsg = errorMsg
            .replace(/password|secret|token|api[_-]?key|authorization|cookie|credential/gi, '[REDACTED]')
            .replace(/["'].*["'].*[:=].*["']/gi, '[REDACTED]');
        }
        record.error = errorMsg;
      } finally {
        fs.writeFileSync(resolvedFilePath, JSON.stringify(record));
      }
    })();

    return next();
  }
}

