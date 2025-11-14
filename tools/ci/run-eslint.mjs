#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';
import path from 'node:path';
import fs from 'node:fs';

function gitListFiles() {
  const res = spawnSync('git', ['ls-files', 'apps', 'libs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) {
    throw new Error(`git ls-files failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.split(/\r?\n/).filter(Boolean);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toRegexFromGlob(glob) {
  const G = '__GLOBSTAR__';
  const escaped = glob
    .replace(/[.+^${}()|\\]/g, '\\$&')
    .replace(/\*\*/g, G)
    .replace(/\*/g, '[^/]*')
    .replace(new RegExp(G, 'g'), '.*')
    .replace(/\\/g, '/');
  return new RegExp('^' + escaped + '$');
}

async function lintWithTimeout(eslint, files, ms) {
  const t = Number(ms || 0) || 60000;
  return await Promise.race([
    eslint.lintFiles(files),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`subset-timeout-${t}`)), t)),
  ]);
}

async function bisectFindOffenders(eslint, files, subsetTimeoutMs = 60000, minLeaf = 10) {
  const offenders = [];
  async function bisect(list) {
    if (list.length === 0) return;
    try {
      await lintWithTimeout(eslint, list, subsetTimeoutMs);
      return; // this subset ok
    } catch (e) {
      if (String(e.message || e).startsWith('subset-timeout-')) {
        if (list.length <= minLeaf) {
          // test files one by one
          for (const f of list) {
            try {
              await lintWithTimeout(eslint, [f], subsetTimeoutMs);
            } catch (ee) {
              if (String(ee.message || ee).startsWith('subset-timeout-')) offenders.push(f);
            }
          }
          return;
        }
        const mid = Math.floor(list.length / 2);
        await bisect(list.slice(0, mid));
        await bisect(list.slice(mid));
      } else {
        // real lint error - not a timeout; this is acceptable and will be reported later
        return;
      }
    }
  }
  await bisect(files);
  return offenders;
}

async function main() {
  const timeoutMs = Number(process.env.LINT_TIMEOUT_MS || 240000);
  const abortTimer = setTimeout(() => {
    console.error(`ESLint timed out after ${timeoutMs}ms`);
    process.exit(2);
  }, timeoutMs);
  const all = gitListFiles();
  const re = /^(apps\/[^/]+\/(src|test)\/.*\.(ts|js)|libs\/[^/]+\/src\/.*\.(ts|js))$/;
  let files = all.filter((f) => re.test(f));

  // Optional: restrict to include globs via env LINT_INCLUDE_GLOBS (comma-separated)
  const includeEnv = process.env.LINT_INCLUDE_GLOBS;
  if (includeEnv) {
    const globs = includeEnv.split(',').map((s) => s.trim()).filter(Boolean);
    const regs = globs.map(toRegexFromGlob);
    files = files.filter((f) => regs.some((r) => r.test(f)));
  }

  if (files.length === 0) {
    console.log('No files to lint.');
    return;
  }

  const eslint = new ESLint({
    cwd: process.cwd(),
    cache: false,
    errorOnUnmatchedPattern: false,
  });

  // If bisection mode is enabled, find hanging offenders quickly
  if (process.env.LINT_BISECT === '1') {
    const subsetTimeout = Number(process.env.LINT_SUBSET_TIMEOUT_MS || 60000);
    const leaf = Number(process.env.LINT_BISECT_LEAF || 10);
    console.log(`Bisect mode: files=${files.length} subsetTimeoutMs=${subsetTimeout} leaf=${leaf}`);
    const suspects = await bisectFindOffenders(eslint, files, subsetTimeout, leaf);
    if (suspects.length) {
      console.log('Timeout offenders (suspected):');
      for (const s of suspects) console.log(s);
      // Exit with special code 3 to indicate offenders found
      process.exit(3);
    } else {
      console.log('No timeout offenders found by bisection.');
    }
  }

  const batches = chunk(files, Number(process.env.LINT_BATCH_SIZE || 200));
  const resultsAll = [];
  for (let i = 0; i < batches.length; i++) {
    const part = batches[i];
    const batchLabel = `${i + 1}/${batches.length}`;
    console.log(`Starting batch ${batchLabel}: ${part[0]} .. ${part[part.length - 1]}`);
    const batchTimeout = Number(process.env.LINT_BATCH_TIMEOUT_MS || 90000);
    // Run ESLint CLI in a child process for robust timeout enforcement
    const eslintBin = path.resolve('node_modules/eslint/bin/eslint.js');
    const outDir = path.resolve('tmp', 'eslint-batches');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `batch-${i + 1}.json`);
    const args = [...part, '-f', 'json', '-o', outFile, '--no-error-on-unmatched-pattern'];
    const res = spawnSync('node', ['--no-warnings', eslintBin, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      timeout: batchTimeout,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      windowsHide: true,
    });
    if (res.error && res.error.code === 'ETIMEDOUT') {
      console.error(`Batch ${batchLabel} timed out after ${batchTimeout}ms`);
      throw new Error('lint-batch-timeout');
    }
    const out = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : (res.stdout || '').trim();
    try {
      const parsed = out ? JSON.parse(out) : [];
      resultsAll.push(...parsed);
    } catch (e) {
      console.error(`Failed to parse ESLint JSON for batch ${batchLabel}:`, (e && e.message) || String(e));
      // Fallback: try stylish to at least show output
      const res2 = spawnSync('node', ['--no-warnings', eslintBin, ...part], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        timeout: batchTimeout,
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
        windowsHide: true,
      });
      process.stdout.write(res2.stdout || '');
      process.stderr.write(res2.stderr || '');
      throw e;
    }
    console.log(`Linted batch ${i + 1}/${batches.length} (${part.length} files)`);
  }
  // Format using compact to avoid requiring external formatters in ESLint v9
  try {
    const compact = await eslint.loadFormatter('compact');
    const output = compact.format(resultsAll);
    if (output) process.stdout.write(output);
  } catch {}

  // Write machine-readable outputs for CI/parsers
  try {
    const outDir = path.resolve('tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'eslint-results.json'), JSON.stringify(resultsAll, null, 2));
  } catch {}

  let errorCount = 0;
  let warningCount = 0;
  const firstErrors = [];
  for (const r of resultsAll) {
    // CLI JSON returns file-level results with messages; compute counts here
    if (r.messages && r.messages.length) {
      for (const m of r.messages) {
        if (m.severity === 2) errorCount += 1;
        if (m.severity === 1) warningCount += 1;
        if (m.severity === 2 && firstErrors.length < 20) {
          firstErrors.push({ filePath: r.filePath, line: m.line, column: m.column, message: m.message, ruleId: m.ruleId });
        }
      }
    }
  }

  clearTimeout(abortTimer);
  console.log(`\nESLint summary: errors=${errorCount} warnings=${warningCount}`);
  if (firstErrors.length) {
    console.log('First errors:');
    for (const e of firstErrors) {
      console.log(`${e.filePath}:${e.line}:${e.column} - ${e.message} [${e.ruleId}]`);
    }
  }
  try {
    const outDir = path.resolve('tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'eslint-summary.txt'), `errors=${errorCount} warnings=${warningCount}`);
  } catch {}
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
