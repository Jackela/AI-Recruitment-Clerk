#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const DEFAULT_DIRS = ['tools/logs', 'dist', 'coverage'];
const ALLOWLIST = new Set((process.env.PII_ALLOWLIST || '').split(',').filter(Boolean));
const roots = (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS)
  .map(p => path.resolve(p));

const patterns = [
  {name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g},
  {name: 'phone', re: /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g},
  {name: 'id', re: /\b\d{15,18}[Xx]?\b/g}
];

let hits = 0;

function scanFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return;
  const rel = path.relative(process.cwd(), file);
  if (ALLOWLIST.has(rel)) return;
  try {
    const data = fs.readFileSync(file, 'utf8');
    for (const p of patterns) {
      if (p.re.test(data)) {
        console.log(`[PII] ${p.name} match in ${rel}`);
        hits++;
      }
    }
  } catch { /* ignore */ }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const st = fs.statSync(dir);
  if (st.isFile()) return scanFile(dir);
  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.git')) continue;
    walk(path.join(dir, entry));
  }
}

for (const r of roots) walk(r);

if (hits > 0) {
  console.error(`PII scan failed: ${hits} potential hits`);
  process.exit(1);
} else {
  console.log('PII scan passed: no matches');
}

