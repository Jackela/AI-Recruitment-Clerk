#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../..');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    options[key.replace(/^--/, '')] = value;
  }
  return options;
}

function loadManifest(localPath) {
  if (!existsSync(localPath)) {
    throw new Error(`Local manifest not found: ${localPath}`);
  }
  return JSON.parse(readFileSync(localPath, 'utf8'));
}

function ensureTestsPassed(manifest) {
  const tests = manifest.tests ?? {};
  const failing = Object.entries(tests).filter(
    ([, result]) => result?.status !== 'pass' && result?.status !== 'skipped',
  );
  if (failing.length > 0) {
    const list = failing.map(([name]) => name).join(', ');
    throw new Error(`Local manifest has non-passing tests: ${list}`);
  }
  if (manifest.result && manifest.result !== 'pass') {
    throw new Error(`Local manifest result is ${manifest.result}, expected pass.`);
  }
}

function main() {
  const opts = parseArgs();
  const localPath = path.resolve(workspaceRoot, opts.local ?? '');
  const remoteStatus = opts['remote-status'];
  if (!localPath) throw new Error('Provide --local <path>');
  if (!remoteStatus) throw new Error('Provide --remote-status <success|failure|cancelled>');

  const workflowUrl = opts['workflow-url'] ?? '';
  const missingSecrets = (opts['missing-secrets'] ?? '').split(',').filter(Boolean);

  const manifest = loadManifest(localPath);
  ensureTestsPassed(manifest);

  const parity = {
    localResult: manifest.result ?? 'unknown',
    remoteStatus,
    workflowUrl,
    missingSecrets,
    status: 'match',
    notes: '',
  };

  if (missingSecrets.length > 0) {
    parity.status = 'blocked';
    parity.notes = `Missing secrets: ${missingSecrets.join(', ')}`;
    throw new Error(parity.notes);
  }

  if (remoteStatus !== 'success') {
    parity.status = 'drift';
    parity.notes = `Remote workflow concluded with ${remoteStatus}`;
    throw new Error(parity.notes);
  }

  console.log('[governance] Local manifest matches remote CI status.');

  if (opts.output) {
    const outputPath = path.resolve(workspaceRoot, opts.output);
    writeFileSync(outputPath, JSON.stringify({ ...parity, checkedAt: new Date().toISOString() }, null, 2));
    console.log(`[governance] Wrote parity summary to ${path.relative(workspaceRoot, outputPath)}`);
  }
}

try {
  main();
} catch (err) {
  console.error('[governance] Parity check failed');
  console.error(err.message || err);
  process.exit(1);
}
