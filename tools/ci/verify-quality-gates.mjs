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

function ensureCoverage(threshold) {
  const summaryPath = path.resolve('coverage/coverage-summary.json');
  if (!fs.existsSync(summaryPath)) {
    // generate coverage by running tests if summary missing
    run('npm', ['run', 'test:coverage']);
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const totals = summary.total || summary;
  const pct = totals.lines?.pct ?? totals.statements?.pct ?? 0;
  if (pct < threshold * 100) {
    throw new Error(`Coverage ${pct}% below threshold ${(threshold * 100)}%`);
  } else {
    console.log(`[OK] Coverage ${pct}% >= ${(threshold * 100)}%`);
  }
}

function main() {
  const cfg = loadConfig();

  // Lint
  if (cfg.lintErrors === 0) {
    run('npm', ['run', 'lint']);
  }

  // Typecheck
  if (cfg.typecheck) {
    run('npm', ['run', 'typecheck']);
  }

  // Coverage
  if (typeof cfg.coverage === 'number') {
    ensureCoverage(cfg.coverage);
  }

  // E2E smoke (optional)
  if (cfg.requireE2ESmoke) {
    run('npm', ['run', 'test:e2e']);
  }

  console.log('Quality gates passed.');
}

main();

