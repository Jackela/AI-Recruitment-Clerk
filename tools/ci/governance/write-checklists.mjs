#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(new URL('.', import.meta.url).pathname, '../../..');
const inventoryDir = path.join(workspaceRoot, 'specs/001-audit-architecture/inventory');
const templatePath = path.join(workspaceRoot, 'specs/001-audit-architecture/templates/principle-checklist.md');

function loadProjects() {
  const file = path.join(inventoryDir, 'projects.json');
  if (!existsSync(file)) {
    throw new Error('Missing inventory/projects.json. Run npm run gov:inventory first.');
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return data.projects ?? [];
}

function generateChecklistContent(project) {
  const template = readFileSync(templatePath, 'utf8');
  return template
    .replace('[COMPONENT_NAME]', project.name)
    .replace('[component-id]', project.name)
    .replace('[owner]', project.ownerTeam)
    .replace('[yyyy-mm-dd]', new Date().toISOString().slice(0, 10));
}

function main() {
  mkdirSync(inventoryDir, { recursive: true });
  const projects = loadProjects();
  if (projects.length === 0) {
    throw new Error('No projects found in projects.json.');
  }

  for (const project of projects) {
    const targetPath = path.join(inventoryDir, `${project.name}.md`);
    if (!existsSync(targetPath)) {
      writeFileSync(targetPath, generateChecklistContent(project));
      console.log(`[governance] Created checklist ${path.relative(workspaceRoot, targetPath)}`);
    }
  }
}

try {
  main();
} catch (err) {
  console.error('[governance] Failed to write checklists');
  console.error(err);
  process.exitCode = 1;
}
