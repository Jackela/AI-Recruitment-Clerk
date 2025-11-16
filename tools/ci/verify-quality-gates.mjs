#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status}`);
  }
}

function loadConfig() {
  const cfgPath = path.resolve('config/quality-gates.json');
  if (!fs.existsSync(cfgPath)) throw new Error(`Missing config: ${cfgPath}`);
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

function toRegex(glob) {
  // Convert a minimal subset of globs to regex: ** -> .*, * -> [^/]*
  const G = '__GLOBSTAR__';
  const escaped = glob
    .replace(/[.+^${}()|\\]/g, '\\$&')
    .replace(/\*\*/g, G)
    .replace(/\*/g, '[^/]*')
    .replace(new RegExp(G, 'g'), '.*')
    .replace(/\\/g, '/');
  return new RegExp('^' + escaped + '$');
}

function ensureCoverage(threshold, includeGlobs = []) {
  const summaryPath = path.resolve('coverage/coverage-summary.json');
  if (!fs.existsSync(summaryPath)) {
    run('npm', ['run', 'test:coverage']);
  }

  // Prefer coverage-final.json for accurate per-file aggregation
  const finalPath = path.resolve('coverage/coverage-final.json');
  if (fs.existsSync(finalPath)) {
    const raw = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
    const patterns = includeGlobs.map(toRegex);
    let totalStatements = 0;
    let coveredStatements = 0;

    const repoRoot = process.cwd().replace(/\\/g, '/');
    for (const filePath of Object.keys(raw)) {
      const normAbs = filePath.replace(/\\/g, '/');
      const norm = normAbs.startsWith(repoRoot + '/')
        ? normAbs.slice(repoRoot.length + 1)
        : normAbs;
      if (patterns.length) {
        const match = patterns.some((re) => re.test(norm));
        if (!match) continue;
      }
      const file = raw[filePath];
      if (!file || !file.s) continue;
      for (const k of Object.keys(file.s)) {
        totalStatements += 1;
        if (file.s[k] > 0) coveredStatements += 1;
      }
    }

    const pct = totalStatements === 0 ? 0 : (coveredStatements / totalStatements) * 100;
    if (pct < threshold * 100) {
      throw new Error(`Coverage ${pct.toFixed(2)}% below threshold ${(threshold * 100)}%`);
    } else {
      console.log(`[OK] Coverage ${pct.toFixed(2)}% >= ${(threshold * 100)}%`);
    }
    return;
  }

  // Fallback to summary totals if final is unavailable
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const totals = summary.total || summary;
  const pctRaw = totals.lines?.pct ?? totals.statements?.pct ?? 0;
  const pct = typeof pctRaw === 'number' ? pctRaw : 0;
  if (pct < threshold * 100) {
    throw new Error(`Coverage ${pct}% below threshold ${(threshold * 100)}%`);
  } else {
    console.log(`[OK] Coverage ${pct}% >= ${(threshold * 100)}%`);
  }
}

function main() {
  const cfg = loadConfig();
  const job = process.env.GITHUB_JOB || '';
  const isAct = process.env.ACT === 'true';

  // Lint: only enforce when running in the lint job
  if (cfg.lintErrors === 0 && job === 'lint') {
    run('npm', ['run', 'lint']);
  }

  // Typecheck: only enforce when running in the typecheck job
  if (cfg.typecheck && job === 'typecheck') {
    run('npm', ['run', 'typecheck']);
  }

  // Coverage
  if (typeof cfg.coverage === 'number') {
    ensureCoverage(cfg.coverage, cfg.includeGlobs || []);
  }

  // E2E smoke (optional): only when in e2e_smoke job and not under act's non-Playwright runner
  if (cfg.requireE2ESmoke && job === 'e2e_smoke' && !isAct) {
    run('npm', ['run', 'test:e2e']);
  }

  console.log('Quality gates passed.');
}

main();

