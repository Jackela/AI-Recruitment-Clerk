#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const inDir = path.resolve('tools/fixtures/resumes');
const outDir = path.resolve('tools/fixtures/normalized');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function toParsedResumeDto(json) {
  return {
    basics: json.basics || {},
    education: json.education || [],
    skills: json.skills || [],
    projects: json.projects || json.work || [],
    internships: json.internships || [],
    certificates: json.certificates || [],
    awards: json.awards || [],
    extras: json.extras || [],
  };
}

const files = fs.existsSync(inDir) ? fs.readdirSync(inDir).filter(f=>f.endsWith('.json')) : [];
let count = 0;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(inDir, f),'utf8'));
  const dto = toParsedResumeDto(j);
  fs.writeFileSync(path.join(outDir, f), JSON.stringify(dto, null, 2));
  count++;
}
console.log(`Converted ${count} file(s) to ParsedResumeDto in ${outDir}`);

