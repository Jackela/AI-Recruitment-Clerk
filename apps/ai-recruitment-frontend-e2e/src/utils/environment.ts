export interface TestEnvironment {
  dbPrefix: string;
  apiUrl: string;
  frontendUrl: string;
  isolationLevel: 'test' | 'suite' | 'spec';
  testRunId: string;
  parallelIndex: number;
}

export function getTestEnvironment(): TestEnvironment {
  const timestamp = Date.now();
  const testRunId = process.env['TEST_RUN_ID'] || `run_${timestamp}`;
  const parallelIndex = parseInt(process.env['TEST_PARALLEL_INDEX'] || '0', 10);

  return {
    dbPrefix: `test_${timestamp}_${parallelIndex}_`,
    apiUrl: process.env['TEST_API_URL'] || 'http://localhost:3000',
    frontendUrl: process.env['TEST_FRONTEND_URL'] || 'http://localhost:4200',
    isolationLevel:
      (process.env['TEST_ISOLATION'] as TestEnvironment['isolationLevel']) ||
      'test',
    testRunId,
    parallelIndex,
  };
}

export function getUniqueIdentifier(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const base = prefix
    ? `${prefix}_${timestamp}_${random}`
    : `${timestamp}_${random}`;
  return base;
}

export function getTestEmail(role = 'user'): string {
  const env = getTestEnvironment();
  return `${role}_${env.testRunId}@test.com`;
}

export function getIsolationConfig(): {
  shouldIsolatePerSuite: boolean;
  shouldIsolatePerSpec: boolean;
} {
  const env = getTestEnvironment();
  return {
    shouldIsolatePerSuite: env.isolationLevel === 'suite',
    shouldIsolatePerSpec: env.isolationLevel === 'spec',
  };
}

export function generateTestRunConfig(): {
  runId: string;
  startTime: number;
  dbName: string;
} {
  const runId = `test_run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    runId,
    startTime: Date.now(),
    dbName: `test_db_${runId}`,
  };
}

export function isCI(): boolean {
  return (
    process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true'
  );
}

export function getRetryCount(): number {
  return parseInt(process.env['TEST_RETRY_COUNT'] || '0', 10);
}
