#!/usr/bin/env node
// Cross-platform command runner with: hard timeout, heartbeat, and tree-kill on Windows.
// Usage: node tools/ci/exec-with-timeout.mjs --timeout 420000 -- <cmd> [args...]

import { spawn } from 'node:child_process';
import os from 'node:os';

function parseArgs(argv) {
  const out = { timeout: 300000, cmd: null, args: [] };
  const parts = [...argv.slice(2)];
  while (parts.length) {
    const t = parts.shift();
    if (t === '--') break;
    if (t === '--timeout') {
      const v = parts.shift();
      out.timeout = Number(v || 0) || 300000;
    } else {
      // Unknown flag, push back and break to command
      parts.unshift(t);
      break;
    }
  }
  if (parts.length) {
    out.cmd = parts.shift();
    out.args = parts;
  }
  return out;
}

function killTree(pid) {
  if (process.platform === 'win32') {
    // Force kill entire tree on Windows
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
}

async function main() {
  const { timeout, cmd, args } = parseArgs(process.argv);
  if (!cmd) {
    console.error('Usage: exec-with-timeout --timeout <ms> -- <cmd> [args...]');
    process.exit(2);
  }

  // Always non-interactive for CI stability
  process.env.CI = process.env.CI || 'true';
  process.env.FORCE_COLOR = process.env.FORCE_COLOR || '0';
  process.env.NX_DAEMON = process.env.NX_DAEMON || 'false';
  process.env.NX_NO_INTERACTIVE = process.env.NX_NO_INTERACTIVE || 'true';

  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  let done = false;

  const hb = setInterval(() => {
    process.stdout.write(`\n[heartbeat] ${new Date().toISOString()} pid=${child.pid}\n`);
  }, 30000);

  const timer = setTimeout(() => {
    if (done) return;
    console.error(`\n[timeout] ${timeout}ms exceeded for: ${cmd} ${args.join(' ')}`);
    try { killTree(child.pid); } catch {}
  }, timeout);

  child.on('exit', (code, signal) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearInterval(hb);
    const exitInfo = signal ? `signal=${signal}` : `code=${code ?? 1}`;
    process.stdout.write(`\n[codex] done ${exitInfo}\n`);
    process.exit(code ?? 1);
  });

  child.on('error', (err) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearInterval(hb);
    console.error('[spawn-error]', err?.message || String(err));
    process.exit(1);
  });
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

