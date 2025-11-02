#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('tools/logs/migration');
const outDir = path.resolve('tools/logs/migration/reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  const sx = x.slice(0, n);
  const sy = y.slice(0, n);
  const mx = sx.reduce((a,b)=>a+b,0)/n;
  const my = sy.reduce((a,b)=>a+b,0)/n;
  let num=0, dx=0, dy=0;
  for (let i=0;i<n;i++) {
    const a = sx[i]-mx; const b = sy[i]-my;
    num += a*b; dx += a*a; dy += b*b;
  }
  const den = Math.sqrt(dx*dy)||1;
  return num/den;
}

function ndcgAtK(scores, k=10) {
  // scores: array of [primaryScore, altScore]
  const pairs = scores.slice(0);
  const sortedPrimary = pairs.slice().sort((a,b)=>b[0]-a[0]).slice(0,k);
  const sortedAlt = pairs.slice().sort((a,b)=>b[1]-a[1]).slice(0,k);
  const rel = new Map(sortedAlt.map((p,i)=>[JSON.stringify(p), k-i]));
  const dcg = sortedPrimary.reduce((sum,p,i)=> sum + (rel.get(JSON.stringify(p))||0)/Math.log2(i+2), 0);
  const idcg = sortedAlt.reduce((sum,_,i)=> sum + (k-i)/Math.log2(i+2), 0) || 1;
  return dcg/idcg;
}

const files = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(f=>f.endsWith('.json')): [];
const prim=[]; const alt=[]; const pairs=[];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(srcDir, f),'utf8'));
  const s1 = j?.primary?.score; const s2 = j?.alternate?.score;
  if (typeof s1 === 'number' && typeof s2 === 'number') { prim.push(s1); alt.push(s2); pairs.push([s1,s2]); }
}

const corr = pearson(prim, alt);
const ndcg = ndcgAtK(pairs, 10);
const report = { samples: pairs.length, pearson: Number(corr.toFixed(4)), ndcg10: Number(ndcg.toFixed(4)), generatedAt: new Date().toISOString() };
const outPath = path.join(outDir, `consistency-${Date.now()}.json`);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(outPath);

