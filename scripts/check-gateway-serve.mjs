#!/usr/bin/env node
/**
 * Smoke-tests the App Gateway by building it, launching the compiled bundle,
 * probing the health endpoint, and then tearing everything down.
 *
 * This provides a repeatable "serve check" that can run locally or in CI.
 */
import { spawn, execSync } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HEALTH_ENDPOINT = process.env.GATEWAY_HEALTH_URL;
const PORT = process.env.GATEWAY_CHECK_PORT || '4310';
const HOST = process.env.GATEWAY_CHECK_HOST || '127.0.0.1';
const HEALTH_URL =
  HEALTH_ENDPOINT || `http://${HOST}:${PORT}/api/system/health`;
const STARTUP_TIMEOUT_MS = Number(process.env.GATEWAY_CHECK_STARTUP_TIMEOUT ?? 60_000);
const POLL_INTERVAL_MS = Number(process.env.GATEWAY_CHECK_INTERVAL ?? 1_000);

const log = (msg, ...rest) => console.log(`[gateway-serve-check] ${msg}`, ...rest);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceLibs = [
  'ai-services-shared',
  'api-contracts',
  'candidate-scoring-domain',
  'configuration',
  'incentive-system-domain',
  'infrastructure-shared',
  'job-management-domain',
  'marketing-domain',
  'report-generation-domain',
  'resume-processing-domain',
  'shared-dtos',
  'shared-nats-client',
  'usage-management-domain',
  'user-management-domain',
];

function buildWorkspaceLibs() {
  const projectsArg = workspaceLibs.join(',');
  log(`Building workspace libs: ${projectsArg}`);
  execSync(
    `npx nx run-many --target=build --projects ${projectsArg} --skip-nx-cache`,
    { stdio: 'inherit' },
  );
}

async function runServeCheck() {
  buildWorkspaceLibs();
  log('Building gateway (nx build app-gateway --skip-nx-cache)…');
  execSync('npx nx build app-gateway --skip-nx-cache', {
    stdio: 'inherit',
  });

  const defaultEntry = process.env.GATEWAY_CHECK_ENTRY || 'dist/apps/app-gateway/main.cjs';
  const esmFallback = 'dist/apps/app-gateway/main.js';
  const entryPoint = existsSync(defaultEntry)
    ? defaultEntry
    : existsSync(esmFallback)
      ? esmFallback
      : defaultEntry;

  log(`Starting gateway on port ${PORT} (entry ${entryPoint})…`);
  const registerAlias = path.resolve(__dirname, 'register-dist-aliases.cjs');
  const nodeOptions = [process.env.NODE_OPTIONS, `--require ${registerAlias}`]
    .filter(Boolean)
    .join(' ')
    .trim();

  const child = spawn(
    'node',
    [entryPoint],
    {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT,
        SKIP_DB: 'true',
        GATEWAY_SERVE_CHECK: 'true',
        SUPPRESS_TEST_LOGS: 'true',
        NATS_OPTIONAL: 'true',
        NODE_OPTIONS: nodeOptions,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const logs = [];
  const captureLog = (data) => {
    const text = data.toString();
    logs.push(text);
    process.stdout.write(text);
  };
  child.stdout.on('data', captureLog);
  child.stderr.on('data', captureLog);

  const startTime = Date.now();
  let healthy = false;
  log(`Polling ${HEALTH_URL} for readiness (timeout ${STARTUP_TIMEOUT_MS}ms)…`);
  while (Date.now() - startTime < STARTUP_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new Error(`Gateway process exited prematurely with code ${child.exitCode}`);
    }
    try {
      const res = await fetch(HEALTH_URL, { method: 'GET' });
      if (res.ok) {
        healthy = true;
        break;
      }
    } catch (err) {
      // ignore until timeout
    }
    await delay(POLL_INTERVAL_MS);
  }

  child.kill('SIGTERM');
  await delay(500);

  if (!healthy) {
    throw new Error(
      `Gateway did not respond at ${HEALTH_URL} within ${STARTUP_TIMEOUT_MS}ms.\n` +
        'Last logs:\n' +
        logs.slice(-10).join(''),
    );
  }

  log('Gateway responded successfully – serve check passed ✅');
}

runServeCheck().catch((err) => {
  console.error('[gateway-serve-check] ❌ Failed:', err.message);
  process.exitCode = 1;
});
