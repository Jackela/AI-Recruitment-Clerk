#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dir = path.resolve('tools/logs/migration');
if (!fs.existsSync(dir)) {
  console.error('No migration logs found');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let total = 0, ok = 0, statusMismatch = 0;
let latencies = [];

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f),'utf8'));
  total++;
  if (j.primary && j.alternate) {
    if (j.primary.status === j.alternate.status) ok++; else statusMismatch++;
    if (typeof j.primary.ms === 'number' && typeof j.alternate.ms === 'number') {
      latencies.push([j.primary.ms, j.alternate.ms]);
    }
  }
}

const avg = (arr)=> arr.reduce((a,b)=>a+b,0)/arr.length || 0;
const avgP = avg(latencies.map(x=>x[0]));
const avgA = avg(latencies.map(x=>x[1]));

const summary = { total, matchedStatus: ok, statusMismatch, avgPrimaryMs: Math.round(avgP), avgAlternateMs: Math.round(avgA) };
console.log(JSON.stringify(summary, null, 2));

