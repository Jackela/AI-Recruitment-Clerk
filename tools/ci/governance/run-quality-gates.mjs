#!/usr/bin/env node
import { spawnSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../..');
const validationDir = path.join(workspaceRoot, 'specs/001-audit-architecture/validation');

const ciPhaseRunner = ['bash', path.join('scripts', 'ci', 'run-phase.sh')];

const testSteps = [
  {
    id: 'lint',
    label: 'Lint',
    command: ciPhaseRunner[0],
    args: [ciPhaseRunner[1], 'lint'],
  },
  {
    id: 'unit',
    label: 'Unit tests',
    command: ciPhaseRunner[0],
    args: [ciPhaseRunner[1], 'test'],
  },
  {
    id: 'integration',
    label: 'Integration tests',
    command: 'npm',
    args: ['run', 'test:integration'],
    skipByDefault: true,
    forceRunEnv: 'GOVERNANCE_RUN_INTEGRATION',
  },
  {
    id: 'typecheck',
    label: 'Typecheck',
    command: ciPhaseRunner[0],
    args: [ciPhaseRunner[1], 'typecheck'],
  },
  {
    id: 'e2e',
    label: 'E2E tests',
    command: ciPhaseRunner[0],
    args: [ciPhaseRunner[1], 'e2e'],
    skipByDefault: true,
    forceRunEnv: 'GOVERNANCE_RUN_E2E',
  },
];

function runCommand(step) {
  const startedAt = new Date().toISOString();
  const shouldSkip = determineSkip(step);
  if (shouldSkip) {
    console.log(`[governance] Skipping ${step.label}`);
    return { status: 'skipped', startedAt, completedAt: new Date().toISOString(), command: step.command, notes: 'skipped' };
  }

  console.log(`\n[governance] ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: { ...process.env, NX_DAEMON: 'false' },
  });
  const completedAt = new Date().toISOString();
  if (result.status !== 0) {
    throw new Error(`${step.label} failed (exit code ${result.status})`);
  }
  return { status: 'pass', startedAt, completedAt, command: `${step.command} ${step.args.join(' ')}` };
}

function determineSkip(step) {
  if (step.forceSkipEnv && process.env[step.forceSkipEnv] === 'true') {
    return true;
  }
  if (step.forceRunEnv && process.env[step.forceRunEnv] === 'true') {
    return false;
  }
  return step.skipByDefault ?? false;
}

function runValidator(label, script) {
  const startedAt = new Date().toISOString();
  const result = spawnSync('node', [script], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: { ...process.env, NX_DAEMON: 'false' },
  });
  const completedAt = new Date().toISOString();
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
  return { status: 'pass', startedAt, completedAt, command: `node ${script}` };
}

function gitInfo() {
  const info = { branch: '', commit: '' };
  try {
    info.commit = execSync('git rev-parse HEAD', { cwd: workspaceRoot }).toString().trim();
  } catch (_) {}
  try {
    info.branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot }).toString().trim();
  } catch (_) {}
  return info;
}

function loadComponents() {
  const file = path.join(workspaceRoot, 'specs/001-audit-architecture/inventory/components.json');
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return (data.projects ?? []).map((p) => p.name);
  } catch (_) {
    return [];
  }
}

function writeManifest(payload) {
  mkdirSync(validationDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `${timestamp}-${(payload.commit || '').slice(0, 7)}`;
  const manifest = {
    runId,
    branch: payload.branch,
    commit: payload.commit,
    trigger: process.env.GOVERNANCE_TRIGGER || 'remediation',
    generatedAt: new Date().toISOString(),
    components: payload.components,
    tests: payload.tests,
    validation: payload.validation,
    actSimulation: {
      workflow: '.github/workflows/ci.yml',
      image: 'ghcr.io/catthehacker/ubuntu:act-latest',
      status: process.env.GOVERNANCE_ACT_STATUS || 'pending',
      logPath: '',
    },
    githubActions: {
      workflowUrl: '',
      conclusion: 'pending',
      jobMatrix: {},
    },
    parity: {
      status: 'pending',
      notes: 'Run compare-ci-results.mjs after GitHub Actions completes.',
    },
    result: determineResult(payload.tests, payload.validation),
  };

  const manifestPath = path.join(validationDir, `${runId}-local.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  writeFileSync(path.join(validationDir, 'latest-local.json'), JSON.stringify(manifest, null, 2));
  console.log(`[governance] Wrote validation manifest to ${path.relative(workspaceRoot, manifestPath)}`);
}

function determineResult(tests, validation) {
  const failedTests = Object.values(tests).some((res) => res.status !== 'pass' && res.status !== 'skipped');
  const failedValidation = Object.values(validation).some((res) => res.status !== 'pass');
  if (failedTests || failedValidation) {
    return 'fail';
  }
  return 'pass';
}

function main() {
  const tests = {};
  for (const step of testSteps) {
    const result = runCommand(step);
    tests[step.id] = result;
  }

  const validation = {
    remediationSchema: runValidator('Remediation schema validation', 'tools/ci/governance/validate-remediation.mjs'),
    remediationCoverage: runValidator('Remediation coverage check', 'tools/ci/governance/report-remediation-coverage.mjs'),
  };

  const info = gitInfo();
  const components = loadComponents();
  writeManifest({ tests, validation, ...info, components });
}

try {
  main();
} catch (err) {
  console.error('[governance] gov:validate failed');
  console.error(err.message || err);
  process.exit(1);
}
