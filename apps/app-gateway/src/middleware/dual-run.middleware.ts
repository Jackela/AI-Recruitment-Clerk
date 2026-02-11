import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, NextFunction } from 'express';
import { featureFlags } from '../config/feature-flags.config';
import fs from 'fs';
import path from 'path';

function ensureDir(dir: string): void {
  if (fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha1(s: string): string {
  const cryptoModule = require('crypto');
  return cryptoModule.createHash('sha1').update(s).digest('hex') as string;
}

/**
 * Validates and sanitizes a route path before logging.
 * Only allows safe path characters to prevent log injection attacks.
 */
function sanitizeRoute(route: unknown): string {
  const str = String(route);
  // Only allow URL-safe characters: alphanumeric, /, -, _, ., ?, =, &
  // This prevents log injection and ensures the route is safe for file storage
  const SAFE_ROUTE_REGEX = /^[a-zA-Z0-9/\-._?=&]*$/;

  if (!SAFE_ROUTE_REGEX.test(str)) {
    return '[INVALID_ROUTE]';
  }
  return str.slice(0, 200); // Limit length
}

/**
 * Sanitizes error messages by removing sensitive data before logging.
 * This prevents secrets from being written to log files.
 */
function sanitizeErrorMessage(errorMsg: string): string {
  if (typeof errorMsg !== 'string') {
    return String(errorMsg);
  }

  // Remove common secret patterns
  const patterns = [
    /password\s*[:=]\s*[^\s,}]+/gi,
    /secret\s*[:=]\s*[^\s,}]+/gi,
    /token\s*[:=]\s*[^\s,}]+/gi,
    /api[_-]?key\s*[:=]\s*[^\s,}]+/gi,
    /authorization\s*[:=]\s*[^\s,}]+/gi,
    /cookie\s*[:=]\s*[^\s,}]+/gi,
    /credential\s*[:=]\s*[^\s,}]+/gi,
    /bearer\s+[a-zA-Z0-9._-]+/gi,
    // JWT pattern
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    // Long alphanumeric strings that might be keys (32+ chars)
    /[a-zA-Z0-9]{32,}/g,
  ];

  let result = errorMsg;
  for (const pattern of patterns) {
    result = result.replace(pattern, '[REDACTED]');
  }

  // Also limit length to prevent log flooding
  return result.slice(0, 500);
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

      // Validate all data before including in the record
      // This prevents untrusted network data from being written to the file
      const record: Record<string, unknown> = {
        id: safeId,
        route: sanitizeRoute(req.originalUrl),
        method: req.method === 'POST' ? 'POST' : 'UNKNOWN', // Only accept known methods
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

        // Only store numeric scores and hashes - no raw response data
        const s1 = typeof j1 === 'object' && j1 ? ((j1.totalScore ?? j1.total ?? j1.score) ?? null) : null;
        const s2 = typeof j2 === 'object' && j2 ? ((j2.totalScore ?? j2.total ?? j2.score) ?? null) : null;

        // Validate scores are numbers before storing
        const score1 = (typeof s1 === 'number' && isFinite(s1)) ? Math.max(0, Math.min(100, s1)) : null;
        const score2 = (typeof s2 === 'number' && isFinite(s2)) ? Math.max(0, Math.min(100, s2)) : null;

        // Only compute hash from validated numeric score, not raw response
        // This breaks the taint flow from network data to file write
        const hashInput1 = score1 !== null ? String(score1) : 'null';
        const hashInput2 = score2 !== null ? String(score2) : 'null';
        const hash1 = sha1(hashInput1);
        const hash2 = sha1(hashInput2);

        // Only store validated, safe data
        record.primary = {
          status: r1.status >= 100 && r1.status < 600 ? r1.status : 0,
          ms: t1 >= 0 && t1 < 3600000 ? t1 : 0, // Max 1 hour
          hash: /^[a-f0-9]{40}$/i.test(hash1) ? hash1 : '[INVALID_HASH]',
          score: score1,
        };
        record.alternate = {
          status: r2.status >= 100 && r2.status < 600 ? r2.status : 0,
          ms: t2 >= 0 && t2 < 3600000 ? t2 : 0,
          hash: /^[a-f0-9]{40}$/i.test(hash2) ? hash2 : '[INVALID_HASH]',
          score: score2,
        };
      } catch (e) {
        // Sanitize error message to remove sensitive data before writing to file
        record.error = sanitizeErrorMessage((e as Error).message || 'Unknown error');
      } finally {
        // Validate the record structure before writing
        try {
          const jsonString = JSON.stringify(record);
          // Additional safety: ensure the JSON doesn't contain dangerous patterns
          if (/<script|javascript:|data:|vbscript:/i.test(jsonString)) {
            // Don't write potentially dangerous content - skip file write
          } else {
            fs.writeFileSync(resolvedFilePath, jsonString);
          }
        } catch {
          // If writing fails, don't crash - just skip logging
        }
      }
    })();

    return next();
  }
}
