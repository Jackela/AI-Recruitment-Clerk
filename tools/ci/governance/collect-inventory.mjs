#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../..');
const inventoryDir = path.join(workspaceRoot, 'specs/001-audit-architecture/inventory');
const findingsDir = path.join(workspaceRoot, 'specs/001-audit-architecture/findings');
const OWNER_OVERRIDES = {
  'ai-recruitment-clerk': 'platform-governance',
};

function ensureDirs() {
  mkdirSync(inventoryDir, { recursive: true });
}

function run(command, args, options = {}) {
  const result = execFileSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    env: { ...process.env, NX_DAEMON: 'false' },
  });
  return result;
}

function extractJson(raw) {
  const start = raw.search(/[\[{]/);
  if (start === -1) {
    throw new Error('Failed to locate JSON payload in Nx output');
  }
  const body = raw.slice(start).trim();
  // Determine closing bracket based on first char
  const closingChar = body[0] === '[' ? ']' : '}';
  const end = body.lastIndexOf(closingChar);
  if (end === -1) {
    throw new Error('Failed to parse Nx JSON output');
  }
  const jsonString = body.slice(0, end + 1);
  return JSON.parse(jsonString);
}

function captureProjectList() {
  const raw = run('npx', ['nx', 'show', 'projects', '--json']);
  return extractJson(raw);
}

function normalizeOwner(tags = []) {
  const ownerTag = tags.find((tag) => typeof tag === 'string' && tag.toLowerCase().startsWith('owner:'));
  if (!ownerTag) return '';
  const [, ...rest] = ownerTag.split(':');
  return rest.join(':').trim();
}

async function main() {
  ensureDirs();

  const graphPath = path.join(inventoryDir, 'graph.json');
  execFileSync('npx', ['nx', 'graph', '--file', graphPath, '--watch=false'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: { ...process.env, NX_DAEMON: 'false' },
  });

  const projectNames = captureProjectList();
  if (!Array.isArray(projectNames)) {
    throw new Error('Unexpected Nx output: expected an array of project names');
  }

  const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
  const nodes = graph?.graph?.nodes ?? {};

  const details = [];
  const missingOwners = [];
  const missingChecklists = [];

  for (const name of projectNames) {
    const node = nodes[name];
    if (!node) {
      console.warn(`[governance] Warning: project ${name} missing from graph output`);
      continue;
    }
    const data = node.data ?? {};
    const tags = data.tags ?? [];
    const ownerTeam = normalizeOwner(tags) || OWNER_OVERRIDES[name] || '';
    if (!ownerTeam || ownerTeam.toUpperCase() === 'UNASSIGNED') {
      missingOwners.push(name);
    }
    details.push({
      name,
      root: data.root ?? '',
      sourceRoot: data.sourceRoot ?? '',
      projectType: data.projectType ?? node.type ?? '',
      tags,
      ownerTeam: ownerTeam || 'UNASSIGNED',
    });

    const checklistPath = path.join(inventoryDir, `${name}.md`);
    if (!existsSync(checklistPath)) {
      missingChecklists.push(name);
    }
  }

  const inventoryPayload = { generatedAt: new Date().toISOString(), projects: details };
  const projectsPath = path.join(inventoryDir, 'projects.json');
  const componentsPath = path.join(inventoryDir, 'components.json');
  writeFileSync(projectsPath, JSON.stringify(inventoryPayload, null, 2));
  writeFileSync(componentsPath, JSON.stringify(inventoryPayload, null, 2));

  console.log(`[governance] Wrote project metadata to ${path.relative(workspaceRoot, projectsPath)}`);
  console.log(`[governance] Wrote component inventory to ${path.relative(workspaceRoot, componentsPath)}`);
  console.log(`[governance] Nx graph saved to ${path.relative(workspaceRoot, graphPath)}`);

  if (missingOwners.length > 0 || missingChecklists.length > 0) {
    if (missingOwners.length > 0) {
      console.error('\n[governance] The following projects are missing owner tags (owner:<team>) or are still UNASSIGNED:');
      missingOwners.forEach((name) => console.error(` - ${name}`));
      console.error('\nAdd an owner tag to each project (e.g., "owner:platform") in its project.json tags array.');
    }
    if (missingChecklists.length > 0) {
      console.error('\n[governance] Missing SSOT/SOLID/DDD checklists:');
      missingChecklists.forEach((name) => console.error(` - ${name}`));
      console.error('\nRun `node tools/ci/governance/write-checklists.mjs` or create the files under specs/001-audit-architecture/inventory/.');
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[governance] Failed to collect Nx inventory');
  console.error(err);
  process.exitCode = 1;
});
