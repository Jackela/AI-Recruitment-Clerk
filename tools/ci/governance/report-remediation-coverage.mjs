#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import YAML from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../..');
const remediationPath = path.join(workspaceRoot, 'specs/001-audit-architecture/remediation.yaml');
const THRESHOLD = 90;

function loadEntries() {
  const doc = YAML.load(readFileSync(remediationPath, 'utf8'));
  return doc?.remediations ?? [];
}

function main() {
  const entries = loadEntries();
  const high = entries.filter((entry) => entry.severity === 'high');
  if (high.length === 0) {
    console.log('[governance] No high-severity findings recorded; coverage defaults to 100%.');
    return;
  }
  const covered = high.filter((entry) => entry.owner && entry.dueDate);
  const coverage = (covered.length / high.length) * 100;
  console.log(`[governance] High-severity remediation coverage: ${covered.length}/${high.length} (${coverage.toFixed(2)}%)`);
  if (coverage < THRESHOLD) {
    console.error(`[governance] Coverage below threshold (${THRESHOLD}%). Please assign owners/dates to remaining items.`);
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error('[governance] Failed to compute remediation coverage');
  console.error(err);
  process.exit(1);
}
