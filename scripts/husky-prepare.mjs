#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const shouldSkip =
  process.env.HUSKY === '0' ||
  process.env.SKIP_PRE_PUSH === 'true' ||
  process.env.CI === 'true';

if (shouldSkip) {
  process.exit(0);
}

const result = spawnSync('husky', ['install'], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
