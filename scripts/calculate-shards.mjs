#!/usr/bin/env node

/**
 * Test Sharding Calculator
 *
 * Calculates optimal shard distribution based on test file count
 * and outputs configuration for CI usage.
 *
 * Usage:
 *   node scripts/calculate-shards.mjs [shards]
 *
 * Example:
 *   node scripts/calculate-shards.mjs 4
 *
 *   Output:
 *   {
 *     "shards": 4,
 *     "testsPerShard": 25,
 *     "totalTests": 100,
 *     "recommendation": "Use 4 shards"
 *   }
 */

import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_SHARDS = 4;
const SHARD_OVERRIDES = {
  // Override shard count for specific test patterns
  'apps/app-gateway': 2,
  libs: 2,
};

async function countTests(pattern) {
  try {
    const files = await glob(pattern, {
      cwd: rootDir,
      absolute: false,
    });
    return files.length;
  } catch (error) {
    console.error(
      `Error counting tests for pattern ${pattern}:`,
      error.message,
    );
    return 0;
  }
}

async function calculateShards() {
  const targetShards = parseInt(process.argv[2], 10) || DEFAULT_SHARDS;

  // Count unit tests
  const unitTestPatterns = ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'];

  let totalUnitTests = 0;
  for (const pattern of unitTestPatterns) {
    const count = await countTests(pattern);
    totalUnitTests += count;
  }

  // Count E2E tests
  const e2eTestPatterns = [
    'apps/ai-recruitment-frontend-e2e/src/**/*.spec.ts',
    'e2e/**/*.spec.ts',
  ];

  let totalE2ETests = 0;
  for (const pattern of e2eTestPatterns) {
    const count = await countTests(pattern);
    totalE2ETests += count;
  }

  const totalTests = totalUnitTests + totalE2ETests;

  if (totalTests === 0) {
    console.error('No test files found!');
    process.exit(1);
  }

  const testsPerShard = Math.ceil(totalTests / targetShards);

  // Calculate optimal shard count based on test distribution
  let recommendedShards = targetShards;
  if (totalTests < 20) {
    recommendedShards = 2;
  } else if (totalTests < 50) {
    recommendedShards = Math.min(3, targetShards);
  }

  const result = {
    shards: targetShards,
    testsPerShard,
    totalTests,
    unitTests: totalUnitTests,
    e2eTests: totalE2ETests,
    recommendation: `Use ${recommendedShards} shards`,
    ciMatrix: Array.from({ length: targetShards }, (_, i) => i + 1),
  };

  console.log(JSON.stringify(result, null, 2));

  // Output for GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    console.log(`\n::set-output name=shards::${targetShards}`);
    console.log(`::set-output name=tests-per-shard::${testsPerShard}`);
    console.log(`::set-output name=total-tests::${totalTests}`);
    console.log(`::set-output name=matrix::${JSON.stringify(result.ciMatrix)}`);
  }

  return result;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  calculateShards().catch((error) => {
    console.error('Failed to calculate shards:', error);
    process.exit(1);
  });
}

export { calculateShards, countTests };
