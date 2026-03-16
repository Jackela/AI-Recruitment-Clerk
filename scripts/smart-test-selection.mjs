#!/usr/bin/env node
/**
 * Smart Test Selection Script
 *
 * This script intelligently selects and runs only the tests affected by code changes.
 * Uses Nx's dependency graph to determine which tests need to run.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const BASE_BRANCH = process.env.NX_BASE || 'origin/main';
const HEAD = process.env.NX_HEAD || 'HEAD';
const PARALLEL = process.env.NX_PARALLEL || '4';

/**
 * Get list of affected projects that have tests
 */
function getAffectedProjects() {
  try {
    const result = execSync(
      `npx nx print-affected --base=${BASE_BRANCH} --head=${HEAD} --select=projects`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return result.trim().split(', ').filter(Boolean);
  } catch (error) {
    console.error('Failed to get affected projects:', error.message);
    return [];
  }
}

/**
 * Check if a project has tests configured
 */
function hasTests(project) {
  const projectRoot = getProjectRoot(project);
  if (!projectRoot) return false;

  // Check for test files or jest config
  const testPatterns = [
    'jest.config.ts',
    'jest.config.js',
    '**/*.spec.ts',
    '**/*.test.ts',
  ];

  try {
    const result = execSync(
      `find ${projectRoot} -type f \( -name "*.spec.ts" -o -name "*.test.ts" -o -name "jest.config.ts" -o -name "jest.config.js" \) 2>/dev/null | head -1`,
      { encoding: 'utf-8' },
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get project root from Nx
 */
function getProjectRoot(project) {
  try {
    const result = execSync(`npx nx show project ${project} --json`, {
      encoding: 'utf-8',
    });
    const projectInfo = JSON.parse(result);
    return projectInfo.root;
  } catch {
    return null;
  }
}

/**
 * Run tests for affected projects
 */
async function runTests(projects) {
  if (projects.length === 0) {
    console.log('No affected projects with tests found.');
    return;
  }

  console.log(`\nRunning tests for ${projects.length} affected project(s):`);
  projects.forEach((p) => console.log(`  - ${p}`));
  console.log();

  const projectsArg = projects.join(',');

  try {
    execSync(
      `npx nx run-many -t test --projects=${projectsArg} --parallel=${PARALLEL} --runInBand=false`,
      { stdio: 'inherit' },
    );
  } catch (error) {
    console.error('Tests failed:', error.message);
    process.exit(1);
  }
}

/**
 * Show dependency graph
 */
function showDependencyGraph() {
  console.log('\nGenerating dependency graph...');
  try {
    execSync('npx nx graph --file=.nx/dep-graph.html', { stdio: 'inherit' });
    console.log('Dependency graph saved to: .nx/dep-graph.html');
  } catch (error) {
    console.error('Failed to generate dependency graph:', error.message);
  }
}

/**
 * Show affected test projects only
 */
function showAffectedTests() {
  console.log('\nAnalyzing affected test projects...');
  try {
    const result = execSync(
      `npx nx print-affected --type=test --select=projects --base=${BASE_BRANCH} --head=${HEAD}`,
      { encoding: 'utf-8' },
    );
    console.log('Affected test projects:', result || 'None');
  } catch (error) {
    console.log('No test targets affected');
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'graph':
      showDependencyGraph();
      break;

    case 'show':
      showAffectedTests();
      break;

    case 'run':
    default:
      console.log('=== Smart Test Selection ===\n');
      console.log(`Base: ${BASE_BRANCH}`);
      console.log(`Head: ${HEAD}`);
      console.log(`Parallel: ${PARALLEL}`);

      const affected = getAffectedProjects();
      console.log(`\nTotal affected projects: ${affected.length}`);

      if (affected.length === 0) {
        console.log('No projects affected by changes.');
        return;
      }

      const testsToRun = affected.filter(hasTests);
      await runTests(testsToRun);
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
